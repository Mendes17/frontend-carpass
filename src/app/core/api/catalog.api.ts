import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { toHttpParams } from './http-params.util';

/** Endereço encontrado a partir do CEP. Número e complemento continuam digitados. */
export interface AddressLookupResponse {
  zipCode: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
}

/** Carro, moto ou caminhão — a divisão que a tabela FIPE usa. */
export type VehicleKind = 'CAR' | 'MOTORCYCLE' | 'TRUCK';

/** Uma opção da FIPE: marca, modelo ou ano. Os três níveis têm a mesma forma. */
export interface CatalogOption {
  code: string;
  label: string;
}

export interface VehicleCatalogDetail {
  fipeCode: string;
  brand: string;
  /** Vem com a versão embutida: a FIPE não separa modelo de versão. */
  model: string;
  modelYear: number | null;
  fuelType: string | null;
  fuelLabel: string | null;
}

/**
 * Consultas de apoio ao preenchimento: CEP e tabela FIPE.
 *
 * As duas passam pelo nosso backend, e não direto para o serviço externo. Lá
 * existe cache — os clientes de uma oficina moram em um punhado de bairros, e
 * repetir a mesma pergunta a um serviço público e gratuito seria abuso — e a
 * troca para a fonte reserva quando a principal falha.
 */
@Injectable({ providedIn: 'root' })
export class CatalogApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/catalog`;

  address(zipCode: string): Observable<AddressLookupResponse> {
    return this.http.get<AddressLookupResponse>(`${this.url}/address/${zipCode}`);
  }

  brands(kind: VehicleKind): Observable<CatalogOption[]> {
    return this.http.get<CatalogOption[]>(`${this.url}/vehicles/${kind}/brands`);
  }

  models(kind: VehicleKind, brandCode: string): Observable<CatalogOption[]> {
    return this.http.get<CatalogOption[]>(`${this.url}/vehicles/${kind}/models`, {
      params: toHttpParams({ brandCode }),
    });
  }

  years(kind: VehicleKind, brandCode: string, modelCode: string): Observable<CatalogOption[]> {
    return this.http.get<CatalogOption[]>(`${this.url}/vehicles/${kind}/years`, {
      params: toHttpParams({ brandCode, modelCode }),
    });
  }

  detail(
    kind: VehicleKind,
    brandCode: string,
    modelCode: string,
    yearCode: string,
  ): Observable<VehicleCatalogDetail> {
    return this.http.get<VehicleCatalogDetail>(`${this.url}/vehicles/${kind}/detail`, {
      params: toHttpParams({ brandCode, modelCode, yearCode }),
    });
  }
}
