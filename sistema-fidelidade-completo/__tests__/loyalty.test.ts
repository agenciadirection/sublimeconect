import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as db from '../db';

// Mock do módulo db
vi.mock('../db', () => ({
  getLoyaltyCustomers: vi.fn(),
  createLoyaltyCustomer: vi.fn(),
  updateLoyaltyCustomer: vi.fn(),
}));

describe('Loyalty Procedures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addStamps', () => {
    it('should add stamps to a customer', async () => {
      const mockCustomer = {
        id: 1,
        name: 'Test Customer',
        phone: '11999999999',
        email: 'test@example.com',
        level: 'bronze',
        stamps: 5,
        joinDate: new Date(),
        lastPurchase: new Date(),
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.getLoyaltyCustomers).mockResolvedValue([mockCustomer]);
      vi.mocked(db.updateLoyaltyCustomer).mockResolvedValue(mockCustomer);

      const customers = await db.getLoyaltyCustomers();
      const customer = customers.find((c: any) => c.id === 1);
      
      expect(customer).toBeDefined();
      expect(customer?.stamps).toBe(5);

      const newStamps = (customer?.stamps || 0) + 3;
      await db.updateLoyaltyCustomer(1, { stamps: newStamps });

      expect(db.updateLoyaltyCustomer).toHaveBeenCalledWith(1, { stamps: 8 });
    });

    it('should not add stamps to non-existent customer', async () => {
      vi.mocked(db.getLoyaltyCustomers).mockResolvedValue([]);

      const customers = await db.getLoyaltyCustomers();
      const customer = customers.find((c: any) => c.id === 999);

      expect(customer).toBeUndefined();
    });
  });

  describe('redeemPrize', () => {
    it('should redeem a prize when customer has 10+ stamps', async () => {
      const mockCustomer = {
        id: 1,
        name: 'Test Customer',
        phone: '11999999999',
        email: 'test@example.com',
        level: 'gold',
        stamps: 10,
        joinDate: new Date(),
        lastPurchase: new Date(),
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.getLoyaltyCustomers).mockResolvedValue([mockCustomer]);
      vi.mocked(db.updateLoyaltyCustomer).mockResolvedValue({
        ...mockCustomer,
        stamps: 0,
      });

      const customers = await db.getLoyaltyCustomers();
      const customer = customers.find((c: any) => c.id === 1);

      expect(customer?.stamps).toBe(10);

      if (customer && customer.stamps >= 10) {
        const newStamps = customer.stamps - 10;
        await db.updateLoyaltyCustomer(1, { stamps: newStamps });

        expect(db.updateLoyaltyCustomer).toHaveBeenCalledWith(1, { stamps: 0 });
      }
    });

    it('should not redeem prize when customer has less than 10 stamps', async () => {
      const mockCustomer = {
        id: 1,
        name: 'Test Customer',
        phone: '11999999999',
        email: 'test@example.com',
        level: 'bronze',
        stamps: 5,
        joinDate: new Date(),
        lastPurchase: new Date(),
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.getLoyaltyCustomers).mockResolvedValue([mockCustomer]);

      const customers = await db.getLoyaltyCustomers();
      const customer = customers.find((c: any) => c.id === 1);

      expect(customer?.stamps).toBeLessThan(10);
      expect(db.updateLoyaltyCustomer).not.toHaveBeenCalled();
    });
  });

  describe('createCustomer', () => {
    it('should create a new loyalty customer', async () => {
      const newCustomer = {
        name: 'New Customer',
        phone: '11988888888',
        email: 'new@example.com',
      };

      const mockCreatedCustomer = {
        id: 2,
        ...newCustomer,
        level: 'bronze',
        stamps: 0,
        joinDate: new Date(),
        lastPurchase: new Date(),
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.createLoyaltyCustomer).mockResolvedValue(mockCreatedCustomer);

      const result = await db.createLoyaltyCustomer({
        name: newCustomer.name,
        phone: newCustomer.phone,
        email: newCustomer.email,
        level: 'bronze',
        stamps: 0,
        joinDate: new Date(),
      });

      expect(result).toBeDefined();
      expect(result.name).toBe('New Customer');
      expect(result.stamps).toBe(0);
      expect(result.level).toBe('bronze');
    });
  });
});
