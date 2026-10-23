-- ==============================================================================
-- KENYAN ISP CRM - MIGRATION 03: AUTH HOOK & KENYAN ISP SEED DATA
-- ==============================================================================

-- 1. Automatic Profile Creation on Supabase Auth Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role := 'support';
  v_role_str text;
BEGIN
  v_role_str := NEW.raw_user_meta_data->>'role';
  IF v_role_str IN ('owner', 'admin', 'sales', 'finance', 'operations', 'support', 'technician') THEN
    v_role := v_role_str::user_role;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone',
    v_role
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Seed Initial Upstream Network Providers
INSERT INTO public.providers (id, name, support_phone, support_email, account_reference, contract_reference, operational_notes)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Liquid Intelligent Technologies Kenya', '+254 20 500 0000', 'noc-kenya@liquid.tech', 'LIQ-NBO-8492', 'LIT-MSA-RD-2025', 'Primary dark fibre backhaul & IP transit at East Africa Data Centre (EADC)'),
  ('a2222222-2222-2222-2222-222222222222', 'Safaricom Enterprise Wholesale', '+254 722 002 222', 'enterprisesupport@safaricom.co.ke', 'SAF-WHOLE-4410', 'SAF-ENT-METRO-2024', 'Metro dark fibre lease in Kilimani, Westlands, and Parklands'),
  ('a3333333-3333-3333-3333-333333333333', 'Wananchi Group Wholesale', '+254 20 310 000', 'wholesale@wananchi.com', 'WAN-GPON-1092', 'WG-RES-ACCESS-2026', 'GPON last-mile infrastructure sharing')
ON CONFLICT (name) DO NOTHING;

-- 3. Seed Realistic Kenyan Internet Service Plans (KES)
INSERT INTO public.plans (id, name, target_customer_type, download_speed_mbps, upload_speed_mbps, monthly_price_kes, setup_fee_kes, billing_interval, description)
VALUES
  ('b1111111-1111-1111-1111-111111111111', 'Simba Home 20 Mbps', 'residential', 20, 20, 2999.00, 2500.00, 'monthly', 'Ideal for HD streaming, zoom calls and small households (up to 4 devices).'),
  ('b2222222-2222-2222-2222-222222222222', 'Simba Home 50 Mbps', 'residential', 50, 50, 4499.00, 0.00, 'monthly', 'High performance ultra-fast fibre for gaming, 4K streaming and smart homes. Free installation.'),
  ('b3333333-3333-3333-3333-333333333333', 'Simba Home 100 Mbps', 'residential', 100, 100, 6999.00, 0.00, 'monthly', 'Top tier residential fibre with zero buffering, symmetric speeds and VIP support.'),
  ('b4444444-4444-4444-4444-444444444444', 'Biashara Pro 30 Mbps', 'business', 30, 30, 5999.00, 5000.00, 'monthly', 'Dedicated business SME connection with 99.5% SLA, prioritized DNS and static IP.'),
  ('b5555555-5555-5555-5555-555555555555', 'Biashara Enterprise 100 Mbps', 'business', 100, 100, 14999.00, 0.00, 'monthly', 'Direct fibre line with 99.9% uptime guarantee, 24/7 dedicated account manager and 2 static IPs.')
ON CONFLICT (name) DO NOTHING;
