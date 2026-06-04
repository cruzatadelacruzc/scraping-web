-- Habilita RLS y políticas para la tabla User
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_access ON "User" FOR SELECT USING (current_setting('app.user_role') = 'admin');
CREATE POLICY tenant_isolation ON "User" FOR ALL
  USING (tenantid = current_setting('app.tenant_id')::uuid)
  WITH CHECK (tenantid = current_setting('app.tenant_id')::uuid);
