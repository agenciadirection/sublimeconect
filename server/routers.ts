import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import { loyaltyRouter } from "./loyalty-router";

export const appRouter = router({
  system: systemRouter,
  
  // ============ SISTEMA DE FIDELIDADE AVANÇADO ============
  loyalty: loyaltyRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ============ CARDÁPIO ============
  menu: router({
    getProducts: publicProcedure.query(async () => {
      try {
        return await db.getProducts();
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao buscar produtos',
        });
      }
    }),
    
    getCategories: publicProcedure.query(async () => {
      try {
        return await db.getCategories();
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao buscar categorias',
        });
      }
    }),

    createProduct: protectedProcedure
      .input(z.object({
        categoryId: z.number(),
        name: z.string(),
        description: z.string().optional(),
        price: z.string(),
        type: z.enum(["unit", "weight"]),
        requiresStock: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          return await db.createProduct({
            categoryId: input.categoryId,
            name: input.name,
            description: input.description,
            price: input.price,
            type: input.type,
            requiresStock: input.requiresStock ?? true,
          });
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Erro ao criar produto',
          });
        }
      }),

    updateProduct: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        price: z.string().optional(),
        type: z.enum(["unit", "weight"]).optional(),
        requiresStock: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          return await db.updateProduct(input.id, {
            name: input.name,
            description: input.description,
            price: input.price,
            type: input.type,
            requiresStock: input.requiresStock,
          });
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Erro ao atualizar produto',
          });
        }
      }),

    createCategory: protectedProcedure
      .input(z.object({
        name: z.string(),
      }))
      .mutation(async ({ input }) => {
        try {
          return await db.createCategory(input.name);
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Erro ao criar categoria',
          });
        }
      }),

    deleteProduct: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        try {
          return await db.deleteProduct(input.id);
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Erro ao deletar produto',
          });
        }
      }),
  }),

  // ============ VENDAS ============
  sales: router({
    getSales: publicProcedure.query(async () => {
      try {
        return await db.getSales();
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao buscar vendas',
        });
      }
    }),

    createSale: protectedProcedure
      .input(z.object({
        userId: z.number(),
        total: z.string(),
        discount: z.string().optional(),
        customerId: z.number().optional(),
        paymentMethod: z.enum(["cash", "pix", "debit", "credit"]).optional(),
        stamps: z.number().optional(),
        items: z.array(z.object({
          productId: z.number(),
          quantity: z.string(),
          unitPrice: z.string(),
          total: z.string(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          // Validar se caixa esta aberto
          const openCash = await db.getCurrentCashRegister(ctx.user.id);
          if (!openCash) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Caixa nao esta aberto. Abra o caixa antes de vender`,
            });
          }
          
          // Validar estoque antes de criar venda (apenas para produtos que requerem)
          for (const item of input.items) {
            const product = await db.getProductById(item.productId);
            if (!product) {
              throw new TRPCError({
                code: 'NOT_FOUND',
                message: `Produto nao encontrado`,
              });
            }
            
            // Validar estoque apenas se o produto requer
            if (product.requiresStock) {
              const inventory = await db.getInventoryByProductId(item.productId);
              if (!inventory) {
                throw new TRPCError({
                  code: 'BAD_REQUEST',
                  message: `Produto nao encontrado no estoque`,
                });
              }
              const currentQty = parseInt(inventory.quantity as any);
              const itemQty = parseInt(item.quantity);
              if (currentQty < itemQty) {
                throw new TRPCError({
                  code: 'BAD_REQUEST',
                  message: `Estoque insuficiente. Disponivel: ${currentQty}, Solicitado: ${itemQty}`,
                });
              }
            }
          }

          // Criar venda
          const saleResult = await db.createSale({
            userId: input.userId,
            total: input.total,
            discount: input.discount || "0",
            customerId: input.customerId || 0,
          });

          if (saleResult && typeof saleResult === 'object' && 'insertId' in saleResult) {
            const saleId = saleResult.insertId as number;
            for (const item of input.items) {
              // Criar item de venda
              await db.createSaleItem({
                saleId: saleId,
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: item.total,
              });
              
              // Reduzir estoque automaticamente
              const qty = parseInt(item.quantity);
              await db.reduceInventory(item.productId, qty);
            }
            
            // Adicionar selos de fidelidade se cliente foi informado
            if (input.customerId && input.customerId > 0 && input.stamps && input.stamps > 0) {
              await db.addLoyaltyStamps(input.customerId, input.stamps);
            }
          }

          return saleResult;
        } catch (error) {
          if (error instanceof TRPCError) {
            throw error;
          }
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error instanceof Error ? error.message : 'Erro ao criar venda',
          });
        }
      }),
  }),

  // ============ ESTOQUE ============
  stock: router({
    getInventory: publicProcedure.query(async () => {
      try {
        return await db.getInventory();
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao buscar estoque',
        });
      }
    }),

    // ✅ NOVA FUNÇÃO: Criar estoque para produto
    createInventory: protectedProcedure
      .input(z.object({
        productId: z.number(),
        quantity: z.string(),
        minQuantity: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          return await db.createInventory({
            productId: input.productId,
            quantity: input.quantity,
            minQuantity: input.minQuantity || "10",
          });
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Erro ao criar estoque',
          });
        }
      }),

    updateInventory: protectedProcedure
      .input(z.object({
        id: z.number().optional(), // ✅ NOVO: ID para identificar registro existente
        productId: z.number(),
        quantity: z.string(),
        minQuantity: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          return await db.updateInventory(input.productId, input.quantity, input.minQuantity, input.id);
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Erro ao atualizar estoque',
          });
        }
      }),
  }),

  // ============ FIDELIDADE ============
  loyalty: router({
    getCustomers: publicProcedure.query(async () => {
      try {
        return await db.getLoyaltyCustomers();
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao buscar clientes',
        });
      }
    }),

    createCustomer: protectedProcedure
      .input(z.object({
        name: z.string(),
        phone: z.string(),
        email: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          return await db.createLoyaltyCustomer({
            name: input.name,
            phone: input.phone,
            email: input.email,
            level: 'bronze',
            stamps: 0,
            joinDate: new Date(),
          });
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Erro ao criar cliente',
          });
        }
      }),

    updateCustomer: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          return await db.updateLoyaltyCustomer(input.id, {
            name: input.name,
            phone: input.phone,
            email: input.email,
          });
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Erro ao atualizar cliente',
          });
        }
      }),

    addStamps: protectedProcedure
      .input(z.object({
        customerId: z.number(),
        stamps: z.number(),
      }))
      .mutation(async ({ input }) => {
        try {
          const customer = await db.getLoyaltyCustomers();
          const cust = customer.find((c: any) => c.id === input.customerId);
          if (!cust) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Cliente não encontrado',
            });
          }
          
          const newStamps = (cust.stamps || 0) + input.stamps;
          await db.updateLoyaltyCustomer(input.customerId, {
            stamps: newStamps,
          });
          
          await db.updateCustomerLastVisit(input.customerId);
          
          return { success: true };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Erro ao adicionar selos',
          });
        }
      }),

    redeemPrize: protectedProcedure
      .input(z.object({
        customerId: z.number(),
      }))
      .mutation(async ({ input }) => {
        try {
          const customer = await db.getLoyaltyCustomers();
          const cust = customer.find((c: any) => c.id === input.customerId);
          if (!cust) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Cliente nao encontrado',
            });
          }
          
          if ((cust.stamps || 0) < 10) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Cliente precisa de 10 selos para resgatar',
            });
          }
          
          const newStamps = (cust.stamps || 0) - 10;
          
          await db.updateLoyaltyCustomer(input.customerId, {
            stamps: newStamps,
          });
          
          await db.createRedemption(input.customerId, 10);
          await db.updateCustomerLastVisit(input.customerId);
          
          return { success: true };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Erro ao resgatar premio',
          });
        }
      }),

    checkExpiration: publicProcedure
      .input(z.object({
        customerId: z.number(),
      }))
      .query(async ({ input }) => {
        try {
          const expired = await db.checkAndExpireStamps(input.customerId);
          return { expired };
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Erro ao verificar expiracao',
          });
        }
      }),

    getStampsHistory: publicProcedure
      .input(z.object({
        customerId: z.number(),
      }))
      .query(async ({ input }) => {
        try {
          return await db.getStampsHistory(input.customerId);
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Erro ao buscar historico de selos',
          });
        }
      }),

    getActiveStampsCount: publicProcedure
      .input(z.object({
        customerId: z.number(),
      }))
      .query(async ({ input }) => {
        try {
          return await db.getActiveStampsCount(input.customerId);
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Erro ao contar selos ativos',
          });
        }
      }),

    expireOldStamps: protectedProcedure
      .input(z.object({
        customerId: z.number(),
      }))
      .mutation(async ({ input }) => {
        try {
          const expiredCount = await db.expireOldStamps(input.customerId);
          return { success: true, expiredCount };
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Erro ao expirar selos antigos',
          });
        }
      }),
  }),

  // ============ CAIXA ============
  cash: router({
    getCurrentCash: protectedProcedure.query(async ({ ctx }) => {
      try {
        return await db.getCurrentCashRegister(ctx.user.id);
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao buscar caixa atual',
        });
      }
    }),

    openCash: protectedProcedure
      .input(z.object({
        initialBalance: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          return await db.openCashRegister(ctx.user.id, input.initialBalance);
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Erro ao abrir caixa',
          });
        }
      }),

    closeCash: protectedProcedure
      .input(z.object({
        finalBalance: z.string(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          return await db.closeCashRegister(ctx.user.id, input.finalBalance, input.notes);
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Erro ao fechar caixa',
          });
        }
      }),

    getCashHistory: protectedProcedure
      .input(z.object({
        limit: z.number().optional(),
      }))
      .query(async ({ input, ctx }) => {
        try {
          return await db.getCashHistory(ctx.user.id, input.limit || 10);
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Erro ao buscar historico de caixa',
          });
        }
      }),
  }),

  // ============ CAMPANHAS E Z-API ============
  campaigns: router({
    getAll: protectedProcedure
      .input(z.object({
        status: z.string().optional(),
      }))
      .query(async ({ input }) => {
        try {
          return await db.getCampaigns(input.status);
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Erro ao buscar campanhas',
          });
        }
      }),

    getStats: protectedProcedure.query(async () => {
      try {
        return await db.getCampaignStats();
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao buscar estatísticas',
        });
      }
    }),

    create: protectedProcedure
      .input(z.object({
        title: z.string(),
        message: z.string(),
        type: z.enum(["promotional", "reminder", "birthday", "custom", "stamp_earned", "inactive", "level_up"]),
        scheduledDate: z.string().optional(),
        targetAudience: z.string(),
        automationEnabled: z.boolean().optional(),
        automationConfig: z.object({
          type: z.string(),
          days: z.number().optional(),
        }).optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          return await db.createCampaign({
            title: input.title,
            message: input.message,
            type: input.type,
            scheduledDate: input.scheduledDate ? new Date(input.scheduledDate) : null,
            targetAudience: input.targetAudience,
            automationEnabled: input.automationEnabled || false,
            automationConfig: input.automationConfig || null,
            status: input.scheduledDate ? "scheduled" : "draft",
          });
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Erro ao criar campanha',
          });
        }
      }),

    sendMessage: protectedProcedure
      .input(z.object({
        campaignId: z.number().optional(),
        customerId: z.number().optional(),
        customerIds: z.array(z.number()).optional(),
        message: z.string(),
        type: z.string(),
      }))
      .mutation(async ({ input }) => {
        try {
          if (input.customerId) {
            return await db.sendWhatsAppMessage({
              customerId: input.customerId,
              message: input.message,
              type: input.type,
              campaignId: input.campaignId,
            });
          } else if (input.customerIds) {
            return await db.sendMassWhatsAppMessage({
              customerIds: input.customerIds,
              message: input.message,
              type: input.type,
              campaignId: input.campaignId,
            });
          }
          throw new Error("Customer ID ou lista de IDs é obrigatório");
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Erro ao enviar mensagem: ${error.message}`,
          });
        }
      }),

    sendMassMessage: protectedProcedure
      .input(z.object({
        customerIds: z.array(z.number()),
        message: z.string(),
        type: z.string(),
      }))
      .mutation(async ({ input }) => {
        try {
          return await db.sendMassWhatsAppMessage({
            customerIds: input.customerIds,
            message: input.message,
            type: input.type,
          });
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Erro ao enviar mensagens em massa: ${error.message}`,
          });
        }
      }),

    configureZAPI: protectedProcedure
      .input(z.object({
        instanceId: z.string(),
        token: z.string(),
        enabled: z.boolean(),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          return await db.configureZAPI({
            userId: ctx.user.id,
            instanceId: input.instanceId,
            token: input.token,
            enabled: input.enabled,
          });
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Erro ao configurar Z-API',
          });
        }
      }),

    testConnection: protectedProcedure.query(async ({ ctx }) => {
      try {
        return await db.testZAPIConnection(ctx.user.id);
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao testar conexão Z-API',
        });
      }
    }),
  }),

  // ============ CLIENTES (PARA AUTOMAÇÕES) ============
  customers: router({
    getInactive: protectedProcedure
      .input(z.object({
        days: z.number().default(30),
      }))
      .query(async ({ input }) => {
        try {
          return await db.getInactiveCustomers(input.days);
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Erro ao buscar clientes inativos',
          });
        }
      }),

    getRecentStamps: protectedProcedure
      .input(z.object({
        days: z.number().default(7),
      }))
      .query(async ({ input }) => {
        try {
          return await db.getCustomersWithRecentStamps(input.days);
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Erro ao buscar clientes com novos selos',
          });
        }
      }),

    getBirthdays: protectedProcedure
      .input(z.object({
        month: z.number().optional(),
      }))
      .query(async ({ input }) => {
        try {
          return await db.getBirthdayCustomers(input.month);
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Erro ao buscar aniversariantes',
          });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
