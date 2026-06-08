CREATE INDEX "clients_org_clerk_user_idx" ON "clients" USING btree ("organization_id","clerk_user_id");--> statement-breakpoint
CREATE INDEX "clients_org_updated_idx" ON "clients" USING btree ("organization_id","updated_at");--> statement-breakpoint
CREATE INDEX "programs_org_updated_idx" ON "programs" USING btree ("organization_id","updated_at");--> statement-breakpoint
CREATE INDEX "program_assignments_org_created_idx" ON "program_assignments" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "automations_active_trigger_idx" ON "automations" USING btree ("is_active","trigger_type") WHERE "automations"."is_active" = true;--> statement-breakpoint
CREATE INDEX "webhook_deliveries_pending_retry_idx" ON "webhook_deliveries" USING btree ("status","next_retry_at") WHERE "webhook_deliveries"."status" IN ('pending', 'failed');
