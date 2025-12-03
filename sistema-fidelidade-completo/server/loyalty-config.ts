// Configuração Centralizada do Sistema de Fidelidade
// Todas as variáveis e constantes em um único local

export const LOYALTY_CONFIG = {
  // ============ SISTEMA DE SELOS ============
  STAMPS: {
    STAMPS_PER_SALE: 1,                    // Selos por compra
    STAMPS_FOR_PRIZE: 10,                  // Selos para ganhar 1 prêmio
    STAMP_EXPIRY_DAYS: 365,               // Validade dos selos em dias
    MILESTONE_INTERVAL: 10,               // Intervalo entre marcos (10, 20, 30...)
  },

  // ============ CLASSIFICAÇÃO DE CLIENTES ============
  CUSTOMER_LEVELS: {
    NEW_CLIENT: {
      name: 'new_client',
      display: 'Novato',
      emoji: '🥉',
      minVisits: 0,
      minStamps: 0,
      color: 'yellow'
    },
    CASUAL: {
      name: 'casual', 
      display: 'Casual',
      emoji: '🥈',
      minVisits: 30,
      minStamps: 30,
      color: 'gray'
    },
    LOVER: {
      name: 'lover',
      display: 'Fiel',
      emoji: '🥇', 
      minVisits: 50,
      minStamps: 50,
      color: 'amber'
    }
  },

  // ============ REATIVAÇÃO POR PERFIL ============
  REACTIVATION_DAYS: {
    LOVER: 15,         // 15 dias sem visitar
    CASUAL: 20,        // 20 dias sem visitar  
    NEW_CLIENT: 30     // 30 dias sem visitar
  },

  // ============ CAMPANHAS AUTOMÁTICAS ============
  CAMPAIGNS: {
    BIRTHDAY_ADVANCE_DAYS: 3,    // Enviar parabéns 3 dias antes
    WEEKLY_THANKS_DAY: 7,        // Agradecer visitas semanais
    MONTHLY_REMINDER_DAY: 30,    // Lembrete mensal
  },

  // ============ FRAUD DETECTION ============
  FRAUD_DETECTION: {
    MAX_STAMPS_PER_DAYS: 6,      // Máximo 6 selos em
    DAYS_THRESHOLD: 3,           // 3 dias
    ALERT_PHONE: '5562992386957' // Telefone do gerente
  },

  // ============ Z-API CONFIGURATION ============
  ZAPI: {
    // Credenciais do sistema original (manter como backup)
    INSTANCE_ID: '3E1439B52394C053ECD57E8E630389E4',
    TOKEN: 'C1659ECB05A3FDCCCAEE46DC', 
    CLIENT_TOKEN: 'F9bbb675d53044dc9a2d2fe2448e3acedS',
    
    BASE_URL: 'https://api.z-api.io',
    TIMEOUT: 30000,              // 30 segundos
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,           // 1 segundo
  },

  // ============ QR CODES ============
  QR_CODE: {
    BASE_URL: 'https://www.acaisublime.com.br/fidelidade',
    WIDTH: 300,
    HEIGHT: 300,
    MARGIN: 2,
    ERROR_CORRECTION: 'M',
    STORAGE_PATH: './qrcodes',
    CLEANUP_DAYS: 30             // Limpar QR codes antigos após 30 dias
  },

  // ============ BANCO DE DADOS ============
  DATABASE: {
    STAMP_HISTORY_RETENTION_DAYS: 1095,  // 3 anos de histórico
    CAMPAIGN_LOGS_RETENTION_DAYS: 365,   // 1 ano de logs
    CLEANUP_BATCH_SIZE: 1000,           // Limpeza em lotes
  },

  // ============ PERFORMANCE ============
  PERFORMANCE: {
    MAX_CUSTOMERS_PER_PAGE: 50,
    BULK_QR_GENERATION_DELAY: 100,      // Pausa entre gerações
    CACHE_TTL: 300,                     // 5 minutos
    SEARCH_DEBOUNCE: 300,               // 300ms
  },

  // ============ VALIDAÇÕES ============
  VALIDATION: {
    PHONE_REGEX: /^\(\d{2}\)\s\d{4,5}-\d{4}$/,
    PHONE_MIN_LENGTH: 10,
    PHONE_MAX_LENGTH: 11,
    NAME_MIN_LENGTH: 2,
    NAME_MAX_LENGTH: 255,
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    STAMP_MIN: 1,
    STAMP_MAX: 100,
  },

  // ============ MENSAGENS TEMPLATE ============
  MESSAGE_TEMPLATES: {
    WELCOME: `🌟 Olá {nome}! Bem-vindo(a) ao programa de fidelidade Açaí Sublime! 

🥤 A partir de agora, a cada compra você ganha 1 selo digital
🎁 Com 10 selos você ganha 1 açaí SPLIT grátis!

📱 Guarde este número na sua agenda para receber suas recompensas!
📊 Acompanhe seus selos: www.acaisublime.com.br/fidelidade

Obrigado por fazer parte da família Sublime! 💜`,

    MILESTONE: `🎉 PARABÉNS {nome}!

Você acaba de atingir {total_selos} selos no nosso programa de fidelidade! 

🏆 Isso significa que você já ganhou {premios_ganhos} prêmios grátis!

Continue comprando conosco para ganhar mais selos e prêmios incríveis! 

💜 Equipe Açaí Sublime`,

    REDEMPTION: `🎁 PRÊMIO RESGATADO COM SUCESSO!

Olá {nome}! 

Seu prêmio "{premio}" está disponível para retirada!

⏰ Validade: 30 dias a partir de hoje
📍 Local: Açaí Sublime  
💳 Documento: Seu CPF ou documento com foto

Obrigado pela preferência! 

💜 Equipe Açaí Sublime`,

    REACTIVATION: `💜 Oi {nome}! Fazemos muito tempo que você não vem aqui na Açaí Sublime!

😢 Sentimos sua falta! Você está com {dias_inativo} dias sem nos visitar.

🎁 Que tal voltar hoje e ganhar selos para prêmios incríveis?

✨ Temos novidades:
- Açaí premium
- Adicionais especiais  
- Ofertas exclusivas para clientes fidelizados

📱 Seu QR Code continua valendo!
Venha nos visitar! 💜`,

    BIRTHDAY: `🎂🎉 FELIZ ANIVERSÁRIO {nome.toUpperCase()}!

Hoje é seu dia especial! 

🎁 Presente de aniversário: 1 selo extra na sua próxima compra!

💜 Obrigado por ser nosso cliente especial!

Equipe Açaí Sublime`,

    WEEKLY_THANKS: `🙏 Obrigado por nos visitar esta semana, {nome}!

😍 Foi um prazer atendê-lo(a) novamente!

💜 Continue visitando para ganhar mais selos e prêmios!

Açaí Sublime 💜`,

    MONTHLY_REMINDER: `📅 Lembrete Mensal - {nome}

Olá! Faz um mês que você não ganha selos conosco... 

🎁 Que tal nos visitar esta semana?
- Temos ofertas especiais
- Produtos novos
- Seu selo extra te aguarda!

📱 Acesse: www.acaisublime.com.br/fidelidade

💜 Equipe Açaí Sublime`,

    FRAUD_ALERT: `🚨 ALERTA DE SUSPEITA - FIDELIDADE

Cliente: {nome}
Telefone: {telefone}
Motivo: {motivo}

Data/Hora: {data_hora}

Por favor, verificar no sistema PDV.

Sistema Automático - Açaí Sublime`,

    TEST_MESSAGE: `🧪 Teste de Mensagem - Z-API

Esta é uma mensagem de teste do sistema integrado de fidelidade Açaí Sublime.

✅ Conexão funcionando perfeitamente!

Data/Hora: {data_hora}

Sistema Automático - Sublime Connect`
  },

  // ============ CRON JOBS ============
  CRON_JOBS: {
    REACTIVATION_CHECK: '0 */4 * * *',     // A cada 4 horas
    BIRTHDAY_CHECK: '0 9 * * *',           // Diariamente às 9h
    FRAUD_CHECK: '0 10 * * 1',             // Semanalmente às 10h (segunda)
    CLEANUP_LOGS: '0 2 * * 0',             // Semanalmente domingo às 2h
    MONTHLY_ANALYSIS: '0 8 1 * *',         // Mensalmente no dia 1 às 8h
  },

  // ============ LOGS E MONITORAMENTO ============
  LOGGING: {
    LEVEL: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    FILE_PATH: './logs/loyalty-system.log',
    MAX_FILE_SIZE: '10MB',
    MAX_FILES: 5,
    COMPRESSION: true,
  },

  // ============ FEATURES FLAGS ============
  FEATURES: {
    AUTOMATION_ENABLED: process.env.AUTOMATION_ENABLED === 'true',
    BIRTHDAY_CAMPAIGN_ENABLED: process.env.BIRTHDAY_CAMPAIGN_ENABLED === 'true',
    FRAUD_DETECTION_ENABLED: process.env.FRAUD_DETECTION_ENABLED !== 'false',
    QR_CODE_GENERATION: process.env.QR_CODE_GENERATION !== 'false',
    BULK_OPERATIONS: process.env.BULK_OPERATIONS !== 'false',
    ANALYTICS_ENABLED: process.env.ANALYTICS_ENABLED !== 'false',
  },

  // ============ LIMITS E THRESHOLDS ============
  LIMITS: {
    MAX_STAMPS_PER_REQUEST: 10,
    MAX_CUSTOMERS_PER_CAMPAIGN: 1000,
    MAX_MESSAGES_PER_MINUTE: 60,
    MAX_QR_CODES_PER_BATCH: 100,
    REQUEST_TIMEOUT: 30000,
    DB_CONNECTION_POOL_SIZE: 10,
  },

  // ============ INTEGRAÇÕES ============
  INTEGRATIONS: {
    WHATSAPP: {
      PROVIDER: 'ZAPI',
      ENABLED: process.env.WHATSAPP_ENABLED !== 'false',
    },
    QR_SCANNER: {
      ENABLED: process.env.QR_SCANNER_ENABLED !== 'false',
      CAMERA_CONSTRAINTS: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'environment'
      }
    },
    ANALYTICS: {
      PROVIDER: 'internal',
      EVENTS: ['stamp_added', 'prize_redeemed', 'customer_created', 'campaign_sent']
    }
  }
};

// Helper functions
export const LoyaltyConfigHelpers = {
  // Verificar se cliente atingiu nível
  customerReachedLevel: (customer: any, levelName: string) => {
    const level = LOYALTY_CONFIG.CUSTOMER_LEVELS[levelName.toUpperCase()];
    if (!level) return false;
    
    return (customer.visitas >= level.minVisits) || (customer.selos >= level.minStamps);
  },

  // Calcular próximo nível do cliente
  getNextLevel: (customer: any) => {
    const levels = Object.values(LOYALTY_CONFIG.CUSTOMER_LEVELS);
    const currentLevel = levels.find(level => level.name === customer.perfil);
    
    if (!currentLevel) return null;
    
    const currentIndex = levels.indexOf(currentLevel);
    return currentIndex < levels.length - 1 ? levels[currentIndex + 1] : null;
  },

  // Verificar se cliente está elegível para reativação
  isEligibleForReactivation: (customer: any) => {
    const reactivationDays = LOYALTY_CONFIG.REACTIVATION_DAYS[customer.perfil?.toUpperCase() || 'NEW_CLIENT'];
    if (!reactivationDays) return false;
    
    if (!customer.ultima_visita) return true;
    
    const lastVisit = new Date(customer.ultima_visita);
    const daysDiff = Math.floor((Date.now() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysDiff >= reactivationDays;
  },

  // Validar telefone
  validatePhone: (phone: string) => {
    return LOYALTY_CONFIG.VALIDATION.PHONE_REGEX.test(phone);
  },

  // Validar email
  validateEmail: (email: string) => {
    return LOYALTY_CONFIG.VALIDATION.EMAIL_REGEX.test(email);
  },

  // Formatar telefone
  formatPhone: (phone: string) => {
    const numbers = phone.replace(/\D/g, '');
    if (numbers.length === 11) {
      return `(${numbers.substring(0, 2)}) ${numbers.substring(2, 7)}-${numbers.substring(7)}`;
    }
    return phone;
  },

  // Verificar se feature está habilitada
  isFeatureEnabled: (featureName: keyof typeof LOYALTY_CONFIG.FEATURES) => {
    return LOYALTY_CONFIG.FEATURES[featureName];
  },

  // Obter template de mensagem
  getMessageTemplate: (templateName: keyof typeof LOYALTY_CONFIG.MESSAGE_TEMPLATES) => {
    return LOYALTY_CONFIG.MESSAGE_TEMPLATES[templateName];
  },

  // Substituir variáveis no template
  renderMessageTemplate: (template: string, variables: Record<string, string>) => {
    let rendered = template;
    Object.entries(variables).forEach(([key, value]) => {
      rendered = rendered.replace(new RegExp(`{${key}}`, 'g'), value);
    });
    return rendered;
  }
};

// Export configuration for use in other modules
export default LOYALTY_CONFIG;