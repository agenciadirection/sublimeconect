CREATE TABLE `campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`type` enum('promotional','reminder','birthday','custom') NOT NULL DEFAULT 'promotional',
	`status` enum('draft','scheduled','sent','cancelled') NOT NULL DEFAULT 'draft',
	`scheduledDate` datetime,
	`sentDate` datetime,
	`targetAudience` varchar(100) DEFAULT 'all',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `paymentMethods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`type` enum('cash','pix','debit','credit') NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `paymentMethods_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `salePayments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`saleId` int NOT NULL,
	`paymentMethodId` int NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`reference` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `salePayments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `whatsappMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`campaignId` int,
	`message` text NOT NULL,
	`type` enum('stamp_added','reward_redeemed','campaign','notification') NOT NULL,
	`status` enum('pending','sent','failed','read') NOT NULL DEFAULT 'pending',
	`zapiMessageId` varchar(255),
	`sentAt` datetime,
	`failureReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `whatsappMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `loyaltyCustomers` MODIFY COLUMN `lastPurchase` datetime DEFAULT '2025-11-10 03:25:12.746';--> statement-breakpoint
ALTER TABLE `loyaltyRedemptions` MODIFY COLUMN `completedAt` datetime DEFAULT '2025-11-10 03:25:12.746';