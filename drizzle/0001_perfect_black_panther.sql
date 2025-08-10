CREATE TABLE `login_challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`wallet_address` text NOT NULL,
	`nonce` text NOT NULL,
	`message` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`expires_at` integer NOT NULL
);
