CREATE TABLE `quiz_attempts` (
	`user_id` text NOT NULL,
	`id` text NOT NULL,
	`country` text NOT NULL,
	`level` integer NOT NULL,
	`mode` text NOT NULL,
	`scope` text NOT NULL,
	`scope_label` text NOT NULL,
	`pool_hash` text NOT NULL,
	`total` integer NOT NULL,
	`correct` integer NOT NULL,
	`hints` integer NOT NULL,
	`reveals` integer NOT NULL,
	`elapsed_ms` integer NOT NULL,
	`completed` integer NOT NULL,
	`full_round` integer NOT NULL,
	`finished_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `id`)
);
--> statement-breakpoint
CREATE INDEX `quiz_attempts_user_history` ON `quiz_attempts` (`user_id`,`finished_at`,`id`);--> statement-breakpoint
CREATE INDEX `quiz_attempts_user_challenge` ON `quiz_attempts` (`user_id`,`country`,`level`,`mode`);