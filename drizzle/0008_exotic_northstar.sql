CREATE TABLE `cashRegister` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`openedAt` timestamp NOT NULL DEFAULT (now()),
	`closedAt` timestamp,
	`initialBalance` decimal(10,2) NOT NULL DEFAULT '0',
	`finalBalance` decimal(10,2),
	`totalSales` decimal(10,2) NOT NULL DEFAULT '0',
	`status` enum('open','closed') NOT NULL DEFAULT 'open',
	`notes` text,
	CONSTRAINT `cashRegister_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cashRegisterDetails` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cashRegisterId` int NOT NULL,
	`paymentMethod` enum('cash','pix','debit','credit') NOT NULL,
	`totalAmount` decimal(10,2) NOT NULL,
	`transactionCount` int NOT NULL DEFAULT 0,
	CONSTRAINT `cashRegisterDetails_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `loyaltyHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`saleId` int,
	`type` enum('stamp_added','prize_redeemed','level_changed','manual_adjustment') NOT NULL,
	`stampsAdded` int DEFAULT 0,
	`stampsRedeemed` int DEFAULT 0,
	`prizeId` int,
	`previousLevel` varchar(50),
	`newLevel` varchar(50),
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `loyaltyHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `loyaltyPrizes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`stampsRequired` int NOT NULL DEFAULT 10,
	`value` decimal(10,2),
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `loyaltyPrizes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `printerSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`printerModel` enum('elgin_i8','bematech','other') NOT NULL,
	`printerName` varchar(255) NOT NULL,
	`ipAddress` varchar(15),
	`port` int DEFAULT 9100,
	`paperWidth` int DEFAULT 80,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `printerSettings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `loyaltyCustomers` MODIFY COLUMN `lastPurchase` datetime DEFAULT '2025-11-12 03:31:49.879';--> statement-breakpoint
ALTER TABLE `loyaltyRedemptions` MODIFY COLUMN `completedAt` datetime DEFAULT '2025-11-12 03:31:49.879';