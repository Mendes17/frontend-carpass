import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

import { PublicQuoteApi } from '../../core/api/public-quote.api';
import { apiErrorMessage } from '../../core/http/api-error.util';
import { PublicQuoteResponse } from '../../core/models/quote.model';

/**
 * Orçamento visto pelo cliente, fora do sistema.
 *
 * Esta é a única tela que roda sem login, e o público dela não é a equipe da
 * oficina — é alguém que abriu um link no celular, provavelmente em casa. Por
 * isso ela não usa o shell, não tem menu, não fala em "OS" nem em "status", e
 * a decisão fica em dois botões grandes e claros.
 *
 * O token vem da rota. Nenhum identificador interno da oficina aparece na URL.
 */
@Component({
  selector: 'cp-public-quote-page',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, DatePipe, MatIconModule],
  templateUrl: './public-quote.page.html',
  styleUrl: './public-quote.page.css',
})
export class PublicQuotePage {
  readonly token = input.required<string>();

  private readonly api = inject(PublicQuoteApi);

  protected readonly quote = signal<PublicQuoteResponse | null>(null);
  protected readonly loading = signal(true);
  protected readonly working = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly decided = signal<'APPROVED' | 'REJECTED' | null>(null);
  protected readonly rejecting = signal(false);
  protected readonly rejectNote = signal('');

  constructor() {
    queueMicrotask(() => this.load());
  }

  private load(): void {
    this.loading.set(true);
    this.api.find(this.token()).subscribe({
      next: (quote) => {
        this.quote.set(quote);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(apiErrorMessage(error));
      },
    });
  }

  protected approve(): void {
    this.working.set(true);
    this.api.approve(this.token()).subscribe({
      next: (quote) => {
        this.quote.set(quote);
        this.decided.set('APPROVED');
        this.working.set(false);
      },
      error: (error: unknown) => {
        this.working.set(false);
        this.errorMessage.set(apiErrorMessage(error));
      },
    });
  }

  protected startReject(): void {
    this.rejecting.set(true);
  }

  protected cancelReject(): void {
    this.rejecting.set(false);
    this.rejectNote.set('');
  }

  protected confirmReject(): void {
    this.working.set(true);
    const note = this.rejectNote().trim();
    this.api.reject(this.token(), note || null).subscribe({
      next: (quote) => {
        this.quote.set(quote);
        this.decided.set('REJECTED');
        this.rejecting.set(false);
        this.working.set(false);
      },
      error: (error: unknown) => {
        this.working.set(false);
        this.errorMessage.set(apiErrorMessage(error));
      },
    });
  }
}
