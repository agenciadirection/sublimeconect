// Migração para habilitar sistema de fidelidade avançado
// Atualiza o schema existente para suportar as novas funcionalidades

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../drizzle/schema';

const sql = postgres(process.env.DATABASE_URL || 'postgresql://localhost:5432/sublime_connect');
const db = drizzle(sql, { schema });

// Novos campos para a tabela loyaltyCustomers
const ALTER_LOYALTY_CUSTOMERS = `
-- Adicionar novos campos ao sistema de fidelidade existente
ALTER TABLE loyalty_customers 
ADD COLUMN IF NOT EXISTS vendedor VARCHAR(100),
ADD COLUMN IF NOT EXISTS valor_total DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS visitas INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ultima_visita TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS data_nascimento DATE,
ADD COLUMN IF NOT EXISTS resgatados INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS completados INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS qr_code TEXT,
ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE;

-- Adicionar índice para performance
CREATE INDEX IF NOT EXISTS idx_loyalty_customers_vendedor ON loyalty_customers(vendedor);
CREATE INDEX IF NOT EXISTS idx_loyalty_customers_perfil ON loyalty_customers(perfil);
CREATE INDEX IF NOT EXISTS idx_loyalty_customers_phone ON loyalty_customers(phone);
`;

// Tabelas para sistema completo de fidelidade
const CREATE_LOYALTY_TABLES = `
-- Histório detalhado de selos
CREATE TABLE IF NOT EXISTS loyalty_stamps_history (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES loyalty_customers(id),
  quantity INTEGER NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'redeemed')),
  reason VARCHAR(255) DEFAULT 'sale',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (customer_id) REFERENCES loyalty_customers(id) ON DELETE CASCADE
);

-- Histório geral de fidelidade
CREATE TABLE IF NOT EXISTS loyalty_history (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES loyalty_customers(id),
  sale_id INTEGER REFERENCES sales(id),
  type VARCHAR(50) NOT NULL CHECK (type IN ('stamp_added', 'prize_redeemed', 'level_changed', 'manual_adjustment')),
  stamps_added INTEGER DEFAULT 0,
  stamps_redeemed INTEGER DEFAULT 0,
  prize_id INTEGER,
  previous_level VARCHAR(50),
  new_level VARCHAR(50),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (customer_id) REFERENCES loyalty_customers(id) ON DELETE CASCADE,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL,
  FOREIGN KEY (prize_id) REFERENCES loyalty_redemptions(id) ON DELETE SET NULL
);

-- Tabela de prêmios personalizados
CREATE TABLE IF NOT EXISTS loyalty_prizes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  stamps_required INTEGER DEFAULT 10 NOT NULL,
  value DECIMAL(10,2),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de campanhas
CREATE TABLE IF NOT EXISTS campaigns (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'promotional' CHECK (type IN ('promotional', 'reminder', 'birthday', 'custom', 'inactive', 'milestone')),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'cancelled')),
  scheduled_date TIMESTAMPTZ,
  sent_date TIMESTAMPTZ,
  target_audience VARCHAR(100) DEFAULT 'all',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de mensagens WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES loyalty_customers(id),
  campaign_id INTEGER REFERENCES campaigns(id),
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('stamp_added', 'reward_redeemed', 'campaign', 'notification', 'inactive', 'milestone', 'birthday', 'welcome')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'read')),
  zapi_message_id VARCHAR(255),
  sent_at TIMESTAMPTZ,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (customer_id) REFERENCES loyalty_customers(id) ON DELETE CASCADE,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
);

-- Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_loyalty_stamps_history_customer ON loyalty_stamps_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_stamps_history_status ON loyalty_stamps_history(status);
CREATE INDEX IF NOT EXISTS idx_loyalty_stamps_history_earned ON loyalty_stamps_history(earned_at);

CREATE INDEX IF NOT EXISTS idx_loyalty_history_customer ON loyalty_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_history_type ON loyalty_history(type);
CREATE INDEX IF NOT EXISTS idx_loyalty_history_created ON loyalty_history(created_at);

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_type ON campaigns(type);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled ON campaigns(scheduled_date);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_customer ON whatsapp_messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON whatsapp_messages(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_type ON whatsapp_messages(type);
`;

// Dados iniciais para o sistema
const INSERT_INITIAL_DATA = `
-- Inserir prêmio padrão
INSERT INTO loyalty_prizes (name, description, stamps_required, value) 
VALUES ('Açaí Split Grátis', 'Prêmio por 10 selos acumulados', 10, 15.00)
ON CONFLICT DO NOTHING;

-- Inserir campanhas template
INSERT INTO campaigns (title, message, type, target_audience) VALUES
('Bem-vindos ao Programa', '🌟 Bem-vindos ao nosso programa de fidelidade! A partir de agora, a cada compra você ganha 1 selo digital. Com 10 selos você ganha 1 açaí SPLIT grátis!', 'welcome', 'all'),
('Obrigado pela Visita', '🙏 Obrigado por nos visitar! Continue comprando conosco para ganhar mais selos e prêmios incríveis!', 'promotional', 'all'),
('Retornem à Loja', '💜 Sentimos sua falta! Fazem mais de 30 dias que você não nos visita. Que tal voltar hoje e ganhar selos para prêmios incríveis?', 'inactive', 'all'),
('Parabéns Marco', '🎉 Parabéns! Você acabou de atingir um marco no nosso programa de fidelidade! Continue assim para ganhar mais prêmios!', 'milestone', 'all'),
('Aniversário Especial', '🎂 Feliz aniversário! Como presente, você ganhou 1 selo extra na sua próxima compra!', 'birthday', 'all')
ON CONFLICT DO NOTHING;

-- Atualizar existing customers com valores padrão
UPDATE loyalty_customers 
SET 
  vendedor = COALESCE(vendedor, 'sistema'),
  valor_total = COALESCE(valor_total, 0),
  visitas = COALESCE(visitas, 0),
  ativo = COALESCE(ativo, true)
WHERE vendedor IS NULL OR valor_total IS NULL;
`;

// Função para executar migração
export async function runLoyaltyMigration() {
  console.log('🚀 Iniciando migração do sistema de fidelidade...');

  try {
    // 1. Alterar tabela de clientes
    console.log('📊 Atualizando tabela loyalty_customers...');
    await sql.unsafe(ALTER_LOYALTY_CUSTOMERS);

    // 2. Criar novas tabelas
    console.log('📋 Criando tabelas do sistema avançado...');
    await sql.unsafe(CREATE_LOYALTY_TABLES);

    // 3. Inserir dados iniciais
    console.log('💾 Inserindo dados iniciais...');
    await sql.unsafe(INSERT_INITIAL_DATA);

    console.log('✅ Migração do sistema de fidelidade concluída com sucesso!');
    
    // Verificar se migração foi bem-sucedida
    const customerCount = await sql`SELECT COUNT(*) as count FROM loyalty_customers`;
    const stampHistoryCount = await sql`SELECT COUNT(*) as count FROM loyalty_stamps_history`;
    const campaignCount = await sql`SELECT COUNT(*) as count FROM campaigns`;
    
    console.log('📈 Estatísticas pós-migração:');
    console.log(`   - Clientes: ${customerCount[0]?.count || 0}`);
    console.log(`   - Histórico de selos: ${stampHistoryCount[0]?.count || 0}`);
    console.log(`   - Campanhas: ${campaignCount[0]?.count || 0}`);

  } catch (error) {
    console.error('❌ Erro na migração:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

// Função para rollback (em caso de emergência)
export async function rollbackLoyaltyMigration() {
  console.log('🔄 Executando rollback da migração...');

  try {
    // Remover tabelas criadas
    await sql.unsafe('DROP TABLE IF EXISTS whatsapp_messages CASCADE');
    await sql.unsafe('DROP TABLE IF EXISTS campaigns CASCADE');
    await sql.unsafe('DROP TABLE IF EXISTS loyalty_prizes CASCADE');
    await sql.unsafe('DROP TABLE IF EXISTS loyalty_history CASCADE');
    await sql.unsafe('DROP TABLE IF EXISTS loyalty_stamps_history CASCADE');

    // Remover índices adicionados
    await sql.unsafe('DROP INDEX IF EXISTS idx_loyalty_customers_vendedor');
    await sql.unsafe('DROP INDEX IF EXISTS idx_loyalty_customers_perfil');
    await sql.unsafe('DROP INDEX IF EXISTS idx_loyalty_customers_phone');

    // Reverter alterações na tabela loyalty_customers
    await sql.unsafe(`
      ALTER TABLE loyalty_customers 
      DROP COLUMN IF EXISTS vendedor,
      DROP COLUMN IF EXISTS valor_total,
      DROP COLUMN IF EXISTS visitas,
      DROP COLUMN IF EXISTS ultima_visita,
      DROP COLUMN IF EXISTS data_nascimento,
      DROP COLUMN IF EXISTS resgatados,
      DROP COLUMN IF EXISTS completados,
      DROP COLUMN IF EXISTS qr_code,
      DROP COLUMN IF EXISTS ativo;
    `);

    console.log('✅ Rollback concluído com sucesso!');
  } catch (error) {
    console.error('❌ Erro no rollback:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

// Função para verificar status da migração
export async function checkMigrationStatus() {
  try {
    const results = {
      loyalty_customers: await sql`SELECT COUNT(*) as count FROM loyalty_customers`,
      loyalty_stamps_history: await sql`SELECT COUNT(*) as count FROM loyalty_stamps_history`,
      loyalty_history: await sql`SELECT COUNT(*) as count FROM loyalty_history`,
      loyalty_prizes: await sql`SELECT COUNT(*) as count FROM loyalty_prizes`,
      campaigns: await sql`SELECT COUNT(*) as count FROM campaigns`,
      whatsapp_messages: await sql`SELECT COUNT(*) as count FROM whatsapp_messages`,
    };

    const status = {
      loyalty_customers: results.loyalty_customers[0]?.count || 0,
      loyalty_stamps_history: results.loyalty_stamps_history[0]?.count || 0,
      loyalty_history: results.loyalty_history[0]?.count || 0,
      loyalty_prizes: results.loyalty_prizes[0]?.count || 0,
      campaigns: results.campaigns[0]?.count || 0,
      whatsapp_messages: results.whatsapp_messages[0]?.count || 0,
    };

    console.log('📊 Status da migração:', status);
    return status;
  } catch (error) {
    console.error('❌ Erro ao verificar status:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

// Se executado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  
  switch (command) {
    case 'migrate':
      runLoyaltyMigration().catch(console.error);
      break;
    case 'rollback':
      rollbackLoyaltyMigration().catch(console.error);
      break;
    case 'status':
      checkMigrationStatus().catch(console.error);
      break;
    default:
      console.log('Uso: npm run loyalty:migrate [migrate|rollback|status]');
      break;
  }
}