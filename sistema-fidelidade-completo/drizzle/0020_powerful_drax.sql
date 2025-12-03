CREATE TABLE `loyaltyStampsHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`quantity` int NOT NULL,
	`earnedAt` datetime NOT NULL,
	`expiresAt` datetime NOT NULL,
	`status` enum('active','expired','redeemed') NOT NULL DEFAULT 'active',
	`reason` varchar(255) DEFAULT 'sale',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `loyaltyStampsHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `loyaltyCustomers` MODIFY COLUMN `lastPurchase` datetime DEFAULT '2025-11-24 01:47:29.373';--> statement-breakpoint
ALTER TABLE `loyaltyRedemptions` MODIFY COLUMN `completedAt` datetime DEFAULT '2025-11-24 01:47:29.374';