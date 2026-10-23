-- ==============================================================================
-- KENYAN ISP CRM - MIGRATION 02: ROW LEVEL SECURITY & PERMISSION POLICIES
-- ==============================================================================

-- 1. Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- 2. Helper Security Functions (STABLE, SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid() AND is_active = true;
$$;

CREATE OR REPLACE FUNCTION public.has_role(allowed_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND is_active = true
      AND (role::text = ANY(allowed_roles) OR role = 'owner')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(ARRAY['admin', 'owner']);
$$;

-- 3. Audit Logging Function
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_before jsonb DEFAULT NULL,
  p_after jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
  v_actor_email text;
BEGIN
  SELECT email INTO v_actor_email FROM public.profiles WHERE id = auth.uid();
  
  INSERT INTO public.audit_logs (
    actor_id,
    actor_email,
    action,
    entity_type,
    entity_id,
    before_state,
    after_state
  ) VALUES (
    auth.uid(),
    v_actor_email,
    p_action,
    p_entity_type,
    p_entity_id,
    p_before,
    p_after
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- 4. Prevent Unauthorized Role Escalation Trigger
CREATE OR REPLACE FUNCTION public.prevent_self_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
BEGIN
  -- If service role or database superuser, allow
  IF current_user = 'postgres' OR current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  v_caller_role := public.current_user_role();

  -- Only owners and admins can modify role or active status
  IF (OLD.role IS DISTINCT FROM NEW.role) OR (OLD.is_active IS DISTINCT FROM NEW.is_active) THEN
    IF v_caller_role NOT IN ('owner', 'admin') THEN
      RAISE EXCEPTION 'Unauthorized: Only owners or administrators can change user roles or status.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_self_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_self_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_role_escalation();

-- 5. Updated_at Automatic Trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_providers_updated_at BEFORE UPDATE ON public.providers FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_plans_updated_at BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_addresses_updated_at BEFORE UPDATE ON public.service_addresses FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_installations_updated_at BEFORE UPDATE ON public.installations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 6. POLICIES: PROFILES
-- ==============================================================================
-- Read: Active staff members can view staff directory
CREATE POLICY "profiles_read_staff" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

-- Update: Staff can update own profile (name, phone); admins/owners can update any
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.is_admin_or_owner());

-- Insert: Admins or owners can insert new profiles
CREATE POLICY "profiles_insert_admin" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_owner());

-- ==============================================================================
-- 7. POLICIES: AUDIT LOGS (Immutable)
-- ==============================================================================
CREATE POLICY "audit_logs_read" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.has_role(ARRAY['owner', 'admin', 'finance']));

CREATE POLICY "audit_logs_insert" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- No UPDATE or DELETE policy exists on audit_logs => Strictly immutable!

-- ==============================================================================
-- 8. POLICIES: LEADS
-- ==============================================================================
CREATE POLICY "leads_read" ON public.leads
  FOR SELECT TO authenticated
  USING (public.has_role(ARRAY['owner', 'admin', 'sales', 'operations', 'support']));

CREATE POLICY "leads_insert" ON public.leads
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(ARRAY['owner', 'admin', 'sales', 'operations']));

CREATE POLICY "leads_update" ON public.leads
  FOR UPDATE TO authenticated
  USING (public.has_role(ARRAY['owner', 'admin', 'sales', 'operations']));

CREATE POLICY "leads_delete" ON public.leads
  FOR DELETE TO authenticated
  USING (public.is_admin_or_owner());

-- ==============================================================================
-- 9. POLICIES: CUSTOMERS
-- ==============================================================================
CREATE POLICY "customers_read" ON public.customers
  FOR SELECT TO authenticated
  USING (
    public.has_role(ARRAY['owner', 'admin', 'sales', 'finance', 'operations', 'support'])
    OR (
      public.current_user_role() = 'technician'
      AND EXISTS (
        SELECT 1 FROM public.installations
        WHERE installations.customer_id = customers.id
          AND installations.assigned_technician_id = auth.uid()
      )
    )
  );

CREATE POLICY "customers_insert" ON public.customers
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(ARRAY['owner', 'admin', 'sales', 'operations']));

CREATE POLICY "customers_update" ON public.customers
  FOR UPDATE TO authenticated
  USING (public.has_role(ARRAY['owner', 'admin', 'sales', 'finance', 'operations']));

CREATE POLICY "customers_delete" ON public.customers
  FOR DELETE TO authenticated
  USING (public.is_admin_or_owner());

-- ==============================================================================
-- 10. POLICIES: SERVICE ADDRESSES
-- ==============================================================================
CREATE POLICY "addresses_read" ON public.service_addresses
  FOR SELECT TO authenticated
  USING (
    public.has_role(ARRAY['owner', 'admin', 'sales', 'finance', 'operations', 'support'])
    OR (
      public.current_user_role() = 'technician'
      AND EXISTS (
        SELECT 1 FROM public.installations
        WHERE installations.service_address_id = service_addresses.id
          AND installations.assigned_technician_id = auth.uid()
      )
    )
  );

CREATE POLICY "addresses_write" ON public.service_addresses
  FOR ALL TO authenticated
  USING (public.has_role(ARRAY['owner', 'admin', 'sales', 'operations']));

-- ==============================================================================
-- 11. POLICIES: PLANS & PROVIDERS
-- ==============================================================================
CREATE POLICY "plans_read" ON public.plans
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "plans_manage" ON public.plans
  FOR ALL TO authenticated
  USING (public.is_admin_or_owner());

CREATE POLICY "providers_read" ON public.providers
  FOR SELECT TO authenticated
  USING (public.has_role(ARRAY['owner', 'admin', 'operations', 'finance', 'support']));

CREATE POLICY "providers_manage" ON public.providers
  FOR ALL TO authenticated
  USING (public.has_role(ARRAY['owner', 'admin', 'operations']));

-- ==============================================================================
-- 12. POLICIES: SUBSCRIPTIONS
-- ==============================================================================
CREATE POLICY "subscriptions_read" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (public.has_role(ARRAY['owner', 'admin', 'sales', 'finance', 'operations', 'support']));

CREATE POLICY "subscriptions_write" ON public.subscriptions
  FOR ALL TO authenticated
  USING (public.has_role(ARRAY['owner', 'admin', 'operations']));

-- ==============================================================================
-- 13. POLICIES: INSTALLATIONS
-- ==============================================================================
CREATE POLICY "installations_read" ON public.installations
  FOR SELECT TO authenticated
  USING (
    public.has_role(ARRAY['owner', 'admin', 'operations', 'support'])
    OR (public.current_user_role() = 'technician' AND assigned_technician_id = auth.uid())
  );

CREATE POLICY "installations_insert" ON public.installations
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(ARRAY['owner', 'admin', 'operations']));

CREATE POLICY "installations_update" ON public.installations
  FOR UPDATE TO authenticated
  USING (
    public.has_role(ARRAY['owner', 'admin', 'operations'])
    OR (public.current_user_role() = 'technician' AND assigned_technician_id = auth.uid())
  );

-- ==============================================================================
-- 14. POLICIES: INVOICES & INVOICE ITEMS
-- ==============================================================================
CREATE POLICY "invoices_read" ON public.invoices
  FOR SELECT TO authenticated
  USING (public.has_role(ARRAY['owner', 'admin', 'finance', 'sales', 'support']));

CREATE POLICY "invoices_write" ON public.invoices
  FOR ALL TO authenticated
  USING (public.has_role(ARRAY['owner', 'admin', 'finance']));

CREATE POLICY "invoice_items_read" ON public.invoice_items
  FOR SELECT TO authenticated
  USING (public.has_role(ARRAY['owner', 'admin', 'finance', 'sales', 'support']));

CREATE POLICY "invoice_items_write" ON public.invoice_items
  FOR ALL TO authenticated
  USING (public.has_role(ARRAY['owner', 'admin', 'finance']));

-- ==============================================================================
-- 15. POLICIES: PAYMENTS & ALLOCATIONS
-- ==============================================================================
CREATE POLICY "payments_read" ON public.payments
  FOR SELECT TO authenticated
  USING (public.has_role(ARRAY['owner', 'admin', 'finance']));

CREATE POLICY "payments_write" ON public.payments
  FOR ALL TO authenticated
  USING (public.has_role(ARRAY['owner', 'admin', 'finance']));

CREATE POLICY "payment_allocations_read" ON public.payment_allocations
  FOR SELECT TO authenticated
  USING (public.has_role(ARRAY['owner', 'admin', 'finance']));

CREATE POLICY "payment_allocations_write" ON public.payment_allocations
  FOR ALL TO authenticated
  USING (public.has_role(ARRAY['owner', 'admin', 'finance']));

-- ==============================================================================
-- 16. POLICIES: TICKETS & TICKET NOTES
-- ==============================================================================
CREATE POLICY "tickets_read" ON public.support_tickets
  FOR SELECT TO authenticated
  USING (public.has_role(ARRAY['owner', 'admin', 'support', 'operations', 'technician']));

CREATE POLICY "tickets_write" ON public.support_tickets
  FOR ALL TO authenticated
  USING (public.has_role(ARRAY['owner', 'admin', 'support', 'operations']));

CREATE POLICY "ticket_notes_read" ON public.ticket_notes
  FOR SELECT TO authenticated
  USING (public.has_role(ARRAY['owner', 'admin', 'support', 'operations', 'technician']));

CREATE POLICY "ticket_notes_write" ON public.ticket_notes
  FOR ALL TO authenticated
  USING (public.has_role(ARRAY['owner', 'admin', 'support', 'operations']));

-- ==============================================================================
-- 17. POLICIES: ACTIVITIES
-- ==============================================================================
CREATE POLICY "activities_read" ON public.activities
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "activities_insert" ON public.activities
  FOR INSERT TO authenticated
  WITH CHECK (true);
