ALTER TABLE "refresh_tokens" ADD PRIMARY KEY ("token");--> statement-breakpoint
ALTER TABLE "refresh_tokens" ALTER COLUMN "token" SET NOT NULL;