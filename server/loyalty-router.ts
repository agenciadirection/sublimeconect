import { z } from "zod";
import { router, publicProcedure } from "./_core/trpc";
import { eq, and, desc, gte, lt, count, sum, sql } from "drizzle-orm";
import { 
  loyaltyCustomers, 
  loyaltyStamps, 
  loyaltyRedemptions, 
  loyaltyStampsHistory,
  loyaltyHistory,
  loyaltyPrizes,
  campaigns,
  whatsappMessages,
  sales,
  users
} from "../drizzle/schema";
import { QRCodeService } from "./services/QRCodeService";
import { ZAPIService } from "./services/ZAPIService";
import { LoyaltyAutomationService } from "./services/LoyaltyAutomationService";
import { LoyaltyMigrationService } from "./services/LoyaltyMigrationService";

// Validação dos dados de entrada
const CustomerSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  phone: z.string().regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, "Formato de telefone inválido"),
  email: z.string().email().optional(),
  vendedor: z.string().optional(),
});

const AddStampsSchema = z.object({
  customerId: z.number(),
  stamps: z.number().positive("Quantidade deve ser positiva"),
  reason: z.string().default("venda"),
  vendedor: z.string().optional(),
  valorCompra: z.number().optional(),
});

const RedeemPrizeSchema = z.object({
  customerId: z.number(),
  prizeId: z.number().optional(),
});

const SearchCustomersSchema = z.object({
  search: z.string().optional(),
  vendedor: z.string().optional(),
  perfil: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  limit: z.number().default(50),
  offset: z.number().default(0),
});

const CampaignSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  message: z.string().min(1, "Mensagem é obrigatória"),
  type: z.enum(["inactive", "milestone", "birthday", "custom"]),
  targetAudience: z.enum(["all", "lovers", "casual", "new_clients"]).default("all"),
  filters: z.object({
    inactiveDays: z.number().optional(),
    stampThreshold: z.number().optional(),
    profileFilter: z.string().optional(),
  }).optional(),
});

export const loyaltyRouter = router({
  // ============ CLIENTES ============
  
  // Buscar clientes com filtros avançados
  getCustomers: publicProcedure
    .input(SearchCustomersSchema.optional())
    .query(async ({ ctx, input }) => {
      const conditions = [];
      
      if (input?.search) {
        conditions.push(
          sql`OR (
            ${loyaltyCustomers.name} ILIKE ${'%' + input.search + '%'},
            ${loyaltyCustomers.phone} ILIKE ${'%' + input.search + '%'}
          )`
        );
      }
      
      if (input?.vendedor) {
        conditions.push(eq(loyaltyCustomers.vendedor, input.vendedor));
      }
      
      if (input?.perfil) {
        conditions.push(eq(loyaltyCustomers.perfil, input.perfil));
      }
      
      const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;
      
      const customers = await ctx.db.select({
        id: loyaltyCustomers.id,
        name: loyaltyCustomers.name,
        phone: loyaltyCustomers.phone,
        email: loyaltyCustomers.email,
        vendedor: loyaltyCustomers.vendedor,
        selos: loyaltyCustomers.selos,
        valorTotal: loyaltyCustomers.valorTotal,
        visitas: loyaltyCustomers.visitas,
        ultimaVisita: loyaltyCustomers.ultimaVisita,
        perfil: loyaltyCustomers.perfil,
        dataNascimento: loyaltyCustomers.dataNascimento,
        resgatados: loyaltyCustomers.resgatados,
        completados: loyaltyCustomers.completados,
        ativo: loyaltyCustomers.ativo,
        qrCode: loyaltyCustomers.qrCode,
        createdAt: loyaltyCustomers.createdAt,
        updatedAt: loyaltyCustomers.updatedAt,
      })
      .from(loyaltyCustomers)
      .where(whereCondition)
      .orderBy(desc(loyaltyCustomers.selos))
      .limit(input?.limit || 50)
      .offset(input?.offset || 0);
      
      return customers;
    }),
    
  // Criar novo cliente
  createCustomer: publicProcedure
    .input(CustomerSchema)
    .mutation(async ({ ctx, input }) => {
      // Gerar QR Code
      const qrCodeData = await QRCodeService.generateQRCode(input.phone);
      
      const [newCustomer] = await ctx.db.insert(loyaltyCustomers).values({
        name: input.name,
        phone: input.phone,
        email: input.email,
        vendedor: input.vendedor || "sistema",
        selos: 0,
        valorTotal: 0,
        visitas: 0,
        perfil: "new_client",
        ativo: true,
        qrCode: qrCodeData,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      
      // Enviar mensagem de boas-vindas se configurado
      try {
        await ZAPIService.sendWelcomeMessage(input.phone, input.name);
      } catch (error) {
        console.error("Erro ao enviar mensagem de boas-vindas:", error);
      }
      
      return newCustomer;
    }),
    
  // Atualizar cliente
  updateCustomer: publicProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      email: z.string().optional(),
      vendedor: z.string().optional(),
      dataNascimento: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;
      
      const [updatedCustomer] = await ctx.db.update(loyaltyCustomers)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(loyaltyCustomers.id, id))
        .returning();
        
      return updatedCustomer;
    }),
    
  // ============ SELOS E TRANSAÇÕES ============
  
  // Adicionar selos a um cliente
  addStamps: publicProcedure
    .input(AddStampsSchema)
    .mutation(async ({ ctx, input }) => {
      const customer = await ctx.db.select()
        .from(loyaltyCustomers)
        .where(eq(loyaltyCustomers.id, input.customerId))
        .limit(1);
        
      if (customer.length === 0) {
        throw new Error("Cliente não encontrado");
      }
      
      const currentCustomer = customer[0];
      const newStampTotal = currentCustomer.selos + input.stamps;
      const newVisitCount = currentCustomer.visitas + 1;
      
      // Determinar novo perfil baseado na lógica do sistema original
      let newPerfil = currentCustomer.perfil;
      if (newVisitCount >= 50 || newStampTotal >= 50) {
        newPerfil = "lover";
      } else if (newVisitCount >= 30 || newStampTotal >= 30) {
        newPerfil = "casual";
      } else {
        newPerfil = "new_client";
      }
      
      // Atualizar cliente
      await ctx.db.update(loyaltyCustomers)
        .set({
          selos: newStampTotal,
          visitas: newVisitCount,
          ultimaVisita: new Date(),
          valorTotal: (currentCustomer.valorTotal || 0) + (input.valorCompra || 0),
          perfil: newPerfil,
          updatedAt: new Date(),
        })
        .where(eq(loyaltyCustomers.id, input.customerId));
        
      // Registrar transação em histórico de selos
      await ctx.db.insert(loyaltyStampsHistory).values({
        customerId: input.customerId,
        quantity: input.stamps,
        earnedAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 ano
        status: "active",
        reason: input.reason,
        createdAt: new Date(),
      });
      
      // Registrar no histórico geral
      await ctx.db.insert(loyaltyHistory).values({
        customerId: input.customerId,
        type: "stamp_added",
        stampsAdded: input.stamps,
        description: `${input.stamps} selos adicionados - ${input.reason}`,
        createdAt: new Date(),
      });
      
      // Verificar se atingiu marcos (10, 20, 30 selos)
      const completedMilestones = Math.floor(newStampTotal / 10);
      if (completedMilestones > (currentCustomer.completados || 0)) {
        await ctx.db.update(loyaltyCustomers)
          .set({
            completados: completedMilestones,
            updatedAt: new Date(),
          })
          .where(eq(loyaltyCustomers.id, input.customerId));
          
        // Criar registros de prêmios para marcos atingidos
        for (let i = (currentCustomer.completados || 0) + 1; i <= completedMilestones; i++) {
          await ctx.db.insert(loyaltyRedemptions).values({
            customerId: input.customerId,
            stampsCost: 10,
            reward: `Prêmio ${i * 10} selos`,
            status: "pending",
            createdAt: new Date(),
          });
        }
        
        // Enviar notificação de parabéns
        try {
          await ZAPIService.sendMilestoneMessage(input.customerId, newStampTotal);
        } catch (error) {
          console.error("Erro ao enviar notificação de marco:", error);
        }
      }
      
      // Verificar inatividade e enviar mensagem se necessário
      try {
        await LoyaltyAutomationService.checkInactivity(input.customerId);
      } catch (error) {
        console.error("Erro ao verificar inatividade:", error);
      }
      
      return { 
        success: true, 
        newStampTotal, 
        newVisitCount, 
        newPerfil,
        completedMilestones 
      };
    }),
    
  // Resgatar prêmio
  redeemPrize: publicProcedure
    .input(RedeemPrizeSchema)
    .mutation(async ({ ctx, input }) => {
      const customer = await ctx.db.select()
        .from(loyaltyCustomers)
        .where(eq(loyaltyCustomers.id, input.customerId))
        .limit(1);
        
      if (customer.length === 0) {
        throw new Error("Cliente não encontrado");
      }
      
      const currentCustomer = customer[0];
      
      if (currentCustomer.selos < 10) {
        throw new Error("Cliente não tem selos suficientes para resgatar prêmio");
      }
      
      // Encontrar prêmio pendente
      const pendingPrizes = await ctx.db.select()
        .from(loyaltyRedemptions)
        .where(and(
          eq(loyaltyRedemptions.customerId, input.customerId),
          eq(loyaltyRedemptions.status, "pending")
        ))
        .orderBy(desc(loyaltyRedemptions.createdAt))
        .limit(1);
        
      if (pendingPrizes.length === 0) {
        throw new Error("Nenhum prêmio pendente encontrado");
      }
      
      const prize = pendingPrizes[0];
      
      // Atualizar cliente (remover 10 selos, incrementar prêmios resgatados)
      await ctx.db.update(loyaltyCustomers)
        .set({
          selos: currentCustomer.selos - 10,
          resgatados: (currentCustomer.resgatados || 0) + 1,
          updatedAt: new Date(),
        })
        .where(eq(loyaltyCustomers.id, input.customerId));
        
      // Marcar prêmio como resgatado
      await ctx.db.update(loyaltyRedemptions)
        .set({
          status: "completed",
          completedAt: new Date(),
          createdAt: new Date(),
        })
        .where(eq(loyaltyRedemptions.id, prize.id));
        
      // Registrar no histórico
      await ctx.db.insert(loyaltyHistory).values({
        customerId: input.customerId,
        type: "prize_redeemed",
        stampsRedeemed: 10,
        prizeId: prize.id,
        description: `Prêmio resgatado: ${prize.reward}`,
        createdAt: new Date(),
      });
      
      // Enviar notificação de resgate
      try {
        await ZAPIService.sendRedemptionMessage(input.customerId, prize.reward);
      } catch (error) {
        console.error("Erro ao enviar notificação de resgate:", error);
      }
      
      return { success: true, prize };
    }),
  
  // ============ RELATÓRIOS E ESTATÍSTICAS ============
  
  // Dashboard com métricas principais
  getDashboardStats: publicProcedure
    .query(async ({ ctx }) => {
      // Total de clientes ativos
      const totalCustomersResult = await ctx.db.select({
        count: count(),
      })
      .from(loyaltyCustomers)
      .where(eq(loyaltyCustomers.ativo, true));
      
      // Selos totais emitidos
      const totalStampsResult = await ctx.db.select({
        count: count(),
      })
      .from(loyaltyStampsHistory)
      .where(eq(loyaltyStampsHistory.status, "active"));
      
      // Prêmios resgatados no mês atual
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);
      
      const prizesRedeemedResult = await ctx.db.select({
        count: count(),
      })
      .from(loyaltyRedemptions)
      .where(and(
        eq(loyaltyRedemptions.status, "completed"),
        gte(loyaltyRedemptions.completedAt, currentMonth)
      ));
      
      // Receita total
      const revenueResult = await ctx.db.select({
        total: sum(loyaltyCustomers.valorTotal),
      })
      .from(loyaltyCustomers)
      .where(eq(loyaltyCustomers.ativo, true));
      
      return {
        totalCustomers: totalCustomersResult[0]?.count || 0,
        totalStamps: totalStampsResult[0]?.count || 0,
        prizesRedeemedThisMonth: prizesRedeemedResult[0]?.count || 0,
        totalRevenue: Number(revenueResult[0]?.total || 0),
      };
    }),
    
  // Ranking de clientes
  getCustomerRanking: publicProcedure
    .input(z.object({
      period: z.enum(["week", "month", "year", "all"]).default("month"),
      metric: z.enum(["stamps", "visits", "revenue"]).default("stamps"),
      limit: z.number().default(10),
    }))
    .query(async ({ ctx, input }) => {
      let orderBy;
      switch (input.metric) {
        case "stamps":
          orderBy = desc(loyaltyCustomers.selos);
          break;
        case "visits":
          orderBy = desc(loyaltyCustomers.visitas);
          break;
        case "revenue":
          orderBy = desc(loyaltyCustomers.valorTotal);
          break;
        default:
          orderBy = desc(loyaltyCustomers.selos);
      }
      
      const customers = await ctx.db.select({
        id: loyaltyCustomers.id,
        name: loyaltyCustomers.name,
        phone: loyaltyCustomers.phone,
        selos: loyaltyCustomers.selos,
        visitas: loyaltyCustomers.visitas,
        valorTotal: loyaltyCustomers.valorTotal,
        perfil: loyaltyCustomers.perfil,
        ultimaVisita: loyaltyCustomers.ultimaVisita,
      })
      .from(loyaltyCustomers)
      .where(eq(loyaltyCustomers.ativo, true))
      .orderBy(orderBy)
      .limit(input.limit);
      
      return customers;
    }),
    
  // Histórico de transações de um cliente
  getCustomerHistory: publicProcedure
    .input(z.object({
      customerId: z.number(),
      limit: z.number().default(50),
    }))
    .query(async ({ ctx, input }) => {
      const history = await ctx.db.select({
        id: loyaltyHistory.id,
        type: loyaltyHistory.type,
        stampsAdded: loyaltyHistory.stampsAdded,
        stampsRedeemed: loyaltyHistory.stampsRedeemed,
        description: loyaltyHistory.description,
        createdAt: loyaltyHistory.createdAt,
      })
      .from(loyaltyHistory)
      .where(eq(loyaltyHistory.customerId, input.customerId))
      .orderBy(desc(loyaltyHistory.createdAt))
      .limit(input.limit);
      
      return history;
    }),
    
  // ============ CAMPANHAS E Z-API ============
  
  // Criar campanha
  createCampaign: publicProcedure
    .input(CampaignSchema)
    .mutation(async ({ ctx, input }) => {
      const [campaign] = await ctx.db.insert(campaigns).values({
        title: input.title,
        message: input.message,
        type: input.type,
        targetAudience: input.targetAudience,
        status: "draft",
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      
      return campaign;
    }),
    
  // Enviar campanha
  sendCampaign: publicProcedure
    .input(z.object({
      campaignId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await ctx.db.select()
        .from(campaigns)
        .where(eq(campaigns.id, input.campaignId))
        .limit(1);
        
      if (campaign.length === 0) {
        throw new Error("Campanha não encontrada");
      }
      
      const campaignData = campaign[0];
      
      // Buscar clientes baseado na audiência
      let customers;
      switch (campaignData.targetAudience) {
        case "lovers":
          customers = await ctx.db.select()
            .from(loyaltyCustomers)
            .where(eq(loyaltyCustomers.perfil, "lover"));
          break;
        case "casual":
          customers = await ctx.db.select()
            .from(loyaltyCustomers)
            .where(eq(loyaltyCustomers.perfil, "casual"));
          break;
        case "new_clients":
          customers = await ctx.db.select()
            .from(loyaltyCustomers)
            .where(eq(loyaltyCustomers.perfil, "new_client"));
          break;
        default:
          customers = await ctx.db.select()
            .from(loyaltyCustomers)
            .where(eq(loyaltyCustomers.ativo, true));
      }
      
      // Enviar mensagens
      const results = [];
      for (const customer of customers) {
        try {
          await ZAPIService.sendCampaignMessage(customer.phone, campaignData.message);
          
          // Registrar envio
          await ctx.db.insert(whatsappMessages).values({
            customerId: customer.id,
            campaignId: input.campaignId,
            message: campaignData.message,
            type: "campaign",
            status: "sent",
            sentAt: new Date(),
            createdAt: new Date(),
          });
          
          results.push({ phone: customer.phone, status: "sent" });
        } catch (error) {
          results.push({ phone: customer.phone, status: "failed", error: error.message });
        }
      }
      
      // Atualizar status da campanha
      await ctx.db.update(campaigns)
        .set({
          status: "sent",
          sentDate: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(campaigns.id, input.campaignId));
        
      return { success: true, sentCount: results.filter(r => r.status === "sent").length, results };
    }),
    
  // ============ QR CODES ============
  
  // Gerar QR Code para cliente
  generateCustomerQRCode: publicProcedure
    .input(z.object({
      customerId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const customer = await ctx.db.select()
        .from(loyaltyCustomers)
        .where(eq(loyaltyCustomers.id, input.customerId))
        .limit(1);
        
      if (customer.length === 0) {
        throw new Error("Cliente não encontrado");
      }
      
      const qrCodeData = await QRCodeService.generateQRCode(customer[0].phone);
      
      // Atualizar cliente com novo QR Code
      await ctx.db.update(loyaltyCustomers)
        .set({
          qrCode: qrCodeData,
          updatedAt: new Date(),
        })
        .where(eq(loyaltyCustomers.id, input.customerId));
        
      return { qrCode: qrCodeData };
    }),
    
  // ============ MIGRAÇÃO DE DADOS ============
  
  // Migrar dados do sistema antigo
  migrateLegacyData: publicProcedure
    .mutation(async ({ ctx }) => {
      try {
        const migrationResult = await LoyaltyMigrationService.migrateFromSQLite();
        return { success: true, ...migrationResult };
      } catch (error) {
        throw new Error(`Erro na migração: ${error.message}`);
      }
    }),
    
  // ============ Z-API E CONFIGURAÇÕES ============
  
  // Testar conexão Z-API
  testZAPIConnection: publicProcedure
    .mutation(async () => {
      try {
        const result = await ZAPIService.testConnection();
        return { success: true, result };
      } catch (error) {
        throw new Error(`Erro na conexão Z-API: ${error.message}`);
      }
    }),
    
  // ============ RELATÓRIOS DETALHADOS ============
  
  // Relatório de resgates por período
  getRedemptionsReport: publicProcedure
    .input(z.object({
      dateFrom: z.string(),
      dateTo: z.string(),
      status: z.enum(["pending", "completed", "cancelled"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const whereConditions = [
        gte(loyaltyRedemptions.createdAt, new Date(input.dateFrom)),
        lt(loyaltyRedemptions.createdAt, new Date(input.dateTo)),
      ];
      
      if (input.status) {
        whereConditions.push(eq(loyaltyRedemptions.status, input.status));
      }
      
      const redemptions = await ctx.db.select({
        id: loyaltyRedemptions.id,
        customerName: loyaltyCustomers.name,
        customerPhone: loyaltyCustomers.phone,
        reward: loyaltyRedemptions.reward,
        status: loyaltyRedemptions.status,
        createdAt: loyaltyRedemptions.createdAt,
        completedAt: loyaltyRedemptions.completedAt,
      })
      .from(loyaltyRedemptions)
      .leftJoin(loyaltyCustomers, eq(loyaltyRedemptions.customerId, loyaltyCustomers.id))
      .where(and(...whereConditions))
      .orderBy(desc(loyaltyRedemptions.createdAt));
      
      return redemptions;
    }),
    
  // Relatório de campanhas enviadas
  getCampaignsReport: publicProcedure
    .input(z.object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      status: z.enum(["draft", "scheduled", "sent", "cancelled"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const whereConditions = [];
      
      if (input.dateFrom && input.dateTo) {
        whereConditions.push(
          gte(campaigns.createdAt, new Date(input.dateFrom)),
          lt(campaigns.createdAt, new Date(input.dateTo))
        );
      }
      
      if (input.status) {
        whereConditions.push(eq(campaigns.status, input.status));
      }
      
      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
      
      const campaignsList = await ctx.db.select({
        id: campaigns.id,
        title: campaigns.title,
        message: campaigns.message,
        type: campaigns.type,
        targetAudience: campaigns.targetAudience,
        status: campaigns.status,
        scheduledDate: campaigns.scheduledDate,
        sentDate: campaigns.sentDate,
        createdAt: campaigns.createdAt,
        sentCount: sql<number>`COUNT(${whatsappMessages.id})`,
      })
      .from(campaigns)
      .leftJoin(whatsappMessages, eq(campaigns.id, whatsappMessages.campaignId))
      .where(whereClause)
      .groupBy(campaigns.id)
      .orderBy(desc(campaigns.createdAt));
      
      return campaignsList;
    }),
});