import { drizzle } from "drizzle-orm/postgres-js";
import { InsertUser, users, products, categories, sales, saleItems, inventory, loyaltyCustomers, loyaltyStamps, loyaltyStampsHistory, loyaltyRedemptions, cashRegister, cashRegisterDetails, InsertProduct, InsertSale, InsertSaleItem, InsertLoyaltyCustomer, InsertLoyaltyStamp, InsertLoyaltyStampsHistory, InsertCashRegister, InsertCashRegisterDetail } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL, { logger: process.env.NODE_ENV === "development" });
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============ CARDÁPIO ============
export async function getProducts() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(products);
}

export async function getProductsByCategory(categoryId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(products).where(eq(products.categoryId, categoryId));
}

export async function createProduct(product: InsertProduct) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(products).values(product);
  return result;
}

export async function updateProduct(id: number, product: Partial<InsertProduct>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(products).set(product).where(eq(products.id, id));
}

export async function deleteProduct(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(products).where(eq(products.id, id));
}

export async function getCategories() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(categories);
}

export async function createCategory(name: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(categories).values({ name });
}

// ============ VENDAS ============
export async function getSales(limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(sales).orderBy(desc(sales.createdAt)).limit(limit);
}

export async function createSale(sale: InsertSale) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(sales).values(sale);
  return result;
}

export async function createSaleItem(item: InsertSaleItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(saleItems).values(item);
}

// ============ ESTOQUE ============
export async function getInventory() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(inventory);
}

// ✅ FUNÇÃO MELHORADA: Update Inventory com suporte a ID específico
export async function updateInventory(productId: number, quantity: string, minQuantity?: string, id?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  if (id) {
    // Atualizar por ID específico
    const updateData: any = { quantity };
    if (minQuantity) updateData.minQuantity = minQuantity;
    return await db.update(inventory).set(updateData).where(eq(inventory.id, id));
  } else {
    // Lógica original: verificar por productId
    const existing = await getInventoryByProductId(productId);
    
    if (existing) {
      const updateData: any = { quantity };
      if (minQuantity) updateData.minQuantity = minQuantity;
      return await db.update(inventory).set(updateData).where(eq(inventory.productId, productId));
    } else {
      return await db.insert(inventory).values({
        productId,
        quantity: quantity,
        minQuantity: minQuantity || "10",
        unit: "un",
      });
    }
  }
}

// ✅ NOVA FUNÇÃO: Create Inventory específico
export async function createInventory(data: {
  productId: number;
  quantity: string;
  minQuantity: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Verificar se já existe
  const existing = await getInventoryByProductId(data.productId);
  if (existing) {
    throw new Error("Produto já possui estoque cadastrado");
  }
  
  return await db.insert(inventory).values({
    productId: data.productId,
    quantity: data.quantity,
    minQuantity: data.minQuantity,
    unit: "un",
  });
}

export async function getInventoryByProductId(productId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(inventory).where(eq(inventory.productId, productId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function reduceInventory(productId: number, quantity: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const currentInventory = await getInventoryByProductId(productId);
  if (!currentInventory) {
    throw new Error("Produto não encontrado no estoque");
  }
  
  const currentQty = parseInt(currentInventory.quantity as any);
  if (currentQty < quantity) {
    throw new Error("Quantidade insuficiente em estoque");
  }
  
  const newQuantity = currentQty - quantity;
  return await db.update(inventory).set({ quantity: newQuantity.toString() }).where(eq(inventory.productId, productId));
}

// ============ FIDELIDADE ============
export async function getLoyaltyCustomers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(loyaltyCustomers).orderBy(desc(loyaltyCustomers.createdAt));
}

export async function createLoyaltyCustomer(customer: InsertLoyaltyCustomer) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(loyaltyCustomers).values(customer);
}

export async function updateLoyaltyCustomer(id: number, customer: Partial<InsertLoyaltyCustomer>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(loyaltyCustomers).set(customer).where(eq(loyaltyCustomers.id, id));
}

export async function addLoyaltyStamps(customerId: number, stampCount: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (customerId === 0) return; // Sem cliente
  
  // Buscar cliente
  const customer = await db.select().from(loyaltyCustomers).where(eq(loyaltyCustomers.id, customerId)).limit(1);
  if (customer.length === 0) return;
  
  // Adicionar selos
  const currentStamps = parseInt(customer[0].stamps as any) || 0;
  const newStamps = currentStamps + stampCount;
  
  await db.update(loyaltyCustomers).set({ stamps: newStamps }).where(eq(loyaltyCustomers.id, customerId));
}


// ============ LOYALTY STAMPS HISTORY ============
export async function addStampsHistory(data: InsertLoyaltyStampsHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(loyaltyStampsHistory).values(data);
}

export async function getStampsHistory(customerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .select()
    .from(loyaltyStampsHistory)
    .where(eq(loyaltyStampsHistory.customerId, customerId))
    .orderBy(desc(loyaltyStampsHistory.earnedAt));
}

export async function updateStampsHistoryStatus(id: number, status: "active" | "expired" | "redeemed") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .update(loyaltyStampsHistory)
    .set({ status })
    .where(eq(loyaltyStampsHistory.id, id));
}

export async function expireOldStamps(customerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const now = new Date();
  const expiredStamps = await db
    .select()
    .from(loyaltyStampsHistory)
    .where(
      and(
        eq(loyaltyStampsHistory.customerId, customerId),
        eq(loyaltyStampsHistory.status, "active"),
        lt(loyaltyStampsHistory.expiresAt, now)
      )
    );
  
  for (const stamp of expiredStamps) {
    await updateStampsHistoryStatus(stamp.id, "expired");
  }
  
  return expiredStamps.length;
}

export async function getActiveStampsCount(customerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const now = new Date();
  const activeStamps = await db
    .select()
    .from(loyaltyStampsHistory)
    .where(
      and(
        eq(loyaltyStampsHistory.customerId, customerId),
        eq(loyaltyStampsHistory.status, "active"),
        gt(loyaltyStampsHistory.expiresAt, now)
      )
    );
  
  return activeStamps.reduce((sum, stamp) => sum + stamp.quantity, 0);
}


// ============ LOYALTY REDEMPTIONS ============
export async function createRedemption(customerId: number, stampsCost: number = 10) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(loyaltyRedemptions).values({
    customerId,
    stampsCost,
    reward: `Premio - ${stampsCost} selos`,
    status: "completed",
    completedAt: new Date(),
  });
}

export async function getRedemptions(customerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.select().from(loyaltyRedemptions).where(eq(loyaltyRedemptions.customerId, customerId));
}

export async function updateCustomerLastVisit(customerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.update(loyaltyCustomers).set({ lastPurchase: new Date() }).where(eq(loyaltyCustomers.id, customerId));
}

export async function checkAndExpireStamps(customerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const customer = await db.select().from(loyaltyCustomers).where(eq(loyaltyCustomers.id, customerId)).limit(1);
  if (customer.length === 0) return false;
  
  const cust = customer[0];
  const lastPurchase = cust.lastPurchase ? new Date(cust.lastPurchase) : new Date(cust.createdAt);
  const now = new Date();
  const daysSinceLastPurchase = Math.floor((now.getTime() - lastPurchase.getTime()) / (1000 * 60 * 60 * 24));
  
  // Se passou 30 dias sem compra, expirar selos
  if (daysSinceLastPurchase > 30) {
    await db.update(loyaltyCustomers).set({ stamps: 0 }).where(eq(loyaltyCustomers.id, customerId));
    return true;
  }
  
  return false;
}


export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}


// ============ CAIXA ============
export async function getCurrentCashRegister(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(cashRegister)
    .where(and(eq(cashRegister.userId, userId), eq(cashRegister.status, 'open')))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}

export async function openCashRegister(userId: number, initialBalance: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(cashRegister).values({
    userId,
    initialBalance,
    status: 'open',
  });
}

export async function closeCashRegister(userId: number, finalBalance: string, notes?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const current = await getCurrentCashRegister(userId);
  if (!current) {
    throw new Error("Caixa nao esta aberto");
  }
  
  return await db.update(cashRegister)
    .set({
      closedAt: new Date(),
      finalBalance,
      status: 'closed',
      notes,
    })
    .where(eq(cashRegister.id, current.id));
}

export async function getCashHistory(userId: number, limit: number = 10) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(cashRegister)
    .where(eq(cashRegister.userId, userId))
    .orderBy(desc(cashRegister.openedAt))
    .limit(limit);
}

// ============ CAMPANHAS E Z-API ============

// Função para obter campanhas
export async function getCampaigns(status?: string) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(campaigns).orderBy(desc(campaigns.createdAt));

  if (status) {
    query = query.where(eq(campaigns.status, status));
  }

  return await query;
}

// Função para obter estatísticas de campanhas
export async function getCampaignStats() {
  const db = await getDb();
  if (!db) return {
    sentCount: 0,
    scheduledCount: 0,
    totalReached: 0,
    openRate: 0
  };

  const [sentCount, scheduledCount] = await Promise.all([
    db.select({ count: db.sql`count(*)` }).from(campaigns).where(eq(campaigns.status, 'sent')),
    db.select({ count: db.sql`count(*)` }).from(campaigns).where(eq(campaigns.status, 'scheduled'))
  ]);

  const messages = await db.select().from(whatsappMessages);
  const totalReached = messages.filter(m => m.status === 'sent').length;
  const readMessages = messages.filter(m => m.status === 'read').length;
  const openRate = totalReached > 0 ? Math.round((readMessages / totalReached) * 100) : 0;

  return {
    sentCount: sentCount[0]?.count || 0,
    scheduledCount: scheduledCount[0]?.count || 0,
    totalReached,
    openRate
  };
}

// Função para criar campanha
export async function createCampaign(campaignData: {
  title: string;
  message: string;
  type: string;
  scheduledDate: Date | null;
  targetAudience: string;
  automationEnabled: boolean;
  automationConfig: any;
  status: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(campaigns).values({
    title: campaignData.title,
    message: campaignData.message,
    type: campaignData.type,
    scheduledDate: campaignData.scheduledDate,
    targetAudience: campaignData.targetAudience,
    status: campaignData.status,
  });
}

// Função para enviar mensagem via Z-API
export async function sendWhatsAppMessage(params: {
  customerId: number;
  message: string;
  type: string;
  campaignId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Buscar dados do cliente
  const customer = await db.select().from(loyaltyCustomers)
    .where(eq(loyaltyCustomers.id, params.customerId))
    .limit(1);

  if (!customer.length) {
    throw new Error("Cliente não encontrado");
  }

  const customerData = customer[0];

  // Simular envio via Z-API (implementar integração real aqui)
  const zapiResult = await simulateZAPISend(customerData.phone, params.message);

  // Salvar mensagem no banco
  const messageRecord = await db.insert(whatsappMessages).values({
    customerId: params.customerId,
    campaignId: params.campaignId,
    message: params.message,
    type: params.type,
    status: zapiResult.success ? 'sent' : 'failed',
    zapiMessageId: zapiResult.messageId,
    sentAt: new Date(),
    failureReason: zapiResult.success ? null : zapiResult.error,
  });

  return {
    success: zapiResult.success,
    messageId: zapiResult.messageId,
    customerId: params.customerId,
    phone: customerData.phone,
  };
}

// Função para envio em massa
export async function sendMassWhatsAppMessage(params: {
  customerIds: number[];
  message: string;
  type: string;
  campaignId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let sentCount = 0;
  const results = [];

  for (const customerId of params.customerIds) {
    try {
      const result = await sendWhatsAppMessage({
        customerId,
        message: params.message,
        type: params.type,
        campaignId: params.campaignId,
      });
      results.push(result);
      if (result.success) sentCount++;
    } catch (error) {
      console.error(`Erro ao enviar para cliente ${customerId}:`, error);
      results.push({ success: false, customerId, error: error.message });
    }
  }

  return {
    sentCount,
    total: params.customerIds.length,
    results,
  };
}

// Função para configurar Z-API
export async function configureZAPI(config: {
  userId: number;
  instanceId: string;
  token: string;
  enabled: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Testar conexão primeiro
  const testResult = await testZAPIConnection(config.userId);

  if (!testResult.success) {
    throw new Error("Falha ao testar conexão Z-API");
  }

  // Salvar configuração (implementar tabela de configurações se necessário)
  // Por agora, vamos salvar nas variáveis de ambiente ou em cache

  return {
    success: true,
    message: "Z-API configurada com sucesso",
    instanceId: config.instanceId,
  };
}

// Função para testar conexão Z-API
export async function testZAPIConnection(userId: number) {
  try {
    // Implementar teste real da Z-API aqui
    // Por enquanto, vamos simular
    
    const mockConfig = {
      instanceId: "1101000001",
      token: "mock_token_123",
      enabled: true
    };

    if (!mockConfig.enabled) {
      return { success: false, error: "Z-API não está habilitada" };
    }

    // Simular teste de conexão
    const response = await fetch(`https://api.z-api.io/instances/${mockConfig.instanceId}/status/fetch`, {
      method: 'GET',
      headers: {
        'apikey': mockConfig.token,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      return { 
        success: true, 
        status: 'connected',
        instanceId: mockConfig.instanceId 
      };
    } else {
      return { 
        success: false, 
        error: `HTTP ${response.status}: ${response.statusText}` 
      };
    }
  } catch (error) {
    return { 
      success: false, 
      error: `Erro de conexão: ${error.message}` 
    };
  }
}

// Função para obter clientes inativos
export async function getInactiveCustomers(days: number = 30) {
  const db = await getDb();
  if (!db) return [];

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return await db.select().from(loyaltyCustomers)
    .where(and(
      eq(loyaltyCustomers.active, true),
      db.sql`${loyaltyCustomers.lastPurchase} < ${cutoffDate}`
    ))
    .orderBy(desc(loyaltyCustomers.lastPurchase));
}

// Função para obter clientes com selos recentes
export async function getCustomersWithRecentStamps(days: number = 7) {
  const db = await getDb();
  if (!db) return [];

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  // Buscar selos ganhos recently
  const recentStamps = await db.select().from(loyaltyStamps)
    .where(db.sql`${loyaltyStamps.createdAt} >= ${cutoffDate}`)
    .orderBy(desc(loyaltyStamps.createdAt));

  const customerIds = [...new Set(recentStamps.map(stamp => stamp.customerId))];

  const customers = await db.select().from(loyaltyCustomers)
    .where(db.sql`${loyaltyCustomers.id} = ANY(${customerIds})`);

  return customers.map(customer => {
    const customerStamps = recentStamps.filter(stamp => stamp.customerId === customer.id);
    const totalNewStamps = customerStamps.reduce((sum, stamp) => sum + stamp.quantity, 0);

    return {
      ...customer,
      newStamps: totalNewStamps,
      totalStamps: customer.stamps,
    };
  });
}

// Função para obter aniversariantes
export async function getBirthdayCustomers(month?: number) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(loyaltyCustomers).where(eq(loyaltyCustomers.active, true));

  // Se month especificado, filtrar por mês
  if (month) {
    query = query.where(db.sql`EXTRACT(MONTH FROM ${loyaltyCustomers.joinDate}) = ${month}`);
  }

  return await query.orderBy(loyaltyCustomers.joinDate);
}

// Simulação de envio Z-API (substituir por implementação real)
async function simulateZAPISend(phone: string, message: string) {
  // Simular delay de rede
  await new Promise(resolve => setTimeout(resolve, 100));

  // Simular 95% de sucesso
  const success = Math.random() > 0.05;

  if (success) {
    return {
      success: true,
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  } else {
    return {
      success: false,
      error: "Falha simulada na conexão",
    };
  }
}

// ============ AUTOMAÇÃO E TRIGGERS ============

// Função chamada quando cliente ganha selo
export async function onCustomerEarnedStamp(customerId: number, stampsQuantity: number, saleId?: number) {
  try {
    const db = await getDb();
    if (!db) return;

    // Buscar dados do cliente
    const customer = await db.select().from(loyaltyCustomers)
      .where(eq(loyaltyCustomers.id, customerId))
      .limit(1);

    if (!customer.length) return;

    const customerData = customer[0];
    const totalStamps = customerData.stamps + stampsQuantity;

    // Verificar se cliente ganhou selo
    if (customerData.stamps < 10 && totalStamps >= 10) {
      // Enviar mensagem de parabéns por ganhar primeiro prêmio
      const message = `🎉 Parabéns, ${customerData.name}! 

Você ganhou seus primeiros 10 selos! 

Agora você pode trocar por um prêmio especial:

🍇 Açaí 300ml grátis
🍓 10% de desconto na próxima compra
🥥 Acompanhamentos especiais

Venha nos visitar! 💜`;

      await sendWhatsAppMessage({
        customerId,
        message,
        type: "stamp_earned",
      });
    }

    // Verificar se cliente subir de nível
    const currentLevel = getLoyaltyLevel(customerData.stamps);
    const newLevel = getLoyaltyLevel(totalStamps);

    if (currentLevel !== newLevel) {
      // Enviar mensagem de parabéns por subir de nível
      const levelMessages = {
        bronze: "Bronze",
        silver: "Silver", 
        gold: "Gold",
        platinum: "Platinum",
        diamond: "Diamond"
      };

      const message = `🏆 Parabéns, ${customerData.name}! 

Você subiu para o nível ${levelMessages[newLevel as keyof typeof levelMessages]}!

Como cliente ${levelMessages[newLevel as keyof typeof levelMessages]}, você agora tem:
✨ Descontos exclusivos
🎁 Prêmios especiais
💫 Atendimento prioritário

Continue nos visitando para manter seu nível! 💎`;

      await sendWhatsAppMessage({
        customerId,
        message,
        type: "level_up",
      });

      // Atualizar nível no banco
      await db.update(loyaltyCustomers)
        .set({ 
          level: newLevel,
          stamps: totalStamps,
          updatedAt: new Date()
        })
        .where(eq(loyaltyCustomers.id, customerId));
    } else {
      // Apenas atualizar stamps
      await db.update(loyaltyCustomers)
        .set({ 
          stamps: totalStamps,
          updatedAt: new Date()
        })
        .where(eq(loyaltyCustomers.id, customerId));
    }

  } catch (error) {
    console.error("Erro ao processar automação de selo:", error);
  }
}

// Função para calcular nível de fidelidade
function getLoyaltyLevel(stamps: number): string {
  if (stamps >= 100) return "diamond";
  if (stamps >= 75) return "platinum";
  if (stamps >= 50) return "gold";
  if (stamps >= 25) return "silver";
  return "bronze";
}

// Função para enviar mensagens para clientes inativos (cron job)
export async function sendInactiveCustomerMessages() {
  try {
    const db = await getDb();
    if (!db) return;

    const inactiveCustomers = await getInactiveCustomers(30);

    for (const customer of inactiveCustomers) {
      const message = `🍇 Oi, ${customer.name}! 

Já estamos com saudades! 😢

Apresenta esta mensagem e ganhe **10% de desconto** em sua próxima compra!

🎉 Ofertas especiais te esperam:
• Açaí premium com desconto
• Combos especiais
• Brindes exclusivos

Te esperamos no Açai Sublime! 💜

Válido até ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}`;

      await sendWhatsAppMessage({
        customerId: customer.id,
        message,
        type: "inactive",
      });
    }

    console.log(`Enviadas ${inactiveCustomers.length} mensagens para clientes inativos`);
  } catch (error) {
    console.error("Erro ao enviar mensagens para inativos:", error);
  }
}

// Função para processar campanhas agendadas (cron job)
export async function processScheduledCampaigns() {
  try {
    const db = await getDb();
    if (!db) return;

    const now = new Date();
    const scheduledCampaigns = await db.select().from(campaigns)
      .where(and(
        eq(campaigns.status, 'scheduled'),
        db.sql`${campaigns.scheduledDate} <= ${now}`
      ));

    for (const campaign of scheduledCampaigns) {
      // Determinar clientes baseado no público alvo
      let targetCustomers: any[] = [];

      switch (campaign.targetAudience) {
        case 'all':
          targetCustomers = await db.select().from(loyaltyCustomers)
            .where(eq(loyaltyCustomers.active, true));
          break;
        case 'bronze':
        case 'silver':
        case 'gold':
          targetCustomers = await db.select().from(loyaltyCustomers)
            .where(and(
              eq(loyaltyCustomers.active, true),
              eq(loyaltyCustomers.level, campaign.targetAudience)
            ));
          break;
        case 'inactive':
          targetCustomers = await getInactiveCustomers(30);
          break;
        case 'recent_buyers':
          targetCustomers = await getCustomersWithRecentStamps(7);
          break;
      }

      // Enviar mensagens
      const customerIds = targetCustomers.map(c => c.id);
      await sendMassWhatsAppMessage({
        customerIds,
        message: campaign.message,
        type: campaign.type,
        campaignId: campaign.id,
      });

      // Marcar campanha como enviada
      await db.update(campaigns)
        .set({ 
          status: 'sent',
          sentDate: now,
          updatedAt: now
        })
        .where(eq(campaigns.id, campaign.id));
    }

    console.log(`Processadas ${scheduledCampaigns.length} campanhas agendadas`);
  } catch (error) {
    console.error("Erro ao processar campanhas agendadas:", error);
  }
}
    .orderBy(desc(cashRegister.openedAt))
    .limit(limit);
}
