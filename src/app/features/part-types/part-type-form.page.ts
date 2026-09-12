import { Component, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';

import { PartTypeApi } from '../../core/api/part-type.api';
import { apiErrorMessage, apiFieldErrors } from '../../core/http/api-error.util';
import { SnackbarService } from '../../core/services/snackbar.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';

/**
 * Cadastro e edição de tipo de peça.
 *
 * O tipo descreve o que a peça é, nunca quem a fabrica — "Óleo de motor", não
 * "Óleo Mobil". Misturar os dois desfaz exatamente o que o tipo veio resolver:
 * com a marca no nome do tipo, cada marca vira um tipo e a lista de marcas de um
 * mesmo item deixa de existir.
 */
@Component({
  selector: 'cp-part-type-form-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatIconModule, PageHeaderComponent, SkeletonComponent],
  templateUrl: './part-type-form.page.html',
  styleUrl: '../_shared/form-page.css',
})
export class PartTypeFormPage {
  /** Vem da rota `/tipos-de-peca/:id`. Ausente significa novo cadastro. */
  readonly id = input<string | undefined>();

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(PartTypeApi);
  private readonly router = inject(Router);
  private readonly snackbar = inject(SnackbarService);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    description: [''],
  });

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly isEdit = computed(() => !!this.id());
  protected readonly title = computed(() => (this.isEdit() ? 'Editar tipo de peça' : 'Novo tipo de peça'));

  constructor() {
    queueMicrotask(() => {
      const id = this.id();
      if (id) {
        this.loadType(id);
      }
    });
  }

  private loadType(id: string): void {
    this.loading.set(true);
    this.api.getById(id).subscribe({
      next: (type) => {
        this.form.patchValue({ name: type.name, description: type.description ?? '' });
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
    };

    const id = this.id();
    const request = id ? this.api.update(id, body) : this.api.create(body);

    request.subscribe({
      next: () => {
        this.snackbar.success(id ? 'Tipo atualizado.' : 'Tipo cadastrado.');
        void this.router.navigate(['/tipos-de-peca']);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        const fields = apiFieldErrors(error);
        this.errorMessage.set(fields.length ? fields[0].message : apiErrorMessage(error));
      },
    });
  }
}
