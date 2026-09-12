/**
 * ThemeService - Gerencia tema claro/escuro com persistência no localStorage
 * Altera a classe do body e armazena a preferência do usuário
 */
import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  /* Signal reativo que armazena o tema atual */
  readonly theme = signal<Theme>(this.loadTheme());

  constructor() {
    /* Effect que reage a mudanças no tema e aplica no DOM */
    effect(() => {
      const current = this.theme();
      document.body.classList.remove('light-theme', 'dark-theme');
      document.body.classList.add(`${current}-theme`);
      localStorage.setItem('carpass-theme', current);
    });
  }

  /** Alterna entre light e dark */
  toggle(): void {
    this.theme.set(this.theme() === 'light' ? 'dark' : 'light');
  }

  /** Carrega tema salvo ou usa preferência do sistema */
  private loadTheme(): Theme {
    const saved = localStorage.getItem('carpass-theme') as Theme | null;
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
