import { 
  serial, integer, varchar, text, decimal, boolean, 
  timestamp, pgTable, pgEnum 
} from "drizzle-orm/pg-core";

/**
 * PostgreSQL optimized schema for Sublime Connect PDV System
 * Optimized for açaí business with loyalty program
 */

// ============ ENUMS ============
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const productTypeEnum = pgEnum("product_type", ["unit", "weight"]);
export const saleStatusEnum = pgEnum("sale_status", ["pending", "completed", "cancelled"]);
export const loyaltyLevelEnum = pgEnum("loyalty_level", ["bronze", "silver", "gold"]);
export const inventoryMovementTypeEnum = pgEnum("inventory_movement_type", ["in", "out", "adjustment"]);
export const campaignTypeEnum = pgEnum("campaign_type", ["promotional", "reminder", "birthday", "custom"]);
export const campaignStatusEnum = pgEnum("campaign_status", ["draft", "scheduled", "sent", "cancelled"]);
export const messageTypeEnum = pgEnum("message_type", ["stamp_added", "reward_redeemed", "campaign", "notification"]);
export const messageStatusEnum = pgEnum("message_status", ["pending", "sent", "failed", "read"]);
export const paymentMethodTypeEnum = pgEnum("payment_method_type", ["cash", "pix", "debit", "credit"]);
export const cashStatusEnum = pgEnum("cash_status", ["open", "closed"]);
export const printerModelEnum = pgEnum("printer_model", ["elgin_i8", "bematech", "other"]);
export const loyaltyHistoryTypeEnum = pgEnum("loyalty_history_type", ["stamp_added", "prize_redeemed", "level_changed", "manual_adjustment"]);
export const loyaltyStampStatusEnum = pgEnum("loyalty_stamp_status", ["active", "expired", "redeemed"]);
export const redemptionStatusEnum = pgEnum("redemption_status", ["pending", "completed", "cancelled"]);

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = pgTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by PostgreSQL.
   * Use this for relations between tables.
   */
  id: serial("id").primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("open_id", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("login_method", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============ CARDÁPIO ============
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  type: productTypeEnum("type").default("unit").notNull(),
  requiresStock: boolean("requires_stock").default(true).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

// ============ VENDAS ============
export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0"),
  status: saleStatusEnum("status").default("completed").notNull(),
  customerId: integer("customer_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Sale = typeof sales.$inferSelect;
export type InsertSale = typeof sales.$inferInsert;

export const saleItems = pgTable("sale_items", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type SaleItem = typeof saleItems.$inferSelect;
export type InsertSaleItem = typeof saleItems.$inferInsert;

// ============ ESTOQUE ============
export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  minQuantity: decimal("min_quantity", { precision: 10, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 50 }).default("un"),
  lastUpdated: timestamp("last_updated", { withTimezone: true }).defaultNow().notNull(),
});

export type Inventory = typeof inventory.$inferSelect;
export type InsertInventory = typeof inventory.$inferInsert;

export const inventoryMovements = pgTable("inventory_movements", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  type: inventoryMovementTypeEnum("type").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type InventoryMovement = typeof inventoryMovements.$inferSelect;
export type InsertInventoryMovement = typeof inventoryMovements.$inferInsert;

// ============ FIDELIDADE ============
export const loyaltyCustomers = pgTable("loyalty_customers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  email: varchar("email", { length: 320 }),
  level: loyaltyLevelEnum("level").default("bronze").notNull(),
  stamps: integer("stamps").default(0),
  joinDate: timestamp("join_date", { withTimezone: true }).notNull(),
  lastPurchase: timestamp("last_purchase", { withTimezone: true }).defaultNow(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type LoyaltyCustomer = typeof loyaltyCustomers.$inferSelect;
export type InsertLoyaltyCustomer = typeof loyaltyCustomers.$inferInsert;

export const loyaltyStamps = pgTable("loyalty_stamps", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  saleId: integer("sale_id").notNull(),
  quantity: integer("quantity").notNull(),
  reason: varchar("reason", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type LoyaltyStamp = typeof loyaltyStamps.$inferSelect;
export type InsertLoyaltyStamp = typeof loyaltyStamps.$inferInsert;

export const loyaltyRedemptions = pgTable("loyalty_redemptions", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  stampsCost: integer("stamps_cost").notNull(),
  reward: varchar("reward", { length: 255 }).notNull(),
  status: redemptionStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }).defaultNow(),
});

export type LoyaltyRedemption = typeof loyaltyRedemptions.$inferSelect;
export type InsertLoyaltyRedemption = typeof loyaltyRedemptions.$inferInsert;

export const loyaltyStampsHistory = pgTable("loyalty_stamps_history", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  quantity: integer("quantity").notNull(),
  earnedAt: timestamp("earned_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  status: loyaltyStampStatusEnum("status").default("active").notNull(),
  reason: varchar("reason", { length: 255 }).default("sale"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type LoyaltyStampsHistory = typeof loyaltyStampsHistory.$inferSelect;
export type InsertLoyaltyStampsHistory = typeof loyaltyStampsHistory.$inferInsert;

// ============ CAMPANHAS E Z-API ============
export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: campaignTypeEnum("type").default("promotional").notNull(),
  status: campaignStatusEnum("status").default("draft").notNull(),
  scheduledDate: timestamp("scheduled_date", { withTimezone: true }),
  sentDate: timestamp("sent_date", { withTimezone: true }),
  targetAudience: varchar("target_audience", { length: 100 }).default("all"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;

export const whatsappMessages = pgTable("whatsapp_messages", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  campaignId: integer("campaign_id"),
  message: text("message").notNull(),
  type: messageTypeEnum("type").notNull(),
  status: messageStatusEnum("status").default("pending").notNull(),
  zapiMessageId: varchar("zapi_message_id", { length: 255 }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type WhatsappMessage = typeof whatsappMessages.$inferSelect;
export type InsertWhatsappMessage = typeof whatsappMessages.$inferInsert;

// ============ FORMAS DE PAGAMENTO ============
export const paymentMethods = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  type: paymentMethodTypeEnum("type").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type InsertPaymentMethod = typeof paymentMethods.$inferInsert;

export const salePayments = pgTable("sale_payments", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id").notNull(),
  paymentMethodId: integer("payment_method_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  reference: varchar("reference", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type SalePayment = typeof salePayments.$inferSelect;
export type InsertSalePayment = typeof salePayments.$inferInsert;

// ============ CONTROLE DE CAIXA ============
export const cashRegister = pgTable("cash_register", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  openedAt: timestamp("opened_at", { withTimezone: true }).defaultNow().notNull(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  initialBalance: decimal("initial_balance", { precision: 10, scale: 2 }).default("0").notNull(),
  finalBalance: decimal("final_balance", { precision: 10, scale: 2 }),
  totalSales: decimal("total_sales", { precision: 10, scale: 2 }).default("0").notNull(),
  status: cashStatusEnum("status").default("open").notNull(),
  notes: text("notes"),
});

export type CashRegister = typeof cashRegister.$inferSelect;
export type InsertCashRegister = typeof cashRegister.$inferInsert;

export const cashRegisterDetails = pgTable("cash_register_details", {
  id: serial("id").primaryKey(),
  cashRegisterId: integer("cash_register_id").notNull(),
  paymentMethod: paymentMethodTypeEnum("payment_method").notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  transactionCount: integer("transaction_count").default(0).notNull(),
});

export type CashRegisterDetail = typeof cashRegisterDetails.$inferSelect;
export type InsertCashRegisterDetail = typeof cashRegisterDetails.$inferInsert;

// ============ CONFIGURAÇÕES DE IMPRESSORA ============
export const printerSettings = pgTable("printer_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  printerModel: printerModelEnum("printer_model").notNull(),
  printerName: varchar("printer_name", { length: 255 }).notNull(),
  ipAddress: varchar("ip_address", { length: 15 }),
  port: integer("port").default(9100),
  paperWidth: integer("paper_width").default(80),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type PrinterSettings = typeof printerSettings.$inferSelect;
export type InsertPrinterSettings = typeof printerSettings.$inferInsert;

// ============ HISTÓRICO DE FIDELIDADE ============
export const loyaltyHistory = pgTable("loyalty_history", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  saleId: integer("sale_id"),
  type: loyaltyHistoryTypeEnum("type").notNull(),
  stampsAdded: integer("stamps_added").default(0),
  stampsRedeemed: integer("stamps_redeemed").default(0),
  prizeId: integer("prize_id"),
  previousLevel: varchar("previous_level", { length: 50 }),
  newLevel: varchar("new_level", { length: 50 }),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type LoyaltyHistory = typeof loyaltyHistory.$inferSelect;
export type InsertLoyaltyHistory = typeof loyaltyHistory.$inferInsert;

// ============ PRÊMIOS DE FIDELIDADE ============
export const loyaltyPrizes = pgTable("loyalty_prizes", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  stampsRequired: integer("stamps_required").default(10).notNull(),
  value: decimal("value", { precision: 10, scale: 2 }),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type LoyaltyPrize = typeof loyaltyPrizes.$inferSelect;
export type InsertLoyaltyPrize = typeof loyaltyPrizes.$inferInsert;