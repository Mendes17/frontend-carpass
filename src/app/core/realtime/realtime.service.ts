import { DestroyRef, Injectable, effect, inject, signal } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import { Subject } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';

/** Avisos que o servidor manda. O conteúdo é mínimo de propósito. */
export type RealtimeEventType = 'WORK_ORDER_CHANGED' | 'QUOTE_DECIDED' | 'LOW_STOCK';

export interface RealtimeEvent {
  type: RealtimeEventType;
  at: string;
  workOrderId?: string;
  number?: number;
  approved?: boolean;
  partId?: string;
  partName?: string;
  stockQuantity?: number;
  minimumStock?: number;
}

/**
 * Canal de avisos em tempo real.
 *
 * <h2>O que trafega aqui</h2>
 *
 * Só "algo mudou", nunca o conteúdo do que mudou. Quem recebe o aviso busca
 * pela API REST de sempre — que já é escopada por oficina e respeita papel.
 * Empurrar dados por este canal obrigaria a reimplementar aqui toda a regra de
 * permissão, e uma cópia dessas nasce desatualizada: o faturamento, por
 * exemplo, é invisível para o atendente sem que este arquivo precise saber
 * disso.
 *
 * <h2>Ciclo de vida</h2>
 *
 * A conexão acompanha a sessão: abre ao entrar, fecha ao sair. O `@stomp/stompjs`
 * cuida da reconexão sozinho, então uma queda de rede se resolve sem a pessoa
 * perceber — e, quando volta, a tela recarrega e pega o que perdeu.
 */
@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  private client: Client | null = null;

  private readonly eventsSubject = new Subject<RealtimeEvent>();
  /** Fluxo único de eventos; cada tela filtra o que lhe interessa. */
  readonly events = this.eventsSubject.asObservable();

  /** Para a interface poder dizer, com honestidade, se está ao vivo. */
  readonly connected = signal(false);

  constructor() {
    // A conexão segue a sessão: entrar conecta, sair desconecta.
    effect(() => {
      // Os dois acessos são de sinal, então o efeito refaz sozinho ao entrar
      // ou sair — `token` é um getter que lê a sessão por dentro.
      const user = this.auth.user();
      const token = this.auth.token;

      if (token && user?.workshopId) {
        this.connect(token, user.workshopId);
      } else {
        this.disconnect();
      }
    });

    this.destroyRef.onDestroy(() => this.disconnect());
  }

  private connect(token: string, workshopId: string): void {
    if (this.client?.active) {
      return;
    }

    const client = new Client({
      brokerURL: this.brokerUrl(),
      // O token vai no CONNECT: o servidor recusa a conexão sem ele.
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
    });

    client.onConnect = () => {
      this.connected.set(true);
      // Só o tópico da própria oficina. O servidor recusa qualquer outro, mas
      // não faz sentido nem tentar.
      client.subscribe(`/topic/workshop/${workshopId}`, (message: IMessage) => {
        try {
          this.eventsSubject.next(JSON.parse(message.body) as RealtimeEvent);
        } catch {
          // Mensagem malformada não pode derrubar o canal.
        }
      });
    };

    client.onWebSocketClose = () => this.connected.set(false);
    client.onStompError = () => this.connected.set(false);

    client.activate();
    this.client = client;
  }

  private disconnect(): void {
    this.connected.set(false);
    void this.client?.deactivate();
    this.client = null;
  }

  /**
   * Deriva o endereço do socket a partir da API.
   *
   * Evita uma segunda variável de ambiente que alguém esqueceria de atualizar
   * ao publicar — e garante `wss` sempre que a API estiver em `https`.
   */
  private brokerUrl(): string {
    const api = new URL(environment.apiUrl, window.location.origin);
    const protocolo = api.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocolo}//${api.host}/ws`;
  }
}
