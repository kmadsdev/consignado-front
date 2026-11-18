// Every user-visible string of the landing area, in Brazilian Portuguese. Same shape as the English table.
// The privacy notice and the terms keep the exact meaning of the English text.
import { DOCS, ROUTES } from './routes.ts'
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
      tagline:
        'Uma API de empréstimo consignado que roda no Azure Functions e no AKS, atrás de um único gateway. O site desenha cada requisição que você envia, com o tempo medido de cada etapa.',
      about:
        'Demonstração técnica de Kaique Souza, engenheiro backend. Escrevi a API de empréstimo, o gateway Java na frente dela, o Terraform do Azure e este site. As telas de empréstimo enviam requisições reais, e você acompanha cada uma pelo edge, pela validação do token, pelo host e pelo banco.',
      sourceLabel: 'Código-fonte',
      repos: [
        { name: 'kmadsdev/consignado-api', href: 'https://github.com/kmadsdev/consignado-api' },
        { name: 'kmadsdev/consignado-front', href: 'https://github.com/kmadsdev/consignado-front' },
        { name: 'kmadsdev/consignado-serverless', href: 'https://github.com/kmadsdev/consignado-serverless' },
      ],
      primaryAction: 'Fazer uma simulação rápida',
      secondaryAction: 'Entrar para usar o host Kubernetes',
      signInNote:
        'A simulação rápida não pede conta. O login usa o Microsoft Entra ID com um código de uso único enviado ao seu e-mail. Para criar a conta, na página da Microsoft selecione "No account? Create one" e depois "Sign up with email".',
    },

    diagram: {
      title: 'Caminho da requisição',
      badge: 'Replay gravado',
      description: 'Uma requisição no host serverless, gravada e repetida em loop. Cada etapa acende quando o evento dela chega.',
      caption: 'Na aplicação, o mesmo diagrama desenha as suas requisições a partir dos eventos que o gateway envia.',
    },

    product: {
      title: 'O que a API faz',
      description: 'Empréstimo consignado: convênios, clientes, margem, simulações e contratos.',
      intro:
        'No empréstimo consignado, o empregador ou o órgão pagador desconta cada parcela direto do salário ou do benefício, sob um convênio com quem empresta. O convênio limita o prazo, a taxa mensal e a parte da renda líquida mensal que as parcelas podem ocupar: a margem consignável. A API cadastra convênios e clientes, simula empréstimos e leva cada contrato da proposta até a quitação.',
      topics: [
        {
          title: 'Margem consignável, conferida em cada contrato e em cada mudança de renda',
          paragraphs: [
            'O limite da margem é a renda líquida mensal vezes o percentual de margem do convênio, arredondado para baixo no centavo. Arredonda para baixo porque a margem é um teto: um centavo a mais deixaria passar uma parcela acima do limite.',
            'A simulação compara a maior parcela do cronograma com a margem livre. A aprovação confere de novo. A API trava a linha do cliente, soma as parcelas dos contratos aprovados e ativos e só então decide. Duas aprovações do mesmo cliente rodam uma depois da outra, então as duas não conseguem usar a mesma margem.',
            'A mudança de renda é a única alteração fora do fluxo do contrato. A API recusa com 422 quando o novo limite fica abaixo das parcelas já comprometidas.',
          ],
          links: [
            { text: 'ADR 0003: estados do contrato e concorrência', href: DOCS.adr0003 },
            { text: 'MarginPolicy.java', href: DOCS.marginPolicy },
          ],
        },
        {
          title: 'Tabela Price e arredondamento',
          paragraphs: [
            'Todas as parcelas têm o mesmo valor, PMT = P × i × (1+i)^n / ((1+i)^n - 1), arredondado no centavo. Os juros do mês são o saldo vezes a taxa. O resto da parcela amortiza o principal.',
            'Os valores são BigDecimal com arredondamento HALF_EVEN. A última parcela absorve a sobra do arredondamento, e o saldo termina em 0,00. R$ 15.000,00 em 84 meses a 1,85% ao mês dá 83 parcelas de 353,24 e uma última de 354,04. A conferência da margem usa a maior.',
            'A API não calcula IOF nem CET. Em um produto de crédito, um CET errado é pior do que nenhum, então deixei os dois de fora e registrei o motivo.',
          ],
          links: [
            { text: 'ADR 0002: dinheiro e arredondamento', href: DOCS.adr0002 },
            { text: 'PriceAmortization.java', href: DOCS.priceAmortization },
          ],
        },
        {
          title: 'Estados do contrato',
          paragraphs: ['Uma tabela em ContractStatus guarda cada transição permitida, e a API responde 409 a qualquer outra.'],
          items: [
            'PROPOSED vai para APPROVED, REJECTED ou CANCELLED.',
            'APPROVED vai para ACTIVE ou CANCELLED. A ativação grava o cronograma de parcelas.',
            'ACTIVE vai para SETTLED ou CANCELLED.',
            'Só contratos APPROVED e ACTIVE ocupam margem.',
            'Cada contrato tem uma versão, enviada como ETag. Um If-Match desatualizado recebe 412 antes de qualquer mudança.',
          ],
          links: [
            { text: 'ADR 0003: estados do contrato e concorrência', href: DOCS.adr0003 },
            { text: 'ContractStatus.java', href: DOCS.contractStatus },
          ],
        },
        {
          title: 'Criação de contrato idempotente',
          paragraphs: [
            'Um cliente que toma timeout manda a requisição de novo, e proposta duplicada é um problema real em crédito. O POST /contracts exige o header Idempotency-Key. Uma unique constraint nessa chave decide qual requisição ganha, sem lock em memória. A repetição com a mesma chave recebe o mesmo contrato com 200. No teste de integração, 8 requisições simultâneas com a mesma chave criam uma linha só.',
          ],
          links: [
            { text: 'ADR 0004: criação de contrato idempotente', href: DOCS.adr0004 },
            { text: 'ContractService.java', href: DOCS.contractService },
          ],
        },
      ],
    },

    hosts: {
      title: 'Dois hosts, um jar',
      description: 'O mesmo build Spring Boot 3.5 roda nos dois, atrás do mesmo gateway e com o mesmo banco.',
      functions: {
        title: 'Azure Functions',
        subtitle: 'Host serverless',
        facts: [
          { label: 'Disponibilidade', value: 'Sempre, inicia sob demanda' },
          { label: 'Quem pode usar', value: 'Visitantes e usuários logados' },
          { label: 'Primeira chamada após ocioso', value: '18,6 a 18,9 s', mono: true },
          { label: 'Chamada warm', value: '0,25 a 0,9 s', mono: true },
          { label: 'Instâncias', value: 'No máximo 1' },
          { label: 'Rede', value: 'Aceita chamadas só do gateway' },
        ],
        tradeOff:
          'Roda sob demanda, então o custo fica perto da cota gratuita do Azure Functions (estimativa). A primeira chamada depois de uma pausa espera uma instância nova iniciar a JVM e o Spring Boot. Os tempos são de ponta a ponta, medidos pelo edge.',
      },
      aks: {
        title: 'Azure Kubernetes Service',
        subtitle: 'Host Kubernetes',
        facts: [
          { label: 'Disponibilidade', value: 'Parado até alguém abrir uma janela de acesso' },
          { label: 'Quem pode usar', value: 'Usuários logados, 3 janelas de 15 minutos' },
          { label: 'Cold start', value: '7 min 13 s', mono: true },
          { label: 'Janela com o cluster ligado', value: 'Pronta em menos de 2 s', mono: true },
          { label: 'Tamanho', value: '1 nó Standard_D2as_v4, 2 a 3 pods' },
          { label: 'Rede', value: 'Load balancer interno, sem endereço público' },
        ],
        tradeOff:
          'O nó custa US$ 0,104 por hora, cerca de US$ 76 num mês inteiro, mais que o orçamento todo. Por isso o cluster só roda durante as janelas, e o primeiro visitante espera ele iniciar.',
      },
      topics: [
        {
          title: 'Por que o mesmo jar roda em dois hosts',
          paragraphs: [
            'Comparar Kubernetes e serverless só é justo quando os dois rodam o mesmo programa. No Azure Functions o jar roda como custom handler. O host do Functions inicia um runtime Java que eu gero com jlink e um arquivo CDS. Ele repassa cada requisição HTTP para o Spring Boot. O CI testa um artefato, e os dois hosts rodam esse artefato.',
            'O custo são dois caminhos de deploy para manter funcionando e um pacote de 129 MB cujo runtime Java só um build novo atualiza. O relay do outbox roda só no AKS, então um evento gravado no host serverless espera um pod ligado.',
            'Um banco escolheria um host por serviço a partir de dados de carga e custo, com um caminho de deploy só.',
          ],
          links: [{ text: 'ADR 0007: dois hosts, uma API', href: DOCS.adr0007 }],
        },
        {
          title: 'O cold start de 7 min 13 s, etapa por etapa',
          paragraphs: ['Medido do cluster parado até a primeira resposta da API:'],
          items: [
            'Início do control plane: 4 min 26 s',
            'Nó pronto: 2 min 13 s',
            'Início do Spring Boot e conexão com o banco: 26 s',
            'Load balancer interno passa a mandar tráfego aos pods: 8 s',
          ],
          links: [
            { text: 'ADR 0009: cluster frio e janelas de acesso', href: DOCS.adr0009 },
            { text: 'EngineService.java', href: DOCS.engineService },
          ],
        },
        {
          title: 'Janelas de acesso e cool-down',
          paragraphs: [
            'O gateway mostra cada etapa da inicialização a partir de sinais reais:',
            'A janela abre quando essa chamada de readiness responde 200 e dura 15 minutos a partir daí.',
            'Cada conta tem 3 janelas, e a janela só conta quando abre, então uma inicialização que falha não custa nada ao usuário. Posso mudar os dois números por conta. Somando todas as contas, abrem no máximo 12 janelas novas por dia. Uma janela custa cerca de US$ 0,04 de tempo de nó.',
            'Um timer roda a cada minuto. Quando nenhuma janela está iniciando ou aberta, o gateway para o cluster. Depois vem um cool-down de 15 minutos, como o Azure recomenda entre parar e iniciar. A role do gateway no Azure lê, inicia e para o cluster. Ela não tem permissão para alterar nem apagar o cluster.',
            'Um banco manteria o cluster ligado, com autoscaling e capacidade reservada, porque a disponibilidade vale mais que o nó.',
          ],
          items: [
            'O power state do cluster no Azure Resource Manager',
            'As conditions dos pods e os estados dos containers',
            'Os endpoints do Service do Kubernetes',
            'Um GET /actuator/health/readiness pelo load balancer interno',
          ],
          links: [{ text: 'ADR 0009: cluster frio e janelas de acesso', href: DOCS.adr0009 }],
        },
      ],
    },

    access: {
      title: 'Níveis de acesso',
      description: 'O login usa um código de uso único enviado ao seu e-mail. Não existe senha.',
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
          serverless: 'Simulação rápida, sem banco',
          kubernetes: 'Replay gravado, marcado como simulação',
          data: 'Snapshot mascarado, só leitura',
          limits: 'O que você digita fica no seu navegador',
        },
        {
          level: 'Usuário logado',
          serverless: 'A API completa, a qualquer hora',
          kubernetes: '3 janelas de acesso de 15 minutos',
          data: 'Lê tudo, grava pelo fluxo do empréstimo',
          limits: 'Mais janelas sob pedido',
        },
        {
          level: 'Responsável',
          serverless: 'A API completa, a qualquer hora',
          kubernetes: 'Sem limite de janelas',
          data: 'Lê tudo, grava pelo fluxo do empréstimo',
          limits: 'Páginas de admin: usuários, janelas, motor e orçamento',
        },
      ],
    },

    path: {
      title: 'O caminho de uma chamada à API',
      description: 'Em ordem. Cada etapa pode recusar a chamada.',
      steps: [
        { service: 'Navegador', text: 'chama um único hostname público por HTTPS.' },
        {
          service: 'Edge da Cloudflare',
          text: 'termina o TLS e aplica 3 regras de firewall, entre elas um limite de 40 requisições a cada 10 segundos por IP em /api/. Depois acrescenta a chave do edge.',
        },
        {
          service: 'Gateway',
          text: 'é Java 21 no Azure Functions e o único backend público. Só aceita a chamada vinda de um endereço da Cloudflare e com a chave do edge.',
        },
        {
          service: 'Microsoft Entra ID',
          text: 'emitiu o token. O gateway confere issuer, audience, assinatura, scope e client, depois o estado da conta e a janela de acesso.',
        },
        {
          service: 'Azure Key Vault',
          text: 'guarda os secrets. O gateway lê os secrets com a managed identity dele.',
        },
        {
          service: 'Host serverless',
          text: 'roda a API no Azure Functions.',
        },
        {
          service: 'Host Kubernetes',
          text: 'recebe a chamada por um load balancer interno na rede virtual. Um de 2 pods responde.',
        },
        {
          service: 'PostgreSQL 16',
          text: 'guarda os dados compartilhados. Só chamadas de usuários logados chegam até ele.',
        },
      ],
      pageLoad: 'O site em si são arquivos estáticos no Azure Blob Storage, com cache no edge da Cloudflare.',
      topics: [
        {
          title: 'Tempo de cada requisição',
          paragraphs: [
            'Cada resposta da API tem um header de tempo com estes valores:',
            'Só números saem da API, nunca o texto do SQL ou dados. O gateway coloca esses números no trace como as etapas app e database. A simulação rápida não executa nenhum statement SQL, e o header dela mostra zero trabalho de banco em toda chamada.',
          ],
          items: [
            'Tempo dentro da aplicação',
            'Statements JDBC por tipo, e o tempo de banco',
            'Espera por uma conexão do pool',
            'A instância que respondeu',
          ],
          links: [
            { text: 'ADR 0013: headers de tempo por requisição', href: DOCS.adr0013 },
            { text: 'RequestTiming.java', href: DOCS.requestTiming },
          ],
        },
        {
          title: 'Por que um gateway fica na frente dos dois hosts',
          paragraphs: [
            'A validação do token, as cotas, o trace e o log de auditoria ficam num lugar só, e a API continua igual. O gateway é Java puro com núcleo em ports and adapters: as regras não têm nenhum tipo do Azure e rodam em 156 testes. Ele inicia e para o cluster pelo Azure Resource Manager com uma managed identity.',
            'O custo é que a rede vira a única defesa da API, e o gateway é um ponto único de falha. Um banco acrescentaria autenticação entre serviços, mTLS ou um token que a API valida, e usaria um API gateway gerenciado.',
          ],
          links: [
            { text: 'ADR 0008: gateway na frente dos dois hosts', href: DOCS.adr0008 },
            { text: 'EntraTokenVerifier.java', href: DOCS.tokenVerifier },
          ],
        },
      ],
    },

    identity: {
      title: 'Identidade, secrets e controle de custo',
      description: 'Nenhuma senha guardada para deploy, pods ou funções.',
      items: [
        'O GitHub Actions faz deploy com OIDC. Os pods usam workload identity. As funções usam managed identities.',
        'A chave do edge é o único secret compartilhado com um sistema fora do Azure. Ela fica no Key Vault e no Worker da Cloudflare.',
        'Visitantes se cadastram com um código de uso único por e-mail e viram contas convidadas restritas no meu tenant do Entra ID.',
        'O Cloudflare Turnstile protege o formulário de contato e o de perfil.',
        'O gateway guarda endereços IP e fingerprints de dispositivo só como HMAC. Uma conta no mesmo dispositivo ou na mesma caixa de e-mail de outra conta espera a minha análise.',
        'O orçamento mensal é de US$ 60. Em 100%, o gateway pausa o motor e para o cluster. O site e o host serverless continuam no ar.',
        'Uma revisão de segurança independente em 2026-11-17 não achou nenhum problema crítico ou alto. Corrigi os achados médios.',
      ],
      topics: [
        {
          title: 'O que o controle de orçamento para, e o que não para',
          paragraphs: [
            'Em 50% e 80% dos US$ 60 eu recebo um e-mail. Em 100%, um action group do Azure chama um webhook do gateway, que pausa o motor e para o cluster. O nó ligado é o maior custo variável, e parar não apaga nada.',
            'Um orçamento do Azure é um alerta, não um teto rígido. Ele dispara depois que o gasto é registrado, e os custos fixos de banco, registry, disco e IP público continuam. Um banco não para produção por alerta de orçamento. Ele define orçamento por time, com previsão e detecção de anomalias, e paga capacidade adiantado.',
          ],
          links: [{ text: 'ADR 0012: controle de orçamento e limites contra abuso', href: DOCS.adr0012 }],
        },
        {
          title: 'Contas duplicadas',
          paragraphs: [
            'O limite de 3 janelas é por conta, então uma segunda conta é o jeito fácil de contornar. O gateway retém uma conta nova com o mesmo fingerprint de dispositivo ou a mesma caixa de e-mail normalizada de outra. O mesmo IP sozinho só gera uma marcação, porque um escritório ou uma universidade compartilha um endereço.',
            'Um navegador novo ou uma VPN passa por esse filtro. Um banco verificaria a identidade no cadastro.',
          ],
          links: [
            { text: 'ADR 0012: controle de orçamento e limites contra abuso', href: DOCS.adr0012 },
            { text: 'UserService.java', href: DOCS.userService },
          ],
        },
      ],
    },

    data: {
      title: 'Regras dos dados',
      description: 'Todos os dados são sintéticos, e os dados compartilhados só crescem.',
      items: [
        'O banco tem 4 convênios, 50 clientes, 60 simulações e 30 contratos, todos sintéticos.',
        'A API não tem DELETE. A única alteração permitida é a renda de um cliente, e a margem consignável protege essa alteração.',
        'Visitantes nunca chegam ao banco. Recebem a simulação rápida e um snapshot mascarado que o gateway atualiza a cada 10 minutos.',
        'O CPF sai mascarado em toda resposta. O banco guarda o CPF em texto puro. Um sistema real criptografaria ou tokenizaria.',
      ],
    },

    delivery: {
      title: 'Entrega',
      description: 'Três repositórios, e cada um faz deploy num push para a main.',
      items: [
        'consignado-api: 281 testes e um gate de cobertura de 80%. O job de CI gera a imagem, marca com o commit e faz o deploy no AKS. As permissões dele cobrem um namespace.',
        'consignado-serverless: o gateway, com 156 testes, e o pacote do host serverless.',
        'consignado-front: este site, gerado e copiado para o Blob Storage pelo GitHub Actions.',
        'O Terraform descreve todos os recursos do Azure. O state remoto fica numa storage account que só aceita login pelo Entra ID.',
        'O Inspetor de requisições liga cada requisição ao commit da imagem que respondeu.',
      ],
      links: [
        { text: 'README do Terraform', href: DOCS.terraform },
        { text: 'Workflow de CI da API', href: DOCS.ci },
      ],
    },

    decisions: {
      title: 'Onde o Azure recusou o primeiro plano',
      description: 'Três partes do desenho mudaram depois de um não do Azure.',
      topics: [
        {
          title: 'Edge: um Worker da Cloudflare no lugar do Azure Front Door',
          paragraphs: [
            'O plano era o Front Door. O Azure recusou nesta assinatura com "Free Trial and Student account is forbidden for Azure Frontdoor resources". A zona DNS já estava na Cloudflare e um Worker não custa nada, então levei o edge para lá. O Front Door Standard ainda somaria US$ 35 por mês.',
            'O custo: uma parte do caminho fica fora do Azure, e o plano gratuito não tem conjunto de regras WAF gerenciado. Eu atualizo à mão a lista de endereços da Cloudflare no gateway. O código Terraform do Front Door continua no repositório, atrás de uma flag.',
            'Num banco eu colocaria ali o Front Door Premium ou equivalente, com regras WAF gerenciadas e private link até a origem.',
          ],
          links: [{ text: 'ADR 0010: edge na Cloudflare no lugar do Front Door', href: DOCS.adr0010 }],
        },
        {
          title: 'Cadastro: convidados no meu tenant no lugar de um tenant External ID',
          paragraphs: [
            'Planejei um tenant separado do Microsoft Entra External ID para os visitantes. A política de região da assinatura recusou. Agora os visitantes se cadastram por um fluxo self-service com código de uso único por e-mail, como usuários convidados do mesmo tenant que guarda a assinatura.',
            'Para limitar o risco, deixei as permissões de convidado no nível mais restrito e só admins podem convidar. Um banco manteria as identidades de clientes num tenant separado, sem ligação com o tenant que roda a infraestrutura.',
          ],
          links: [{ text: 'ADR 0011: cadastro no tenant corporativo', href: DOCS.adr0011 }],
        },
        {
          title: 'Banco: North Central US, com endpoint público',
          paragraphs: [
            'Belgium Central não tinha capacidade para o tamanho B1ms, então o servidor PostgreSQL 16 ficou em North Central US. Os dois hosts estão em Belgium Central. Cada statement atravessa da Europa para os EUA. Ativar um contrato grava muitas linhas e leva cerca de 4,5 s.',
            'O endpoint é público, com TLS e a regra de firewall "Azure services". Escolhi isso no lugar de um private endpoint para economizar cerca de US$ 8 por mês. A senha tem 28 caracteres aleatórios e existe só no Key Vault.',
            'Para um banco: rede privada, login do Entra ID no banco de dados e a mesma região de quem chama.',
          ],
          links: [{ text: 'Tabela de decisões', href: DOCS.decisions }],
        },
      ],
    },

    limits: {
      title: 'Limites conhecidos',
      description: 'Lacunas que eu conheço e não fechei.',
      items: [
        'O plano gratuito da Cloudflare não tem conjunto de regras WAF gerenciado. O edge tem 3 regras próprias, entre elas o rate limit.',
        'O endpoint do banco é público. TLS, uma regra de firewall e uma senha no Key Vault protegem o banco.',
        'As contas de visitantes ficam no mesmo tenant do Entra ID que a assinatura do Azure.',
        'Os números do Azure Monitor chegam com cerca de 2 minutos de atraso.',
        'Quem chega durante o cool-down espera até 15 minutos pelo host Kubernetes.',
        'Nenhum advogado revisou o aviso de privacidade nem os termos.',
      ],
      links: [{ text: 'Documento de segurança e privacidade', href: DOCS.security }],
    },

    stack: {
      title: 'Stack',
      groups: [
        { label: 'API', items: ['Java 21', 'Spring Boot 3.5', 'PostgreSQL 16'] },
        { label: 'Hosts', items: ['Azure Functions', 'AKS'] },
        { label: 'Edge e armazenamento', items: ['Worker da Cloudflare', 'Blob Storage'] },
        { label: 'Identidade e secrets', items: ['Entra ID', 'Key Vault'] },
        { label: 'Infraestrutura e deploy', items: ['Terraform', 'GitHub Actions'] },
        { label: 'Front-end', items: ['React', 'Cloudscape'] },
      ],
    },

    contact: {
      title: 'Contato e mais janelas de acesso',
      description: 'Pergunte sobre o projeto ou peça mais janelas no host Kubernetes. Leio todas as mensagens e respondo por e-mail.',
    },
  },

  contactForm: {
    name: 'Nome',
    namePlaceholder: 'Seu nome',
    email: 'E-mail',
    emailPlaceholder: 'voce@exemplo.com',
    emailConstraint: 'Respondo para este endereço.',
    kind: 'Assunto',
    kinds: {
      contact: 'Pergunta sobre o projeto',
      'more-windows': 'Mais janelas de acesso',
    },
    message: 'Mensagem',
    messagePlaceholder: 'Sua pergunta, ou quantas janelas você precisa',
    messageConstraint: 'De 10 a 2000 caracteres.',
    antiBotLabel: 'Verificação anti-bot',
    antiBotPlaceholder: 'Carregando a verificação do Cloudflare Turnstile.',
    antiBotFailed: 'A verificação anti-bot não carregou. Confira se challenges.cloudflare.com não está bloqueado e recarregue a página.',
    consentBefore: 'Concordo com o tratamento desta mensagem e dos meus dados de contato conforme o ',
    consentLink: 'aviso de privacidade',
    consentAfter: '.',
    submit: 'Enviar mensagem',
    sending: 'Enviando',
    errors: {
      name: 'Informe seu nome.',
      email: 'Informe um e-mail válido.',
      message: 'Escreva pelo menos 10 caracteres.',
      messageLong: 'Escreva no máximo 2000 caracteres.',
      consent: 'Marque a caixa de concordância para enviar a mensagem.',
      send: 'A mensagem não foi enviada. Tente de novo em um minuto.',
      bot: 'Conclua a verificação anti-bot para enviar a mensagem.',
    },
    successTitle: 'Mensagem enviada',
    successText: 'Recebi sua mensagem e vou responder por e-mail.',
    successSimulated: 'Este build não tem backend. Nada foi enviado.',
    again: 'Enviar outra mensagem',
  },

  privacy: {
    title: 'Aviso de privacidade',
    description:
      'Como o Consignado Cloud trata dados pessoais, nos termos da Lei Geral de Proteção de Dados Pessoais (LGPD, Lei nº 13.709/2018).',
    alertTitle: 'Não revisado por advogado',
    alert: 'Escrevi este aviso para uma demonstração técnica. Ele não foi revisado por um advogado.',
    sections: [
      {
        title: '1. Quem controla os dados',
        paragraphs: [
          'O controlador é Kaique Souza, que criou e mantém esta demo. Para falar comigo, use o formulário da página inicial.',
        ],
        link: { text: 'Abrir o formulário de contato', href: ROUTES.contact },
      },
      {
        title: '2. Visitantes',
        paragraphs: [
          'Se você usa a demo sem conta, o que você digita fica no seu navegador. Nada vai para o banco de dados, e nenhuma conta é criada para você.',
          'A Cloudflare vê o endereço IP de todo visitante por pouco tempo, para aplicar as regras de firewall e os limites de requisições.',
        ],
      },
      {
        title: '3. O que coleto dos usuários cadastrados, e por quê',
        items: [
          'Nome, e-mail, empresa e URL do LinkedIn: para criar a sua conta e saber quem usa a demo.',
          'Endereço IP e fingerprint do dispositivo, guardados só como hash com chave: para evitar abuso. A regra é uma pessoa, um teste.',
          'Quando você pede, inicia e encerra cada janela de acesso: para aplicar o limite de janelas e controlar o custo.',
          'Logs de segurança de logins e requisições: para identificar e interromper ataques.',
          'Mensagens que você envia pelo formulário de contato, com o nome e o e-mail que você informa.',
        ],
      },
      {
        title: '4. Bases legais',
        items: [
          'Consentimento (LGPD, art. 7º, I) para os dados da conta. Você dá o consentimento ao completar o perfil e pode revogar a qualquer momento.',
          'Legítimo interesse (LGPD, art. 7º, IX) para prevenção de abuso e segurança: o endereço IP, o fingerprint do dispositivo e os logs de segurança.',
        ],
      },
      {
        title: '5. Por quanto tempo guardo os dados',
        items: [
          'Dados da conta: até você pedir a eliminação, ou até a conta passar 12 meses sem uso.',
          'Logs de segurança: 90 dias.',
          'Um job diário apaga as linhas de auditoria com mais de 90 dias. Ele também apaga as contas com 12 meses sem uso, com as janelas e as mensagens de contato delas.',
          'Para apagar seus dados antes, peça pelo formulário de contato. Também apago a sua conta de convidado no Microsoft Entra ID.',
        ],
      },
      {
        title: '6. Quem trata os dados',
        items: [
          'Microsoft Azure: hospedagem, banco de dados, login (Microsoft Entra ID) e logs.',
          'Cloudflare: todo o tráfego do site passa pela Cloudflare (DNS, TLS, CDN, regras de firewall e a verificação anti-bot dos formulários). A Cloudflare vê o endereço IP e as requisições de cada visitante.',
        ],
        after: [
          'Essas empresas são operadoras. Os data centers delas podem ficar fora do Brasil. Não compartilho os dados com nenhum outro terceiro.',
        ],
      },
      {
        title: '7. Seus direitos',
        paragraphs: ['O art. 18 da LGPD garante a você estes direitos sobre os seus dados pessoais:'],
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
          'Envie uma mensagem pelo formulário de contato, a partir do e-mail da sua conta. Respondo por e-mail. Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).',
        ],
        link: { text: 'Abrir o formulário de contato', href: ROUTES.contact },
      },
      {
        title: '9. O que este site não faz',
        items: ['Não vende dados pessoais.', 'Não exibe publicidade.', 'Não usa cookies de rastreamento.'],
        after: ['Os dados de empréstimo da demo são sintéticos. Não informe dados reais de nenhuma pessoa nas telas de empréstimo.'],
      },
    ],
  },

  terms: {
    title: 'Termos de uso',
    description: 'As condições para usar o Consignado Cloud.',
    sections: [
      {
        title: '1. Uma demonstração técnica',
        paragraphs: [
          'O Consignado Cloud é uma demonstração técnica de uma arquitetura de nuvem. Não é banco nem instituição financeira. Não faz oferta de crédito, e nenhum empréstimo real é contratado, aprovado ou pago aqui. Os números das telas de empréstimo não têm valor financeiro.',
        ],
      },
      {
        title: '2. Nenhum dado pessoal real',
        paragraphs: [
          'Não informe dados pessoais reais de ninguém nas telas de empréstimo: nada de nome, CPF, renda ou empregador reais. Use o gerador aleatório da aplicação. Outros usuários cadastrados podem ver os dados do banco compartilhado.',
        ],
      },
      {
        title: '3. Uso justo e limites',
        items: [
          'Cada usuário cadastrado tem 3 janelas de acesso de 15 minutos no host Kubernetes. Concedo mais janelas sob pedido.',
          'Limites de requisições valem para todas as requisições.',
          'Uma conta por pessoa. Uma conta que parece duplicada espera a minha análise.',
          'Não ataque o serviço, não teste os limites dele com carga automatizada e não tente obter dados de outras contas.',
          'Posso reter ou bloquear uma conta a qualquer momento.',
        ],
      },
      {
        title: '4. Disponibilidade',
        paragraphs: [
          'O serviço tem um orçamento mensal. Quando o orçamento é atingido, o host Kubernetes fica pausado até o mês seguinte. Posso pausar ou parar todo o serviço a qualquer momento, sem aviso. Posso restaurar os dados da demo ao estado inicial.',
        ],
      },
      {
        title: '5. Sem garantia',
        paragraphs: [
          'O serviço é fornecido no estado em que se encontra, sem garantia de qualquer natureza. Na medida em que a lei permite, não respondo por danos decorrentes do uso do serviço ou da indisponibilidade dele.',
        ],
      },
      {
        title: '6. Privacidade',
        paragraphs: ['O aviso de privacidade diz quais dados pessoais coleto e por quê.'],
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
