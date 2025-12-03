ALTER TABLE `loyaltyCustomers` MODIFY COLUMN `lastPurchase` datetime DEFAULT '2025-11-25 01:40:14.555';--> statement-breakpoint
ALTER TABLE `loyaltyRedemptions` MODIFY COLUMN `completedAt` datetime DEFAULT '2025-11-25 01:40:14.556';--> statement-breakpoint
ALTER TABLE `products` ADD `requiresStock` boolean DEFAULT true NOT NULL;