import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { PartApi } from '../../core/api/part.api';
import { ServiceCatalogApi } from '../../core/api/service-catalog.api';
import { ItemType } from '../../core/models/enums.model';
import { PartResponse } from '../../core/models/part.model';
import { ServiceCatalogResponse } from '../../core/models/service-catalog.model';
import { WorkOrderItemRequest, WorkOrderItemResponse } from '../../core/models/work-order.model';

/** Rótulo do grupo das peças ainda não classificadas. */
const SEM_TIPO = 'Sem tipo definido';

export interface WorkOrderItemDialogData {
  /** Preenchido ao editar; ausente ao adicionar. */
  item?: WorkOrderItemResponse;
}

/**
 * Adiciona ou edita um item da ordem de serviço.
 *
 * Um item é um serviço do catálogo ou uma peça do estoque. Escolher do catálogo
 * traz preço e descrição prontos, mas os dois seguem editáveis: o preço do
 * catálogo é sugestão, e o que vale é o que foi combinado com o cliente.
 *
 * A tela avisa quando a quantidade pedida passa do saldo, porque adicionar peça
 * dá baixa no estoque na hora — não no fechamento da ordem.
 */
@Component({
  selector: 'cp-work-order-item-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>{{ isEdit ? 'Editar item' : 'Adicionar item' }}</h2>

    <mat-dialog-content>
      <form [formGroup]="form" novalidate>
        @if (!isEdit) {
          <div class="cp-field">
            <span class="cp-label">Tipo</span>
            <div class="type-toggle" role="radiogroup" aria-label="Tipo do item">
              <button type="button" class="type-option" [class.selected]="type() === 'SERVICE'"
                      role="radio" [attr.aria-checked]="type() === 'SERVICE'" (click)="setType('SERVICE')">
                <mat-icon aria-hidden="true">build</mat-icon>
                Serviço
              </button>
              <button type="button" class="type-option" [class.selected]="type() === 'PART'"
                      role="radio" [attr.aria-checked]="type() === 'PART'" (click)="setType('PART')">
                <mat-icon aria-hidden="true">inventory_2</mat-icon>
                Peça
              </button>
            </div>
          </div>

          <div class="cp-field">
            <label class="cp-label" for="catalog">
              {{ type() === 'SERVICE' ? 'Serviço do catálogo' : 'Peça do estoque' }}
            </label>
            <select id="catalog" class="cp-select" (change)="onCatalogChange($event)">
              <option value="">Item avulso (descrever à mão)</option>
              @if (type() === 'SERVICE') {
                @for (service of services(); track service.id) {
                  <option [value]="service.id">{{ service.name }}</option>
                }
              } @else {
                <!--
                  Agrupado por tipo: com o carro no elevador a busca é "óleo de
                  motor", e a marca é a escolha seguinte. Numa lista corrida de
                  duzentas peças em ordem alfabética, as opções do mesmo tipo
                  ficam espalhadas e comparar marcas vira rolagem.
                -->
                @for (grupo of partsByType(); track grupo.tipo) {
                  <optgroup [label]="grupo.tipo">
                    @for (part of grupo.pecas; track part.id) {
                      <option [value]="part.id">{{ describePart(part) }}</option>
                    }
                  </optgroup>
                }
              }
            </select>
          </div>
        }

        <div class="cp-field">
          <label class="cp-label" for="description">Descrição</label>
          <input id="description" type="text" class="cp-input" formControlName="description"
                 [class.error]="form.controls.description.touched && form.controls.description.invalid" />
          @if (form.controls.description.touched && form.controls.description.invalid) {
            <span class="cp-error-msg">Descreva o item.</span>
          }
        </div>

        <div class="two-up">
          <div class="cp-field">
            <label class="cp-label" for="quantity">Quantidade</label>
            <input id="quantity" type="number" min="1" step="1" class="cp-input" formControlName="quantity"
                   [class.error]="form.controls.quantity.touched && form.controls.quantity.invalid" />
            @if (form.controls.quantity.touched && form.controls.quantity.invalid) {
              <span class="cp-error-msg">A quantidade tem que ser pelo menos 1.</span>
            }
          </div>

          <div class="cp-field">
            <label class="cp-label" for="unitPrice">Preço unitário (R$)</label>
            <input id="unitPrice" type="number" min="0" step="0.01" class="cp-input" formControlName="unitPrice"
                   [class.error]="form.controls.unitPrice.touched && form.controls.unitPrice.invalid" />
            @if (form.controls.unitPrice.touched && form.controls.unitPrice.invalid) {
              <span class="cp-error-msg">O preço não pode ser negativo.</span>
            }
          </div>
        </div>

        @if (stockWarning()) {
          <p class="stock-warning" role="status">
            <mat-icon aria-hidden="true">warning_amber</mat-icon>
            {{ stockWarning() }}
          </p>
        }

        <p class="line-total" role="status">
          Total do item: <strong>{{ lineTotal() }}</strong>
        </p>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button type="button" class="cp-btn cp-btn-ghost" (click)="close()">Cancelar</button>
      <button type="button" class="cp-btn cp-btn-primary" [disabled]="form.invalid" (click)="confirm()">
        {{ isEdit ? 'Salvar' : 'Adicionar' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    :host {
      display: block;
    }

    .cp-field + .cp-field,
    .cp-field + .two-up,
    .two-up + .cp-field {
      margin-top: 16px;
    }

        /* A regra de espaçamento entre campos empilhados não vale dentro da grade
       de duas colunas: lá os campos são irmãos lado a lado, e o margin-top
       empurrava o segundo para baixo, desalinhando os dois rótulos. */
    .two-up .cp-field + .cp-field {
      margin-top: 0;
    }

    .two-up {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .type-toggle {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .type-option {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px;
      border: 1px solid var(--cp-border);
      border-radius: var(--cp-radius-sm);
      background: var(--cp-bg-input);
      color: var(--cp-text-secondary);
      font-size: 14px;
      cursor: pointer;
      transition: border-color var(--cp-transition), color var(--cp-transition);
    }
    .type-option.selected {
      border-color: var(--cp-primary);
      color: var(--cp-primary-fg);
      font-weight: 600;
    }
    .type-option:focus-visible {
      outline: 2px solid var(--cp-border-focus);
      outline-offset: 2px;
    }
    .type-option mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .stock-warning {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 16px;
      padding: 10px 12px;
      border-radius: var(--cp-radius-sm);
      background: var(--cp-warning-bg);
      color: var(--cp-warning-fg);
      font-size: 13px;
    }
    .stock-warning mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .line-total {
      margin-top: 16px;
      text-align: right;
      font-size: 14px;
      color: var(--cp-text-secondary);
      font-variant-numeric: tabular-nums;
    }
    .line-total strong {
      color: var(--cp-text);
      font-size: 16px;
    }

    @media (max-width: 480px) {
      .two-up {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class WorkOrderItemDialog {
  private readonly data = inject<WorkOrderItemDialogData>(MAT_DIALOG_DATA, { optional: true });
  private readonly dialogRef = inject(MatDialogRef<WorkOrderItemDialog>);
  private readonly fb = inject(FormBuilder);
  private readonly serviceApi = inject(ServiceCatalogApi);
  private readonly partApi = inject(PartApi);

  protected readonly isEdit = !!this.data?.item;

  protected readonly services = signal<ServiceCatalogResponse[]>([]);
  protected readonly parts = signal<PartResponse[]>([]);
  protected readonly type = signal<ItemType>(this.data?.item?.type ?? 'SERVICE');

  /**
   * Peças agrupadas pelo tipo, na ordem em que a pessoa pensa.
   *
   * As sem tipo vão para o fim, num grupo próprio: elas continuam alcançáveis,
   * mas não podem competir com as classificadas no topo da lista.
   */
  protected readonly partsByType = computed(() => {
    const grupos = new Map<string, PartResponse[]>();

    for (const part of this.parts()) {
      const tipo = part.partTypeName ?? SEM_TIPO;
      const atual = grupos.get(tipo);
      if (atual) {
        atual.push(part);
      } else {
        grupos.set(tipo, [part]);
      }
    }

    return [...grupos.entries()]
      .map(([tipo, pecas]) => ({ tipo, pecas }))
      .sort((a, b) => {
        if (a.tipo === SEM_TIPO) return 1;
        if (b.tipo === SEM_TIPO) return -1;
        return a.tipo.localeCompare(b.tipo, 'pt-BR');
      });
  });

  /** "Mobil · Óleo 5W30 — saldo 12". A marca vem primeiro dentro do tipo. */
  protected describePart(part: PartResponse): string {
    const marca = part.manufacturer ? `${part.manufacturer} · ` : '';
    return `${marca}${part.name} — saldo ${part.stockQuantity}`;
  }

  private readonly selectedPart = signal<PartResponse | null>(null);
  private catalogId: string | null = this.data?.item?.serviceCatalogId ?? null;
  private partId: string | null = this.data?.item?.partId ?? null;

  protected readonly form = this.fb.nonNullable.group({
    description: [this.data?.item?.description ?? '', [Validators.required, Validators.maxLength(255)]],
    quantity: [this.data?.item?.quantity ?? 1, [Validators.required, Validators.min(1)]],
    unitPrice: [this.data?.item?.unitPrice ?? 0, [Validators.required, Validators.min(0)]],
  });

  private readonly quantity = signal(this.data?.item?.quantity ?? 1);
  private readonly unitPrice = signal(this.data?.item?.unitPrice ?? 0);

  protected readonly lineTotal = computed(() =>
    ((Number(this.quantity()) || 0) * (Number(this.unitPrice()) || 0)).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }),
  );

  /** Só avisa; quem recusa de fato é o backend, que conhece o saldo real. */
  protected readonly stockWarning = computed(() => {
    const part = this.selectedPart();
    if (!part) {
      return '';
    }
    const wanted = Number(this.quantity()) || 0;
    if (wanted > part.stockQuantity) {
      return `Estoque atual é ${part.stockQuantity}. Registre uma entrada antes de adicionar ${wanted}.`;
    }
    return '';
  });

  constructor() {
    this.form.controls.quantity.valueChanges.subscribe((v) => this.quantity.set(Number(v) || 0));
    this.form.controls.unitPrice.valueChanges.subscribe((v) => this.unitPrice.set(Number(v) || 0));

    if (!this.isEdit) {
      this.loadCatalog();
    }
  }

  private loadCatalog(): void {
    this.serviceApi.list({ active: true, size: 200, sort: 'name,asc' }).subscribe({
      next: (page) => this.services.set(page.content),
      error: () => this.services.set([]),
    });
    this.partApi.list({ active: true, size: 200, sort: 'name,asc' }).subscribe({
      next: (page) => this.parts.set(page.content),
      error: () => this.parts.set([]),
    });
  }

  protected setType(type: ItemType): void {
    this.type.set(type);
    // Trocar de tipo zera a escolha: um id de peça não vale como id de serviço.
    this.catalogId = null;
    this.partId = null;
    this.selectedPart.set(null);
    this.form.patchValue({ description: '', unitPrice: 0 });
  }

  protected onCatalogChange(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    this.catalogId = null;
    this.partId = null;
    this.selectedPart.set(null);

    if (!id) {
      return;
    }

    if (this.type() === 'SERVICE') {
      const service = this.services().find((s) => s.id === id);
      if (service) {
        this.catalogId = service.id;
        this.form.patchValue({ description: service.name, unitPrice: service.defaultPrice ?? 0 });
      }
      return;
    }

    const part = this.parts().find((p) => p.id === id);
    if (part) {
      this.partId = part.id;
      this.selectedPart.set(part);
      this.form.patchValue({ description: part.name, unitPrice: part.salePrice ?? 0 });
    }
  }

  protected close(): void {
    this.dialogRef.close(null);
  }

  protected confirm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const body: WorkOrderItemRequest = {
      type: this.type(),
      serviceCatalogId: this.catalogId,
      partId: this.partId,
      description: value.description.trim(),
      quantity: Number(value.quantity),
      unitPrice: Number(value.unitPrice),
    };
    this.dialogRef.close(body);
  }
}
