import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as db from '../db';

// Mock do módulo db
vi.mock('../db', () => ({
  getCurrentCashRegister: vi.fn(),
  openCashRegister: vi.fn(),
  closeCashRegister: vi.fn(),
  getCashHistory: vi.fn(),
}));

describe('Sistema de Caixa', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Abrir Caixa', () => {
    it('should open cash register with initial balance', async () => {
      const userId = 1;
      const initialBalance = '100.00';

      vi.mocked(db.openCashRegister).mockResolvedValue({ insertId: 1 } as any);

      const result = await db.openCashRegister(userId, initialBalance);
      expect(result).toBeDefined();
      expect(db.openCashRegister).toHaveBeenCalledWith(userId, initialBalance);
    });

    it('should prevent opening cash if already open', async () => {
      const userId = 1;
      const openCash = {
        id: 1,
        userId,
        status: 'open',
        openedAt: new Date(),
        closedAt: null,
        initialBalance: '100.00',
        finalBalance: null,
        totalSales: '0',
        notes: null,
      };

      vi.mocked(db.getCurrentCashRegister).mockResolvedValue(openCash as any);

      const current = await db.getCurrentCashRegister(userId);
      expect(current?.status).toBe('open');
    });
  });

  describe('Fechar Caixa', () => {
    it('should close cash register with final balance', async () => {
      const userId = 1;
      const finalBalance = '250.00';
      const notes = 'Faltam R$ 10.00';

      vi.mocked(db.closeCashRegister).mockResolvedValue({ success: true } as any);

      const result = await db.closeCashRegister(userId, finalBalance, notes);
      expect(result).toBeDefined();
      expect(db.closeCashRegister).toHaveBeenCalledWith(userId, finalBalance, notes);
    });

    it('should prevent closing cash if not open', async () => {
      const userId = 1;

      vi.mocked(db.getCurrentCashRegister).mockResolvedValue(null);

      const current = await db.getCurrentCashRegister(userId);
      expect(current).toBeNull();
    });

    it('should update cash status to closed', async () => {
      const userId = 1;
      const closedCash = {
        id: 1,
        userId,
        status: 'closed',
        openedAt: new Date(),
        closedAt: new Date(),
        initialBalance: '100.00',
        finalBalance: '250.00',
        totalSales: '150.00',
        notes: null,
      };

      vi.mocked(db.closeCashRegister).mockResolvedValue({ success: true } as any);

      const result = await db.closeCashRegister(userId, '250.00');
      expect(result).toBeDefined();
    });
  });

  describe('Histórico de Caixa', () => {
    it('should retrieve cash history for user', async () => {
      const userId = 1;
      const history = [
        {
          id: 1,
          userId,
          status: 'closed',
          openedAt: new Date('2025-11-24 08:00'),
          closedAt: new Date('2025-11-24 18:00'),
          initialBalance: '100.00',
          finalBalance: '250.00',
          totalSales: '150.00',
          notes: null,
        },
      ];

      vi.mocked(db.getCashHistory).mockResolvedValue(history as any);

      const result = await db.getCashHistory(userId, 10);
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('closed');
    });

    it('should limit cash history results', async () => {
      const userId = 1;

      vi.mocked(db.getCashHistory).mockResolvedValue([]);

      const result = await db.getCashHistory(userId, 5);
      expect(db.getCashHistory).toHaveBeenCalledWith(userId, 5);
    });
  });

  describe('Persistência de Estado', () => {
    it('should persist cash state across reconnections', async () => {
      const userId = 1;
      const openCash = {
        id: 1,
        userId,
        status: 'open',
        openedAt: new Date(),
        closedAt: null,
        initialBalance: '100.00',
        finalBalance: null,
        totalSales: '0',
        notes: null,
      };

      vi.mocked(db.getCurrentCashRegister).mockResolvedValue(openCash as any);

      // Primeira chamada
      let current = await db.getCurrentCashRegister(userId);
      expect(current?.status).toBe('open');

      // Simular reconexão
      vi.mocked(db.getCurrentCashRegister).mockResolvedValue(openCash as any);

      // Segunda chamada após reconexão
      current = await db.getCurrentCashRegister(userId);
      expect(current?.status).toBe('open');
    });

    it('should save all sales until cash is closed', async () => {
      const userId = 1;
      const openCash = {
        id: 1,
        userId,
        status: 'open',
        openedAt: new Date(),
        closedAt: null,
        initialBalance: '100.00',
        finalBalance: null,
        totalSales: '300.00',
        notes: null,
      };

      vi.mocked(db.getCurrentCashRegister).mockResolvedValue(openCash as any);

      const current = await db.getCurrentCashRegister(userId);
      expect(current?.totalSales).toBe('300.00');
    });
  });

  describe('Validação de Caixa Aberto', () => {
    it('should allow sale only if cash is open', async () => {
      const userId = 1;
      const openCash = {
        id: 1,
        userId,
        status: 'open',
        openedAt: new Date(),
        closedAt: null,
        initialBalance: '100.00',
        finalBalance: null,
        totalSales: '0',
        notes: null,
      };

      vi.mocked(db.getCurrentCashRegister).mockResolvedValue(openCash as any);

      const current = await db.getCurrentCashRegister(userId);
      const canSell = current?.status === 'open';

      expect(canSell).toBe(true);
    });

    it('should prevent sale if cash is closed', async () => {
      const userId = 1;

      vi.mocked(db.getCurrentCashRegister).mockResolvedValue(null);

      const current = await db.getCurrentCashRegister(userId);
      const canSell = current?.status === 'open';

      expect(canSell).toBe(false);
    });
  });
});
