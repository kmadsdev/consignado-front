// Every user-visible string of the API area, in Brazilian Portuguese. Same shape as the English table.
import type { en } from './strings.ts'

export const ptBR: typeof en = {
  network: 'A rede não respondeu. Verifique sua conexão e tente de novo.',
  unauthorized: 'Entre com sua conta para usar esta função.',
  invalidToken: 'Sua sessão não é mais válida. Entre de novo.',
  forbidden: 'Esta conta não tem permissão para fazer isso.',
  blocked: 'Esta conta está bloqueada. Se você acha que é um engano, use o formulário de contato.',
  noSession: 'O host Kubernetes exige uma janela de acesso aberta. Inicie antes uma janela de 15 minutos.',
  botCheck: 'A verificação anti-bot não passou. Refaça a verificação e envie o formulário de novo.',
  paused: 'Novas janelas de acesso estão pausadas no momento. O host serverless continua disponível.',
  held: 'Esta conta aguarda a análise do responsável. Você pode ler os dados, mas ainda não pode iniciar uma janela.',
  noWindows: 'Esta conta não tem mais janelas de acesso. Você pode pedir mais ao responsável.',
  dailyLimit: 'O limite diário de janelas de acesso para todos os visitantes foi atingido. Tente de novo amanhã.',
  profileIncomplete: 'Complete seu perfil primeiro. Depois você pode iniciar uma janela de acesso.',
  cooldown: (minutes: number) =>
    minutes > 0
      ? `O cluster parou há pouco. O Azure exige um intervalo entre parar e iniciar. Tente de novo em ${minutes} min.`
      : 'O cluster parou há pouco. O Azure exige um intervalo entre parar e iniciar. Tente de novo em alguns minutos.',
  conflict: 'Os dados mudaram enquanto esta requisição era processada. Recarregue os dados e tente de novo.',
  notFound: 'Este item não existe.',
  tooLarge: 'A requisição é grande demais.',
  validation: 'Um ou mais valores não são válidos.',
  tooMany: 'Muitas requisições em pouco tempo. Aguarde um minuto e tente de novo.',
  badGateway: 'O host da API não está disponível agora. Tente de novo em instantes.',
  timeout: 'O host da API não respondeu a tempo. Um host frio pode levar de 15 a 25 segundos. Tente de novo.',
  internal: 'O serviço teve um erro interno. Tente de novo em instantes.',
  unknown: (status: number) => `A requisição falhou (HTTP ${status}). Tente de novo.`,
  authFailed: 'O login não foi concluído. Tente de novo.',
  reason: {
    reject: 'Recusado no console da demo',
    cancel: 'Cancelado no console da demo',
  },
  trace: {
    noTrace: 'o gateway não enviou trace para esta chamada',
  },
}
