#!/usr/bin/env tsx

import Database from 'better-sqlite3';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

// Funções auxiliares para gerar dados sintéticos
function generatePhone(): string {
  const numbers = '0123456789';
  const phone = '+55 62 9';
  for (let i = 0; i < 8; i++) {
    phone += numbers[Math.floor(Math.random() * numbers.length)];
  }
  return phone;
}

function generateName(): string {
  const firstNames = ['João', 'Maria', 'Pedro', 'Ana', 'Carlos', 'Laura', 'José', 'Fernanda', 'Lucas', 'Carla', 'Rafael', 'Beatriz', 'Daniel', 'Juliana', 'Bruno', 'Amanda', 'Eduardo', 'Patricia', 'Felipe', 'Roberta'];
  const lastNames = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Barbosa'];
  
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  
  return `${firstName} ${lastName}`;
}

function generateDate(startDate: Date, endDate: Date): Date {
  const start = startDate.getTime();
  const end = endDate.getTime();
  return new Date(start + Math.random() * (end - start));
}

function generateObservation(): string | null {
  const observations = [
    'Cliente preferencial',
    'Pessoa física',
    'Pessoa jurídica',
    'Cliente frequentes',
    'Novo cliente',
    'Participante do programa'
  ];
  
  return Math.random() > 0.8 ? 
    observations[Math.floor(Math.random() * observations.length)] : 
    null;
}

// Gera dados sintéticos que replicam o sistema original de fidelidade
const DEMO_DATA_PATH = './data';

function generateDemoData() {
  console.log('🎯 Gerando dados de demonstração para sistema de fidelidade...');
  
  // Criar diretório de dados se não existir
  mkdirSync(DEMO_DATA_PATH, { recursive: true });
  
  // Criar banco SQLite
  const dbPath = join(DEMO_DATA_PATH, 'fidelidade_demo.db');
  
  // Se já existe, remove para recriar
  if (existsSync(dbPath)) {
    import('fs').then(fs => fs.unlinkSync(dbPath));
  }
  
  const db = new Database(dbPath);
  
  // Criar tabelas no formato do sistema original
  db.exec(`
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telefone VARCHAR(20) UNIQUE NOT NULL,
      nome VARCHAR(100) NOT NULL,
      selos INTEGER DEFAULT 0,
      categoria VARCHAR(20) DEFAULT 'new_client',
      primeiro_selo DATE,
      ultimo_selo DATE,
      ativo BOOLEAN DEFAULT 1,
      data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
      data_ultima_atualizacao DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS selos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_id INTEGER NOT NULL,
      quantidade INTEGER NOT NULL,
      data_obtencao DATETIME DEFAULT CURRENT_TIMESTAMP,
      estabelecimento VARCHAR(100) DEFAULT 'Açaí Sublime',
      operador VARCHAR(50),
      observacoes TEXT,
      FOREIGN KEY (cliente_id) REFERENCES clientes (id)
    );
    
    CREATE TABLE IF NOT EXISTS resgates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_id INTEGER NOT NULL,
      premio VARCHAR(200) NOT NULL,
      data_resgate DATETIME DEFAULT CURRENT_TIMESTAMP,
      operacao VARCHAR(50) DEFAULT 'WEB',
      status VARCHAR(20) DEFAULT 'resgatado',
      observacoes TEXT,
      FOREIGN KEY (cliente_id) REFERENCES clientes (id)
    );
    
    CREATE TABLE IF NOT EXISTS ranking (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_id INTEGER NOT NULL,
      pontuacao INTEGER NOT NULL,
      visitas_totais INTEGER NOT NULL,
      periodo DATE,
      categoria VARCHAR(20),
      posicao INTEGER,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cliente_id) REFERENCES clientes (id)
    );
  `);
  
  // Gerar clientes
  console.log('👥 Gerando 9.604 clientes...');
  const clientes = [];
  const insertCliente = db.prepare(`
    INSERT INTO clientes (telefone, nome, selos, categoria, primeiro_selo, ultimo_selo)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  const categorias = ['new_client', 'casual', 'lover'];
  const cincoAnosAtras = new Date();
  cincoAnosAtras.setFullYear(cincoAnosAtras.getFullYear() - 7);
  
  for (let i = 0; i < 9604; i++) {
    const telefone = generatePhone();
    const nome = generateName();
    const categoria = categorias[Math.floor(Math.random() * categorias.length)];
    const selos = categoria === 'new_client' ? 
      Math.floor(Math.random() * 25) : 
      categoria === 'casual' ? 
        30 + Math.floor(Math.random() * 50) : 
        50 + Math.floor(Math.random() * 200);
    
    const primeiroSelo = generateDate(cincoAnosAtras, new Date());
    const ultimoSelo = generateDate(primeiroSelo, new Date());
    
    clientes.push({ telefone, nome, selos, categoria, primeiroSelo, ultimoSelo });
  }
  
  // Inserir clientes
  const transaction = db.transaction(() => {
    clientes.forEach((cliente, index) => {
      insertCliente.run(
        cliente.telefone,
        cliente.nome,
        cliente.selos,
        cliente.categoria,
        cliente.primeiroSelo.toISOString(),
        cliente.ultimoSelo.toISOString()
      );
    });
  });
  
  transaction();
  console.log('✅ Clientes inseridos!');
  
  // Gerar transações de selos
  console.log('🎫 Gerando 45.322 transações...');
  const insertSelo = db.prepare(`
    INSERT INTO selos (cliente_id, quantidade, data_obtencao, estabelecimento, operador, observacoes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  const transactionSelos = db.transaction(() => {
    for (let i = 0; i < 45322; i++) {
      const clienteId = Math.floor(Math.random() * 9604) + 1;
      const quantidade = Math.floor(Math.random() * 5) + 1; // 1 a 5 selos por transação
      const dataObtencao = generateDate(cincoAnosAtras, new Date());
      const estabelecimento = 'Açaí Sublime';
      const operador = ['João', 'Maria', 'Pedro', 'Ana', 'Carlos'][Math.floor(Math.random() * 5)];
      const observacoes = generateObservation();
      
      insertSelo.run(clienteId, quantidade, dataObtencao.toISOString(), estabelecimento, operador, observacoes);
    }
  });
  
  transactionSelos();
  console.log('✅ Transações inseridas!');
  
  // Gerar resgates
  console.log('🎁 Gerando 4.316 resgates...');
  const insertResgate = db.prepare(`
    INSERT INTO resgates (cliente_id, premio, data_resgate, operacao, status, observacoes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  const premios = [
    'Açaí Premium 500ml',
    'Açaí com Granola',
    'Açaí com Banana e Morango',
    'Tampa para Açaí',
    'Copinho Açaí',
    'Combo Açaí + Suco',
    'Açaí Duplo',
    'Topping Premium'
  ];
  
  const transactionResgates = db.transaction(() => {
    for (let i = 0; i < 4316; i++) {
      const clienteId = Math.floor(Math.random() * 9604) + 1;
      const premio = premios[Math.floor(Math.random() * premios.length)];
      const dataResgate = generateDate(cincoAnosAtras, new Date());
      const operacao = ['WEB', 'PDV', 'APP'][Math.floor(Math.random() * 3)];
      const status = Math.random() > 0.1 ? 'resgatado' : 'pendente';
      const observacoes = Math.random() > 0.9 ? generateObservation() : null;
      
      insertResgate.run(clienteId, premio, dataResgate.toISOString(), operacao, status, observacoes);
    }
  });
  
  transactionResgates();
  console.log('✅ Resgates inseridos!');
  
  // Atualizar ranking
  console.log('🏆 Gerando ranking...');
  const insertRanking = db.prepare(`
    INSERT OR REPLACE INTO ranking (cliente_id, pontuacao, visitas_totais, categoria, periodo)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  // Calcular pontuação baseada nos selos
  clientes.forEach((cliente, index) => {
    const visitasTotais = Math.floor(cliente.selos / Math.max(1, Math.floor(Math.random() * 3) + 1));
    const pontuacao = cliente.selos * 10 + visitasTotais * 5;
    const periodo = new Date().toISOString().split('T')[0];
    
    insertRanking.run(index + 1, pontuacao, visitasTotais, cliente.categoria, periodo);
  });
  console.log('✅ Ranking inserido!');
  
  // Estatísticas finais
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total_clientes,
      SUM(selos) as total_selos,
      (SELECT COUNT(*) FROM selos) as total_transacoes,
      (SELECT COUNT(*) FROM resgates) as total_resgates
    FROM clientes
  `).get();
  
  db.close();
  
  console.log('\n✅ Dados de demonstração criados com sucesso!');
  console.log('📊 Estatísticas dos dados gerados:');
  console.log(`   • Total de clientes: ${stats.total_clientes}`);
  console.log(`   • Total de selos: ${stats.total_selos}`);
  console.log(`   • Total de transações: ${stats.total_transacoes}`);
  console.log(`   • Total de resgates: ${stats.total_resgates}`);
  console.log(`   • Arquivo gerado: ${dbPath}`);
  
  return {
    clientes: stats.total_clientes,
    transacoes: stats.total_transacoes,
    resgates: stats.total_resgates,
    arquivo: dbPath
  };
}

// Executar geração
if (import.meta.url === `file://${process.argv[1]}`) {
  generateDemoData();
}

export { generateDemoData };