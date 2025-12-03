# 🚀 Guia de Uso - Sistema de Fidelidade Integrado

## 🎯 Como Acessar o Sistema

1. **Acesse o PDV Sublime Connect** na aba "FIDELIDADE"
2. **Interface moderna** com design dark mode e glassmorphism
3. **6 abas principais**: Dashboard, Clientes, Campanhas, Relatórios, Automação, Config

## 📊 Dashboard Principal

### Métricas em Tempo Real
- **Total de Clientes**: Base ativa do programa
- **Selos Emitidos**: Volume total de engajamento
- **Prêmios Resgatados/Mês**: Taxa de conversão
- **Receita Total**: Faturamento dos clientes fidelizados

### Ações Rápidas
- **Novo Cliente**: Cadastrar cliente rapidamente
- **Nova Campanha**: Criar campanha WhatsApp
- **Testar Z-API**: Verificar conexão WhatsApp
- **Ver Relatórios**: Acessar análises detalhadas

## 👥 Gestão de Clientes

### Buscar Cliente
1. **Digite o telefone** no campo de busca
2. **Clique em "Buscar"** ou pressione Enter
3. **Visualize detalhes** completos do cliente

### Adicionar Selos
1. **Selecione o cliente** na busca
2. **Clique em "Adicionar Selos"**
3. **Informe quantidade** (padrão: 1 selo por compra)
4. **Digite o vendedor** (opcional)
5. **Clique em "Adicionar"**

### Resgatar Prêmio
- **Automático**: Quando cliente atinge 10 selos
- **Manual**: Cliente com 10+ selos vê botão "Resgatar Prêmio"
- **Validação**: Sistema verifica elegibilidade

### QR Code
1. **Clique em "QR Code"** no cliente selecionado
2. **QR Code é gerado** automaticamente
3. **Use para identificação rápida** no PDV
4. **Imprima ou mostre** na tela para cliente

## 💬 Campanhas WhatsApp

### Tipos de Campanha
- **Boas-vindas**: Para novos clientes
- **Reativação**: Para clientes inativos  
- **Parabéns**: Por marcos de selos
- **Aniversário**: Mensagens especiais
- **Promocionais**: Ofertas gerais

### Criar Campanha
1. **Aba "Campanhas"**
2. **Clique em "Nova Campanha"**
3. **Preencha dados**:
   - Título da campanha
   - Mensagem (use templates)
   - Audiência (todos, lover, casual, new_client)
4. **Agende ou envie** imediatamente

### Templates Prontos
- **Bem-vindos**: Mensagem de boas-vindas
- **Obrigado**: Agradecimento por visita
- **Reativação**: Retorno de clientes inativos
- **Parabéns**: Marcos de selos
- **Aniversário**: Mensagem especial

## 📈 Relatórios e Analytics

### Rankings
- **Top 10 clientes** por selos
- **Por receita** total
- **Por número** de visitas
- **Por tempo** de fidelidade

### Filtros Disponíveis
- **Período**: Semana, mês, ano, personalizado
- **Vendedor**: Filtrar por vendedor específico
- **Perfil**: Bronze, Prata, Ouro
- **Status**: Ativo, inativo, novo

### Métricas Detalhadas
- **Evolução** de clientes no tempo
- **Taxa de retenção** por perfil
- **Conversão** de selos em prêmios
- **ROI** do programa de fidelidade

## 🤖 Automação

### Regras Automáticas
- **Lover**: Reativação após 15 dias
- **Casual**: Reativação após 20 dias  
- **New Client**: Reativação após 30 dias
- **Marcos**: Parabéns em 10, 20, 30... selos
- **Aniversário**: 3 dias antes da data

### Configurações
1. **Habilitar automação**: Toggle no topo
2. **Definir horários**: Melhor momento para enviar
3. **Personalizar mensagens**: Editar templates
4. **Monitorar resultados**: Acompanhar taxas

## ⚙️ Configurações

### Níveis de Cliente
- **Bronze (Novato)**: 0-29 visitas/selos
- **Prata (Casual)**: 30-49 visitas/selos
- **Ouro (Fiel)**: 50+ visitas/selos

### Integrações
- **Z-API**: Configuração WhatsApp
- **QR Scanner**: Ativar câmera para leitura
- **Backup**: Configurar backups automáticos

## 🔍 Funcionalidades Especiais

### Busca Avançada
- **Por telefone**: Busca exata
- **Por nome**: Busca parcial
- **Por vendedor**: Filtrar por vendedor
- **Por perfil**: Filtrar por nível
- **Por data**: Filtrar por período

### Import/Export
- **Export CSV**: Baixar lista de clientes
- **Import CSV**: Importar clientes em lote
- **Backup completo**: Export de todos os dados

### Histórico Completo
- **Log de transações**: Todos os selos adicionados
- **Histórico de prêmios**: Resgates realizados
- **Campanhas enviadas**: Log de mensagens WhatsApp
- **Alterações**: Log de todas as modificações

## 🚨 Alertas e Notificações

### Alertas Automáticos
- **Fraude suspeita**: Mais de 6 selos em 3 dias
- **Clientes inativos**: Reativação automática
- **Marcos atingidos**: Parabéns automáticos
- **Aniversários**: Mensagens especiais

### Notificações em Tempo Real
- **Selos adicionados**: Feedback imediato
- **Prêmios resgatados**: Confirmação instantânea
- **Erros de sistema**: Alertas técnicos
- **Backup completo**: Status de migrações

## 💡 Dicas de Uso

### Fluxo de Trabalho Eficiente
1. **Sempre busque** cliente antes de adicionar selos
2. **Use QR Code** para identificação rápida
3. **Monitore dashboard** para insights diários
4. **Execute campanhas** em horários de pico
5. **Analise relatórios** semanalmente

### Melhores Práticas
- **Mantenha dados atualizados**: Telefone, email, nascimento
- **Use nomes descritivos** para vendedores
- **Monitore métricas** de engajamento
- **Teste campanhas** antes de enviar em massa
- **Faça backup** antes de alterações grandes

### Solução de Problemas
- **Cliente não encontrado**: Verifique formatação do telefone
- **QR Code não gera**: Verifique conexão com internet
- **Mensagem não envia**: Teste conexão Z-API
- **Sistema lento**: Verifique conexão com banco de dados

## 📞 Suporte

### Recursos Disponíveis
- **Documentação**: `FIDELIDADE_README.md`
- **Guia Técnico**: Este documento
- **Logs do Sistema**: Pasta `/logs/`
- **Testes Automáticos**: `npm run loyalty:test`

### Em Caso de Problemas
1. **Verifique logs** em `/logs/loyalty-system.log`
2. **Execute testes** com `npm run loyalty:test`
3. **Consulte documentação** técnica
4. **Faça backup** antes de modificações

---

## 🎉 Parabéns!

Agora você tem acesso ao **sistema de fidelidade mais completo e moderno** para gestão de açaí. Com 7 anos de dados históricos, automação inteligente e interface intuitiva, seu negócio está pronto para crescer com clientes mais engajados e rentáveis.

**Desenvolvido com ❤️ por MiniMax Agent**