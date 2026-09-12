import { Routes } from '@angular/router';

import { authGuard, guestGuard, workshopGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';

/**
 * Rotas da aplicação.
 *
 * Duas áreas: as públicas de autenticação e as internas, protegidas pelo
 * authGuard e envolvidas pelo shell. Tudo é carregado sob demanda, para o
 * primeiro carregamento trazer só o que a tela de login precisa.
 */
export const routes: Routes = [
  {
    /*
     * Orçamento do cliente: sem login e sem shell.
     *
     * Fica antes de tudo e fora dos dois grupos de propósito — não pode passar
     * pelo guestGuard (que redireciona quem está logado) nem pelo authGuard. O
     * cliente não tem conta, e o dono da oficina pode abrir o mesmo link para
     * conferir o que foi enviado.
     */
    path: 'orcamento/:token',
    title: 'Orçamento do seu veículo · CarPass',
    loadComponent: () =>
      import('./features/quote/public-quote.page').then((m) => m.PublicQuotePage),
  },
  {
    /*
     * O orçamento em papel: mesma ideia da folha da OS, e pelos mesmos motivos
     * fica fora do shell e antes dos grupos de `path: ''`.
     */
    path: 'ordens/:id/orcamento',
    canActivate: [authGuard],
    title: 'Imprimir orçamento · CarPass',
    loadComponent: () =>
      import('./features/work-orders/work-order-quote-print.page').then((m) => m.WorkOrderQuotePrintPage),
  },
  {
    /*
     * A ordem de serviço em papel: exige login, mas fica fora do shell.
     *
     * Precisa vir antes dos dois grupos de `path: ''` — quem casa primeiro
     * vence, e dentro do shell esta URL seria lida como `ordens/:id`. Sem menu
     * e sem barra lateral de propósito: o que está na tela é o que sai na
     * impressora.
     */
    path: 'ordens/:id/imprimir',
    canActivate: [authGuard],
    title: 'Imprimir ordem de serviço · CarPass',
    loadComponent: () =>
      import('./features/work-orders/work-order-print.page').then((m) => m.WorkOrderPrintPage),
  },
  {
    /*
     * O relatório financeiro em papel: mesma ideia das folhas acima, e pelos
     * mesmos motivos fica fora do shell e antes dos grupos de `path: ''`. O
     * período vem por query params, e não por um id de rota — "financeiro" é
     * uma tela sobre um período, não sobre um recurso com identidade própria.
     * O roleGuard aqui é a mesma conveniência de navegação da tela "financeiro":
     * quem barra de fato é o backend.
     */
    path: 'financeiro/imprimir',
    canActivate: [authGuard, roleGuard('OWNER', 'MANAGER')],
    title: 'Imprimir financeiro · CarPass',
    loadComponent: () =>
      import('./features/finance/finance-print.page').then((m) => m.FinancePrintPage),
  },
  {
    /*
     * Escolher a oficina e criar a própria.
     *
     * Ficam fora do shell porque não há oficina escolhida ainda — não haveria o
     * que colocar no menu lateral nem no cabeçalho. Exigem login, mas nenhum
     * papel: quem chega aqui pode estar justamente sem vínculo com oficina
     * nenhuma, que é o caso de quem foi desligado.
     */
    path: 'escolher-oficina',
    canActivate: [authGuard],
    title: 'Escolher oficina · CarPass',
    loadComponent: () =>
      import('./features/auth/workshop-choice/workshop-choice.page').then((m) => m.WorkshopChoicePage),
  },
  {
    path: 'nova-oficina',
    canActivate: [authGuard],
    title: 'Cadastrar oficina · CarPass',
    loadComponent: () =>
      import('./features/auth/new-workshop/new-workshop.page').then((m) => m.NewWorkshopPage),
  },
  {
    path: '',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/layout/auth-layout.component').then((m) => m.AuthLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'entrar' },
      {
        path: 'entrar',
        title: 'Entrar · CarPass',
        loadComponent: () => import('./features/auth/login/login.page').then((m) => m.LoginPage),
      },
      {
        path: 'criar-conta',
        title: 'Cadastrar oficina · CarPass',
        loadComponent: () =>
          import('./features/auth/register/register.page').then((m) => m.RegisterPage),
      },
      {
        path: 'recuperar-senha',
        title: 'Recuperar senha · CarPass',
        loadComponent: () =>
          import('./features/auth/forgot-password/forgot-password.page').then(
            (m) => m.ForgotPasswordPage,
          ),
      },
      {
        // Mesma tela para redefinir senha e para o primeiro acesso de um
        // funcionário: os dois fluxos usam o mesmo tipo de token.
        path: 'definir-senha',
        title: 'Definir senha · CarPass',
        loadComponent: () =>
          import('./features/auth/set-password/set-password.page').then((m) => m.SetPasswordPage),
      },
    ],
  },
  {
    /*
     * O shell exige mais que estar autenticado: exige estar *dentro* de uma
     * oficina. As duas coisas deixaram de ser a mesma quando o vínculo virou
     * entidade própria — sem o workshopGuard, quem entra sem vínculo cairia no
     * painel e veria uma tela cheia de 403 em vez do caminho que resolve a
     * situação dele.
     */
    path: '',
    canActivate: [authGuard, workshopGuard],
    loadComponent: () => import('./layout/shell/shell.component').then((m) => m.ShellComponent),
    children: [
      {
        path: 'painel',
        title: 'Painel · CarPass',
        loadComponent: () =>
          import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
      },
      // ----------------------------------------------------------- clientes
      {
        path: 'clientes',
        title: 'Clientes · CarPass',
        loadComponent: () =>
          import('./features/customers/customer-list.page').then((m) => m.CustomerListPage),
      },
      {
        path: 'clientes/novo',
        title: 'Novo cliente · CarPass',
        loadComponent: () =>
          import('./features/customers/customer-form.page').then((m) => m.CustomerFormPage),
      },
      {
        // Vem depois de "novo" de propósito: senão "novo" seria lido como um id.
        path: 'clientes/:id',
        title: 'Editar cliente · CarPass',
        loadComponent: () =>
          import('./features/customers/customer-form.page').then((m) => m.CustomerFormPage),
      },

      // ----------------------------------------------------------- veículos
      {
        path: 'veiculos',
        title: 'Veículos · CarPass',
        loadComponent: () =>
          import('./features/vehicles/vehicle-list.page').then((m) => m.VehicleListPage),
      },
      {
        path: 'veiculos/novo',
        title: 'Novo veículo · CarPass',
        loadComponent: () =>
          import('./features/vehicles/vehicle-form.page').then((m) => m.VehicleFormPage),
      },
      {
        // Rota mais específica antes da genérica: senão "historico" nunca é
        // alcançado, porque `veiculos/:id` casa primeiro.
        path: 'veiculos/:id/historico',
        title: 'Histórico do veículo · CarPass',
        loadComponent: () =>
          import('./features/vehicles/vehicle-history.page').then((m) => m.VehicleHistoryPage),
      },
      {
        path: 'veiculos/:id',
        title: 'Editar veículo · CarPass',
        loadComponent: () =>
          import('./features/vehicles/vehicle-form.page').then((m) => m.VehicleFormPage),
      },

      // ------------------------------------------------ ordens de serviço
      {
        path: 'ordens',
        title: 'Ordens de serviço · CarPass',
        loadComponent: () =>
          import('./features/work-orders/work-order-list.page').then((m) => m.WorkOrderListPage),
      },
      {
        path: 'ordens/nova',
        title: 'Abrir ordem de serviço · CarPass',
        loadComponent: () =>
          import('./features/work-orders/work-order-create.page').then((m) => m.WorkOrderCreatePage),
      },
      {
        path: 'ordens/:id',
        title: 'Ordem de serviço · CarPass',
        loadComponent: () =>
          import('./features/work-orders/work-order-detail.page').then((m) => m.WorkOrderDetailPage),
      },

      // ----------------------------------------------------------- serviços
      {
        path: 'servicos',
        title: 'Catálogo de serviços · CarPass',
        loadComponent: () =>
          import('./features/services/service-list.page').then((m) => m.ServiceListPage),
      },
      {
        path: 'servicos/novo',
        title: 'Novo serviço · CarPass',
        canActivate: [roleGuard('OWNER', 'MANAGER')],
        loadComponent: () =>
          import('./features/services/service-form.page').then((m) => m.ServiceFormPage),
      },
      {
        path: 'servicos/:id',
        title: 'Editar serviço · CarPass',
        canActivate: [roleGuard('OWNER', 'MANAGER')],
        loadComponent: () =>
          import('./features/services/service-form.page').then((m) => m.ServiceFormPage),
      },

      // -------------------------------------------------------------- peças
      {
        path: 'pecas',
        title: 'Peças · CarPass',
        loadComponent: () => import('./features/parts/part-list.page').then((m) => m.PartListPage),
      },
      {
        path: 'pecas/nova',
        title: 'Nova peça · CarPass',
        canActivate: [roleGuard('OWNER', 'MANAGER')],
        loadComponent: () => import('./features/parts/part-form.page').then((m) => m.PartFormPage),
      },
      {
        path: 'pecas/:id',
        title: 'Editar peça · CarPass',
        canActivate: [roleGuard('OWNER', 'MANAGER')],
        loadComponent: () => import('./features/parts/part-form.page').then((m) => m.PartFormPage),
      },

      // -------------------------------------------------------- financeiro
      /*
       * O guard cobre o papel; a segunda metade da regra — se o dono deixou o
       * gerente ver — mora no backend, que responde 403. Duplicar aqui criaria
       * uma segunda verdade sobre permissão, e a cópia é sempre a que fica
       * desatualizada.
       */
      {
        path: 'financeiro',
        title: 'Financeiro · CarPass',
        canActivate: [roleGuard('OWNER', 'MANAGER')],
        loadComponent: () => import('./features/finance/finance.page').then((m) => m.FinancePage),
      },
      {
        path: 'despesas',
        title: 'Despesas · CarPass',
        canActivate: [roleGuard('OWNER', 'MANAGER')],
        loadComponent: () =>
          import('./features/expenses/expense-list.page').then((m) => m.ExpenseListPage),
      },
      // As rotas de categoria vêm antes de `despesas/:id`, senão "categorias"
      // seria lido como o id de uma despesa.
      {
        path: 'despesas/categorias',
        title: 'Categorias de despesa · CarPass',
        canActivate: [roleGuard('OWNER', 'MANAGER')],
        loadComponent: () =>
          import('./features/expenses/expense-category-list.page').then((m) => m.ExpenseCategoryListPage),
      },
      {
        path: 'despesas/categorias/nova',
        title: 'Nova categoria de despesa · CarPass',
        canActivate: [roleGuard('OWNER', 'MANAGER')],
        loadComponent: () =>
          import('./features/expenses/expense-category-form.page').then((m) => m.ExpenseCategoryFormPage),
      },
      {
        path: 'despesas/categorias/:id',
        title: 'Editar categoria de despesa · CarPass',
        canActivate: [roleGuard('OWNER', 'MANAGER')],
        loadComponent: () =>
          import('./features/expenses/expense-category-form.page').then((m) => m.ExpenseCategoryFormPage),
      },
      {
        path: 'despesas/nova',
        title: 'Nova despesa · CarPass',
        canActivate: [roleGuard('OWNER', 'MANAGER')],
        loadComponent: () =>
          import('./features/expenses/expense-form.page').then((m) => m.ExpenseFormPage),
      },
      {
        path: 'despesas/:id',
        title: 'Editar despesa · CarPass',
        canActivate: [roleGuard('OWNER', 'MANAGER')],
        loadComponent: () =>
          import('./features/expenses/expense-form.page').then((m) => m.ExpenseFormPage),
      },

      // ----------------------------------------------------- tipos de peça
      {
        path: 'tipos-de-peca',
        title: 'Tipos de peça · CarPass',
        loadComponent: () =>
          import('./features/part-types/part-type-list.page').then((m) => m.PartTypeListPage),
      },
      {
        path: 'tipos-de-peca/novo',
        title: 'Novo tipo de peça · CarPass',
        canActivate: [roleGuard('OWNER', 'MANAGER')],
        loadComponent: () =>
          import('./features/part-types/part-type-form.page').then((m) => m.PartTypeFormPage),
      },
      {
        path: 'tipos-de-peca/:id',
        title: 'Editar tipo de peça · CarPass',
        canActivate: [roleGuard('OWNER', 'MANAGER')],
        loadComponent: () =>
          import('./features/part-types/part-type-form.page').then((m) => m.PartTypeFormPage),
      },

      // ------------------------------------------------------------- equipe
      {
        // Gerir a equipe é decisão de quem administra a oficina. O backend
        // aplica a mesma regra: o guard aqui só evita oferecer o caminho.
        path: 'equipe',
        title: 'Equipe · CarPass',
        canActivate: [roleGuard('OWNER', 'MANAGER')],
        loadComponent: () =>
          import('./features/employees/employee-list.page').then((m) => m.EmployeeListPage),
      },
      {
        path: 'equipe/novo',
        title: 'Novo funcionário · CarPass',
        canActivate: [roleGuard('OWNER', 'MANAGER')],
        loadComponent: () =>
          import('./features/employees/employee-form.page').then((m) => m.EmployeeFormPage),
      },
      {
        path: 'equipe/:id',
        title: 'Editar funcionário · CarPass',
        canActivate: [roleGuard('OWNER', 'MANAGER')],
        loadComponent: () =>
          import('./features/employees/employee-form.page').then((m) => m.EmployeeFormPage),
      },

      {
        path: 'oficina',
        title: 'Minha oficina · CarPass',
        canActivate: [roleGuard('OWNER', 'MANAGER')],
        loadComponent: () =>
          import('./features/workshop/workshop.page').then((m) => m.WorkshopPage),
      },
      {
        path: 'perfil',
        title: 'Meu perfil · CarPass',
        loadComponent: () => import('./features/profile/profile.page').then((m) => m.ProfilePage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
