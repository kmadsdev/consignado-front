// Every user-visible string of the landing area, in Brazilian Portuguese. Same shape as the English table.
// The privacy notice and the terms keep the exact meaning of the English text.
import { ROUTES } from './routes.ts'
import type { en } from './strings.ts'

export const ptBR: typeof en = {
  common: {
    product: 'Consignado Cloud',
    footer: 'Demonstração técnica. Não é oferta de crédito. Todos os dados são sintéticos.',
    footerNav: 'Legal',
    privacy: 'Privacidade',
    terms: 'Termos',
    home: 'Início',
    lastUpdated: 'Última atualização',
    backHome: 'Voltar à página inicial',
  },

  landing: {
    header: {
      title: 'Consignado Cloud',
      tagline: 'Um motor de empréstimo consignado, dois hosts no Azure. Acompanhe cada requisição atravessar a arquitetura, ao vivo.',
      about:
        'Uma demonstração técnica de Kaique Souza, engenheiro backend. Uma única API de empréstimo consignado roda em dois hosts do Azure para mostrar uma arquitetura com cara de produção: edge com firewall, gateway, identidade, secrets, banco de dados e deploy automatizado. As telas de empréstimo existem para gerar requisições. O que está em exibição é a arquitetura.',
      sourceLabel: 'Código-fonte',
      repos: [
        { name: 'kmadsdev/consignado-api', href: 'https://github.com/kmadsdev/consignado-api' },
        { name: 'kmadsdev/consignado-front', href: 'https://github.com/kmadsdev/consignado-front' },
        { name: 'kmadsdev/consignado-serverless', href: 'https://github.com/kmadsdev/consignado-serverless' },
      ],
      primaryAction: 'Testar a simulação',
      secondaryAction: 'Entrar para rodar no Kubernetes',
      signInNote:
        'O login é feito pelo Microsoft Entra ID. Primeira vez aqui? Na página da Microsoft, selecione "No account? Create one", depois "Sign up with email", e confirme seu e-mail com um código de uso único.',
    },

    diagram: {
      title: 'A arquitetura, ao vivo',
      badge: 'Simulação',
      description:
        'Replay de uma requisição no host serverless. Cada etapa acende quando o evento dela chega.',
      caption:
        'Esta página reproduz tempos gravados, em loop. Na aplicação, o mesmo diagrama é alimentado pelos eventos das suas próprias requisições.',
    },

    hosts: {
      title: 'Dois hosts, uma API',
      description:
        'A mesma aplicação Spring Boot roda nos dois hosts, atrás do mesmo gateway e com o mesmo banco de dados.',
      tradeOffLabel: 'Trade-off',
      functions: {
        title: 'Azure Functions',
        subtitle: 'Host serverless',
        facts: [
          { label: 'Disponibilidade', value: 'Sempre ligado' },
          { label: 'Quem pode usar', value: 'Visitantes e usuários logados' },
          { label: 'Cold start', value: 'De 15 a 25 s', mono: true },
          { label: 'Requisição warm', value: '0,3 a 1 s', mono: true },
          { label: 'Quando ocioso', value: 'Escala para zero instâncias' },
          { label: 'Rede', value: 'Sem endpoint público, só via gateway' },
        ],
        tradeOff:
          'Não custa nada quando está ocioso, mas a primeira requisição depois de uma pausa espera uma nova instância e a subida da JVM.',
      },
      aks: {
        title: 'Azure Kubernetes Service',
        subtitle: 'Host Kubernetes',
        facts: [
          { label: 'Disponibilidade', value: 'Iniciado para uma janela de acesso de 15 minutos' },
          { label: 'Quem pode usar', value: 'Usuários logados, 3 janelas cada' },
          { label: 'Cold start', value: 'De 4 a 6 min', mono: true },
          { label: 'Progresso da inicialização', value: 'Mostrado etapa por etapa' },
          { label: 'Quando a janela termina', value: 'O cluster é parado' },
          { label: 'Rede', value: 'Load balancer interno, 2 pods' },
        ],
        tradeOff:
          'Depois de iniciado, responde em velocidade constante, mas um cluster parado leva minutos para subir e um cluster ligado custa dinheiro a cada hora.',
      },
    },

    access: {
      title: 'O que você pode fazer',
      description: 'Três níveis de acesso. O login é por um código de uso único enviado para o seu e-mail.',
      columns: {
        level: 'Nível de acesso',
        serverless: 'Host serverless',
        kubernetes: 'Host Kubernetes',
        data: 'Dados compartilhados',
        limits: 'Limites',
      },
      rows: [
        {
          level: 'Visitante',
          serverless: 'Prévia de empréstimo stateless',
          kubernetes: 'Só replay, marcado como simulação',
          data: 'Snapshot mascarado, somente leitura',
          limits: 'Seus dados ficam no navegador',
        },
        {
          level: 'Cadastrado',
          serverless: 'Fluxo completo, o tempo todo',
          kubernetes: '3 janelas de acesso de 15 minutos',
          data: 'Lê tudo, grava pelo fluxo de trabalho',
          limits: 'Mais janelas sob pedido',
        },
        {
          level: 'Responsável',
          serverless: 'Fluxo completo, o tempo todo',
          kubernetes: 'Sem limite de janelas',
          data: 'Lê tudo, grava pelo fluxo de trabalho',
          limits: 'Nenhum. Também: usuários, sessões, estado do cluster e orçamento',
        },
      ],
    },

    path: {
      title: 'O caminho da requisição',
      description: 'Por onde passa uma chamada de API, em ordem.',
      steps: [
        { service: 'Navegador', text: 'envia a chamada por HTTPS para um único hostname público.' },
        {
          service: 'Edge da Cloudflare (CDN + WAF + TLS)',
          text: 'termina a conexão TLS, aplica as regras de firewall (WAF) e o rate limit, e descarta o que não passa.',
        },
        {
          service: 'Gateway (função Java)',
          text: 'é a única origem que o edge alcança. Ele aceita a chamada e escolhe o host.',
        },
        {
          service: 'Microsoft Entra ID',
          text: 'emitiu o token. O gateway valida a assinatura e as claims, depois o estado da conta e as janelas de acesso restantes.',
        },
        {
          service: 'Azure Key Vault',
          text: 'entrega os secrets ao gateway por meio de uma managed identity.',
        },
        {
          service: 'Azure Functions',
          text: 'executa a API Spring Boot no host serverless. No host Kubernetes, a chamada segue para a próxima etapa.',
        },
        {
          service: 'Azure Load Balancer interno e pods do AKS',
          text: 'recebem a chamada dentro da rede virtual e a enviam para um dos 2 pods com a mesma API.',
        },
        {
          service: 'PostgreSQL',
          text: 'armazena os dados compartilhados. Só as chamadas de usuários logados chegam até ele.',
        },
      ],
      pageLoadLabel: 'Carga da página',
      pageLoad: 'Navegador, depois o edge da Cloudflare (CDN + WAF + TLS), depois o Blob Storage (site estático).',
      edgeNote:
        'O edge é a Cloudflare porque o Azure Front Door não está disponível em assinaturas de estudante. O código Terraform do Front Door está no repositório.',
    },

    security: {
      title: 'Segurança e limites, sem rodeios',
      description: 'O que protege a demo e o que a faz parar.',
      items: [
        { lead: 'Edge.', text: 'Um web application firewall e rate limits no edge da Cloudflare.' },
        {
          lead: 'Nenhum host público.',
          text: 'O cluster e os hosts da API não têm endpoint público. Só o gateway fica exposto.',
        },
        {
          lead: 'Nenhuma senha armazenada.',
          text: 'OIDC nos deploys, workload identity nos pods, managed identities nas funções.',
        },
        { lead: 'Login.', text: 'Um código de uso único por e-mail, pelo Microsoft Entra ID.' },
        {
          lead: 'Uma pessoa, um teste.',
          text: 'Contas com possível duplicidade ficam retidas para análise do responsável.',
        },
        {
          lead: 'Orçamento.',
          text: 'Um orçamento mensal de US$ 60. Quando ele é atingido, o host Kubernetes é pausado.',
        },
        { lead: 'Dados.', text: 'Todos os dados são sintéticos. Não há nenhuma pessoa real no banco de dados.' },
      ],
    },

    stack: {
      title: 'Feito com',
      groups: [
        { label: 'API', items: ['Java 21', 'Spring Boot 3', 'PostgreSQL 16'] },
        { label: 'Hosts', items: ['Azure Functions', 'AKS'] },
        { label: 'Edge e armazenamento', items: ['Edge da Cloudflare', 'Blob Storage'] },
        { label: 'Identidade e secrets', items: ['Entra ID', 'Key Vault'] },
        { label: 'Infraestrutura e deploy', items: ['Terraform', 'GitHub Actions'] },
        { label: 'Front-end', items: ['React', 'Cloudscape'] },
      ],
    },

    contact: {
      title: 'Contato, ou pedido de mais acesso',
      description:
        'Tire uma dúvida sobre o projeto ou peça mais janelas de acesso ao host Kubernetes. O responsável lê todas as mensagens.',
    },
  },

  contactForm: {
    name: 'Nome',
    namePlaceholder: 'Seu nome',
    email: 'E-mail',
    emailPlaceholder: 'voce@exemplo.com',
    emailConstraint: 'A resposta vai para este endereço.',
    kind: 'Assunto',
    kinds: {
      contact: 'Dúvida geral',
      'more-windows': 'Mais janelas de acesso',
    },
    message: 'Mensagem',
    messagePlaceholder: 'O que você quer saber ou testar?',
    messageConstraint: 'Entre 10 e 2000 caracteres.',
    antiBotLabel: 'Verificação anti-bot',
    antiBotPlaceholder: 'O widget anti-bot carrega aqui.',
    antiBotFailed: 'A verificação anti-bot não carregou. Confira se challenges.cloudflare.com não está bloqueado e recarregue a página.',
    consentBefore: 'Concordo com o tratamento desta mensagem e dos meus dados de contato conforme descrito no ',
    consentLink: 'aviso de privacidade',
    consentAfter: '.',
    submit: 'Enviar mensagem',
    sending: 'Enviando',
    errors: {
      name: 'Informe seu nome.',
      email: 'Informe um endereço de e-mail válido.',
      message: 'Escreva pelo menos 10 caracteres.',
      messageLong: 'Escreva no máximo 2000 caracteres.',
      consent: 'Sua concordância é necessária para enviar a mensagem.',
      send: 'A mensagem não foi enviada. Tente de novo em instantes.',
      bot: 'Conclua a verificação anti-bot para enviar a mensagem.',
    },
    successTitle: 'Mensagem enviada',
    successText: 'O responsável recebeu sua mensagem e vai responder por e-mail.',
    successSimulated: 'Este build não tem backend conectado. O envio foi simulado.',
    again: 'Enviar outra mensagem',
  },

  privacy: {
    title: 'Aviso de privacidade',
    description:
      'Como o Consignado Cloud trata dados pessoais, nos termos da Lei Geral de Proteção de Dados Pessoais (LGPD, Lei nº 13.709/2018).',
    alertTitle: 'Não revisado por advogado',
    alert: 'Este aviso foi escrito para uma demonstração técnica e não foi revisado por um advogado.',
    sections: [
      {
        title: '1. Quem é o controlador dos dados',
        paragraphs: [
          'O controlador é Kaique Souza, autor e responsável por esta demo. Para falar com o controlador, use o formulário da página inicial.',
        ],
        link: { text: 'Abrir o formulário de contato', href: ROUTES.contact },
      },
      {
        title: '2. Visitantes',
        paragraphs: [
          'Se você usa a demo sem conta, os dados que você digita ficam no seu navegador. Eles não são enviados ao banco de dados e nenhuma conta é criada para você.',
          'A rede de edge vê o seu endereço IP por um curto período, para aplicar o firewall e os limites de requisições. Isso vale para todo visitante.',
        ],
      },
      {
        title: '3. O que é coletado dos usuários cadastrados, e por quê',
        items: [
          'Nome, e-mail, empresa e URL do LinkedIn: para criar a sua conta e saber quem usa a demo.',
          'Endereço IP e uma impressão digital do dispositivo em formato de hash: para prevenir abuso. A regra é uma pessoa, um teste.',
          'Registros de uso das suas janelas de acesso (quando cada uma foi solicitada, iniciada e encerrada): para aplicar o limite de janelas e controlar o custo.',
          'Logs de segurança de logins e requisições: para identificar e interromper ataques.',
          'Mensagens que você envia pelo formulário de contato, com o nome e o e-mail que você informa.',
        ],
      },
      {
        title: '4. Bases legais',
        items: [
          'Consentimento (LGPD, art. 7º, I): os dados da conta. Você o fornece ao completar o seu perfil e pode revogá-lo a qualquer momento.',
          'Legítimo interesse (LGPD, art. 7º, IX): prevenção de abuso e segurança, o que inclui o endereço IP, a impressão digital do dispositivo e os logs de segurança.',
        ],
      },
      {
        title: '5. Por quanto tempo os dados são mantidos',
        items: [
          'Dados da conta: até você pedir a eliminação ou até 12 meses sem uso.',
          'Logs de segurança: até 90 dias.',
          'Nesta versão, o responsável os elimina manualmente, de forma periódica.',
        ],
      },
      {
        title: '6. Quem trata os dados',
        items: [
          'Microsoft Azure: hospedagem, banco de dados, login (Microsoft Entra ID) e logs.',
          'Cloudflare: todo o tráfego do site passa pela Cloudflare (DNS, TLS, CDN, regras de firewall e a verificação anti-bot dos formulários). A Cloudflare vê o endereço IP e as requisições de cada visitante.',
        ],
        after: [
          'Essas empresas atuam como operadoras. Os data centers delas podem ficar fora do Brasil. Os dados não são compartilhados com nenhum outro terceiro.',
        ],
      },
      {
        title: '7. Seus direitos',
        paragraphs: [
          'O art. 18 da LGPD garante a você estes direitos sobre os seus dados pessoais:',
        ],
        items: [
          'Confirmar que os seus dados são tratados e ter acesso a eles.',
          'Corrigir dados incompletos, inexatos ou desatualizados.',
          'Obter a anonimização, o bloqueio ou a eliminação de dados desnecessários ou excessivos.',
          'Receber os seus dados em formato portável.',
          'Obter a eliminação dos dados tratados com o seu consentimento.',
          'Saber com quem os seus dados são compartilhados.',
          'Saber que você pode não dar o consentimento, e o que acontece se você negar.',
          'Revogar o seu consentimento.',
        ],
      },
      {
        title: '8. Como exercer os seus direitos',
        paragraphs: [
          'Envie uma mensagem pelo formulário de contato, a partir do endereço de e-mail da sua conta. O controlador responde por e-mail. Você também pode apresentar uma reclamação à Autoridade Nacional de Proteção de Dados (ANPD).',
        ],
        link: { text: 'Abrir o formulário de contato', href: ROUTES.contact },
      },
      {
        title: '9. O que este site não faz',
        items: [
          'Não vende dados pessoais.',
          'Não exibe publicidade.',
          'Não usa cookies de rastreamento.',
        ],
        after: [
          'Os dados de empréstimo da demo são sintéticos. Não informe dados reais de nenhuma pessoa nas telas de empréstimo.',
        ],
      },
    ],
  },

  terms: {
    title: 'Termos de uso',
    description: 'As condições para usar o Consignado Cloud. São curtas.',
    sections: [
      {
        title: '1. Uma demonstração técnica',
        paragraphs: [
          'O Consignado Cloud é uma demonstração técnica de uma arquitetura de nuvem. Não é um banco nem uma instituição financeira. Não faz oferta de crédito, e nenhum empréstimo real é contratado, aprovado ou pago aqui. Os números das telas de empréstimo não têm valor financeiro.',
        ],
      },
      {
        title: '2. Nenhum dado pessoal real',
        paragraphs: [
          'Não informe dados pessoais reais de nenhuma pessoa nas telas de empréstimo: nada de nome, CPF, renda ou empregador reais. Use o gerador aleatório que a aplicação oferece. Os dados do banco compartilhado podem ser vistos por outros usuários cadastrados.',
        ],
      },
      {
        title: '3. Uso justo e limites',
        items: [
          'Cada usuário cadastrado tem 3 janelas de acesso de 15 minutos no host Kubernetes. Mais janelas são concedidas sob pedido.',
          'Limites de requisições se aplicam a todas as requisições.',
          'Uma conta por pessoa. Contas com possível duplicidade ficam retidas para análise.',
          'Não ataque o serviço, não teste os limites dele com carga automatizada e não tente obter dados de outras contas.',
          'O responsável pode reter ou bloquear uma conta a qualquer momento.',
        ],
      },
      {
        title: '4. Disponibilidade',
        paragraphs: [
          'O serviço tem um orçamento mensal. Quando o orçamento é atingido, o host Kubernetes fica pausado até o mês seguinte. O responsável pode pausar ou interromper todo o serviço a qualquer momento, sem aviso prévio. Os dados da demo podem ser restaurados ao estado inicial.',
        ],
      },
      {
        title: '5. Sem garantia',
        paragraphs: [
          'O serviço é fornecido no estado em que se encontra, sem garantia de qualquer natureza. Na medida em que a lei permite, o responsável não responde por danos decorrentes do uso do serviço ou da indisponibilidade dele.',
        ],
      },
      {
        title: '6. Privacidade',
        paragraphs: ['O aviso de privacidade informa quais dados pessoais são coletados e por quê.'],
        link: { text: 'Ler o aviso de privacidade', href: ROUTES.privacy },
      },
      {
        title: '7. Contato',
        paragraphs: ['Para dúvidas sobre estes termos, use o formulário de contato da página inicial.'],
        link: { text: 'Abrir o formulário de contato', href: ROUTES.contact },
      },
    ],
  },
}
