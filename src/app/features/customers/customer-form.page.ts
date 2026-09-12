import { Component, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';

import { CustomerApi } from '../../core/api/customer.api';
import { apiErrorMessage, apiFieldErrors } from '../../core/http/api-error.util';
import { CUSTOMER_TYPE_LABELS, CustomerType } from '../../core/models/enums.model';
import { SnackbarService } from '../../core/services/snackbar.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { CepFieldComponent } from '../../shared/components/cep-field/cep-field.component';

/**
 * Cadastro e edição de cliente.
 *
 * A mesma tela serve para os dois casos: `id` chega pela rota e decide se estamos
 * criando ou editando.
 */
@Component({
  selector: 'cp-customer-form-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatIconModule, PageHeaderComponent, SkeletonComponent, CepFieldComponent],
  templateUrl: './customer-form.page.html',
  styleUrl: '../_shared/form-page.css',
})
export class CustomerFormPage {
  /** Vem da rota `/clientes/:id`. Ausente significa novo cadastro. */
  readonly id = input<string | undefined>();

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(CustomerApi);
  private readonly router = inject(Router);
  private readonly snackbar = inject(SnackbarService);

  protected readonly types: { value: CustomerType; label: string }[] = [
    { value: 'INDIVIDUAL', label: CUSTOMER_TYPE_LABELS.INDIVIDUAL },
    { value: 'COMPANY', label: CUSTOMER_TYPE_LABELS.COMPANY },
  ];

  protected readonly form = this.fb.nonNullable.group({
    type: ['INDIVIDUAL' as CustomerType, [Validators.required]],
    name: ['', [Validators.required, Validators.maxLength(180)]],
    document: [''],
    phone: [''],
    email: ['', [Validators.email]],
    zipCode: [''],
    street: [''],
    number: [''],
    complement: [''],
    neighborhood: [''],
    city: [''],
    state: [''],
    notes: [''],
  });

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly isEdit = computed(() => !!this.id());
  protected readonly title = computed(() => (this.isEdit() ? 'Editar cliente' : 'Novo cliente'));

  /** Rótulo e ajuda mudam conforme pessoa física ou jurídica. */
  protected readonly documentLabel = computed(() =>
    this.form.controls.type.value === 'COMPANY' ? 'CNPJ' : 'CPF',
  );

  constructor() {
    // O input de rota chega depois da construção; carregamos quando ele aparece.
    queueMicrotask(() => {
      const id = this.id();
      if (id) {
        this.loadCustomer(id);
      }
    });
  }

  private loadCustomer(id: string): void {
    this.loading.set(true);
    this.api.getById(id).subscribe({
      next: (customer) => {
        this.form.patchValue({
          type: customer.type,
          name: customer.name,
          document: customer.document ?? '',
          phone: customer.phone ?? '',
          email: customer.email ?? '',
          zipCode: customer.address?.zipCode ?? '',
          street: customer.address?.street ?? '',
          number: customer.address?.number ?? '',
          complement: customer.address?.complement ?? '',
          neighborhood: customer.address?.neighborhood ?? '',
          city: customer.address?.city ?? '',
          state: customer.address?.state ?? '',
          notes: customer.notes ?? '',
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
      type: value.type,
      name: value.name.trim(),
      // O backend guarda documento e CEP só com dígitos.
      document: value.document.replace(/\D/g, '') || null,
      phone: value.phone || null,
      email: value.email.trim().toLowerCase() || null,
      notes: value.notes || null,
      address: {
        zipCode: value.zipCode.replace(/\D/g, '') || null,
        street: value.street || null,
        number: value.number || null,
        complement: value.complement || null,
        neighborhood: value.neighborhood || null,
        city: value.city || null,
        state: value.state ? value.state.toUpperCase() : null,
      },
    };

    const id = this.id();
    const request = id ? this.api.update(id, body) : this.api.create(body);

    request.subscribe({
      next: () => {
        this.snackbar.success(id ? 'Cliente atualizado.' : 'Cliente cadastrado.');
        void this.router.navigate(['/clientes']);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        // O 422 traz erro campo a campo; mostramos no primeiro deles.
        const fields = apiFieldErrors(error);
        this.errorMessage.set(fields.length ? fields[0].message : apiErrorMessage(error));
      },
    });
  }
}
