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
import { WorkOrderItemResponse, WorkOrderResponse } from '../../core/models/work-order.model';

/**
 * O orçamento em papel.
 *
 * <h2>Por que ele existe, já havendo o link por e-mail</h2>
 *
 * <p>
 * O link resolve o caso comum e não resolve os outros: o cliente que não se
 * entende com o celular, o que não abre e-mail, o que quer levar a proposta para
 * casa e conversar em família, e a oficina que prefere entregar o papel no
 * balcão. Este é o mesmo orçamento pelo caminho físico — e por isso ele termina
 * onde o link termina: numa decisão registrada.
 * </p>
 *
 * <h2>Como a aprovação em papel volta para o sistema</h2>
 *
 * <p>
 * O cliente assina a folha, e alguém da gerência registra a decisão na tela da
 * OS. Não há atalho automático: quem aprova continua sendo uma pessoa
 * identificada, e a assinatura é a prova de que ela tinha autorização para
 * fazê-lo.
 * </p>
 *
 * <h2>O que não sai aqui</h2>
 *
 * <p>
 * Diagnóstico técnico e observações internas ficam de fora — exatamente como na
 * versão que o cliente vê pelo e-mail. Se os dois documentos mostrassem coisas
 * diferentes sobre a mesma OS, o cliente que recebesse os dois teria razão em
 * perguntar qual vale.
 * </p>
 */
@Component({
  selector: 'cp-work-order-quote-print-page',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, DatePipe, DecimalPipe],
  templateUrl: './work-order-quote-print.page.html',
  styleUrl: './work-order-quote-print.page.css',
})
export class WorkOrderQuotePrintPage {
  readonly id = input.required<string>();

  private readonly api = inject(WorkOrderApi);
  private readonly workshopApi = inject(WorkshopApi);
  private readonly customerApi = inject(CustomerApi);
  private readonly vehicleApi = inject(VehicleApi);

  protected readonly order = signal<WorkOrderResponse | null>(null);
  protected readonly workshop = signal<WorkshopResponse | null>(null);
  protected readonly customer = signal<CustomerResponse | null>(null);
  protected readonly vehicle = signal<VehicleResponse | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');

  /** Momento da emissão — vai impresso, para datar a proposta. */
  protected readonly emittedAt = new Date();

  /** Serviços antes de peças: é a ordem em que a conversa acontece no balcão. */
  protected readonly items = computed<WorkOrderItemResponse[]>(() => {
    const lista = [...(this.order()?.items ?? [])];
    return lista.sort((a, b) => (a.type === b.type ? 0 : a.type === 'SERVICE' ? -1 : 1));
  });

  constructor() {
    queueMicrotask(() => this.load());
  }

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

  /**
   * Só a ordem é obrigatória.
   *
   * Se a ficha do cliente ou do carro falhar, a folha sai com o que a própria OS
   * traz — deixar de imprimir um orçamento porque faltou o telefone seria trocar
   * um problema pequeno por um grande.
   */
  private loadRelated(order: WorkOrderResponse): void {
    forkJoin({
      workshop: this.workshopApi.get().pipe(catchError(() => of(null))),
      customer: this.customerApi.getById(order.customerId).pipe(catchError(() => of(null))),
      vehicle: this.vehicleApi.getById(order.vehicleId).pipe(catchError(() => of(null))),
    }).subscribe((resultado) => {
      this.workshop.set(resultado.workshop);
      this.customer.set(resultado.customer);
      this.vehicle.set(resultado.vehicle);
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
