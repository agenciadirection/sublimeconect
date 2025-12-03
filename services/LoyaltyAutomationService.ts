import { ZAPIService } from './ZAPIService';
import { Database } from 'better-sqlite3';
import { join } from 'path';
import { readFileSync } from 'fs';

interface CustomerProfile {
  new_client: { days: number; stamps?: number };
  casual: { days: number; visits: number; stamps: number };
  lover: { days: number; visits: number; stamps: number };
}

interface AutomationConfig {
  reactivationDays: {
    lover: number;
    casual: number;
    new_client: number;
  };
  fraudThreshold: {
    stampsInDays: number;
    days: number;
    managerPhone: string;
  };
  birthdayAdvanceDays: number;
  weeklyThanksDay: number;
}

export class LoyaltyAutomationService {
  private static instance: LoyaltyAutomationService;
  private config: AutomationConfig;

  private constructor() {
    this.config = {
      reactivationDays: {
        lover: 15,
        casual: 20,
        new_client: 30
      },
      fraudThreshold: {
        stampsInDays: 6,
        days: 3,
        managerPhone: '5562992386957'
      },
      birthdayAdvanceDays: 3,
      weeklyThanksDay: 7
    };
  }

  static getInstance(): LoyaltyAutomationService {
    if (!LoyaltyAutomationService.instance) {
      LoyaltyAutomationService.instance = new LoyaltyAutomationService();
    }
    return LoyaltyAutomationService.instance;
  }

  /**
   * Verifica inatividade de cliente e envia mensagem se necessário
   */
  static async checkInactivity(customerId: number): Promise<boolean> {
    try {
      const customer = await this.getCustomerData(customerId);
      if (!customer) return false;

      const lastVisit = new Date(customer.ultima_visita || customer.createdAt);
      const today = new Date();
      const daysDiff = Math.floor((today.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));

      const reactivationDays = this.getReactivationDaysForProfile(customer.perfil);
      
      if (daysDiff >= reactivationDays) {
        await ZAPIService.sendReactivationMessage(customer.telefone, customer.cliente, daysDiff);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Erro ao verificar inatividade:', error);
      return false;
    }
  }

  /**
   * Verifica aniversário e envia parabéns antecipado
   */
  static async checkBirthdayCampaigns(): Promise<number> {
    try {
      const customers = await this.getCustomersWithBirthdayToday();
      let sentCount = 0;

      for (const customer of customers) {
        try {
          await ZAPIService.sendBirthdayMessage(customer.telefone, customer.cliente);
          sentCount++;
          
          // Log do envio
          await this.logMessageSend(customer.telefone, 'birthday', 'sent');
        } catch (error) {
          console.error(`Erro ao enviar aniversário para ${customer.cliente}:`, error);
          await this.logMessageSend(customer.telefone, 'birthday', 'failed');
        }
      }

      return sentCount;
    } catch (error) {
      console.error('Erro na campanha de aniversário:', error);
      return 0;
    }
  }

  /**
   * Envia parabéns por marcos de selos
   */
  static async sendMilestoneCongratulations(): Promise<number> {
    try {
      const customers = await this.getCustomersWithMilestones();
      let sentCount = 0;

      for (const customer of customers) {
        try {
          await ZAPIService.sendMilestoneMessage(customer.id, customer.selos);
          sentCount++;
        } catch (error) {
          console.error(`Erro ao enviar parabéns para ${customer.cliente}:`, error);
        }
      }

      return sentCount;
    } catch (error) {
      console.error('Erro no envio de parabéns por marcos:', error);
      return 0;
    }
  }

  /**
   * Verifica atividades suspeitas e envia alerta para gerente
   */
  static async checkFraudAlerts(): Promise<number> {
    try {
      const suspiciousCustomers = await this.getSuspiciousActivity();
      let alertCount = 0;

      for (const customer of suspiciousCustomers) {
        try {
          await ZAPIService.sendManagerAlert(
            this.config.fraudThreshold.managerPhone,
            customer.cliente,
            `${customer.selos_dia} selos em ${this.config.fraudThreshold.dias} dias`
          );
          alertCount++;
        } catch (error) {
          console.error(`Erro ao enviar alerta para gerente sobre ${customer.cliente}:`, error);
        }
      }

      return alertCount;
    } catch (error) {
      console.error('Erro na verificação de fraudes:', error);
      return 0;
    }
  }

  /**
   * Envia agradecimentos semanais
   */
  static async sendWeeklyThanks(): Promise<number> {
    try {
      const customers = await this.getCustomersVisitedThisWeek();
      let sentCount = 0;

      for (const customer of customers) {
        try {
          await ZAPIService.sendWeeklyThanks(customer.telefone, customer.cliente);
          sentCount++;
        } catch (error) {
          console.error(`Erro ao enviar agradecimento para ${customer.cliente}:`, error);
        }
      }

      return sentCount;
    } catch (error) {
      console.error('Erro no envio de agradecimentos semanais:', error);
      return 0;
    }
  }

  /**
   * Executa todas as automações
   */
  static async runAllAutomations(): Promise<{
    inactivity: number;
    birthdays: number;
    milestones: number;
    fraud: number;
    weekly: number;
  }> {
    console.log('🚀 Iniciando execução de todas as automações...');

    const results = {
      inactivity: 0,
      birthdays: 0,
      milestones: 0,
      fraud: 0,
      weekly: 0
    };

    try {
      // 1. Verificar inatividade
      results.inactivity = await this.checkBulkInactivity();

      // 2. Campanhas de aniversário
      results.birthdays = await this.checkBirthdayCampaigns();

      // 3. Parabéns por marcos
      results.milestones = await this.sendMilestoneCongratulations();

      // 4. Alertas de fraude
      results.fraud = await this.checkFraudAlerts();

      // 5. Agradecimentos semanais
      results.weekly = await this.sendWeeklyThanks();

      console.log('✅ Automações concluídas:', results);
      return results;
    } catch (error) {
      console.error('❌ Erro na execução de automações:', error);
      return results;
    }
  }

  /**
   * Verifica inatividade em lote
   */
  private static async checkBulkInactivity(): Promise<number> {
    const inactiveCustomers = await this.getInactiveCustomers();
    let sentCount = 0;

    for (const customer of inactiveCustomers) {
      try {
        await this.checkInactivity(customer.id);
        sentCount++;
      } catch (error) {
        console.error(`Erro ao verificar inatividade de ${customer.cliente}:`, error);
      }
    }

    return sentCount;
  }

  /**
   * Obtém dados do cliente por ID
   */
  private static async getCustomerData(customerId: number): Promise<any> {
    // TODO: Implementar busca real no banco de dados
    // Por enquanto, retorna dados simulados
    return {
      id: customerId,
      telefone: '5562984025846',
      cliente: 'Cliente Teste',
      ultima_visita: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 35 dias atrás
      perfil: 'casual'
    };
  }

  /**
   * Obtém dias de reativação baseado no perfil
   */
  private static getReactivationDaysForProfile(profile: string): number {
    const config = this.getInstance().config;
    
    switch (profile) {
      case 'lover':
        return config.reactivationDays.lover;
      case 'casual':
        return config.reactivationDays.casual;
      case 'new_client':
      default:
        return config.reactivationDays.new_client;
    }
  }

  /**
   * Obtém clientes inativos
   */
  private static async getInactiveCustomers(): Promise<any[]> {
    // TODO: Implementar busca real no banco
    // Simulando alguns clientes inativos
    return [
      {
        id: 1,
        telefone: '5562984025846',
        cliente: 'João Silva',
        ultima_visita: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
        perfil: 'casual'
      },
      {
        id: 2,
        telefone: '5562999887766',
        cliente: 'Maria Santos',
        ultima_visita: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        perfil: 'new_client'
      }
    ];
  }

  /**
   * Obtém clientes com aniversário hoje
   */
  private static async getCustomersWithBirthdayToday(): Promise<any[]> {
    // TODO: Implementar busca real no banco
    const today = new Date();
    const todayFormatted = today.toISOString().substring(5, 10); // MM-DD
    
    // Simulando clientes com aniversário hoje
    return [
      {
        id: 3,
        telefone: '5562999554433',
        cliente: 'Ana Costa',
        data_nascimento: `1990-${todayFormatted}`
      }
    ];
  }

  /**
   * Obtém clientes com marcos de selos
   */
  private static async getCustomersWithMilestones(): Promise<any[]> {
    // TODO: Implementar busca real no banco
    return [
      {
        id: 4,
        cliente: 'Carlos Oliveira',
        selos: 20 // Completou 2 marcos (20/10)
      }
    ];
  }

  /**
   * Obtém atividade suspeita
   */
  private static async getSuspiciousActivity(): Promise<any[]> {
    // TODO: Implementar busca real no banco
    return [
      {
        id: 5,
        cliente: 'Pedro Souza',
        selos_dia: 8, // Mais de 6 selos no período
        periodo_dias: 2
      }
    ];
  }

  /**
   * Obtém clientes que visitaram esta semana
   */
  private static async getCustomersVisitedThisWeek(): Promise<any[]> {
    // TODO: Implementar busca real no banco
    return [
      {
        id: 6,
        telefone: '5562977558899',
        cliente: 'Rosa Lima'
      }
    ];
  }

  /**
   * Registra envio de mensagem no log
   */
  private static async logMessageSend(phone: string, type: string, status: string): Promise<void> {
    // TODO: Implementar log real no banco
    console.log(`Log: ${phone} - ${type} - ${status} - ${new Date().toISOString()}`);
  }

  /**
   * Obtém configuração de automações
   */
  static getConfig(): AutomationConfig {
    return this.getInstance().config;
  }

  /**
   * Atualiza configuração de automações
   */
  static updateConfig(newConfig: Partial<AutomationConfig>): void {
    const instance = this.getInstance();
    instance.config = {
      ...instance.config,
      ...newConfig
    };
  }

  /**
   * Verifica se automação está habilitada
   */
  static isAutomationEnabled(): boolean {
    // TODO: Verificar configuração no ambiente/database
    return process.env.AUTOMATION_ENABLED === 'true';
  }

  /**
   * Executa verificação de inatividade para um perfil específico
   */
  static async checkProfileInactivity(profile: string): Promise<number> {
    const config = this.getInstance().config;
    const daysThreshold = this.getReactivationDaysForProfile(profile);
    
    const inactiveCustomers = await this.getCustomersByProfileAndInactivity(profile, daysThreshold);
    let sentCount = 0;

    for (const customer of inactiveCustomers) {
      try {
        await ZAPIService.sendReactivationMessage(customer.telefone, customer.cliente, daysThreshold);
        sentCount++;
      } catch (error) {
        console.error(`Erro ao enviar reativação para ${customer.cliente}:`, error);
      }
    }

    return sentCount;
  }

  /**
   * Obtém clientes por perfil e inatividade
   */
  private static async getCustomersByProfileAndInactivity(profile: string, daysThreshold: number): Promise<any[]> {
    // TODO: Implementar busca real no banco
    const cutoffDate = new Date(Date.now() - daysThreshold * 24 * 60 * 60 * 1000);
    
    return [
      {
        id: 7,
        telefone: '5562966442211',
        cliente: `Cliente ${profile}`,
        ultima_visita: cutoffDate,
        perfil: profile
      }
    ];
  }
}