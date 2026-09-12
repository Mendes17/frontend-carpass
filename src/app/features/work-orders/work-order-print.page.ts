import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';

import { CustomerApi } from '../../core/api/customer.api';
import { VehicleApi } from '../../core/api/vehicle.api';
import { WorkOrderApi } from '../../core/api/work-order.api';
import { WorkshopApi } from '../../core/api/workshop.api';
import { apiErrorMessage } from '../../core/http/api-error.util';
import { Address } from '../../core/models/common.model';
import { CustomerResponse } from '../../core/models/customer.model';
import { VehicleResponse } from '../../core/models/vehicle.model';
import { WorkshopResponse } from '../../core/models/workshop.model';
import {
  WorkOrderItemResponse,
  WorkOrderResponse,
  WorkOrderStatusHistoryEntry,
} from '../../core/models/work-order.model';

/**
 * A ordem de serviço em papel.
 *
 * <h2>Por que é uma tela, e não um PDF gerado no servidor</h2>
 *
 * O que o navegador imprime é exatamente o que está aqui na frente da pessoa —
 * ela confere antes de gastar papel, e o mesmo botão salva em PDF pelo diálogo
 * de impressão. Gerar o arquivo no backend traria uma biblioteca nova, um
 * endpoint novo e um segundo lugar para a mesma folha divergir.
 *
 * <h2>Por que ela busca de novo, e não recebe os dados da tela anterior</h2>
 *
 * A folha carrega mais coisa do que a tela de detalhe tem: documento e endereço
 * do cliente, chassi e renavam do carro, dados da oficina. Tudo vem pelos
 * endpoints de sempre, cada um já escopado por oficina e checado por papel —
 * imprimir não abre nenhuma porta que a pessoa já não tivesse.
 *
 * <h2>Assinatura</h2>
 *
 * A folha traz linha de assinatura para o cliente e para a oficina. O que ela
 * registra é a **entrega**: que o carro voltou e que o serviço descrito foi o
 * executado. A aprovação do orçamento já acontece antes, pelo link do e-mail —
 * são momentos diferentes, e só o segundo acontece com as duas pessoas frente
 * a frente. Assinatura desenhada na tela ficou de fora de propósito: um rabisco
 * guardado no banco dá menos garantia do que aparenta e cria dado pessoal
 * sensível para guardar; papel assinado resolve o mesmo problema hoje.
 */
@Component({
  selector: 'cp-work-order-print-page',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, DatePipe, DecimalPipe],
  templateUrl: './work-order-print.page.html',
  styleUrl: './work-order-print.page.css',
})
export class WorkOrderPrintPage {
  readonly id = input.required<string>();

  private readonly api = inject(WorkOrderApi);
  private readonly workshopApi = inject(WorkshopApi);
  private readonly customerApi = inject(CustomerApi);
  private readonly vehicleApi = inject(VehicleApi);

  protected readonly order = signal<WorkOrderResponse | null>(null);
  protected readonly workshop = signal<WorkshopResponse | null>(null);
  protected readonly customer = signal<CustomerResponse | null>(null);
  protected readonly vehicle = signal<VehicleResponse | null>(null);
  protected readonly history = signal<WorkOrderStatusHistoryEntry[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');

  /** Momento em que a folha foi emitida — vai impressa, para datar a via. */
  protected readonly emittedAt = new Date();

  /** Serviços antes de peças: é a ordem em que a conversa acontece no balcão. */
  protected readonly items = computed<WorkOrderItemResponse[]>(() => {
    const list = [...(this.order()?.items ?? [])];
    return list.sort((a, b) => (a.type === b.type ? 0 : a.type === 'SERVICE' ? -1 : 1));
  });

  constructor() {
    queueMicrotask(() => this.load());
  }

  /**
   * Carrega a ordem e, em paralelo, as fichas completas.
   *
   * Só a ordem é obrigatória. Se a busca do cliente ou do carro falhar, a folha
   * sai assim mesmo com o que a própria OS já traz — deixar de imprimir porque
   * faltou o renavam seria trocar um problema pequeno por um grande.
   */
  private load(): void {
    this.loading.set(true);

    this.api.getById(this.id()).subscribe({
      next: (order) => {
        this.order.set(order);
        this.loadRelated(order);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(apiErrorMessage(error));
      },
    });
  }

  private loadRelated(order: WorkOrderResponse): void {
    forkJoin({
      workshop: this.workshopApi.get().pipe(catchError(() => of(null))),
      customer: this.customerApi.getById(order.customerId).pipe(catchError(() => of(null))),
      vehicle: this.vehicleApi.getById(order.vehicleId).pipe(catchError(() => of(null))),
      history: this.api.history(order.id).pipe(catchError(() => of([]))),
    }).subscribe((resultado) => {
      this.workshop.set(resultado.workshop);
      this.customer.set(resultado.customer);
      this.vehicle.set(resultado.vehicle);
      this.history.set(resultado.history);
      this.loading.set(false);
    });
  }

  protected print(): void {
    window.print();
  }

  /** Monta o endereço numa linha só; devolve vazio quando não há nada de útil. */
  protected formatAddress(address: Address | null | undefined): string {
    if (!address) {
      return '';
    }

    const rua = [address.street, address.number].filter(Boolean).join(', ');
    const cidade = [address.city, address.state].filter(Boolean).join('/');
    return [rua, address.complement, address.neighborhood, cidade, address.zipCode]
      .filter((parte) => !!parte && String(parte).trim().length > 0)
      .join(' · ');
  }

  /** Ano no formato "2022/2023", ou só um deles quando o outro falta. */
  protected formatYears(vehicle: VehicleResponse | null): string {
    if (!vehicle) {
      return '';
    }
    const anos = [vehicle.manufactureYear, vehicle.modelYear].filter((a) => a != null);
    if (!anos.length) {
      return '';
    }
    return anos.length === 2 && anos[0] !== anos[1] ? `${anos[0]}/${anos[1]}` : String(anos[0]);
  }
}
