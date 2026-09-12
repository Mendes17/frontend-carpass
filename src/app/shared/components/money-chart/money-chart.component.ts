import { CurrencyPipe } from '@angular/common';
import { Component, computed, input, signal } from '@angular/core';

/** Um ponto do eixo: um mês, com um valor por série. */
export interface MoneyChartPoint {
  label: string;
  /** Um valor por série, na mesma ordem de `series`. */
  values: number[];
}

/** Uma série do gráfico. */
export interface MoneyChartSeries {
  name: string;
  /** Nome do custom property CSS que pinta a barra. */
  colorVar: string;
  /**
   * Quando verdadeiro, o sinal manda na cor: positivo em verde, negativo em
   * vermelho. Só faz sentido para resultado (lucro/prejuízo), onde o sinal é
   * de fato um estado, e nunca com mais de uma série.
   */
  signColored?: boolean;
}

/**
 * Barras verticais de valores em reais, por período.
 *
 * <h2>Decisões que valem registro</h2>
 *
 * <ul>
 *   <li><b>Um eixo só.</b> As duas séries são reais, então dividem a mesma
 *       escala. Dois eixos y fariam qualquer par de barras parecer comparável
 *       quando não é — é o erro clássico de gráfico financeiro.</li>
 *   <li><b>Mês vazio aparece vazio.</b> O backend manda os doze meses, inclusive
 *       os zerados. Pular abril faria março e maio virarem vizinhos e mentiria
 *       sobre o ritmo da oficina.</li>
 *   <li><b>Nenhum número em cima de cada barra.</b> Doze meses × duas séries são
 *       24 números competindo entre si. O valor aparece ao passar o mouse ou
 *       focar pelo teclado, e a tabela invisível traz todos.</li>
 *   <li><b>Cor não carrega sozinha a identidade.</b> Sempre há legenda com o
 *       nome da série, e a tabela para leitor de tela repete tudo em texto.</li>
 *   <li><b>O par de cores foi validado</b>, não escolhido no olho — ver o
 *       comentário de `--cp-chart-gross` no tema.</li>
 * </ul>
 */
@Component({
  selector: 'cp-money-chart',
  standalone: true,
  imports: [CurrencyPipe],
  templateUrl: './money-chart.component.html',
  styleUrl: './money-chart.component.css',
})
export class MoneyChartComponent {
  readonly points = input.required<MoneyChartPoint[]>();
  readonly series = input.required<MoneyChartSeries[]>();
  /** Descrição para leitor de tela e legenda da tabela invisível. */
  readonly caption = input('Valores por mês');

  /** Índice da coluna sob o cursor ou com foco; null quando nenhuma. */
  protected readonly hovered = signal<number | null>(null);

  /**
   * Escala comum a todas as barras.
   *
   * Usa o maior valor absoluto para que o gráfico de resultado, que desce
   * abaixo do zero, mantenha a mesma proporção acima e abaixo da linha.
   */
  protected readonly max = computed(() => {
    const todos = this.points().flatMap((p) => p.values.map((v) => Math.abs(v ?? 0)));
    return Math.max(1, ...todos);
  });

  /** Se alguma série pode ficar negativa — decide se há linha do zero no meio. */
  protected readonly hasNegative = computed(() =>
    this.points().some((p) => p.values.some((v) => (v ?? 0) < 0)),
  );

  protected readonly isEmpty = computed(() =>
    this.points().every((p) => p.values.every((v) => (v ?? 0) === 0)),
  );

  /**
   * Altura da barra, em porcentagem do espaço disponível.
   *
   * No modo divergente cada metade vale 50% da área, então a proporção é
   * dividida por dois — sem isso, o maior valor ocuparia a área inteira e
   * atravessaria a linha do zero para o outro lado.
   */
  protected heightOf(value: number): number {
    const bruto = Math.abs(value ?? 0);
    if (bruto === 0) {
      return 0;
    }

    // Piso de 2% para um valor pequeno mas real não desaparecer — barra
    // invisível é indistinguível de mês sem movimento.
    const proporcao = Math.max(2, (bruto / this.max()) * 100);
    return this.hasNegative() ? proporcao / 2 : proporcao;
  }

  protected colorOf(serie: MoneyChartSeries, value: number): string {
    if (!serie.signColored) {
      return `var(${serie.colorVar})`;
    }
    return (value ?? 0) < 0 ? 'var(--cp-danger)' : 'var(--cp-success)';
  }

  protected isNegative(value: number): boolean {
    return (value ?? 0) < 0;
  }
}
