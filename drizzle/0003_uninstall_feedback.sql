CREATE TABLE "uninstall_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reason" text NOT NULL,
	"details" text,
	"competitor" text,
	"extension_version" text,
	"browser" text DEFAULT 'other' NOT NULL,
	"visit_key" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uninstall_feedback_len_ck" CHECK (length("uninstall_feedback"."reason") <= 40 and ("uninstall_feedback"."details" is null or length("uninstall_feedback"."details") <= 500) and ("uninstall_feedback"."competitor" is null or length("uninstall_feedback"."competitor") <= 80) and ("uninstall_feedback"."extension_version" is null or length("uninstall_feedback"."extension_version") <= 20) and length("uninstall_feedback"."browser") <= 10)
);
--> statement-breakpoint
CREATE INDEX "uninstall_feedback_created_idx" ON "uninstall_feedback" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uninstall_feedback_visit_uq" ON "uninstall_feedback" USING btree ("visit_key");