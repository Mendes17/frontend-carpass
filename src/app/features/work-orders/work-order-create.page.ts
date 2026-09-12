import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';

import { EmployeeApi } from '../../core/api/employee.api';
import { WorkOrderApi } from '../../core/api/work-order.api';
import { apiErrorMessage, apiFieldErrors } from '../../core/http/api-error.util';
import { EmployeeResponse } from '../../core/models/employee.model';
import { SnackbarService } from '../../core/services/snackbar.service';
import { CustomerPickerComponent } from '../../shared/components/customer-picker/customer-picker.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { VehiclePickerComponent } from '../../shared/components/vehicle-picker/vehicle-picker.component';

/**
 * Abertura de ordem de serviço.
 *
 * A ordem nasce enxuta: veículo, quem vai atender e o que o cliente reclamou.
 * Serviços e peças entram depois, na própria ordem, porque no balcão raramente
 * se sabe o que será feito antes de olhar o carro.
 */
@Component({
  selector: 'cp-work-order-create-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatIconModule,
    PageHeaderComponent,
    CustomerPickerComponent,
    VehiclePickerComponent,
  ],
  templateUrl: './work-order-create.page.html',
  styleUrl: '../_shared/form-page.css',
})
export class WorkOrderCreatePage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(WorkOrderApi);
  private readonly employeeApi = inject(EmployeeApi);
  private readonly router = inject(Router);
  private readonly snackbar = inject(SnackbarService);

  protected readonly mechanics = signal<EmployeeResponse[]>([]);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');

  /**
   * O cliente não vai para o backend — a ordem se liga ao veículo, e o veículo
   * já sabe de quem é. Ele existe aqui só para estreitar a busca de carro.
   */
  protected readonly customerId = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    customerId: [null as string | null],
    vehicleId: [null as string | null, [Validators.required]],
    assignedMechanicId: [null as string | null],
    reportedProblem: ['', [Validators.maxLength(2000)]],
    mileage: [null as number | null, [Validators.min(0)]],
    estimatedDeliveryDate: [''],
  });

  constructor() {
    this.employeeApi.mechanics().subscribe({
      next: (list) => this.mechanics.set(list),
      error: () => this.mechanics.set([]),
    });

    this.form.controls.customerId.valueChanges.subscribe((value) => {
      this.customerId.set(value);
      // Trocar de cliente invalida o carro escolhido: senão a ordem sairia com
      // o veículo de outra pessoa.
      this.form.controls.vehicleId.setValue(null);
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
    this.api
      .create({
        vehicleId: value.vehicleId!,
        assignedMechanicId: value.assignedMechanicId || null,
        reportedProblem: value.reportedProblem.trim() || null,
        mileage: value.mileage === null || (value.mileage as unknown) === '' ? null : Number(value.mileage),
        estimatedDeliveryDate: value.estimatedDeliveryDate || null,
      })
      .subscribe({
        next: (order) => {
          this.snackbar.success(`Ordem de serviço #${order.number} aberta.`);
          void this.router.navigate(['/ordens', order.id]);
        },
        error: (error: unknown) => {
          this.saving.set(false);
          const fields = apiFieldErrors(error);
          this.errorMessage.set(fields.length ? fields[0].message : apiErrorMessage(error));
        },
      });
  }
}
