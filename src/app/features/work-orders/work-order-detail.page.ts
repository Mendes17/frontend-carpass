import { Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import { CustomerApi } from '../../core/api/customer.api';
import { EmployeeApi } from '../../core/api/employee.api';
import { WorkOrderApi } from '../../core/api/work-order.api';
import { apiErrorMessage } from '../../core/http/api-error.util';
import { EmployeeResponse } from '../../core/models/employee.model';
import {
  QUOTE_STATUS_TONES,
  WORK_ORDER_STATUS_LABELS,
  WORK_ORDER_STATUS_TONES,
  WorkOrderStatus,
} from '../../core/models/enums.model';
import {
  WorkOrderItemRequest,
  WorkOrderItemResponse,
  WorkOrderResponse,
  WorkOrderStatusHistoryEntry,
} from '../../core/models/work-order.model';
import { AuthService } from '../../core/auth/auth.service';
import { RealtimeService } from '../../core/realtime/realtime.service';
import { SnackbarService } from '../../core/services/snackbar.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { SendQuoteDialog } from './send-quote.dialog';
import { WorkOrderItemDialog } from './work-order-item.dialog';

/**
 * A ordem de serviço.
 *
 * Três coisas valem entender antes de mexer aqui:
 *
 * 1. **Quem decide as etapas possíveis é o backend.** A tela desenha os botões a
 *    partir de `allowedNextStatuses`, em vez de inventar o menu e descobrir o
 *    erro depois do clique. Se uma transição sumir, é regra de negócio, não bug
 *    de tela.
 * 2. **Adicionar peça dá baixa no estoque na hora**, não no fechamento. Remover
 *    devolve. Por isso o aviso ao remover é claro sobre o que acontece.
 * 3. **Orçamento aprovado tranca os itens** (`editable: false`). Para mexer, é
 *    preciso reabrir o orçamento, e isso fica registrado na linha do tempo — a
 *    ideia é justamente que ninguém mude o combinado em silêncio.
 */
@Component({
  selector: 'cp-work-order-detail-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    MatIconModule,
    PageHeaderComponent,
    SkeletonComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './work-order-detail.page.html',
  styleUrl: './work-order-detail.page.css',
})
export class WorkOrderDetailPage {
  readonly id = input.required<string>();

  private readonly api = inject(WorkOrderApi);
  private readonly employeeApi = inject(EmployeeApi);
  private readonly customerApi = inject(CustomerApi);
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(SnackbarService);
  private readonly auth = inject(AuthService);
  private readonly realtime = inject(RealtimeService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly order = signal<WorkOrderResponse | null>(null);
  protected readonly history = signal<WorkOrderStatusHistoryEntry[]>([]);
  protected readonly mechanics = signal<EmployeeResponse[]>([]);
  protected readonly loading = signal(true);
  protected readonly working = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly editingDetails = signal(false);

  /** E-mail do cadastro do cliente, para sugerir no envio do orçamento. */
  protected readonly customerEmail = signal<string | null>(null);

  /**
   * Decidir sobre valor é de quem responde pelo dinheiro.
   *
   * Quem aprova de verdade é o cliente, pelo link do e-mail. Estes botões
   * existem para o caso em que ele não consegue usar o link e pede a um
   * superior que registre a decisão por ele — por isso ficam fora do alcance
   * do atendente e do mecânico.
   */
  protected readonly canDecideQuote = computed(() => this.auth.hasAnyRole('OWNER', 'MANAGER'));

  protected readonly statusTone = WORK_ORDER_STATUS_TONES;
  protected readonly quoteTone = QUOTE_STATUS_TONES;
  protected readonly statusLabels = WORK_ORDER_STATUS_LABELS;

  protected readonly detailsForm = this.fb.nonNullable.group({
    assignedMechanicId: [null as string | null],
    reportedProblem: [''],
    diagnosis: [''],
    mileage: [null as number | null],
    estimatedDeliveryDate: [''],
    discount: [null as number | null],
    notes: [''],
  });

  /**
   * Etapas oferecidas como botão.
   *
   * Fora da lista ficam as três que têm caminho próprio: entregar e cancelar
   * viram ações destacadas, e "Aprovada" só pode ser alcançada pela aprovação
   * do orçamento — o backend recusa a transição direta justamente para
   * preservar o registro de quem aprovou. Oferecer o botão seria oferecer um
   * clique que sempre falha.
   */
  protected readonly nextStatuses = computed<WorkOrderStatus[]>(() =>
    (this.order()?.allowedNextStatuses ?? []).filter(
      (s) => s !== 'CANCELED' && s !== 'DELIVERED' && s !== 'APPROVED',
    ),
  );

  protected readonly canDeliver = computed(() =>
    (this.order()?.allowedNextStatuses ?? []).includes('DELIVERED'),
  );
  protected readonly canCancel = computed(() =>
    (this.order()?.allowedNextStatuses ?? []).includes('CANCELED'),
  );

  /**
   * O orçamento em papel existe enquanto houver o que propor.
   *
   * Diferente da folha da OS, que só aparece com o serviço fechado: aqui a
   * proposta é justamente o documento de antes: o cliente leva para casa,
   * decide e devolve assinada. Sai de cena quando a ordem é cancelada — não há
   * o que propor sobre um serviço que não vai acontecer.
   */
  protected readonly canPrintQuote = computed(() => {
    const os = this.order();
    return !!os && os.items.length > 0 && os.status !== 'CANCELED';
  });

  /**
   * A folha só aparece depois que o serviço acabou.
   *
   * Antes disso os itens ainda mudam, e um papel impresso no meio do caminho
   * circula pela oficina dizendo um valor que a OS já não diz mais. Concluída e
   * entregue são os dois estados em que o conteúdo está fechado — e é
   * justamente quando o cliente chega para assinar e levar o carro.
   */
  protected readonly canPrint = computed(() => {
    const status = this.order()?.status;
    return status === 'FINISHED' || status === 'DELIVERED';
  });

  /** Aviso de decisão do cliente, para destacar na tela em vez de só recarregar. */
  protected readonly decisaoDoCliente = signal<'APPROVED' | 'REJECTED' | null>(null);

  constructor() {
    queueMicrotask(() => this.reload());
    this.employeeApi.mechanics().subscribe({
      next: (list) => this.mechanics.set(list),
      error: () => this.mechanics.set([]),
    });

    // O cliente pode responder o orçamento a qualquer momento, de casa. Sem
    // isto a tela ficaria mostrando "aguardando resposta" para sempre, e a
    // pessoa só descobriria a mudança recarregando a página.
    this.realtime.events.pipe(takeUntilDestroyed()).subscribe((evento) => {
      if (evento.workOrderId !== this.id()) {
        return;
      }

      if (evento.type === 'QUOTE_DECIDED') {
        this.decisaoDoCliente.set(evento.approved ? 'APPROVED' : 'REJECTED');
        this.snackbar.success(
          evento.approved
            ? 'O cliente acabou de aprovar o orçamento.'
            : 'O cliente acabou de recusar o orçamento.',
        );
      }

      // Recarrega em vez de aplicar o evento: o aviso diz que mudou, e a API
      // diz o que é — já filtrada pelo papel de quem está olhando.
      this.reload();
    });
  }

  private reload(): void {
    this.loading.set(true);
    this.api.getById(this.id()).subscribe({
      next: (order) => {
        this.apply(order);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(apiErrorMessage(error));
      },
    });
    this.loadHistory();
  }

  private loadHistory(): void {
    this.api.history(this.id()).subscribe({
      next: (entries) => this.history.set(entries),
      error: () => this.history.set([]),
    });
  }

  private apply(order: WorkOrderResponse): void {
    this.order.set(order);
    this.carregarEmailDoCliente(order.customerId);
    this.detailsForm.patchValue({
      assignedMechanicId: order.assignedMechanicId,
      reportedProblem: order.reportedProblem ?? '',
      diagnosis: order.diagnosis ?? '',
      mileage: order.mileage,
      estimatedDeliveryDate: order.estimatedDeliveryDate ?? '',
      discount: order.discount,
      notes: order.notes ?? '',
    });
  }

  /**
   * Busca o e-mail do cliente para pré-preencher o envio do orçamento.
   *
   * A OS não carrega esse dado — ela traz o nome, não a ficha inteira. Falhar
   * aqui é inofensivo: o diálogo simplesmente abre com o campo vazio.
   */
  private carregarEmailDoCliente(customerId: string): void {
    this.customerApi.getById(customerId).subscribe({
      next: (customer) => this.customerEmail.set(customer.email),
      error: () => this.customerEmail.set(null),
    });
  }

  /** Toda ação passa por aqui: um só lugar para tratar erro e recarregar. */
  private run(action: ReturnType<WorkOrderApi['getById']>, successMessage: string): void {
    this.working.set(true);
    action.subscribe({
      next: (order) => {
        this.apply(order);
        this.working.set(false);
        this.snackbar.success(successMessage);
        this.loadHistory();
      },
      error: (error: unknown) => {
        this.working.set(false);
        this.snackbar.error(apiErrorMessage(error));
      },
    });
  }

  // ------------------------------------------------------------- detalhes
  protected toggleEditDetails(): void {
    this.editingDetails.update((v) => !v);
  }

  protected saveDetails(): void {
    const value = this.detailsForm.getRawValue();
    this.run(
      this.api.update(this.id(), {
        assignedMechanicId: value.assignedMechanicId || null,
        reportedProblem: value.reportedProblem.trim() || null,
        diagnosis: value.diagnosis.trim() || null,
        mileage: numberOrNull(value.mileage),
        estimatedDeliveryDate: value.estimatedDeliveryDate || null,
        discount: numberOrNull(value.discount),
        notes: value.notes.trim() || null,
      }),
      'Ordem atualizada.',
    );
    this.editingDetails.set(false);
  }

  // ---------------------------------------------------------------- itens
  protected addItem(): void {
    this.dialog
      .open(WorkOrderItemDialog, { width: '560px' })
      .afterClosed()
      .subscribe((body: WorkOrderItemRequest | null) => {
        if (body) {
          this.run(this.api.addItem(this.id(), body), 'Item adicionado.');
        }
      });
  }

  protected editItem(item: WorkOrderItemResponse): void {
    this.dialog
      .open(WorkOrderItemDialog, { width: '560px', data: { item } })
      .afterClosed()
      .subscribe((body: WorkOrderItemRequest | null) => {
        if (body) {
          this.run(this.api.updateItem(this.id(), item.id, body), 'Item atualizado.');
        }
      });
  }

  protected removeItem(item: WorkOrderItemResponse): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        width: '440px',
        data: {
          title: 'Remover item',
          message:
            item.type === 'PART'
              ? `"${item.description}" sai da ordem e as ${item.quantity} unidades voltam para o estoque.`
              : `"${item.description}" sai da ordem.`,
          confirmText: 'Remover',
          cancelText: 'Cancelar',
          type: 'danger',
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.run(this.api.removeItem(this.id(), item.id), 'Item removido.');
        }
      });
  }

  // --------------------------------------------------------------- status
  protected changeStatus(status: WorkOrderStatus): void {
    this.run(this.api.changeStatus(this.id(), { status }), `Ordem movida para ${this.statusLabels[status]}.`);
  }

  protected deliver(): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        width: '440px',
        data: {
          title: 'Registrar entrega',
          message: 'O carro sai da oficina e a ordem é encerrada. Depois disso ela não se move mais.',
          confirmText: 'Registrar entrega',
          cancelText: 'Cancelar',
          type: 'primary',
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.run(this.api.deliver(this.id()), 'Entrega registrada.');
        }
      });
  }

  protected cancel(): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        width: '440px',
        data: {
          title: 'Cancelar ordem',
          message:
            'A ordem é encerrada e as peças já lançadas voltam para o estoque. Não dá para reabrir depois.',
          confirmText: 'Cancelar ordem',
          cancelText: 'Voltar',
          type: 'danger',
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.run(this.api.cancel(this.id()), 'Ordem cancelada.');
        }
      });
  }

  // ------------------------------------------------------------ orçamento
  protected submitQuote(): void {
    this.abrirEnvio(false);
  }

  /** Reenviar deriruba o link anterior e manda um novo. */
  protected resendQuote(): void {
    this.abrirEnvio(true);
  }

  private abrirEnvio(reenvio: boolean): void {
    const order = this.order();
    if (!order) {
      return;
    }

    this.dialog
      .open(SendQuoteDialog, {
        width: '520px',
        data: {
          customerName: order.customerName,
          customerEmail: this.customerEmail(),
          resend: reenvio,
        },
      })
      .afterClosed()
      .subscribe((resultado: { email: string | null } | undefined) => {
        // `undefined` é cancelar; `{ email: null }` é seguir sem enviar nada.
        if (resultado === undefined) {
          return;
        }

        if (reenvio) {
          this.run(
            this.api.resendQuote(this.id(), resultado.email),
            resultado.email ? `Orçamento reenviado para ${resultado.email}.` : 'Orçamento reenviado.',
          );
          return;
        }

        this.run(
          this.api.submitQuote(this.id(), resultado.email),
          resultado.email
            ? `Orçamento enviado para ${resultado.email}.`
            : 'Orçamento aguardando aprovação. Nenhum e-mail foi enviado.',
        );
      });
  }

  protected approveQuote(): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        width: '440px',
        data: {
          title: 'Aprovar orçamento',
          message:
            'O cliente aprovou os valores. Os itens ficam travados a partir de agora — para mexer neles será preciso reabrir o orçamento, e isso fica registrado.',
          confirmText: 'Aprovar',
          cancelText: 'Cancelar',
          type: 'primary',
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.run(this.api.approveQuote(this.id()), 'Orçamento aprovado.');
        }
      });
  }

  protected rejectQuote(): void {
    this.run(this.api.rejectQuote(this.id()), 'Orçamento recusado. A ordem voltou para revisão.');
  }

  protected reopenQuote(): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        width: '440px',
        data: {
          title: 'Reabrir orçamento',
          message:
            'Os itens voltam a ser editáveis e o orçamento precisará de nova aprovação do cliente. A reabertura fica registrada na linha do tempo.',
          confirmText: 'Reabrir',
          cancelText: 'Cancelar',
          type: 'danger',
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.run(this.api.reopenQuote(this.id()), 'Orçamento reaberto.');
        }
      });
  }

  protected openVehicleHistory(): void {
    const order = this.order();
    if (order) {
      void this.router.navigate(['/veiculos', order.vehicleId, 'historico']);
    }
  }
}

/** Campo numérico vazio chega como string vazia, e `Number('')` é zero. */
function numberOrNull(value: number | null): number | null {
  if (value === null || value === undefined || (value as unknown) === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
