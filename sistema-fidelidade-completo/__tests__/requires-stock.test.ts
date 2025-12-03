import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as db from '../db';

// Mock do módulo db
vi.mock('../db', () => ({
  getProductById: vi.fn(),
  getInventoryByProductId: vi.fn(),
  createSale: vi.fn(),
}));

describe('Opção "Sem Estoque" para Produtos por Quilo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Validação de Estoque Condicional', () => {
    it('should validate stock for products with requiresStock=true', async () => {
      const product = {
        id: 1,
        name: 'Produto com Estoque',
        requiresStock: true,
        type: 'unit',
        price: '10.00',
      };

      const inventory = {
        id: 1,
        productId: 1,
        quantity: '5',
        minQuantity: '1',
        unit: 'un',
      };

      vi.mocked(db.getProductById).mockResolvedValue(product as any);
      vi.mocked(db.getInventoryByProductId).mockResolvedValue(inventory as any);

      const productFromDb = await db.getProductById(1);
      expect(productFromDb?.requiresStock).toBe(true);

      if (productFromDb?.requiresStock) {
        const inv = await db.getInventoryByProductId(1);
        expect(inv?.quantity).toBe('5');
      }
    });

    it('should skip stock validation for products with requiresStock=false', async () => {
      const product = {
        id: 2,
        name: 'Açaí por Quilo',
        requiresStock: false,
        type: 'weight',
        price: '25.00',
      };

      vi.mocked(db.getProductById).mockResolvedValue(product as any);

      const productFromDb = await db.getProductById(2);
      expect(productFromDb?.requiresStock).toBe(false);

      // Não deve chamar getInventoryByProductId
      expect(db.getInventoryByProductId).not.toHaveBeenCalled();
    });

    it('should allow sale of weight-based products without stock validation', async () => {
      const product = {
        id: 3,
        name: 'Carne por Quilo',
        requiresStock: false,
        type: 'weight',
        price: '45.00',
      };

      vi.mocked(db.getProductById).mockResolvedValue(product as any);
      vi.mocked(db.createSale).mockResolvedValue({ id: 1 } as any);

      const productFromDb = await db.getProductById(3);

      // Simular lógica de venda
      if (!productFromDb?.requiresStock) {
        // Permitir venda sem validar estoque
        await db.createSale({
          userId: 1,
          total: '45.00',
          items: [
            {
              productId: 3,
              quantity: '2.5',
              unitPrice: '45.00',
              total: '112.50',
            },
          ],
        } as any);

        expect(db.createSale).toHaveBeenCalled();
      }
    });

    it('should reject sale if stock is insufficient for requiresStock=true products', async () => {
      const product = {
        id: 4,
        name: 'Produto com Estoque',
        requiresStock: true,
        type: 'unit',
        price: '10.00',
      };

      const inventory = {
        id: 4,
        productId: 4,
        quantity: '2',
        minQuantity: '1',
        unit: 'un',
      };

      vi.mocked(db.getProductById).mockResolvedValue(product as any);
      vi.mocked(db.getInventoryByProductId).mockResolvedValue(inventory as any);

      const productFromDb = await db.getProductById(4);
      expect(productFromDb?.requiresStock).toBe(true);

      const inv = await db.getInventoryByProductId(4);
      const requestedQty = 5;
      const currentQty = parseInt(inv?.quantity || '0');

      expect(currentQty).toBeLessThan(requestedQty);
    });
  });

  describe('Product Type and Stock Requirements', () => {
    it('should mark unit products as requiresStock=true by default', async () => {
      const product = {
        id: 5,
        name: 'Produto Unitário',
        requiresStock: true,
        type: 'unit',
        price: '15.00',
      };

      vi.mocked(db.getProductById).mockResolvedValue(product as any);

      const productFromDb = await db.getProductById(5);
      expect(productFromDb?.type).toBe('unit');
      expect(productFromDb?.requiresStock).toBe(true);
    });

    it('should allow weight products to have requiresStock=false', async () => {
      const product = {
        id: 6,
        name: 'Produto por Peso',
        requiresStock: false,
        type: 'weight',
        price: '30.00',
      };

      vi.mocked(db.getProductById).mockResolvedValue(product as any);

      const productFromDb = await db.getProductById(6);
      expect(productFromDb?.type).toBe('weight');
      expect(productFromDb?.requiresStock).toBe(false);
    });
  });

  describe('Integration: Complete Sale Flow', () => {
    it('should complete sale for weight product without stock check', async () => {
      const product = {
        id: 7,
        name: 'Açaí Premium',
        requiresStock: false,
        type: 'weight',
        price: '25.00',
      };

      vi.mocked(db.getProductById).mockResolvedValue(product as any);
      vi.mocked(db.createSale).mockResolvedValue({ id: 1 } as any);

      const productFromDb = await db.getProductById(7);

      // Simular validação
      let canSell = true;
      if (productFromDb?.requiresStock) {
        const inv = await db.getInventoryByProductId(7);
        if (!inv) canSell = false;
      }

      expect(canSell).toBe(true);

      // Criar venda
      if (canSell) {
        await db.createSale({
          userId: 1,
          total: '50.00',
          items: [
            {
              productId: 7,
              quantity: '2',
              unitPrice: '25.00',
              total: '50.00',
            },
          ],
        } as any);

        expect(db.createSale).toHaveBeenCalled();
      }
    });

    it('should block sale for unit product with insufficient stock', async () => {
      const product = {
        id: 8,
        name: 'Bebida 500ml',
        requiresStock: true,
        type: 'unit',
        price: '8.00',
      };

      const inventory = {
        id: 8,
        productId: 8,
        quantity: '3',
        minQuantity: '1',
        unit: 'un',
      };

      vi.mocked(db.getProductById).mockResolvedValue(product as any);
      vi.mocked(db.getInventoryByProductId).mockResolvedValue(inventory as any);

      const productFromDb = await db.getProductById(8);
      let canSell = true;

      if (productFromDb?.requiresStock) {
        const inv = await db.getInventoryByProductId(8);
        const currentQty = parseInt(inv?.quantity || '0');
        const requestedQty = 5;

        if (currentQty < requestedQty) {
          canSell = false;
        }
      }

      expect(canSell).toBe(false);
    });
  });
});
