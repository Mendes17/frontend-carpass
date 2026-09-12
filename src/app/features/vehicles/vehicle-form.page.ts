import { Component, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';

import { VehicleApi } from '../../core/api/vehicle.api';
import { apiErrorMessage, apiFieldErrors } from '../../core/http/api-error.util';
import { FUEL_TYPE_LABELS, FuelType } from '../../core/models/enums.model';
import { SnackbarService } from '../../core/services/snackbar.service';
import { CustomerPickerComponent } from '../../shared/components/customer-picker/customer-picker.component';
import { FipePickerComponent, FipeSelection } from '../../shared/components/fipe-picker/fipe-picker.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';

/** Placa nos formatos antigo (ABC1234) e Mercosul (ABC1D23). */
const PLATE_PATTERN = /^[A-Za-z]{3}[0-9][0-9A-Ja-j][0-9]{2}$/;

@Component({
  selector: 'cp-vehicle-form-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatIconModule,
    PageHeaderComponent,
    SkeletonComponent,
    CustomerPickerComponent,
    FipePickerComponent,
  ],
  templateUrl: './vehicle-form.page.html',
  styleUrl: '../_shared/form-page.css',
})
export class VehicleFormPage {
  readonly id = input<string | undefined>();

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(VehicleApi);
  private readonly router = inject(Router);
  private readonly snackbar = inject(SnackbarService);

  protected readonly fuelTypes: { value: FuelType; label: string }[] = (
    Object.keys(FUEL_TYPE_LABELS) as FuelType[]
  ).map((value) => ({ value, label: FUEL_TYPE_LABELS[value] }));

  /** Um ano à frente porque montadora lança o modelo do ano seguinte. */
  protected readonly maxYear = new Date().getFullYear() + 1;

  protected readonly form = this.fb.nonNullable.group({
    customerId: ['', [Validators.required]],
    plate: ['', [Validators.required, Validators.pattern(PLATE_PATTERN)]],
    brand: ['', [Validators.required, Validators.maxLength(80)]],
    model: ['', [Validators.required, Validators.maxLength(120)]],
    manufactureYear: [null as number | null],
    modelYear: [null as number | null],
    mileage: [null as number | null, [Validators.min(0)]],
    fuelType: ['' as FuelType | ''],
    // Guardam de onde o cadastro veio. Vazios no caminho manual, e isso é um
    // estado legítimo — carro antigo ou importado raro não está na FIPE.
    vehicleKind: ['' as string],
    fipeCode: [''],
    color: [''],
    chassis: [''],
    renavam: [''],
    notes: [''],
  });

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly isEdit = computed(() => !!this.id());
  protected readonly title = computed(() => (this.isEdit() ? 'Editar veículo' : 'Novo veículo'));

  /**
   * Se a pessoa está escolhendo da FIPE ou digitando à mão.
   *
   * Cadastro novo abre na FIPE, que é o caminho que padroniza. A edição abre no
   * manual: o veículo já tem marca e modelo escritos, e obrigar a refazer a
   * escolha para corrigir a cor seria trabalho à toa.
   */
  protected readonly usandoFipe = signal(false);

  /** Resumo do que foi escolhido na FIPE, para a pessoa ver o que será salvo. */
  protected readonly escolhaFipe = signal<FipeSelection | null>(null);

  constructor() {
    queueMicrotask(() => {
      const id = this.id();
      if (id) {
        this.loadVehicle(id);
      } else {
        this.usandoFipe.set(true);
      }
    });
  }

  /**
   * Aplica a escolha da FIPE ao formulário.
   *
   * O modelo da FIPE já vem com a versão embutida — "ARGO DRIVE 1.3 8V Flex" é
   * um valor único, ela não separa os dois. O ano de fabricação não é tocado:
   * a FIPE informa o ano do modelo, e os dois costumam diferir.
   */
  protected aplicarFipe(escolha: FipeSelection): void {
    this.escolhaFipe.set(escolha);

    this.form.patchValue({
      brand: escolha.brand,
      model: escolha.model,
      modelYear: escolha.modelYear,
      vehicleKind: escolha.kind,
      fipeCode: escolha.fipeCode ?? '',
    });

    // Só preenche o combustível se a FIPE usou um termo que conhecemos; chutar
    // o mais parecido gravaria um dado errado com cara de certo.
    if (escolha.fuelType) {
      this.form.patchValue({ fuelType: escolha.fuelType as FuelType });
    }
  }

  /** Volta para a digitação manual, mantendo o que já foi preenchido. */
  protected digitarManualmente(): void {
    this.usandoFipe.set(false);
  }

  /** Refaz a escolha na FIPE. Limpa a origem para não sobrar código de outro carro. */
  protected escolherNaFipe(): void {
    this.escolhaFipe.set(null);
    this.form.patchValue({ vehicleKind: '', fipeCode: '' });
    this.usandoFipe.set(true);
  }

  private loadVehicle(id: string): void {
    this.loading.set(true);
    this.api.getById(id).subscribe({
      next: (vehicle) => {
        this.form.patchValue({
          customerId: vehicle.customerId,
          plate: vehicle.plate,
          brand: vehicle.brand,
          model: vehicle.model,
          manufactureYear: vehicle.manufactureYear,
          modelYear: vehicle.modelYear,
          mileage: vehicle.mileage,
          fuelType: vehicle.fuelType ?? '',
          vehicleKind: vehicle.vehicleKind ?? '',
          fipeCode: vehicle.fipeCode ?? '',
          color: vehicle.color ?? '',
          chassis: vehicle.chassis ?? '',
          renavam: vehicle.renavam ?? '',
          notes: vehicle.notes ?? '',
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
      customerId: value.customerId,
      // A placa é guardada em caixa alta e sem separador.
      plate: value.plate.replace(/[^A-Za-z0-9]/g, '').toUpperCase(),
      brand: value.brand.trim(),
      model: value.model.trim(),
      manufactureYear: value.manufactureYear,
      modelYear: value.modelYear,
      mileage: value.mileage,
      fuelType: value.fuelType || null,
      vehicleKind: value.vehicleKind || null,
      fipeCode: value.fipeCode || null,
      color: value.color || null,
      chassis: value.chassis || null,
      renavam: value.renavam || null,
      notes: value.notes || null,
    };

    const id = this.id();
    const request = id ? this.api.update(id, body) : this.api.create(body);

    request.subscribe({
      next: () => {
        this.snackbar.success(id ? 'Veículo atualizado.' : 'Veículo cadastrado.');
        void this.router.navigate(['/veiculos']);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        const fields = apiFieldErrors(error);
        this.errorMessage.set(fields.length ? fields[0].message : apiErrorMessage(error));
      },
    });
  }
}
