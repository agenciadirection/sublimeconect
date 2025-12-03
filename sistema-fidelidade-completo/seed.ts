// Seed data para o sistema de açaí
// Execute este arquivo após o primeiro deploy para popular com dados iniciais

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import * as schema from "../drizzle/schema";

// Configurar conexão com PostgreSQL
const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client, { schema });

// ============ DADOS INICIAIS ============

// Categorias de produtos do açaí
export const initialCategories = [
  { name: "Açaí Puro", description: "Açaí tradicional sem adicionais" },
  { name: "Combos Especiais", description: "Combinações especiais com frutas" },
  { name: "Bebidas", description: "Vitaminas e sucos naturais" },
  { name: "Gelados", description: "Picolés e produtos gelados" },
  { name: "Acompanhamentos", description: "Granolas, frutas e acompanhamentos" }
];

// Produtos principais do açaí
export const initialProducts = [
  // Açaí Puro
  { name: "Açaí Tradicional 300ml", description: "Açaí puro cremoso - 300ml", price: 15.00, category: "Açaí Puro", type: "unit", requiresStock: true },
  { name: "Açaí Tradicional 500ml", description: "Açaí puro cremoso - 500ml", price: 25.00, category: "Açaí Puro", type: "unit", requiresStock: true },
  { name: "Açaí Gourmet 300ml", description: "Açaí premium com toque especial", price: 18.00, category: "Açaí Puro", type: "unit", requiresStock: true },
  { name: "Açaí Família 1L", description: "Açaí para família - 1 litro", price: 40.00, category: "Açaí Puro", type: "unit", requiresStock: true },
  
  // Combos Especiais
  { name: "Açaí + Banana", description: "Açaí com fatias de banana", price: 18.00, category: "Combos Especiais", type: "unit", requiresStock: true },
  { name: "Açaí + Morango", description: "Açaí com morangos frescos", price: 20.00, category: "Combos Especiais", type: "unit", requiresStock: true },
  { name: "Açaí + Banana + Granola", description: "Combo completo com banana e granola", price: 22.00, category: "Combos Especiais", type: "unit", requiresStock: true },
  { name: "Açaí Royal", description: "Açaí premium com múltiplos toppings", price: 28.00, category: "Combos Especiais", type: "unit", requiresStock: true },
  
  // Bebidas
  { name: "Vitamina de Açaí", description: "Bebida cremosa de açaí", price: 12.00, category: "Bebidas", type: "unit", requiresStock: true },
  { name: "Suco de Açaí", description: "Suco gelado de açaí", price: 10.00, category: "Bebidas", type: "unit", requiresStock: true },
  { name: "Água de Coco c/ Açaí", description: "Água de coco com açaí", price: 8.00, category: "Bebidas", type: "unit", requiresStock: true },
  
  // Gelados
  { name: "Picolé de Açaí", description: "Picolé artesanal de açaí", price: 8.00, category: "Gelados", type: "unit", requiresStock: true },
  { name: "Açaí Gelado", description: "Açaí bem gelado para levar", price: 16.00, category: "Gelados", type: "unit", requiresStock: true },
  
  // Acompanhamentos
  { name: "Granola Premium", description: "Granola especial para toppings", price: 5.00, category: "Acompanhamentos", type: "unit", requiresStock: true },
  { name: "Leite Condensado", description: "Doce de leite condensado", price: 3.00, category: "Acompanhamentos", type: "unit", requiresStock: true },
  { name: "Mel", description: "Mel natural puro", price: 4.00, category: "Acompanhamentos", type: "unit", requiresStock: true }
];

// Prêmios de fidelidade
export const initialPrizes = [
  { name: "10% OFF próximo açaí", description: "Desconto de 10% na próxima compra", stampsRequired: 10, value: 0.00 },
  { name: "Açaí Grátis 300ml", description: "Açaí tradicional 300ml sem custo", stampsRequired: 20, value: 15.00 },
  { name: "Combo Grátis", description: "Combo especial sem custo", stampsRequired: 30, value: 22.00 },
  { name: "Produto Premium Grátis", description: "Escolha qualquer produto premium", stampsRequired: 40, value: 28.00 },
  { name: "Açaí Família Grátis", description: "Açaí 1L para a família", stampsRequired: 60, value: 40.00 }
];

// Formas de pagamento
export const initialPaymentMethods = [
  { name: "Dinheiro", type: "cash", active: true },
  { name: "PIX", type: "pix", active: true },
  { name: "Cartão de Débito", type: "debit", active: true },
  { name: "Cartão de Crédito", type: "credit", active: true }
];

// ============ FUNÇÃO DE SEED ============

export async function seedDatabase() {
  try {
    console.log("🌱 Iniciando seed do banco de dados...");

    // 1. Inserir categorias
    console.log("📂 Inserindo categorias...");
    for (const category of initialCategories) {
      await db.insert(schema.categories).values(category);
    }

    // 2. Inserir produtos
    console.log("🍇 Inserindo produtos...");
    for (const productData of initialProducts) {
      // Buscar ID da categoria
      const category = await db.query.categories.findFirst({
        where: (categories, { eq }) => eq(categories.name, productData.category)
      });

      if (category) {
        await db.insert(schema.products).values({
          categoryId: category.id,
          name: productData.name,
          description: productData.description,
          price: productData.price.toString(),
          type: productData.type,
          requiresStock: productData.requiresStock,
          active: true
        });
      }
    }

    // 3. Inserir prêmios
    console.log("🏆 Inserindo prêmios de fidelidade...");
    for (const prize of initialPrizes) {
      await db.insert(schema.loyaltyPrizes).values(prize);
    }

    // 4. Inserir formas de pagamento
    console.log("💳 Inserindo formas de pagamento...");
    for (const payment of initialPaymentMethods) {
      await db.insert(schema.paymentMethods).values(payment);
    }

    // 5. Inserir alguns clientes de exemplo
    console.log("👥 Inserindo clientes de exemplo...");
    const sampleCustomers = [
      { name: "João Silva", phone: "(11) 99999-1111", email: "joao@email.com" },
      { name: "Maria Santos", phone: "(11) 98888-2222", email: "maria@email.com" },
      { name: "Pedro Costa", phone: "(11) 97777-3333", email: "pedro@email.com" },
      { name: "Ana Oliveira", phone: "(11) 96666-4444", email: "ana@email.com" }
    ];

    for (const customer of sampleCustomers) {
      await db.insert(schema.loyaltyCustomers).values({
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        level: "bronze",
        stamps: Math.floor(Math.random() * 30),
        joinDate: new Date(),
        lastPurchase: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Últimos 30 dias
        active: true
      });
    }

    console.log("✅ Seed concluído com sucesso!");
    console.log("📊 Dados inseridos:");
    console.log(`   - ${initialCategories.length} categorias`);
    console.log(`   - ${initialProducts.length} produtos`);
    console.log(`   - ${initialPrizes.length} prêmios`);
    console.log(`   - ${initialPaymentMethods.length} formas de pagamento`);
    console.log(`   - ${sampleCustomers.length} clientes de exemplo`);

  } catch (error) {
    console.error("❌ Erro durante o seed:", error);
    throw error;
  } finally {
    await client.end();
  }
}

// Executar seed se for chamado diretamente
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log("🚀 Database seeded successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Failed to seed database:", error);
      process.exit(1);
    });
}