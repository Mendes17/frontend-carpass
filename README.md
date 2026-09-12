# CarPass — Web

Painel da oficina. Angular 20 com componentes standalone, signals e change detection zoneless.

## Rodando

```bash
npm install
npm start
```

A aplicação sobe em `http://localhost:4200` e fala com a API em `http://localhost:8080/api/v1`.

Se a API estiver em outro endereço, ajuste `src/environments/environment.ts`. Em produção o endereço é relativo (`/api/v1`), então o mesmo bundle serve qualquer domínio.

> A origem `http://localhost:4200` precisa estar em `CARPASS_ALLOWED_ORIGINS` no `.env` do backend. A API recusa curinga no CORS de propósito.

## Estrutura

```
src/app/
├── core/
│   ├── models/        contratos da API (espelham os DTOs do backend)
│   ├── api/           um serviço HTTP por recurso
│   ├── auth/          sessão, guardas de rota
│   ├── http/          interceptors e tratamento de erro
│   └── services/      tema e notificações
├── layout/            moldura das telas autenticadas
├── features/          uma pasta por tela
└── shared/components/ peças reutilizáveis
```

## Convenções

- **Endereço da API em um lugar só.** Nenhum serviço monta URL com string solta. O interceptor decide se injeta o token comparando com `environment.apiUrl`, e não procurando `localhost` no endereço — era por isso que o token parava de ir fora da máquina do desenvolvedor.
- **Erro tem dono.** O interceptor global cuida do que é sempre igual: sessão expirada derruba o login, 403 e falha de servidor viram aviso. Erro de negócio e de validação seguem para a tela, que sabe onde exibi-los.
- **A tela não inventa permissão.** O menu esconde o que o papel não alcança e o `roleGuard` evita a navegação, mas quem decide é o backend. Isso é conveniência, não segurança.
- **Ações da OS vêm do servidor.** O backend devolve `allowedNextStatuses`; a tela oferece só isso, em vez de recriar a máquina de estados no cliente e divergir dela.
- **Fontes auto-hospedadas.** Roboto e Material Icons vêm dos pacotes `@fontsource/roboto` e `material-icons`. Sem chamada ao Google no carregamento: menos uma dependência externa, sem texto piscando e sem expor o IP de quem acessa a um terceiro.

## Tema e acessibilidade

O tema claro/escuro vive em `src/custom-theme.scss`, em variáveis CSS `--cp-*`. Cada estado tem duas cores com papéis diferentes:

| Token | Papel | Contraste exigido |
|---|---|---|
| `--cp-<estado>` | marca: ícone, barra, borda | ≥ 3:1 contra o cartão |
| `--cp-<estado>-fg` | texto sobre o fundo tingido | ≥ 4,5:1 contra `--cp-<estado>-bg` |

Os valores de texto foram medidos, não escolhidos no olho. Os originais reprovavam: verde em 2,41:1 e amarelo em 2,07:1 sobre o próprio fundo. O modo escuro tem passos próprios, medidos contra as superfícies escuras — não é a inversão automática do claro.

Outras decisões: cor nunca identifica um estado sozinha (o rótulo textual acompanha sempre), há link para pular ao conteúdo, `prefers-reduced-motion` desliga as animações, e a barra lateral fecha com `Esc`.
