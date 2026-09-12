import { Component, inject, output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Observable } from 'rxjs';

import {
  CatalogApi,
  CatalogOption,
  VehicleCatalogDetail,
  VehicleKind,
} from '../../../core/api/catalog.api';
import { apiErrorMessage } from '../../../core/http/api-error.util';

/** O que o seletor entrega quando a escolha se completa. */
export interface FipeSelection extends VehicleCatalogDetail {
  kind: VehicleKind;
}

/**
 * Escolha de veículo pela tabela FIPE, em cascata.
 *
 * <h2>Por que uma cascata e não uma busca</h2>
 *
 * A FIPE só responde nessa ordem: marca, depois modelo, depois ano — não existe
 * endpoint de busca livre. Fingir uma caixa de busca exigiria baixar a lista
 * inteira de todas as marcas para filtrar no navegador, o que é muito dado para
 * uma pergunta pequena.
 *
 * <h2>O tipo vem primeiro</h2>
 *
 * A FIPE são três tabelas separadas: carro, moto e caminhão não dividem a mesma
 * lista de marcas. Sem essa pergunta, a lista de marcas não existe.
 *
 * <h2>Quando a FIPE não responde</h2>
 *
 * O erro aparece dentro do próprio seletor e o formulário continua utilizável
 * pelo caminho manual. Serviço de terceiro fora do ar não pode impedir o
 * cadastro de um carro.
 */
@Component({
  selector: 'cp-fipe-picker',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './fipe-picker.component.html',
  styleUrl: './fipe-picker.component.css',
})
export class FipePickerComponent {
  /** Emitido quando marca, modelo e ano estão escolhidos. */
  readonly selected = output<FipeSelection>();

  private readonly api = inject(CatalogApi);

  protected readonly kinds: { value: VehicleKind; label: string }[] = [
    { value: 'CAR', label: 'Carro' },
    { value: 'MOTORCYCLE', label: 'Moto' },
    { value: 'TRUCK', label: 'Caminhão' },
  ];

  protected readonly kind = signal<VehicleKind>('CAR');
  protected readonly brands = signal<CatalogOption[]>([]);
  protected readonly models = signal<CatalogOption[]>([]);
  protected readonly years = signal<CatalogOption[]>([]);

  protected readonly brandCode = signal('');
  protected readonly modelCode = signal('');
  protected readonly yearCode = signal('');

  protected readonly loading = signal<'brands' | 'models' | 'years' | 'detail' | null>(null);
  protected readonly errorMessage = signal('');

  constructor() {
    this.loadBrands();
  }

  protected onKindChange(event: Event): void {
    this.kind.set((event.target as HTMLSelectElement).value as VehicleKind);
    // Trocar de tabela invalida tudo abaixo: marca de carro não existe na
    // tabela de motos, e manter a escolha anterior pediria um modelo que a
    // nova lista não tem.
    this.resetFrom('brand');
    this.loadBrands();
  }

  protected onBrandChange(event: Event): void {
    this.brandCode.set((event.target as HTMLSelectElement).value);
    this.resetFrom('model');
    if (this.brandCode()) {
      this.loadModels();
    }
  }

  protected onModelChange(event: Event): void {
    this.modelCode.set((event.target as HTMLSelectElement).value);
    this.resetFrom('year');
    if (this.modelCode()) {
      this.loadYears();
    }
  }

  protected onYearChange(event: Event): void {
    this.yearCode.set((event.target as HTMLSelectElement).value);
    if (this.yearCode()) {
      this.loadDetail();
    }
  }

  // ------------------------------------------------------------- carga
  private loadBrands(): void {
    this.comLoading('brands', this.api.brands(this.kind()), (lista) => this.brands.set(lista));
  }

  private loadModels(): void {
    this.comLoading('models', this.api.models(this.kind(), this.brandCode()), (lista) =>
      this.models.set(lista),
    );
  }

  private loadYears(): void {
    this.comLoading('years', this.api.years(this.kind(), this.brandCode(), this.modelCode()), (lista) =>
      this.years.set(lista),
    );
  }

  private loadDetail(): void {
    this.loading.set('detail');
    this.errorMessage.set('');

    this.api.detail(this.kind(), this.brandCode(), this.modelCode(), this.yearCode()).subscribe({
      next: (detalhe) => {
        this.loading.set(null);
        this.selected.emit({ ...detalhe, kind: this.kind() });
      },
      error: (erro: unknown) => {
        this.loading.set(null);
        this.errorMessage.set(apiErrorMessage(erro));
      },
    });
  }

  /** Carrega um nível da cascata cuidando de "carregando" e de erro num lugar só. */
  private comLoading(
    etapa: 'brands' | 'models' | 'years',
    fonte: Observable<CatalogOption[]>,
    aplicar: (valor: CatalogOption[]) => void,
  ): void {
    this.loading.set(etapa);
    this.errorMessage.set('');

    fonte.subscribe({
      next: (valor) => {
        aplicar(valor);
        this.loading.set(null);
      },
      error: (erro: unknown) => {
        this.loading.set(null);
        this.errorMessage.set(apiErrorMessage(erro));
      },
    });
  }

  /** Limpa a escolha daquele nível para baixo. */
  private resetFrom(nivel: 'brand' | 'model' | 'year'): void {
    if (nivel === 'brand') {
      this.brands.set([]);
      this.brandCode.set('');
    }
    if (nivel === 'brand' || nivel === 'model') {
      this.models.set([]);
      this.modelCode.set('');
    }
    this.years.set([]);
    this.yearCode.set('');
  }
}
