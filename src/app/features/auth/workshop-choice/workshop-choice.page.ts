import { Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import { apiErrorMessage } from '../../../core/http/api-error.util';
import { WorkshopOption } from '../../../core/models/auth.model';

/**
 * Em qual oficina entrar.
 *
 * <h2>Quando esta tela aparece</h2>
 *
 * Quando a pessoa tem vínculo ativo com mais de uma oficina — o dono com duas
 * unidades, o gerente que atende duas da família, o mecânico de meio período em
 * duas. Com um vínculo só ela não aparece: escolher entre uma opção é uma
 * pergunta sem conteúdo.
 *
 * <h2>Por que não escolhemos por ela</h2>
 *
 * Entrar na oficina errada não é um engano barato: a pessoa lança uma ordem, um
 * pagamento ou uma despesa no lugar errado, e desfazer isso é trabalho manual em
 * dois cadastros. Uma escolha explícita custa um clique e evita esse tipo de
 * erro, que só aparece depois.
 *
 * <h2>O papel aparece junto do nome</h2>
 *
 * A mesma pessoa pode ser dona de uma e mecânica em outra. Só o nome da oficina
 * não diria em que pé ela está entrando, e o que ela pode fazer muda bastante
 * entre os dois casos.
 */
@Component({
  selector: 'cp-workshop-choice-page',
  standalone: true,
  imports: [MatIconModule, RouterLink],
  templateUrl: './workshop-choice.page.html',
  styleUrl: './workshop-choice.page.css',
})
export class WorkshopChoicePage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly workshops = this.auth.workshops;
  protected readonly user = this.auth.user;

  /** Id em carga, para desabilitar só o cartão clicado. */
  protected readonly entrando = signal<string | null>(null);
  protected readonly errorMessage = signal('');

  protected entrar(opcao: WorkshopOption): void {
    if (this.entrando()) {
      return;
    }

    this.entrando.set(opcao.workshopId);
    this.errorMessage.set('');

    this.auth.selectWorkshop(opcao.workshopId).subscribe({
      next: () => void this.router.navigate(['/painel']),
      error: (erro: unknown) => {
        this.entrando.set(null);
        // 404 aqui significa vínculo que caiu entre o login e o clique — a
        // pessoa foi desligada agora há pouco. A lista precisa ser relida em
        // vez de continuar oferecendo uma porta que não abre mais.
        this.errorMessage.set(apiErrorMessage(erro));
        this.auth.refreshWorkshops().subscribe({ error: () => undefined });
      },
    });
  }

  protected sair(): void {
    this.auth.logout();
  }

  /** Ícone que distingue o papel de relance, sem depender só do texto. */
  protected iconeDoPapel(opcao: WorkshopOption): string {
    switch (opcao.role) {
      case 'OWNER':
        return 'workspace_premium';
      case 'MANAGER':
        return 'badge';
      case 'RECEPTIONIST':
        return 'support_agent';
      default:
        return 'build';
    }
  }
}
