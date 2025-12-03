ALTER TABLE `loyaltyCustomers` MODIFY COLUMN `joinDate` datetime NOT NULL;--> statement-breakpoint
ALTER TABLE `loyaltyCustomers` MODIFY COLUMN `lastPurchase` datetime DEFAULT '2025-11-06 03:04:32.556';--> statement-breakpoint
ALTER TABLE `loyaltyRedemptions` MODIFY COLUMN `completedAt` datetime DEFAULT '2025-11-06 03:04:32.556';