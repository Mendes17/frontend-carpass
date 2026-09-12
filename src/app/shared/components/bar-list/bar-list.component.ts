import { Component, computed, input } from '@angular/core';

/** Uma linha do gráfico: rótulo, valor e se ela é ativa ou apenas contexto. */
export interface BarListItem {
  label: string;
  value: number;
  /** Linhas em contexto ficam em cinza; as ativas ficam na cor de destaque. */
  muted?: boolean;
}

/**
 * Barras horizontais para comparar magnitude entre categorias nomeadas.
 *
 * <p>
 * Decisões que valem registro:
 * </p>
 * <ul>
 *   <li><b>Uma cor só.</b> É uma série única — o comprimento da barra já mostra a
 *       quantidade e a ordem das linhas já mostra a sequência do fluxo. Pintar
 *       cada linha de uma cor gastaria o canal de identidade para reencodar o que
 *       o tamanho da barra mostra, e nenhuma paleta sobrevive a dez cores
 *       distinguíveis sob daltonismo.</li>
 *   <li><b>Destaque em vez de arco-íris.</b> O que ainda está na oficina fica na
 *       cor principal; o que já saiu fica em cinza. É a leitura que o dono precisa
 *       em um segundo.</li>
 *   <li><b>Tabela de verdade.</b> A marcação é uma tabela: o valor está sempre em
 *       texto, então leitor de tela, impressão e alto contraste funcionam sem a
 *       cor.</li>
 * </ul>
 */
@Component({
  selector: 'cp-bar-list',
  standalone: true,
  template: `
    <table class="bars">
      <caption class="cp-visually-hidden">{{ caption() }}</caption>
      <thead class="cp-visually-hidden">
        <tr>
          <th scope="col">Categoria</th>
          <th scope="col">Quantidade</th>
        </tr>
      </thead>
      <tbody>
        @for (item of items(); track item.label) {
          <tr>
            <th scope="row" class="bar-label" [title]="item.label">{{ item.label }}</th>
            <td class="bar-cell">
              <span class="bar-track" aria-hidden="true">
                <span
                  class="bar-fill"
                  [class.muted]="item.muted"
                  [style.width.%]="widthOf(item.value)"
                ></span>
              </span>
              <span class="bar-value">{{ item.value }}</span>
            </td>
          </tr>
        }
      </tbody>
    </table>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .bars {
        width: 100%;
        border-collapse: collapse;
      }
      .bars tr + tr > * {
        padding-top: 8px;
      }
      .bar-label {
        font-size: 13px;
        font-weight: 400;
        color: var(--cp-text-secondary);
        text-align: left;
        padding-right: 12px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 190px;
      }
      .bar-cell {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
      }
      .bar-track {
        flex: 1;
        min-width: 40px;
        height: 8px;
        border-radius: 4px;
        background: var(--cp-bg-hover);
        overflow: hidden;
      }
      .bar-fill {
        display: block;
        height: 100%;
        /* Ponta arredondada só do lado do dado; a base fica ancorada no zero. */
        border-radius: 0 4px 4px 0;
        background: var(--cp-primary);
        transition: width var(--cp-transition);
      }
      .bar-fill.muted {
        background: var(--cp-text-muted);
      }
      .bar-value {
        min-width: 2.5ch;
        text-align: right;
        font-size: 13px;
        font-variant-numeric: tabular-nums;
        color: var(--cp-text);
      }

      @media (max-width: 480px) {
        .bar-label {
          max-width: 120px;
        }
      }
    `,
  ],
})
export class BarListComponent {
  readonly items = input.required<BarListItem[]>();
  /** Descrição para leitor de tela; a tabela é invisível mas navegável. */
  readonly caption = input('Distribuição por categoria');

  /** Escala comum a todas as barras, para o comprimento ser comparável. */
  private readonly max = computed(() => Math.max(1, ...this.items().map((item) => item.value)));

  protected widthOf(value: number): number {
    return value === 0 ? 0 : Math.max(2, (value / this.max()) * 100);
  }
}
