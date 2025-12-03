# Sistema de Fidelidade Integrado - Sublime Connect

## 🎯 Visão Geral

Sistema completo de fidelidade migrado do PHP/SQLite para React/TypeScript/PostgreSQL, integrando todas as funcionalidades avançadas do sistema original com uma interface moderna e responsiva.

## ✨ Funcionalidades Implementadas

### 🏢 Sistema de Fidelidade Avançado
- **Gestão Completa de Clientes**: Cadastro, edição, busca e classificação
- **Sistema de Selos**: Acumulação automática e manual com histórico detalhado
- **Classificação de Perfis**: new_client → casual → lover (baseado em visitas e selos)
- **Prêmios Personalizados**: Sistema de resgate com expiração de 30 dias
- **QR Codes**: Geração automática para identificação rápida de clientes

### 📱 Integração WhatsApp (Z-API)
- **Mensagens Automatizadas**: Boas-vindas, marcos, aniversário, reativação
- **Campanhas Personalizadas**: Segmentação por perfil de cliente
- **Teste de Conexão**: Verificação automática da API Z-API
- **Log de Envios**: Rastreamento completo de mensagens enviadas

### 🤖 Automação Inteligente
- **Reativação por Perfil**: Lover (15 dias), Casual (20 dias), New Client (30 dias)
- **Alertas de Fraude**: Detecção de padrões suspeitos
- **Parabéns por Marcos**: Notificações automáticas em 10, 20, 30 selos...
- **Lembretes Aniversário**: Mensagens com 3 dias de antecedência
- **Agradecimentos Semanais**: Reconhecimento por visitas frequentes

### 📊 Dashboard e Relatórios
- **Métricas em Tempo Real**: Total de clientes, selos, prêmios, receita
- **Ranking de Clientes**: Top 10 por selos, visitas e receita
- **Distribuição por Níveis**: Bronze, Prata, Ouro com estatísticas
- **Relatórios Detalhados**: Histórico de transações e campanhas

### 🎨 Interface Moderna
- **Design Glassmorphism**: Interface elegante com efeitos de vidro
- **Dark Mode**: Otimizado para uso em PDV
- **Responsivo**: Funciona perfeitamente em tablets e desktops
- **Animações Suaves**: Transições e feedback visual aprimorado

## 🏗️ Arquitetura Técnica

### Backend (TypeScript/Node.js)
```
server/
├── loyalty-router.ts          # Router principal do sistema
├── services/
│   ├── QRCodeService.ts       # Geração e gestão de QR Codes
│   ├── ZAPIService.ts         # Integração WhatsApp Z-API
│   ├── LoyaltyAutomationService.ts  # Automação de campanhas
│   └── LoyaltyMigrationService.ts   # Migração de dados
├── loyalty-migration.ts       # Scripts de migração
└── routers.ts                 # Integração com tRPC
```

### Frontend (React/TypeScript)
```
client/src/pages/
├── Loyalty.tsx                # Página principal (wrapper)
└── LoyaltyAdvanced.tsx        # Interface completa do sistema

client/src/components/ui/      # Componentes UI (Radix + Tailwind)
```

### Banco de Dados (PostgreSQL + Drizzle)
```sql
-- Tabelas Principais
loyalty_customers             # Clientes do programa
loyalty_stamps_history        # Histórico detalhado de selos
loyalty_history              # Histórico geral de ações
loyalty_redemptions          # Resgates de prêmios
loyalty_prizes               # Prêmios disponíveis
campaigns                    # Campanhas de marketing
whatsapp_messages            # Log de mensagens WhatsApp

-- Índices Otimizados
idx_loyalty_customers_vendedor ON loyalty_customers(vendedor)
idx_loyalty_customers_perfil  ON loyalty_customers(perfil)
idx_loyalty_stamps_history_customer ON loyalty_stamps_history(customer_id)
```

## 🚀 Instalação e Configuração

### 1. Dependências
```bash
# Instalar dependências específicas para fidelidade
npm install bcryptjs jsonwebtoken node-cron qrcode
npm install -D @types/bcryptjs @types/jsonwebtoken @types/qrcode @types/node-cron

# Ou via pnpm
pnpm add bcryptjs jsonwebtoken node-cron qrcode @types/bcryptjs @types/jsonwebtoken @types/qrcode @types/node-cron
```

### 2. Migração do Banco
```bash
# Executar migração completa
npm run loyalty:migrate

# Verificar status da migração
npm run loyalty:status

# Rollback em caso de emergência
npm run loyalty:rollback
```

### 3. Configuração de Variáveis de Ambiente
```env
# Z-API Configuration (do sistema original)
ZAPI_INSTANCE_ID=3E1439B52394C053ECD57E8E630389E4
ZAPI_TOKEN=C1659ECB05A3FDCCCAEE46DC
ZAPI_CLIENT_TOKEN=F9bbb675d53044dc9a2d2fe2448e3acedS

# Automação
AUTOMATION_ENABLED=true
INACTIVE_DAYS_THRESHOLD=30
BIRTHDAY_CAMPAIGN_ENABLED=true

# QR Codes
QR_CODE_BASE_URL=https://www.acaisublime.com.br/fidelidade
```

## 📋 Migração de Dados

### Arquivos Suportados
- **clientes.db**: Base SQLite principal (9,604 clientes)
- **capturas.csv**: Histórico de transações (45,322 registros)
- **resgates.csv**: Histórico de resgates (4,316 registros)
- **log_envios.db**: Log de mensagens WhatsApp
- **SUBLIME.csv**: Export completo de clientes

### Processo de Migração
1. **Backup Automático**: Criação de backup antes da migração
2. **Validação**: Verificação de integridade dos dados
3. **Migrção**: Transferência dos dados com conversão de formato
4. **QR Codes**: Geração automática para todos os clientes
5. **Relatório**: Estatísticas completas do processo

## 🔧 APIs e Endpoints

### tRPC Endpoints Principais
```typescript
// Clientes
trpc.loyalty.getCustomers          # Buscar clientes com filtros
trpc.loyalty.createCustomer        # Criar novo cliente
trpc.loyalty.updateCustomer        # Atualizar dados do cliente

// Selos e Transações
trpc.loyalty.addStamps            # Adicionar selos (com automação)
trpc.loyalty.redeemPrize          # Resgatar prêmio
trpc.loyalty.getCustomerHistory   # Histórico do cliente

// Campanhas e WhatsApp
trpc.loyalty.createCampaign       # Criar campanha
trpc.loyalty.sendCampaign         # Enviar campanha
trpc.loyalty.testZAPIConnection   # Testar Z-API

// Relatórios
trpc.loyalty.getDashboardStats    # Métricas principais
trpc.loyalty.getCustomerRanking   # Ranking de clientes
trpc.loyalty.getRedemptionsReport # Relatório de resgates

// QR Codes e Utilitários
trpc.loyalty.generateCustomerQRCode  # Gerar QR Code
trpc.loyalty.migrateLegacyData       # Migração de dados
```

## 🤖 Automação e Cron Jobs

### Regras de Automação
```typescript
// Reativação por perfil
lover: 15 dias de inatividade
casual: 20 dias de inatividade
new_client: 30 dias de inatividade

// Alerta de fraude
6+ selos em 3 dias → Notificação para gerente

// Aniversários
Parabéns automáticos 3 dias antes

// Marcos de selos
Parabéns em 10, 20, 30, 40, 50... selos
```

### Configuração de Cron Jobs
```bash
# Adicionar ao crontab do servidor
# Executar automações a cada 4 horas
0 */4 * * * /usr/bin/node server/loyalty-automation.js

# Verificar aniversários diariamente às 9h
0 9 * * * /usr/bin/node server/birthday-check.js

# Análise de fraudes semanalmente
0 10 * * 1 /usr/bin/node server/fraud-analysis.js
```

## 🎨 Interface e UX

### Guia de Design
- **Cores Primárias**: #8A2BE2 (Roxo Sublime), #E0409A (Rosa)
- **Dark Mode**: Fundo principal #0A0A0A, cards #141414
- **Glassmorphism**: Backdrop blur 20px + bordas sutis
- **Tipografia**: Inter font, hierarchy clara
- **Responsividade**: Mobile-first, tablet optimized

### Componentes Principais
- **StatCard**: Cards de métricas com ícones
- **QRCodeModal**: Visualização e download de QR Codes
- **AddStampsModal**: Adição de selos com validação
- **CustomerList**: Lista com busca e filtros
- **ProgressBar**: Barra de progresso para próximos prêmios

## 📈 Monitoramento e Analytics

### Métricas Chave
- **Total de Clientes**: Base ativa do programa
- **Selos Emitidos**: Volume de engajamento
- **Prêmios/Mês**: Taxa de conversão
- **Receita Total**: Impacto financeiro
- **Taxa de Retenção**: Clientes que retornam

### Logs e Debugging
```typescript
// Logs de automação
console.log('🚀 Iniciando execução de todas as automações...');
console.log('✅ Automações concluídas:', results);

// Logs de migração
console.log(`📊 Encontrados ${customers.length} clientes no sistema antigo`);
console.log(`✅ Migração concluída:`, migrationResult);

// Logs de Z-API
console.log('Erro ao enviar mensagem Z-API:', error);
```

## 🔒 Segurança e Validação

### Validações Implementadas
- **Telefone**: Formato brasileiro (11) 99999-9999
- **Email**: Validação RFC Completa
- **Selos**: Não podem ser negativos
- **Prêmios**: Requerem 10 selos mínimos
- **QR Codes**: Validação de integridade

### Autenticação
- **tRPC**: Endpoints protegidos
- **JWT**: Tokens de sessão
- **RBAC**: Controle de acesso baseado em roles
- **Rate Limiting**: Prevenção de spam

## 🚦 Roadmap e Próximas Funcionalidades

### Fase 2 - Q1 2025
- [ ] **Geolocalização**: Pontos por proximidade
- [ ] **Gamificação**: Conquistas e badges
- [ ] **API Pública**: Integrações com terceiros
- [ ] **PWA**: Aplicativo offline

### Fase 3 - Q2 2025
- [ ] **IA/ML**: Recomendações personalizadas
- [ ] **Análise Preditiva**: Churn prevention
- [ ] **Integração ERP**: Sincronização de dados
- [ ] **Multi-tenant**: Suporte a múltiplas franquias

## 🐛 Troubleshooting

### Problemas Comuns

**1. Z-API não conecta**
```bash
# Verificar credenciais
npm run loyalty:test

# Testar conexão
curl -H "client-token: SEU_TOKEN" \
     https://api.z-api.io/instance/INSTANCIA/status
```

**2. QR Code não gera**
```bash
# Verificar permissões
chmod 755 qrcodes/

# Verificar dependências
npm list qrcode
```

**3. Migração falha**
```bash
# Backup automático
npm run loyalty:rollback

# Verificar logs
tail -f logs/migration.log
```

**4. Performance lenta**
```sql
-- Verificar índices
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'loyalty_customers';

-- Otimizar queries
EXPLAIN ANALYZE SELECT * FROM loyalty_customers 
WHERE perfil = 'lover' AND ativo = true;
```

## 📞 Suporte

Para suporte técnico ou dúvidas sobre implementação:
- **Documentação**: Este README
- **Logs**: `/workspace/logs/`
- **Migrations**: `npm run loyalty:status`
- **Testes**: `npm run test loyalty`

---

## 🏆 Conclusão

Este sistema representa uma evolução completa do programa de fidelidade original, mantendo todas as funcionalidades avançadas enquanto adiciona uma interface moderna, automação inteligente e arquitetura escalável. A migração preserva 7 anos de dados históricos enquanto prepara o sistema para crescimento futuro.

**Status**: ✅ **Produção Ready**
**Compatibilidade**: PostgreSQL 13+, Node.js 18+
**Performance**: Otimizado para 10K+ clientes ativos
