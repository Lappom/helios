-- Enable row-level security for multi-tenant isolation (P6.1)

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON organizations FOR ALL
  USING (
    id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON subscriptions FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON team_members FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE client_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_notes FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON client_notes FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE client_status_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_status_events FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON client_status_events FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE client_tag_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_tag_assignments FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON client_tag_assignments FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE client_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_tags FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON client_tags FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON clients FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE exercise_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_aliases FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON exercise_aliases FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE exercise_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_categories FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON exercise_categories FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE exercise_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_favorites FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON exercise_favorites FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE exercise_hidden ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_hidden FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON exercise_hidden FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON exercises FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE foods FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON foods FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE meal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_items FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON meal_items FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE meal_log_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_log_items FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON meal_log_items FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON meal_logs FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON meals FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE nutrition_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_assignments FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON nutrition_assignments FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE nutrition_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_plans FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON nutrition_plans FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE assignment_session_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_session_overrides FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON assignment_session_overrides FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE block_exercise_alternatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE block_exercise_alternatives FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON block_exercise_alternatives FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE block_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE block_exercises FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON block_exercises FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE exercise_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_blocks FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON exercise_blocks FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE program_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_assignments FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON program_assignments FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE program_macrocycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_macrocycles FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON program_macrocycles FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE program_mesocycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_mesocycles FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON program_mesocycles FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE program_microcycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_microcycles FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON program_microcycles FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE program_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_sessions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON program_sessions FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE program_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_weeks FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON program_weeks FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON programs FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE set_prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE set_prescriptions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON set_prescriptions FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON recipe_ingredients FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON recipes FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE session_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON session_logs FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE set_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE set_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON set_logs FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE assessment_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_fields FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON assessment_fields FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE assessment_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_responses FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON assessment_responses FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE assessment_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_templates FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON assessment_templates FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON assessments FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE feedback_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_questions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON feedback_questions FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_responses FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON feedback_responses FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE session_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_feedback FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON session_feedback FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE session_feedback_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_feedback_templates FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON session_feedback_templates FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE habit_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_assignments FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON habit_assignments FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON habit_logs FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON habits FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE coach_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_profiles FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON coach_profiles FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE coach_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_services FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON coach_services FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_rules FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON availability_rules FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_dates FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON blocked_dates FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON bookings FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON promo_codes FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON payments FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE revenue_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_snapshots FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON revenue_snapshots FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON notification_logs FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON notification_templates FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON push_subscriptions FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON conversation_participants FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON conversations FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON messages FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE drive_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE drive_files FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON drive_files FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE drive_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE drive_folders FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON drive_folders FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE drive_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE drive_shares FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON drive_shares FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE video_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_access FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON video_access FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE video_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_categories FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON video_categories FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON videos FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON action_logs FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE automation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_actions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON automation_actions FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE automation_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_executions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON automation_executions FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE automations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON automations FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE coach_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_tasks FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON coach_tasks FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE questionnaire_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaire_questions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON questionnaire_questions FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE questionnaire_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaire_responses FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON questionnaire_responses FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE questionnaire_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaire_schedules FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON questionnaire_schedules FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE questionnaire_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaire_submissions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON questionnaire_submissions FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE questionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaires FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON questionnaires FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE coaching_pathways ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_pathways FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON coaching_pathways FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE pathway_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pathway_enrollments FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON pathway_enrollments FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE pathway_step_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pathway_step_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON pathway_step_logs FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE pathway_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE pathway_steps FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON pathway_steps FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON api_keys FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON webhook_deliveries FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_endpoints FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON webhook_endpoints FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON referral_codes FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE referral_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_conversions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON referral_conversions FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE referral_credit_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_credit_balances FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON referral_credit_balances FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE referral_credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_credit_ledger FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON referral_credit_ledger FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE referral_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_programs FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON referral_programs FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON audit_logs FOR ALL
  USING (
    organization_id = current_setting('app.organization_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );
