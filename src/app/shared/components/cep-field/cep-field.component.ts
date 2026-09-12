import { Component, inject, input, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

import { CatalogApi } from '../../../core/api/catalog.api';

/**
 * Campo de CEP que preenche o resto do endereço.
 *
 * <h2>Quando ele busca</h2>
 *
 * Ao completar oito dígitos, sem esperar o `blur`. Quem digita CEP digita os
 * oito de uma vez, e fazer a pessoa sair do campo para ver o resultado
 * transforma um automatismo em mais um passo.
 *
 * <h2>O que ele não sobrescreve</h2>
 *
 * Número e complemento, que o CEP não sabe — ele identifica a rua, nunca a
 * casa. Depois de preencher, o foco vai para o número, que é exatamente o que
 * falta digitar.
 *
 * <h2>Quando a busca falha</h2>
 *
 * Aparece um aviso discreto e os campos ficam livres para digitação. Um serviço
 * externo fora do ar não pode impedir o cadastro de um cliente — antes desta
 * tela existir, tudo era digitado, e continua sendo possível.
 *
 * <h2>Por que ele recebe o formulário inteiro</h2>
 *
 * As duas telas que têm endereço usam os mesmos nomes de controle
 * (`zipCode`, `street`, `neighborhood`, `city`, `state`). Passar o grupo evita
 * seis inputs de configuração repetidos em cada uso — e se um dia um formulário
 * fugir do padrão, os nomes são sobrescrevíveis.
 */
@Component({
  selector: 'cp-cep-field',
  standalone: true,
  imports: [ReactiveFormsModule, MatIconModule],
  templateUrl: './cep-field.component.html',
  styleUrl: './cep-field.component.css',
})
export class CepFieldComponent {
  readonly form = input.required<FormGroup>();

  readonly zipControl = input('zipCode');
  readonly streetControl = input('street');
  readonly neighborhoodControl = input('neighborhood');
  readonly cityControl = input('city');
  readonly stateControl = input('state');
  /** Id do campo que recebe o foco depois do preenchimento. */
  readonly focusAfter = input('number');

  private readonly api = inject(CatalogApi);

  protected readonly loading = signal(false);
  protected readonly message = signal('');
  protected readonly found = signal(false);

  /** Último CEP consultado, para não repetir a busca a cada tecla. */
  private lastLookup = '';

  protected onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digitos = input.value.replace(/\D/g, '').slice(0, 8);

    // A máscara é aplicada aqui e o valor guardado no controle já sai limpo no
    // submit — as duas telas fazem `replace(/\D/g, '')` antes de enviar.
    input.value = mascarar(digitos);
    this.form().get(this.zipControl())?.setValue(input.value, { emitEvent: false });

    if (digitos.length < 8) {
      this.found.set(false);
      this.message.set('');
      this.lastLookup = '';
      return;
    }

    if (digitos === this.lastLookup) {
      return;
    }

    this.lastLookup = digitos;
    this.buscar(digitos);
  }

  private buscar(cep: string): void {
    this.loading.set(true);
    this.message.set('');
    this.found.set(false);

    this.api.address(cep).subscribe({
      next: (endereco) => {
        this.loading.set(false);
        this.found.set(true);

        const form = this.form();
        // Só escreve o que veio preenchido: CEP de cidade inteira não tem rua,
        // e sobrescrever com vazio apagaria o que a pessoa já tinha digitado.
        this.patch(form, this.streetControl(), endereco.street);
        this.patch(form, this.neighborhoodControl(), endereco.neighborhood);
        this.patch(form, this.cityControl(), endereco.city);
        this.patch(form, this.stateControl(), endereco.state);

        this.message.set('Endereço preenchido. Confira e informe o número.');
        this.focarNoNumero();
      },
      error: () => {
        this.loading.set(false);
        this.found.set(false);
        // Sem drama: a mensagem diz o que fazer, não de quem é a culpa.
        this.message.set('Não encontramos este CEP. Preencha o endereço manualmente.');
      },
    });
  }

  private patch(form: FormGroup, control: string, valor: string): void {
    if (!valor) {
      return;
    }
    form.get(control)?.setValue(valor);
  }

  /**
   * Leva o cursor para o número.
   *
   * O `setTimeout` espera o Angular terminar de escrever nos campos; focar
   * antes disso funcionaria, mas o valor recém-preenchido ainda não estaria na
   * tela e o pulo pareceria aleatório.
   */
  private focarNoNumero(): void {
    const id = this.focusAfter();
    if (!id) {
      return;
    }
    setTimeout(() => document.getElementById(id)?.focus(), 0);
  }
}

/** 03175000 vira 03175-000. Só para exibir; o envio continua só com dígitos. */
function mascarar(digitos: string): string {
  if (digitos.length <= 5) {
    return digitos;
  }
  return `${digitos.slice(0, 5)}-${digitos.slice(5)}`;
}
