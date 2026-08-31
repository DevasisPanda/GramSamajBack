ALTER TABLE `users` MODIFY COLUMN `openId` varchar(64);--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `status` enum('active','inactive','blocked','pending') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` text;--> statement-breakpoint
ALTER TABLE `users` ADD `membershipType` varchar(50);--> statement-breakpoint
CREATE INDEX `role_idx` ON `users` (`role`);