import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

import { WorkshopApi } from '../../core/api/workshop.api';
import { AuthService } from '../../core/auth/auth.service';
import { FinanceAccessService } from '../../core/auth/finance-access.service';
import { apiErrorMessage } from '../../core/http/api-error.util';
import { WorkshopResponse } from '../../core/models/workshop.model';
import { SnackbarService } from '../../core/services/snackbar.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { CepFieldComponent } from '../../shared/components/cep-field/cep-field.component';

/** Formatos que a folha impressa reproduz bem — SVG fica de fora por poder trazer script embutido. */
const TIPOS_DE_LOGO_ACEITOS = ['image/png', 'image/jpeg', 'image/webp'];

/** 400 KB. A logo aparece pequena no cabeçalho da folha; não precisa ser grande. */
const TAMANHO_MAXIMO_LOGO = 400 * 1024;

/**
 * Cadastro da oficina.
 *
 * O CNPJ aparece só para leitura: ele identifica a empresa e trocá-lo invalidaria
 * o histórico já emitido. O backend também não aceita alteração.
 *
 * <h2>A logo</h2>
 *
 * Não há upload para um serviço de arquivos: a imagem escolhida vira uma data
 * URI em base64 no próprio navegador e viaja dentro do mesmo PUT que salva o
 * resto do cadastro. O limite de tamanho e formato aqui é conveniência — quem
 * garante de verdade é o backend, que valida de novo antes de gravar.
 */
@Component({
  selector: 'cp-workshop-page',
  standalone: true,
  imports: [ReactiveFormsModule, MatIconModule, PageHeaderComponent, SkeletonComponent, CepFieldComponent],
  templateUrl: './workshop.page.html',
  styleUrl: './workshop.page.css',
})
export class WorkshopPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(WorkshopApi);
  private readonly auth = inject(AuthService);
  private readonly financeAccess = inject(FinanceAccessService);
  private readonly snackbar = inject(SnackbarService);

  /**
   * Só o dono decide quem vê o financeiro.
   *
   * O gerente edita o cadastro da oficina — por isso esta chave não vive no
   * mesmo formulário nem no mesmo endpoint. Se vivesse, o gerente se
   * concederia acesso salvando a própria tela.
   */
  protected readonly isOwner = computed(() => this.auth.hasAnyRole('OWNER'));
  protected readonly savingFinanceAccess = signal(false);

  protected readonly workshop = signal<WorkshopResponse | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);

  /**
   * A logo em memória: a data URI atual (herdada da oficina ou recém-
   * escolhida), ou `null` quando não há logo. Fica fora do `FormGroup`
   * porque um `<input type="file">` não guarda o próprio valor — o que ele
   * dispara é um evento, e o resultado da leitura é isto aqui.
   */
  protected readonly logoUrl = signal<string | null>(null);
  protected readonly logoError = signal('');

  protected readonly form = this.fb.nonNullable.group({
    tradeName: ['', [Validators.required, Validators.maxLength(150)]],
    corporateName: [''],
    phone: [''],
    email: ['', [Validators.email]],
    zipCode: [''],
    street: [''],
    number: [''],
    complement: [''],
    neighborhood: [''],
    city: [''],
    state: [''],
    /*
     * Prazo do encerramento automático, em horas. String vazia = desligado.
     *
     * Fica no formulário da oficina, e não numa chave separada como a do
     * financeiro, porque é decisão operacional e não de permissão — o gerente
     * pode mexer sem se conceder acesso a nada.
     */
    autoCloseOpenOrdersHours: [''],
  });

  /** Liga ou desliga o acesso do gerente ao financeiro. */
  protected toggleFinanceAccess(event: Event): void {
    const permitido = (event.target as HTMLInputElement).checked;
    this.savingFinanceAccess.set(true);

    this.api.updateFinanceAccess(permitido).subscribe({
      next: (atualizada) => {
        this.workshop.set(atualizada);
        // O menu do próprio gerente reage sem precisar recarregar a página.
        this.financeAccess.setManagerAllowed(atualizada.managerCanSeeFinance);
        this.savingFinanceAccess.set(false);
        this.snackbar.success(
          permitido
            ? 'O gerente passa a ver o financeiro.'
            : 'O gerente deixa de ver o financeiro.',
        );
      },
      error: (erro: unknown) => {
        this.savingFinanceAccess.set(false);
        // Devolve a chave ao estado real: a tela não pode mostrar uma permissão
        // que o servidor não concedeu.
        (event.target as HTMLInputElement).checked = !permitido;
        this.snackbar.error(apiErrorMessage(erro));
      },
    });
  }

  /**
   * Lê o arquivo escolhido, valida formato e tamanho, e converte para data
   * URI. Nada disso grava sozinho — só populariza `logoUrl()`, que viaja no
   * próximo "Salvar alterações" como qualquer outro campo do formulário.
   */
  protected onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const arquivo = input.files?.[0] ?? null;
    // Limpa o input: sem isso, escolher o mesmo arquivo de novo (por exemplo
    // depois de um erro) não dispara um novo evento "change".
    input.value = '';

    if (!arquivo) {
      return;
    }

    this.logoError.set('');

    if (!TIPOS_DE_LOGO_ACEITOS.includes(arquivo.type)) {
      this.logoError.set('Envie uma imagem PNG, JPG ou WEBP.');
      return;
    }

    if (arquivo.size > TAMANHO_MAXIMO_LOGO) {
      this.logoError.set('A logo deve ter no máximo 400 KB.');
      return;
    }

    const leitor = new FileReader();
    leitor.onload = () => this.logoUrl.set(leitor.result as string);
    leitor.onerror = () => this.logoError.set('Não foi possível ler o arquivo. Tente outro.');
    leitor.readAsDataURL(arquivo);
  }

  protected removeLogo(): void {
    this.logoUrl.set(null);
    this.logoError.set('');
  }

  constructor() {
    this.api.get().subscribe({
      next: (workshop) => {
        this.workshop.set(workshop);
        this.logoUrl.set(workshop.logoUrl);
        this.form.patchValue({
          tradeName: workshop.tradeName,
          corporateName: workshop.corporateName ?? '',
          phone: workshop.phone ?? '',
          email: workshop.email ?? '',
          zipCode: workshop.address?.zipCode ?? '',
          street: workshop.address?.street ?? '',
          number: workshop.address?.number ?? '',
          complement: workshop.address?.complement ?? '',
          neighborhood: workshop.address?.neighborhood ?? '',
          city: workshop.address?.city ?? '',
          state: workshop.address?.state ?? '',
          autoCloseOpenOrdersHours: workshop.autoCloseOpenOrdersHours == null
            ? ''
            : String(workshop.autoCloseOpenOrdersHours),
        });
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const value = this.form.getRawValue();

    this.api
      .update({
        tradeName: value.tradeName.trim(),
        corporateName: value.corporateName || null,
        phone: value.phone || null,
        email: value.email || null,
        logoUrl: this.logoUrl(),
        // Vazio significa desligado, e desligado é null — não zero. Zero passaria
        // pela validação de obrigatório e encerraria tudo que fosse aberto.
        autoCloseOpenOrdersHours: value.autoCloseOpenOrdersHours
          ? Number(value.autoCloseOpenOrdersHours)
          : null,
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
        next: (updated) => {
          this.workshop.set(updated);
          this.logoUrl.set(updated.logoUrl);
          // O nome da oficina aparece na barra lateral: recarrega a sessão.
          this.auth.refreshUser().subscribe();
          this.saving.set(false);
          this.snackbar.success('Dados da oficina atualizados.');
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.snackbar.error(apiErrorMessage(error));
        },
      });
  }
}
