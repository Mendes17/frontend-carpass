import { Component, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';

import { ServiceCatalogApi } from '../../core/api/service-catalog.api';
import { apiErrorMessage, apiFieldErrors } from '../../core/http/api-error.util';
import { SnackbarService } from '../../core/services/snackbar.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';

/**
 * Cadastro e edição de serviço do catálogo.
 *
 * Preço e tempo aqui são o padrão sugerido, não um valor fixo: cada ordem de
 * serviço pode ajustar o que foi realmente cobrado sem alterar o catálogo.
 */
@Component({
  selector: 'cp-service-form-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatIconModule, PageHeaderComponent, SkeletonComponent],
  templateUrl: './service-form.page.html',
  styleUrl: '../_shared/form-page.css',
})
export class ServiceFormPage {
  /** Vem da rota `/servicos/:id`. Ausente significa novo cadastro. */
  readonly id = input<string | undefined>();

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ServiceCatalogApi);
  private readonly router = inject(Router);
  private readonly snackbar = inject(SnackbarService);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    description: [''],
    defaultPrice: [null as number | null, [Validators.min(0)]],
    estimatedMinutes: [null as number | null, [Validators.min(0), Validators.max(10080)]],
  });

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly isEdit = computed(() => !!this.id());
  protected readonly title = computed(() => (this.isEdit() ? 'Editar serviço' : 'Novo serviço'));

  constructor() {
    queueMicrotask(() => {
      const id = this.id();
      if (id) {
        this.loadService(id);
      }
    });
  }

  private loadService(id: string): void {
    this.loading.set(true);
    this.api.getById(id).subscribe({
      next: (service) => {
        this.form.patchValue({
          name: service.name,
          description: service.description ?? '',
          defaultPrice: service.defaultPrice,
          estimatedMinutes: service.estimatedMinutes,
        });
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
    const body = {
      name: value.name.trim(),
      description: value.description.trim() || null,
      // Campo numérico vazio chega como string vazia; normalizamos para null.
      defaultPrice: toNumberOrNull(value.defaultPrice),
      estimatedMinutes: toNumberOrNull(value.estimatedMinutes),
    };

    const id = this.id();
    const request = id ? this.api.update(id, body) : this.api.create(body);

    request.subscribe({
      next: () => {
        this.snackbar.success(id ? 'Serviço atualizado.' : 'Serviço cadastrado.');
        void this.router.navigate(['/servicos']);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        const fields = apiFieldErrors(error);
        this.errorMessage.set(fields.length ? fields[0].message : apiErrorMessage(error));
      },
    });
  }
}

/**
 * Um `<input type="number">` vazio entrega string vazia, e `Number('')` é zero.
 * Sem esta conversão, deixar o preço em branco gravaria R$ 0,00.
 */
function toNumberOrNull(value: number | null): number | null {
  if (value === null || value === undefined || (value as unknown) === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
