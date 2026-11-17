CREATE TABLE "checkout_intents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"plan" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "checkout_intents_plan_ck" CHECK ("checkout_intents"."plan" in ('monthly','yearly','lifetime'))
);
--> statement-breakpoint
CREATE TABLE "email_opt_outs" (
	"user_id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lifecycle_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"email" text NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	CONSTRAINT "lifecycle_emails_kind_ck" CHECK ("lifecycle_emails"."kind" in ('nudge','trial_ended','checkout_recovery','test')),
	CONSTRAINT "lifecycle_emails_status_ck" CHECK ("lifecycle_emails"."status" in ('pending','sent','failed'))
);
--> statement-breakpoint
ALTER TABLE "checkout_intents" ADD CONSTRAINT "checkout_intents_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_opt_outs" ADD CONSTRAINT "email_opt_outs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lifecycle_emails" ADD CONSTRAINT "lifecycle_emails_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "checkout_intents_created_idx" ON "checkout_intents" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "lifecycle_emails_user_idx" ON "lifecycle_emails" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "lifecycle_emails_created_idx" ON "lifecycle_emails" USING btree ("created_at");