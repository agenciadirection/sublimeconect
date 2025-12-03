import axios from 'axios';

// Configuração Z-API baseada no sistema original
const ZAPI_CONFIG = {
  instanceId: '3E1439B52394C053ECD57E8E630389E4',
  token: 'C1659ECB05A3FDCCCAEE46DC',
  clientToken: 'F9bbb675d53044dc9a2d2fe2448e3acedS',
  baseURL: 'https://api.z-api.io',
};

interface ZAPIMessage {
  phone: string;
  message: string;
  type?: 'text' | 'template';
}

interface ZAPIResponse {
  status: 'success' | 'error';
  message?: string;
  data?: any;
}

export class ZAPIService {
  private static instance: ZAPIService;
  
  private constructor() {}

  static getInstance(): ZAPIService {
    if (!ZAPIService.instance) {
      ZAPIService.instance = new ZAPIService();
    }
    return ZAPIService.instance;
  }

  /**
   * Testa a conexão com Z-API
   */
  static async testConnection(): Promise<boolean> {
    try {
      const response = await axios.get(
        `${ZAPI_CONFIG.baseURL}/instance/${ZAPI_CONFIG.instanceId}/status`,
        {
          headers: {
            'client-token': ZAPI_CONFIG.clientToken,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );
      
      return response.status === 200 && response.data.status === 'online';
    } catch (error) {
      console.error('Erro ao testar conexão Z-API:', error);
      return false;
    }
  }

  /**
   * Envia mensagem de texto via Z-API
   */
  static async sendTextMessage(phone: string, message: string): Promise<ZAPIResponse> {
    try {
      const formattedPhone = this.formatPhoneForZAPI(phone);
      
      const response = await axios.post(
        `${ZAPI_CONFIG.baseURL}/instance/${ZAPI_CONFIG.instanceId}/send-text`,
        {
          phone: formattedPhone,
          message: message,
        },
        {
          headers: {
            'client-token': ZAPI_CONFIG.clientToken,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      if (response.status === 200) {
        return {
          status: 'success',
          data: response.data,
        };
      } else {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
    } catch (error: any) {
      console.error('Erro ao enviar mensagem Z-API:', error);
      return {
        status: 'error',
        message: error.response?.data?.message || error.message || 'Erro desconhecido',
      };
    }
  }

  /**
   * Envia mensagem de boas-vindas para novo cliente
   */
  static async sendWelcomeMessage(phone: string, customerName: string): Promise<ZAPIResponse> {
    const message = `🌟 Olá ${customerName}! Bem-vindo(a) ao programa de fidelidade Açaí Sublime! 

🥤 A partir de agora, a cada compra você ganha 1 selo digital
🎁 Com 10 selos você ganha 1 açaí SPLIT grátis!

📱 Guarde este número na sua agenda para receber suas recompensas!
📊 Acompanhe seus selos: www.acaisublime.com.br/fidelidade

Obrigado por fazer parte da família Sublime! 💜`;

    return this.sendTextMessage(phone, message);
  }

  /**
   * Envia notificação de parabéns por marco atingido
   */
  static async sendMilestoneMessage(customerId: number, totalStamps: number): Promise<ZAPIResponse> {
    // Aqui você buscaria o telefone do cliente no banco
    // Por enquanto, retornando sucesso simulado
    const customerPhone = await this.getCustomerPhoneById(customerId);
    const customerName = await this.getCustomerNameById(customerId);
    
    const message = `🎉 PARABÉNS ${customerName}!

Você acaba de atingir ${totalStamps} selos no nosso programa de fidelidade! 

🏆 Isso significa que você já ganhou ${Math.floor(totalStamps / 10)} prêmios grátis!

Continue comprando conosco para ganhar mais selos e prêmios incríveis! 

💜 Equipe Açaí Sublime`;

    return this.sendTextMessage(customerPhone, message);
  }

  /**
   * Envia notificação de prêmio resgatado
   */
  static async sendRedemptionMessage(customerId: number, prizeName: string): Promise<ZAPIResponse> {
    const customerPhone = await this.getCustomerPhoneById(customerId);
    const customerName = await this.getCustomerNameById(customerId);
    
    const message = `🎁 PRÊMIO RESGATADO COM SUCESSO!

Olá ${customerName}! 

Seu prêmio "${prizeName}" está disponível para retirada!

⏰ Validade: 30 dias a partir de hoje
📍 Local: Açaí Sublime
💳 Documento: Seu CPF ou documento com foto

Obrigado pela preferência! 

💜 Equipe Açaí Sublime`;

    return this.sendTextMessage(customerPhone, message);
  }

  /**
   * Envia campanha para reativação de clientes inativos
   */
  static async sendReactivationMessage(phone: string, customerName: string, daysInactive: number): Promise<ZAPIResponse> {
    const message = `💜 Oi ${customerName}! Fazemos muito tempo que você não vem aqui na Açaí Sublime!

😢 Sentimos sua falta! Você está com ${daysInactive} dias sem nos visitar.

🎁 Que tal voltar hoje e ganhar selos para prêmios incríveis?

✨ Temos novidades:
- Açaí premium
- Adicionais especiais
- Ofertas exclusivas para clientes fidelizados

📱 Seu QR Code continua valendo!
Venha nos visitar! 💜

Equpe Açaí Sublime`;

    return this.sendTextMessage(phone, message);
  }

  /**
   * Envia mensagem personalizada de campanha
   */
  static async sendCampaignMessage(phone: string, message: string): Promise<ZAPIResponse> {
    return this.sendTextMessage(phone, message);
  }

  /**
   * Envia mensagem de parabéns por aniversário
   */
  static async sendBirthdayMessage(phone: string, customerName: string): Promise<ZAPIResponse> {
    const message = `🎂🎉 FELIZ ANIVERSÁRIO ${customerName.toUpperCase()}!

Hoje é seu dia especial! 

🎁 Presente de aniversário: 1 selo extra na sua próxima compra!

💜 Obrigado por ser nosso cliente especial!

Equipe Açaí Sublime`;

    return this.sendTextMessage(phone, message);
  }

  /**
   * Envia alerta de suspeita de fraude para gerente
   */
  static async sendManagerAlert(phone: string, customerName: string, reason: string): Promise<ZAPIResponse> {
    const message = `🚨 ALERTA DE SUSPEITA - FIDELIDADE

Cliente: ${customerName}
Telefone: ${phone}
Motivo: ${reason}

Data/Hora: ${new Date().toLocaleString('pt-BR')}

Por favor, verificar no sistema PDV.

Sistema Automático - Açaí Sublime`;

    return this.sendTextMessage(phone, message);
  }

  /**
   * Envia lembrete mensal
   */
  static async sendMonthlyReminder(phone: string, customerName: string): Promise<ZAPIResponse> {
    const message = `📅 Lembrete Mensal - ${customerName}

Olá! Faz um mês que você não ganha selos conosco... 

🎁 Que tal nos visitar esta semana?
- Temos ofertas especiais
- Produtos novos
- Seu selo extra te aguarda!

📱 Acesse: www.acaisublime.com.br/fidelidade

💜 Equipe Açaí Sublime`;

    return this.sendTextMessage(phone, message);
  }

  /**
   * Envia agradecimento por visita semanal
   */
  static async sendWeeklyThanks(phone: string, customerName: string): Promise<ZAPIResponse> {
    const message = `🙏 Obrigado por nos visitar esta semana, ${customerName}!

😍 Foi um prazer atendê-lo(a) novamente!

💜 Continue visitando para ganhar mais selos e prêmios!

Açaí Sublime 💜`;

    return this.sendTextMessage(phone, message);
  }

  /**
   * Busca telefone do cliente por ID (mock - implementar com DB real)
   */
  private static async getCustomerPhoneById(customerId: number): Promise<string> {
    // TODO: Implementar busca no banco de dados
    // Por enquanto, retorna número fixo para teste
    return '5562984025846';
  }

  /**
   * Busca nome do cliente por ID (mock - implementar com DB real)
   */
  private static async getCustomerNameById(customerId: number): Promise<string> {
    // TODO: Implementar busca no banco de dados
    // Por enquanto, retorna nome fixo para teste
    return 'Cliente';
  }

  /**
   * Formata telefone para formato Z-API (internacional +55)
   */
  private static formatPhoneForZAPI(phone: string): string {
    // Remove tudo que não é número
    const numbers = phone.replace(/\D/g, '');
    
    // Adiciona código do país se não tiver
    if (!numbers.startsWith('55')) {
      return `55${numbers}`;
    }
    
    return numbers;
  }

  /**
   * Valida se o telefone é válido para envio
   */
  static isValidPhone(phone: string): boolean {
    const numbers = phone.replace(/\D/g, '');
    return numbers.length >= 10 && numbers.length <= 13;
  }

  /**
   * Envia mensagem de teste
   */
  static async sendTestMessage(phone?: string): Promise<ZAPIResponse> {
    const testPhone = phone || '5562984025846'; // Telefone de teste do sistema original
    
    const message = `🧪 Teste de Mensagem - Z-API

Esta é uma mensagem de teste do sistema integrado de fidelidade Açaí Sublime.

✅ Conexão funcionando perfeitamente!

Data/Hora: ${new Date().toLocaleString('pt-BR')}

Sistema Automático - Sublime Connect`;

    return this.sendTextMessage(testPhone, message);
  }

  /**
   * Retorna status da instância Z-API
   */
  static async getInstanceStatus(): Promise<any> {
    try {
      const response = await axios.get(
        `${ZAPI_CONFIG.baseURL}/instance/${ZAPI_CONFIG.instanceId}/status`,
        {
          headers: {
            'client-token': ZAPI_CONFIG.clientToken,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );
      
      return response.data;
    } catch (error: any) {
      console.error('Erro ao verificar status da instância:', error);
      return {
        status: 'offline',
        error: error.message
      };
    }
  }

  /**
   * Envia mensagem com Template (futuro)
   */
  static async sendTemplateMessage(phone: string, template: string, variables: Record<string, string>): Promise<ZAPIResponse> {
    // TODO: Implementar envio de templates Z-API
    // Por enquanto, converte template para texto simples
    let message = template;
    
    Object.entries(variables).forEach(([key, value]) => {
      message = message.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    });
    
    return this.sendTextMessage(phone, message);
  }
}