import { Component, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';

import { PartApi } from '../../core/api/part.api';
import { PartTypeApi } from '../../core/api/part-type.api';
import { apiErrorMessage, apiFieldErrors } from '../../core/http/api-error.util';
import { PartTypeResponse } from '../../core/models/part-type.model';
import { SnackbarService } from '../../core/services/snackbar.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';

/**
 * Cadastro e edição de peça.
 *
 * O saldo em estoque não é editável aqui de propósito. Alterar um número de
 * estoque direto no cadastro apagaria a razão da mudança; toda alteração passa
 * pela movimentação, que fica registrada. O campo de estoque inicial só existe
 * na criação, e vira a primeira entrada.
 */
@Component({
  selector: 'cp-part-form-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatIconModule, PageHeaderComponent, SkeletonComponent],
  templateUrl: './part-form.page.html',
  styleUrl: '../_shared/form-page.css',
})
export class PartFormPage {
  /** Vem da rota `/pecas/:id`. Ausente significa novo cadastro. */
  readonly id = input<string | undefined>();

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(PartApi);
  private readonly partTypeApi = inject(PartTypeApi);
  private readonly router = inject(Router);
  private readonly snackbar = inject(SnackbarService);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    code: [''],
    manufacturer: [''],
    partTypeId: [null as string | null],
    costPrice: [null as number | null, [Validators.min(0)]],
    salePrice: [null as number | null, [Validators.min(0)]],
    minimumStock: [0, [Validators.required, Validators.min(0)]],
    initialStock: [0, [Validators.min(0)]],
  });

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly currentStock = signal(0);

  /**
   * Tipos ativos, para o seletor.
   *
   * Um tipo desativado continua valendo na peça que já o usa, mas não é
   * oferecido para novas — senão o cadastro voltaria a crescer com opções que a
   * oficina já decidiu abandonar.
   */
  protected readonly types = signal<PartTypeResponse[]>([]);

  protected readonly isEdit = computed(() => !!this.id());
  protected readonly title = computed(() => (this.isEdit() ? 'Editar peça' : 'Nova peça'));

  constructor() {
    this.partTypeApi.listActive().subscribe({
      next: (list) => this.types.set(list),
      // Sem os tipos o cadastro segue funcionando: o campo é opcional, e travar
      // o formulário inteiro por causa dele seria trocar um problema pequeno por
      // um grande.
      error: () => this.types.set([]),
    });

    queueMicrotask(() => {
      const id = this.id();
      if (id) {
        this.loadPart(id);
      }
    });
  }

  private loadPart(id: string): void {
    this.loading.set(true);
    this.api.getById(id).subscribe({
      next: (part) => {
        this.form.patchValue({
          name: part.name,
          code: part.code ?? '',
          manufacturer: part.manufacturer ?? '',
          partTypeId: part.partTypeId,
          costPrice: part.costPrice,
          salePrice: part.salePrice,
          minimumStock: part.minimumStock,
        });
        this.currentStock.set(part.stockQuantity);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(apiErrorMessage(error));
      },
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');

    const value = this.form.getRawValue();
    const id = this.id();
    const body = {
      name: value.name.trim(),
      code: value.code.trim() || null,
      manufacturer: value.manufacturer.trim() || null,
      partTypeId: value.partTypeId || null,
      costPrice: toNumberOrNull(value.costPrice),
      salePrice: toNumberOrNull(value.salePrice),
      minimumStock: Number(value.minimumStock) || 0,
      // Na edição o saldo é intocado: quem muda estoque é a movimentação.
      initialStock: id ? null : Number(value.initialStock) || 0,
    };

    const request = id ? this.api.update(id, body) : this.api.create(body);

    request.subscribe({
      next: () => {
        this.snackbar.success(id ? 'Peça atualizada.' : 'Peça cadastrada.');
        void this.router.navigate(['/pecas']);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        const fields = apiFieldErrors(error);
        this.errorMessage.set(fields.length ? fields[0].message : apiErrorMessage(error));
      },
    });
  }
}

/** Campo numérico vazio chega como string vazia, e `Number('')` é zero. */
function toNumberOrNull(value: number | null): number | null {
  if (value === null || value === undefined || (value as unknown) === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
