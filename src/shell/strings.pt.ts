// Every user-visible string of the shell, in Brazilian Portuguese. Same shape as the English table.
import type { en } from './strings.ts'

export const ptBR: typeof en = {
  brand: 'Consignado Cloud',
  brandAlt: 'Símbolo do Consignado Cloud',
  footer: 'Demonstração técnica. Não é oferta de crédito. Todos os dados são sintéticos.',
  engine: {
    chip: (label: string) => `Cluster: ${label}`,
    chipTitle: 'Estado do cluster Kubernetes',
    states: {
      stopped: 'parado', starting: 'iniciando', running: 'em execução', stopping: 'parando', cooldown: 'em cooldown', paused: 'pausado',
    },
    pausedBy: { budget: 'pausado (limite do orçamento)', admin: 'pausado (pelo responsável)' },
    pausedNoNew: 'pausado: sem novas janelas',
  },
  metaDescription: 'Consignado Cloud: uma API de empréstimo consignado em dois hosts do Azure, com cada requisição desenhada ao vivo. Demonstração técnica com dados sintéticos.',
  lang: { label: 'EN | PT', title: 'Idioma', en: 'English', pt: 'Português (Brasil)' },
  theme: { toDark: 'Modo escuro', toLight: 'Modo claro', title: 'Alternar entre o modo claro e o escuro' },
  preview: {
    label: (name: string) => `Ver como: ${name}`,
    title: 'Prévia do design',
    description: 'Prévia do design. Este build não tem login real.',
    groupPersonas: 'Mostrar o site como',
    groupData: 'Dados de mock',
    reset: 'Restaurar os dados da demo',
    resetDone: 'Os dados da demo voltaram ao estado inicial.',
    personas: {
      guest: 'Visitante',
      recruiter: 'Recrutador (cadastrado)',
      'recruiter-new': 'Recrutador (novo, perfil incompleto)',
      'recruiter-held': 'Recrutador (em análise, possível duplicidade)',
      'recruiter-spent': 'Recrutador (sem janelas restantes)',
      admin: 'Admin',
    },
    short: {
      guest: 'Visitante', recruiter: 'Recrutador', 'recruiter-new': 'Recrutador novo', 'recruiter-held': 'Recrutador em análise', 'recruiter-spent': 'Recrutador, 0 janelas', admin: 'Admin',
    },
  },
  user: { signIn: 'Entrar', signOut: 'Sair', profile: 'Seu perfil', noName: 'Conta nova', menuTitle: 'Conta' },
  nav: {
    header: 'Consignado Cloud',
    overview: 'Visão geral',
    operations: 'Operações',
    aks: 'Host Kubernetes',
    simulate: 'Simulação serverless',
    admin: 'Admin',
    docs: 'Docs da arquitetura (GitHub)',
    privacy: 'Privacidade',
    terms: 'Termos',
    home: 'Início',
    liveWindow: 'Janela ao vivo',
    notFound: 'Página não encontrada',
    guestBadge: 'visitante',
    sectionHosts: 'Hosts',
    sectionOwner: 'Responsável',
    sectionMore: 'Mais',
  },
  docsUrl: 'https://github.com/kmadsdev/consignado-api/tree/main/docs/platform',
  aria: {
    navigation: 'Navegação lateral', navigationClose: 'Fechar a navegação lateral', navigationToggle: 'Abrir a navegação lateral',
    notifications: 'Notificações', breadcrumbs: 'Trilha de navegação', overflow: 'Mais', overflowTitle: 'Tudo', overflowBack: 'Voltar', overflowDismiss: 'Fechar o menu', external: 'Abre em uma nova aba',
  },
  inspector: {
    title: 'Inspetor de requisições',
    empty: 'Nenhuma requisição ainda. Execute uma ação em uma tabela e o caminho dela pela nuvem aparece aqui.',
  },
  notFound: {
    title: 'Página não encontrada',
    text: 'Não existe página neste endereço.',
    home: 'Ir para a página inicial',
    app: 'Abrir a visão geral',
  },
}
