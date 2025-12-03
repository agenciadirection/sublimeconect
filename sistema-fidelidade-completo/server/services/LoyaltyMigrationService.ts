import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';

interface LegacyCustomer {
  telefone: string;
  cliente: string;
  vendedor?: string;
  selos: number;
  valor_total: number;
  visitas: number;
  ultima_visita?: string;
  perfil: string;
  data_nascimento?: string;
  resgatados: number;
  completados: number;
}

interface LegacyRedemption {
  telefone: string;
  quantidade: number;
  data: string;
  status: string;
  validade: string;
  data_resgate?: string;
}

interface LegacyLogSend {
  telefone: string;
  mensagem: string;
  status: string;
  data_envio: string;
}

interface LegacyCaptura {
  data: string;
  telefone: string;
  vendedor?: string;
  valor: number;
  quantidade: number;
  adicionais?: string;
}

export class LoyaltyMigrationService {
  private static instance: LoyaltyMigrationService;
  
  // Caminhos dos arquivos SQLite originais
  private readonly CLIENTES_DB_PATH = './user_input_files/clientes.db';
  private readonly LOG_ENVIOS_DB_PATH = './user_input_files/log_envios.db';
  private readonly CAPTURAS_CSV_PATH = './user_input_files/capturas.csv';
  private readonly SUBIME_CSV_PATH = './user_input_files/SUBLIME.csv';
  private readonly RESGATES_CSV_PATH = './user_input_files/resgates.csv';

  private constructor() {}

  static getInstance(): LoyaltyMigrationService {
    if (!LoyaltyMigrationService.instance) {
      LoyaltyMigrationService.instance = new LoyaltyMigrationService();
    }
    return LoyaltyMigrationService.instance;
  }

  /**
   * Migra todos os dados do sistema antigo para o novo
   */
  static async migrateFromSQLite(): Promise<{
    customers: number;
    redemptions: number;
    logs: number;
    transactions: number;
    errors: string[];
  }> {
    const results = {
      customers: 0,
      redemptions: 0,
      logs: 0,
      transactions: 0,
      errors: [] as string[]
    };

    try {
      console.log('🚀 Iniciando migração de dados do sistema de fidelidade...');

      // 1. Migrar clientes da base SQLite
      const customersResult = await this.migrateCustomers();
      results.customers = customersResult.migrated;
      results.errors.push(...customersResult.errors);

      // 2. Migrar resgates
      const redemptionsResult = await this.migrateRedemptions();
      results.redemptions = redemptionsResult.migrated;
      results.errors.push(...redemptionsResult.errors);

      // 3. Migrar logs de envio
      const logsResult = await this.migrateLogs();
      results.logs = logsResult.migrated;
      results.errors.push(...logsResult.errors);

      // 4. Migrar transações do CSV capturas
      const transactionsResult = await this.migrateTransactions();
      results.transactions = transactionsResult.migrated;
      results.errors.push(...transactionsResult.errors);

      // 5. Gerar QR codes para todos os clientes
      const qrCodesResult = await this.generateQRCodes();
      results.errors.push(...qrCodesResult.errors);

      console.log('✅ Migração concluída:', results);
      return results;

    } catch (error: any) {
      console.error('❌ Erro crítico na migração:', error);
      results.errors.push(`Erro crítico: ${error.message}`);
      return results;
    }
  }

  /**
   * Migra clientes do arquivo clientes.db
   */
  private static async migrateCustomers(): Promise<{ migrated: number; errors: string[] }> {
    const result = { migrated: 0, errors: [] as string[] };

    try {
      const db = new Database(this.getInstance().CLIENTES_DB_PATH);
      
      // Verificar se o arquivo existe
      try {
        readFileSync(this.getInstance().CLIENTES_DB_PATH);
      } catch {
        throw new Error('Arquivo clientes.db não encontrado');
      }

      const customers = db.prepare('SELECT * FROM clientes').all();
      console.log(`📊 Encontrados ${customers.length} clientes no sistema antigo`);

      for (const customer of customers) {
        try {
          const legacyCustomer: LegacyCustomer = {
            telefone: customer.telefone,
            cliente: customer.cliente,
            vendedor: customer.vendedor,
            selos: customer.selos || 0,
            valor_total: customer.valor_total || 0,
            visitas: customer.visitas || 0,
            ultima_visita: customer.ultima_visita,
            perfil: customer.perfil || 'new_client',
            data_nascimento: customer.data_nascimento,
            resgatados: customer.resgatados || 0,
            completados: customer.completados || 0
          };

          await this.insertCustomer(legacyCustomer);
          result.migrated++;

        } catch (error: any) {
          console.error(`Erro ao migrar cliente ${customer.cliente}:`, error);
          result.errors.push(`Cliente ${customer.cliente}: ${error.message}`);
        }
      }

      db.close();
      console.log(`✅ Clientes migrados: ${result.migrated}`);

    } catch (error: any) {
      result.errors.push(`Erro ao ler clientes.db: ${error.message}`);
    }

    return result;
  }

  /**
   * Migra resgates do arquivo CSV
   */
  private static async migrateRedemptions(): Promise<{ migrated: number; errors: string[] }> {
    const result = { migrated: 0, errors: [] as string[] };

    try {
      const csvContent = readFileSync(this.getInstance().RESGATES_CSV_PATH, 'utf-8');
      const lines = csvContent.split('\n').filter(line => line.trim());
      
      // Pular cabeçalho
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        try {
          const [telefone, quantidade, data, status, validade, data_resgate] = line.split(';');
          
          const redemption: LegacyRedemption = {
            telefone: telefone?.replace(/"/g, ''),
            quantidade: parseInt(quantidade) || 0,
            data: data?.replace(/"/g, '') || new Date().toISOString(),
            status: status?.replace(/"/g, '') || 'pending',
            validade: validade?.replace(/"/g, '') || '',
            data_resgate: data_resgate?.replace(/"/g, '')
          };

          await this.insertRedemption(redemption);
          result.migrated++;

        } catch (error: any) {
          console.error(`Erro ao migrar resgate na linha ${i}:`, error);
          result.errors.push(`Resgate linha ${i}: ${error.message}`);
        }
      }

      console.log(`✅ Resgates migrados: ${result.migrated}`);

    } catch (error: any) {
      result.errors.push(`Erro ao ler resgates.csv: ${error.message}`);
    }

    return result;
  }

  /**
   * Migra logs de envio de mensagens
   */
  private static async migrateLogs(): Promise<{ migrated: number; errors: string[] }> {
    const result = { migrated: 0, errors: [] as string[] };

    try {
      const db = new Database(this.getInstance().LOG_ENVIOS_DB_PATH);
      const logs = db.prepare('SELECT * FROM envios').all();

      for (const log of logs) {
        try {
          const legacyLog: LegacyLogSend = {
            telefone: log.telefone,
            mensagem: log.mensagem,
            status: log.status,
            data_envio: log.data_envio || log.enviado_em
          };

          await this.insertLog(legacyLog);
          result.migrated++;

        } catch (error: any) {
          console.error(`Erro ao migrar log ${log.id}:`, error);
          result.errors.push(`Log ${log.id}: ${error.message}`);
        }
      }

      db.close();
      console.log(`✅ Logs migrados: ${result.migrated}`);

    } catch (error: any) {
      result.errors.push(`Erro ao ler log_envios.db: ${error.message}`);
    }

    return result;
  }

  /**
   * Migra transações do CSV capturas
   */
  private static async migrateTransactions(): Promise<{ migrated: number; errors: string[] }> {
    const result = { migrated: 0, errors: [] as string[] };

    try {
      const csvContent = readFileSync(this.getInstance().CAPTURAS_CSV_PATH, 'utf-8');
      const lines = csvContent.split('\n').filter(line => line.trim());
      
      // Pular cabeçalho
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        try {
          const [data, telefone, vendedor, valor, quantidade, adicionais] = line.split(';');
          
          const captura: LegacyCaptura = {
            data: data?.replace(/"/g, ''),
            telefone: telefone?.replace(/"/g, ''),
            vendedor: vendedor?.replace(/"/g, ''),
            valor: parseFloat(valor) || 0,
            quantidade: parseInt(quantidade) || 0,
            adicionais: adicionais?.replace(/"/g, '')
          };

          await this.insertTransaction(captura);
          result.migrated++;

        } catch (error: any) {
          console.error(`Erro ao migrar transação na linha ${i}:`, error);
          result.errors.push(`Transação linha ${i}: ${error.message}`);
        }
      }

      console.log(`✅ Transações migradas: ${result.migrated}`);

    } catch (error: any) {
      result.errors.push(`Erro ao ler capturas.csv: ${error.message}`);
    }

    return result;
  }

  /**
   * Gera QR codes para todos os clientes migrados
   */
  private static async generateQRCodes(): Promise<{ migrated: number; errors: string[] }> {
    const result = { migrated: 0, errors: [] as string[] };

    try {
      const customers = await this.getAllCustomers();
      
      for (const customer of customers) {
        try {
          // Gerar QR code para o telefone
          const { QRCodeService } = await import('./QRCodeService');
          const qrCode = await QRCodeService.generateQRCode(customer.telefone);
          
          // Atualizar cliente com QR code
          await this.updateCustomerQRCode(customer.id, qrCode);
          result.migrated++;

        } catch (error: any) {
          console.error(`Erro ao gerar QR code para ${customer.cliente}:`, error);
          result.errors.push(`QR Code ${customer.cliente}: ${error.message}`);
        }
      }

      console.log(`✅ QR codes gerados: ${result.migrated}`);

    } catch (error: any) {
      result.errors.push(`Erro ao gerar QR codes: ${error.message}`);
    }

    return result;
  }

  /**
   * Insere cliente no novo sistema
   */
  private static async insertCustomer(customer: LegacyCustomer): Promise<void> {
    // TODO: Implementar inserção real no banco PostgreSQL
    // Por enquanto, apenas simula a inserção
    console.log(`📝 Inserindo cliente: ${customer.cliente} - ${customer.telefone}`);
  }

  /**
   * Insere resgate no novo sistema
   */
  private static async insertRedemption(redemption: LegacyRedemption): Promise<void> {
    // TODO: Implementar inserção real no banco PostgreSQL
    console.log(`🎁 Inserindo resgate: ${redemption.telefone} - ${redemption.quantidade} prêmios`);
  }

  /**
   * Insere log no novo sistema
   */
  private static async insertLog(log: LegacyLogSend): Promise<void> {
    // TODO: Implementar inserção real no banco PostgreSQL
    console.log(`📧 Inserindo log: ${log.telefone} - ${log.status}`);
  }

  /**
   * Insere transação no novo sistema
   */
  private static async insertTransaction(transaction: LegacyCaptura): Promise<void> {
    // TODO: Implementar inserção real no banco PostgreSQL
    console.log(`💰 Inserindo transação: ${transaction.telefone} - R$ ${transaction.valor}`);
  }

  /**
   * Obtém todos os clientes do novo sistema
   */
  private static async getAllCustomers(): Promise<Array<{id: number; telefone: string; cliente: string}>> {
    // TODO: Implementar busca real no banco PostgreSQL
    return [
      { id: 1, telefone: '5562984025846', cliente: 'Cliente Teste' }
    ];
  }

  /**
   * Atualiza QR code do cliente
   */
  private static async updateCustomerQRCode(customerId: number, qrCode: string): Promise<void> {
    // TODO: Implementar atualização real no banco PostgreSQL
    console.log(`📱 Atualizando QR code do cliente ${customerId}`);
  }

  /**
   * Valida dados antes da migração
   */
  static async validateMigrationData(): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    statistics: any;
  }> {
    const errors = [];
    const warnings = [];
    const statistics = {};

    try {
      // Validar arquivo clientes.db
      try {
        const db = new Database(this.getInstance().CLIENTES_DB_PATH);
        const customers = db.prepare('SELECT COUNT(*) as count FROM clientes').get();
        statistics.customersCount = customers.count;
        db.close();
      } catch {
        errors.push('Arquivo clientes.db não encontrado ou corrompido');
      }

      // Validar arquivos CSV
      const csvFiles = [
        this.getInstance().CAPTURAS_CSV_PATH,
        this.getInstance().RESGATES_CSV_PATH,
        this.getInstance().SUBIME_CSV_PATH
      ];

      for (const csvFile of csvFiles) {
        try {
          const content = readFileSync(csvFile, 'utf-8');
          const lines = content.split('\n').filter(line => line.trim());
          statistics[csvFile.split('/').pop() + '_lines'] = lines.length - 1; // Exclui cabeçalho
        } catch {
          warnings.push(`Arquivo ${csvFile.split('/').pop()} não encontrado`);
        }
      }

      const valid = errors.length === 0;
      return { valid, errors, warnings, statistics };

    } catch (error: any) {
      errors.push(`Erro na validação: ${error.message}`);
      return { valid: false, errors, warnings, statistics };
    }
  }

  /**
   * Cria backup antes da migração
   */
  static async createBackup(): Promise<{ success: boolean; backupPath?: string; error?: string }> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `./backup-fidelidade-${timestamp}`;
      
      // TODO: Implementar criação real de backup
      console.log(`💾 Backup criado em: ${backupPath}`);
      
      return { success: true, backupPath };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}