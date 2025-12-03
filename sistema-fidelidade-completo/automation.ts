/**
 * Sistema de Automação e Cron Jobs
 * Processa campanhas agendadas e automações de fidelidade
 */

import * as db from "./db";

// ============ CRON JOBS ============

/**
 * Executa a cada 15 minutos - Processa campanhas agendadas
 */
export async function processScheduledCampaignsJob() {
  console.log(`[${new Date().toISOString()}] Processando campanhas agendadas...`);
  
  try {
    await db.processScheduledCampaigns();
    console.log(`[${new Date().toISOString()}] Campanhas processadas com sucesso`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Erro ao processar campanhas:`, error);
  }
}

/**
 * Executa todo dia às 10:00 - Enviar mensagens para clientes inativos
 */
export async function inactiveCustomersJob() {
  console.log(`[${new Date().toISOString()}] Verificando clientes inativos...`);
  
  try {
    await db.sendInactiveCustomerMessages();
    console.log(`[${new Date().toISOString()}] Mensagens para inativos enviadas`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Erro ao enviar mensagens para inativos:`, error);
  }
}

/**
 * Executa todo dia às 12:00 - Verificar aniversariantes
 */
export async function birthdayCustomersJob() {
  console.log(`[${new Date().toISOString()}] Verificando aniversariantes...`);
  
  try {
    const dbInstance = await db.getDb();
    if (!dbInstance) return;

    // Buscar aniversariantes do dia
    const today = new Date();
    const birthdayCustomers = await dbInstance.select().from(db.loyaltyCustomers)
      .where(db.sql`EXTRACT(MONTH FROM ${db.loyaltyCustomers.joinDate}) = ${today.getMonth() + 1} 
                   AND EXTRACT(DAY FROM ${db.loyaltyCustomers.joinDate}) = ${today.getDate()}`);

    for (const customer of birthdayCustomers) {
      const message = `🎂 Parabéns pelo seu aniversário, ${customer.name}! 

Que tal celebrar este dia especial com um açaí saboroso?

🎁 PRESENTE DE ANIVERSÁRIO:
• Açaí gratuito 300ml
• Toppings especiais
• Parabéns personalizado

Apresenta esta mensagem e ganhe seu presente! 🎉

Te desejamos um dia cheio de sabor e felicidade! 💜`;

      await db.sendWhatsAppMessage({
        customerId: customer.id,
        message,
        type: "birthday",
      });
    }

    console.log(`[${new Date().toISOString()}] Enviadas ${birthdayCustomers.length} mensagens de aniversário`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Erro ao processar aniversariantes:`, error);
  }
}

/**
 * Executa a cada hora - Limpeza de logs antigos
 */
export async function cleanupJob() {
  console.log(`[${new Date().toISOString()}] Executando limpeza...`);
  
  try {
    const dbInstance = await db.getDb();
    if (!dbInstance) return;

    // Deletar logs de mensagens antigas (mais de 30 dias)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    await dbInstance.delete(db.whatsappMessages)
      .where(db.sql`${db.whatsappMessages.createdAt} < ${thirtyDaysAgo}`);

    // Deletar campanhas de rascunho antigas (mais de 7 dias)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    await dbInstance.delete(db.campaigns)
      .where(db.sql`${db.campaigns.status} = 'draft' AND ${db.campaigns.createdAt} < ${sevenDaysAgo}`);

    console.log(`[${new Date().toISOString()}] Limpeza executada com sucesso`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Erro durante limpeza:`, error);
  }
}

// ============ INICIALIZAÇÃO DE CRON JOBS ============

/**
 * Inicia todos os cron jobs
 */
export function startCronJobs() {
  console.log("🚀 Iniciando sistema de automação...");

  // Processar campanhas a cada 15 minutos
  setInterval(processScheduledCampaignsJob, 15 * 60 * 1000);

  // Verificar clientes inativos diariamente às 10:00
  setInterval(() => {
    const now = new Date();
    if (now.getHours() === 10 && now.getMinutes() === 0) {
      inactiveCustomersJob();
    }
  }, 60 * 1000); // Verificar a cada minuto

  // Verificar aniversariantes diariamente às 12:00
  setInterval(() => {
    const now = new Date();
    if (now.getHours() === 12 && now.getMinutes() === 0) {
      birthdayCustomersJob();
    }
  }, 60 * 1000); // Verificar a cada minuto

  // Limpeza diariamente à 01:00
  setInterval(() => {
    const now = new Date();
    if (now.getHours() === 1 && now.getMinutes() === 0) {
      cleanupJob();
    }
  }, 60 * 1000); // Verificar a cada minuto

  // Executar jobs imediatamente na inicialização
  processScheduledCampaignsJob();
  
  console.log("✅ Sistema de automação iniciado com sucesso!");
  console.log("📅 Cron jobs configurados:");
  console.log("   • Campanhas agendadas: a cada 15 minutos");
  console.log("   • Clientes inativos: diariamente às 10:00");
  console.log("   • Aniversariantes: diariamente às 12:00");
  console.log("   • Limpeza: diariamente às 01:00");
}

// ============ TRIGGERS DE EVENTOS ============

/**
 * Trigger chamado quando uma venda é concluída
 */
export async function onSaleCompleted(saleData: {
  customerId: number;
  saleId: number;
  totalAmount: number;
  products: Array<{ name: string; quantity: number; price: number }>;
}) {
  console.log(`[${new Date().toISOString()}] Venda concluída para cliente ${saleData.customerId}`);

  try {
    const dbInstance = await db.getDb();
    if (!dbInstance) return;

    // Calcular stamps baseado nos produtos
    let totalStamps = 0;

    for (const product of saleData.products) {
      // Lógica de stamps por categoria de produto
      if (product.name.toLowerCase().includes('açaí')) {
        totalStamps += product.quantity * 2; // 2 stamps por açaí
      } else if (product.name.toLowerCase().includes('combo')) {
        totalStamps += product.quantity * 3; // 3 stamps por combo
      } else {
        totalStamps += product.quantity * 1; // 1 stamp por outros produtos
      }
    }

    // Registrar stamps ganhos
    await dbInstance.insert(db.loyaltyStamps).values({
      customerId: saleData.customerId,
      saleId: saleData.saleId,
      quantity: totalStamps,
      reason: 'Venda realizada',
    });

    // Atualizar última compra do cliente
    await dbInstance.update(db.loyaltyCustomers)
      .set({ 
        lastPurchase: new Date(),
        updatedAt: new Date()
      })
      .where(eq(db.loyaltyCustomers.id, saleData.customerId));

    // Disparar automação de selo ganho
    await db.onCustomerEarnedStamp(saleData.customerId, totalStamps, saleData.saleId);

    console.log(`[${new Date().toISOString()}] ${totalStamps} stamps adicionados para cliente ${saleData.customerId}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Erro ao processar venda:`, error);
  }
}

/**
 * Trigger chamado quando um prêmio é resgatado
 */
export async function onPrizeRedeemed(customerId: number, prizeId: number, stampsUsed: number) {
  console.log(`[${new Date().toISOString()}] Prêmio resgatado - Cliente: ${customerId}, Selos: ${stampsUsed}`);

  try {
    const dbInstance = await db.getDb();
    if (!dbInstance) return;

    // Enviar confirmação de resgate
    const customer = await dbInstance.select().from(db.loyaltyCustomers)
      .where(eq(db.loyaltyCustomers.id, customerId))
      .limit(1);

    if (customer.length) {
      const message = `🎁 Confirmação de Resgate

Olá, ${customer[0].name}!

Seu prêmio foi resgatado com sucesso!

🏆 Detalhes:
• Selos utilizados: ${stampsUsed}
• Data: ${new Date().toLocaleDateString('pt-BR')}
• Status: Disponível para retirada

Apresente esta mensagem na loja para retirar seu prêmio!

Obrigado por ser nosso cliente fiel! 💜`;

      await db.sendWhatsAppMessage({
        customerId,
        message,
        type: "prize_redeemed",
      });
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Erro ao processar resgate:`, error);
  }
}

// ============ INTEGRATIONS ============

/**
 * Configurar integração com Z-API
 */
export async function setupZAPIIntegration() {
  console.log("🔗 Configurando integração Z-API...");

  try {
    // Verificar se Z-API está configurada
    const testResult = await db.testZAPIConnection(1); // user ID padrão

    if (testResult.success) {
      console.log("✅ Z-API conectada e funcionando!");
      
      // Testar envio de mensagem
      const testMessage = "Teste de conexão Z-API - Açai Sublime";
      
      // Aqui você pode adicionar um número de teste
      // await db.sendWhatsAppMessage({
      //   customerId: 1,
      //   message: testMessage,
      //   type: "test"
      // });

    } else {
      console.warn("⚠️ Z-API não está configurada ou com problemas:", testResult.error);
    }
  } catch (error) {
    console.error("❌ Erro ao configurar Z-API:", error);
  }
}

/**
 * Função para testar todas as automações
 */
export async function testAllAutomations() {
  console.log("🧪 Testando todas as automações...");
  
  try {
    // Testar campanhas agendadas
    console.log("📅 Testando processamento de campanhas...");
    await processScheduledCampaignsJob();
    
    // Testar clientes inativos
    console.log("😴 Testando mensagens para inativos...");
    await inactiveCustomersJob();
    
    // Testar aniversariantes
    console.log("🎂 Testando mensagens de aniversário...");
    await birthdayCustomersJob();
    
    // Testar limpeza
    console.log("🧹 Testando limpeza...");
    await cleanupJob();
    
    console.log("✅ Todos os testes de automação concluídos!");
  } catch (error) {
    console.error("❌ Erro durante testes:", error);
  }
}

// Exportar para uso no server principal
export default {
  startCronJobs,
  onSaleCompleted,
  onPrizeRedeemed,
  setupZAPIIntegration,
  testAllAutomations,
};