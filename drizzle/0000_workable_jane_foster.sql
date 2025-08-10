CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`voice_command` text NOT NULL,
	`parsed_intent` text NOT NULL,
	`recipient_address` text NOT NULL,
	`amount` text NOT NULL,
	`token_symbol` text NOT NULL,
	`transaction_hash` text,
	`status` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`confirmed_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`wallet_address` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`last_active` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_wallet_address_unique` ON `users` (`wallet_address`);--> statement-breakpoint
CREATE TABLE `voice_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`audio_url` text,
	`transcription` text,
	`response_audio_url` text,
	`response_text` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
