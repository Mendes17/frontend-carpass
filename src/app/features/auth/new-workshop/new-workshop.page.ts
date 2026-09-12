import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';

import { WorkshopApi } from '../../../core/api/workshop.api';
import { AuthService } from '../../../core/auth/auth.service';
import { apiErrorMessage } from '../../../core/http/api-error.util';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { CepFieldComponent } from '../../../shared/components/cep-field/cep-field.component';

/**
 * Criar a própria oficina, já estando autenticado.
 *
 * <h2>Por que esta tela existe</h2>
 *
 * Ela é a saída do problema que motivou toda a separação entre identidade e
 * vínculo: quem era desligado de uma oficina tinha a conta desativada e, como o
 * e-mail é único no sistema, ficava sem conseguir usar o próprio endereço para
 * mais nada — nem para abrir a oficina dele. A ex-empregadora ficava, na
 * prática, com a chave do e-mail pessoal de alguém.
 *
 * Agora a pessoa entra com a conta de sempre e cria a oficina por aqui. A conta
 * é a mesma, o e-mail é o mesmo, e ela vira proprietária da oficina nova.
 *
 * <h2>Sem confirmação por e-mail</h2>
 *
 * Não há o que confirmar: o login já provou que a pessoa é dona daquela conta.
 * A conferência de e-mail pertence ao cadastro público, onde ninguém provou
 * nada ainda.
 *
 * <h2>Quem mais chega aqui</h2>
 *
 * Também serve a quem já tem oficina e vai abrir uma segunda unidade — daí o
 * texto mudar conforme a pessoa já tenha vínculo ou não. Prometer "sua primeira
 * oficina" a quem já tem duas seria dizer algo falso na primeira linha da tela.
 */
@Component({
  selector: 'cp-new-workshop-page',
  standalone: true,
  imports: [ReactiveFormsModule, MatIconModule, RouterLink, CepFieldComponent],
  templateUrl: './new-workshop.page.html',
  styleUrl: './new-workshop.page.css',
})
export class NewWorkshopPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(WorkshopApi);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackbar = inject(SnackbarService);

  protected readonly user = this.auth.user;
  protected readonly temOutras = computed(() => this.auth.workshops().length > 0);

  /**
   * Se a pessoa chegou aqui de dentro de uma oficina.
   *
   * Muda para onde o botão de escape leva. São três chegadas diferentes: quem
   * está trabalhando e vai abrir outra (volta para o painel), quem acabou de
   * fazer login e tem várias (volta para a escolha), e quem não tem nenhuma
   * (só resta sair). Oferecer "voltar para minhas oficinas" a quem está no
   * meio do expediente manda a pessoa para uma tela que ela não pediu.
   */
  protected readonly dentroDeOficina = this.auth.hasWorkshop;

  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly form = this.fb.nonNullable.group({
    tradeName: ['', [Validators.required, Validators.maxLength(150)]],
    corporateName: [''],
    cnpj: ['', [Validators.required, Validators.pattern(/^\d{14}$/)]],
    workshopPhone: [''],
    workshopEmail: ['', [Validators.email]],
    zipCode: [''],
    street: [''],
    number: [''],
    complement: [''],
    neighborhood: [''],
    city: [''],
    state: [''],
  });

  /** Mantém no controle só os dígitos, que é o que o backend valida. */
  protected onCnpjInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digitos = input.value.replace(/\D/g, '').slice(0, 14);
    input.value = mascararCnpj(digitos);
    this.form.controls.cnpj.setValue(digitos, { emitEvent: false });
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
        tradeName: value.tradeName.trim(),
        corporateName: value.corporateName || null,
        cnpj: value.cnpj,
        workshopPhone: value.workshopPhone || null,
        workshopEmail: value.workshopEmail || null,
        address: {
          zipCode: value.zipCode.replace(/\D/g, '') || null,
          street: value.street || null,
          number: value.number || null,
          complement: value.complement || null,
          neighborhood: value.neighborhood || null,
          city: value.city || null,
          state: value.state ? value.state.toUpperCase() : null,
        },
      })
      .subscribe({
        next: (criada) => {
          // A oficina existe, mas a sessão ainda está fora dela: o token atual
          // não tem escopo nenhum. Entrar de fato é o passo seguinte, e é o
          // servidor que emite o token escopado.
          this.auth.selectWorkshop(criada.id).subscribe({
            next: () => {
              this.saving.set(false);
              this.snackbar.success('Oficina criada. Bem-vindo!');
              void this.router.navigate(['/painel']);
            },
            error: (erro: unknown) => {
              this.saving.set(false);
              this.errorMessage.set(apiErrorMessage(erro));
            },
          });
        },
        error: (erro: unknown) => {
          this.saving.set(false);
          this.errorMessage.set(apiErrorMessage(erro));
        },
      });
  }

  protected sair(): void {
    this.auth.logout();
  }
}

/** 12.345.678/0001-90 — só para a leitura; o valor guardado são os dígitos. */
function mascararCnpj(digitos: string): string {
  if (digitos.length <= 2) {
    return digitos;
  }
  if (digitos.length <= 5) {
    return `${digitos.slice(0, 2)}.${digitos.slice(2)}`;
  }
  if (digitos.length <= 8) {
    return `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5)}`;
  }
  if (digitos.length <= 12) {
    return `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(8)}`;
  }
  return `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(8, 12)}-${digitos.slice(12)}`;
}
