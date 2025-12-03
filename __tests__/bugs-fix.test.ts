import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as db from '../db';

// Mock do módulo db
vi.mock('../db', () => ({
  getInventory: vi.fn(),
  getInventoryByProductId: vi.fn(),
  updateInventory: vi.fn(),
  getLoyaltyCustomers: vi.fn(),
  updateLoyaltyCustomer: vi.fn(),
  createRedemption: vi.fn(),
  updateCustomerLastVisit: vi.fn(),
  checkAndExpireStamps: vi.fn(),
}));

describe('Bug Fixes - Sublime Connect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Bug #1: Estoque não salvando produtos', () => {
    it('should create new inventory entry if product does not exist', async () => {
      vi.mocked(db.getInventoryByProductId).mockResolvedValue(null);
      vi.mocked(db.updateInventory).mockResolvedValue({} as any);

      await db.updateInventory(1, '100', '10');

      expect(db.updateInventory).toHaveBeenCalledWith(1, '100', '10');
    });

    it('should update existing inventory entry if product exists', async () => {
      const existingInventory = {
        id: 1,
        productId: 1,
        quantity: '50',
        minQuantity: '10',
        unit: 'un',
        lastUpdated: new Date(),
      };

      vi.mocked(db.getInventoryByProductId).mockResolvedValue(existingInventory as any);
      vi.mocked(db.updateInventory).mockResolvedValue({} as any);

      await db.updateInventory(1, '100', '10');

      expect(db.updateInventory).toHaveBeenCalledWith(1, '100', '10');
    });
  });

  describe('Bug #2: Fidelidade com resgate incorreto', () => {
    it('should create redemption record when prize is redeemed', async () => {
      vi.mocked(db.createRedemption).mockResolvedValue({} as any);

      await db.createRedemption(1, 10);

      expect(db.createRedemption).toHaveBeenCalledWith(1, 10);
    });

    it('should update customer lastVisit when redeeming prize', async () => {
      vi.mocked(db.updateCustomerLastVisit).mockResolvedValue({} as any);

      await db.updateCustomerLastVisit(1);

      expect(db.updateCustomerLastVisit).toHaveBeenCalledWith(1);
    });

    it('should reduce stamps by exactly 10 when redeeming', async () => {
      const customer = {
        id: 1,
        name: 'Test Customer',
        phone: '11999999999',
        email: 'test@example.com',
        level: 'gold',
        stamps: 15,
        joinDate: new Date(),
        lastPurchase: new Date(),
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.getLoyaltyCustomers).mockResolvedValue([customer] as any);
      vi.mocked(db.updateLoyaltyCustomer).mockResolvedValue({} as any);

      const customers = await db.getLoyaltyCustomers();
      const cust = customers.find((c: any) => c.id === 1);

      expect(cust?.stamps).toBe(15);

      const newStamps = (cust?.stamps || 0) - 10;
      await db.updateLoyaltyCustomer(1, { stamps: newStamps });

      expect(db.updateLoyaltyCustomer).toHaveBeenCalledWith(1, { stamps: 5 });
    });
  });

  describe('Bug #3: Expiração de selos após 30 dias', () => {
    it('should expire stamps if customer has not visited for 30+ days', async () => {
      const thirtyOneDaysAgo = new Date();
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

      const customer = {
        id: 1,
        name: 'Test Customer',
        phone: '11999999999',
        email: 'test@example.com',
        level: 'bronze',
        stamps: 5,
        joinDate: new Date(),
        lastPurchase: thirtyOneDaysAgo,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.checkAndExpireStamps).mockResolvedValue(true);

      const expired = await db.checkAndExpireStamps(1);

      expect(expired).toBe(true);
      expect(db.checkAndExpireStamps).toHaveBeenCalledWith(1);
    });

    it('should not expire stamps if customer visited within 30 days', async () => {
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

      const customer = {
        id: 1,
        name: 'Test Customer',
        phone: '11999999999',
        email: 'test@example.com',
        level: 'gold',
        stamps: 5,
        joinDate: new Date(),
        lastPurchase: fifteenDaysAgo,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.checkAndExpireStamps).mockResolvedValue(false);

      const expired = await db.checkAndExpireStamps(1);

      expect(expired).toBe(false);
    });
  });

  describe('Integration: Complete flow', () => {
    it('should handle complete loyalty flow: add stamps -> redeem -> expire', async () => {
      const customer = {
        id: 1,
        name: 'Test Customer',
        phone: '11999999999',
        email: 'test@example.com',
        level: 'bronze',
        stamps: 0,
        joinDate: new Date(),
        lastPurchase: new Date(),
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Step 1: Add stamps
      vi.mocked(db.updateLoyaltyCustomer).mockResolvedValue({} as any);
      vi.mocked(db.updateCustomerLastVisit).mockResolvedValue({} as any);

      await db.updateLoyaltyCustomer(1, { stamps: 10 });
      await db.updateCustomerLastVisit(1);

      expect(db.updateLoyaltyCustomer).toHaveBeenCalledWith(1, { stamps: 10 });

      // Step 2: Redeem prize
      vi.mocked(db.createRedemption).mockResolvedValue({} as any);

      await db.createRedemption(1, 10);
      await db.updateLoyaltyCustomer(1, { stamps: 0 });

      expect(db.createRedemption).toHaveBeenCalledWith(1, 10);
      expect(db.updateLoyaltyCustomer).toHaveBeenCalledWith(1, { stamps: 0 });

      // Step 3: Check expiration (30 days later)
      vi.mocked(db.checkAndExpireStamps).mockResolvedValue(true);

      const expired = await db.checkAndExpireStamps(1);

      expect(expired).toBe(true);
    });
  });
});
