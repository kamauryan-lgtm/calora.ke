-- ==============================================================================
-- KENYAN ISP CRM - MIGRATION 01: CORE SCHEMA & CONSTRAINTS
-- ==============================================================================

-- 1. Create Profile Roles & Enum Definitions
CREATE TYPE user_role AS ENUM (
  'owner',
  'admin',
  'sales',
  'finance',
  'operations',
  'support',
  'technician'
);

CREATE TYPE customer_type_enum AS ENUM ('residential', 'business');
CREATE TYPE lead_status_enum AS ENUM ('new', 'contacted', 'qualified', 'coverage_check', 'converted', 'lost', 'disqualified');
CREATE TYPE coverage_status_enum AS ENUM ('unknown', 'pending', 'serviceable', 'not_serviceable');
CREATE TYPE subscription_status_enum AS ENUM ('pending', 'awaiting_installation', 'active', 'suspended', 'cancelled', 'completed');
CREATE TYPE installation_status_enum AS ENUM ('scheduled', 'assigned', 'in_progress', 'completed', 'rescheduled', 'failed');
CREATE TYPE invoice_status_enum AS ENUM ('draft', 'issued', 'partially_paid', 'paid', 'overdue', 'void');
CREATE TYPE payment_method_enum AS ENUM ('mpesa', 'bank_transfer', 'cash', 'cheque', 'other');
CREATE TYPE payment_verification_enum AS ENUM ('unverified', 'verified', 'rejected', 'reversed');
CREATE TYPE ticket_priority_enum AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE ticket_status_enum AS ENUM ('open', 'assigned', 'in_progress', 'awaiting_provider', 'awaiting_customer', 'resolved', 'closed');

-- 2. Staff Profiles Table (Linked to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'support',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Audit Logs Table (Immutable business activity & security log)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id),
  actor_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  before_state JSONB,
  after_state JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Upstream Network Providers Directory
CREATE TABLE IF NOT EXISTS public.providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  support_phone TEXT,
  support_email TEXT,
  account_reference TEXT,
  contract_reference TEXT,
  operational_notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Internet Service Packages (Plans)
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  target_customer_type customer_type_enum NOT NULL DEFAULT 'residential',
  download_speed_mbps INTEGER NOT NULL CHECK (download_speed_mbps > 0),
  upload_speed_mbps INTEGER NOT NULL CHECK (upload_speed_mbps > 0),
  monthly_price_kes NUMERIC(12, 2) NOT NULL CHECK (monthly_price_kes >= 0),
  setup_fee_kes NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (setup_fee_kes >= 0),
  billing_interval TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_interval IN ('monthly', 'quarterly', 'annually')),
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Leads Table
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_number TEXT NOT NULL UNIQUE,
  customer_type customer_type_enum NOT NULL DEFAULT 'residential',
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  lead_source TEXT NOT NULL,
  interested_plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  requested_service_area TEXT NOT NULL,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status lead_status_enum NOT NULL DEFAULT 'new',
  next_follow_up DATE,
  notes TEXT,
  converted_customer_id UUID, -- Forward reference to customers
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_number TEXT NOT NULL UNIQUE,
  customer_type customer_type_enum NOT NULL DEFAULT 'residential',
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  national_id_or_reg_number TEXT,
  kra_pin TEXT,
  billing_address TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending_activation', 'terminated')),
  assigned_account_manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  converted_from_lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add foreign key constraint for leads converted_customer_id
ALTER TABLE public.leads
  ADD CONSTRAINT fk_leads_converted_customer
  FOREIGN KEY (converted_customer_id)
  REFERENCES public.customers(id)
  ON DELETE SET NULL;

-- 8. Service Addresses & Coverage Checks
CREATE TABLE IF NOT EXISTS public.service_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  area TEXT NOT NULL,
  building_or_estate TEXT NOT NULL,
  house_or_unit_number TEXT NOT NULL,
  street_address TEXT,
  coordinates_lat NUMERIC(10, 7),
  coordinates_lng NUMERIC(10, 7),
  coverage_status coverage_status_enum NOT NULL DEFAULT 'unknown',
  coverage_checked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  coverage_checked_at TIMESTAMPTZ,
  coverage_notes TEXT,
  upstream_provider_id UUID REFERENCES public.providers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_reference TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  service_address_id UUID NOT NULL REFERENCES public.service_addresses(id) ON DELETE RESTRICT,
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  start_date DATE,
  next_billing_date DATE,
  status subscription_status_enum NOT NULL DEFAULT 'pending',
  installation_status TEXT NOT NULL DEFAULT 'unassigned' CHECK (installation_status IN ('unassigned', 'scheduled', 'in_progress', 'completed', 'failed')),
  upstream_provider_id UUID REFERENCES public.providers(id) ON DELETE SET NULL,
  provider_connection_reference TEXT,
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Installations
CREATE TABLE IF NOT EXISTS public.installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE RESTRICT,
  service_address_id UUID NOT NULL REFERENCES public.service_addresses(id) ON DELETE RESTRICT,
  scheduled_date TIMESTAMPTZ NOT NULL,
  assigned_technician_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status installation_status_enum NOT NULL DEFAULT 'scheduled',
  equipment_notes TEXT,
  completion_notes TEXT,
  failure_reason TEXT,
  provider_reference TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Invoices & Billing Ledger
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KES',
  subtotal_kes NUMERIC(12, 2) NOT NULL CHECK (subtotal_kes >= 0),
  tax_kes NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (tax_kes >= 0),
  discount_kes NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (discount_kes >= 0),
  total_kes NUMERIC(12, 2) NOT NULL CHECK (total_kes >= 0),
  amount_paid_kes NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (amount_paid_kes >= 0),
  balance_kes NUMERIC(12, 2) NOT NULL CHECK (balance_kes >= 0),
  status invoice_status_enum NOT NULL DEFAULT 'draft',
  voided_at TIMESTAMPTZ,
  void_reason TEXT,
  voided_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. Invoice Items
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_kes NUMERIC(12, 2) NOT NULL CHECK (unit_price_kes >= 0),
  total_kes NUMERIC(12, 2) NOT NULL CHECK (total_kes >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. Payments (Verified collections)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  amount_kes NUMERIC(12, 2) NOT NULL CHECK (amount_kes > 0),
  currency TEXT NOT NULL DEFAULT 'KES',
  payment_method payment_method_enum NOT NULL DEFAULT 'mpesa',
  external_reference TEXT NOT NULL UNIQUE, -- E.g. M-Pesa code QBH123456
  payment_date TIMESTAMPTZ NOT NULL,
  verification_status payment_verification_enum NOT NULL DEFAULT 'unverified',
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  allocated_amount_kes NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (allocated_amount_kes >= 0),
  unallocated_amount_kes NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (unallocated_amount_kes >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. Payment Allocations (Linking payments to invoices)
CREATE TABLE IF NOT EXISTS public.payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
  allocated_amount_kes NUMERIC(12, 2) NOT NULL CHECK (allocated_amount_kes > 0),
  allocated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. Support Tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN ('no_internet', 'slow_connection', 'intermittent_connection', 'billing_query', 'installation_issue', 'equipment_issue', 'other')),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  priority ticket_priority_enum NOT NULL DEFAULT 'medium',
  status ticket_status_enum NOT NULL DEFAULT 'open',
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  upstream_provider_ticket_ref TEXT,
  resolution_notes TEXT,
  closed_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 16. Ticket Notes (Separates internal notes from customer communications)
CREATE TABLE IF NOT EXISTS public.ticket_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  note_type TEXT NOT NULL CHECK (note_type IN ('internal', 'customer_communication')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 17. Operational Activities (History & touchpoints)
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 18. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON public.leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_customers_status ON public.customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);
CREATE INDEX IF NOT EXISTS idx_addresses_customer ON public.service_addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_addresses_coverage ON public.service_addresses(coverage_status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON public.subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_installations_status ON public.installations(status);
CREATE INDEX IF NOT EXISTS idx_installations_technician ON public.installations(assigned_technician_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON public.invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON public.payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_ext_ref ON public.payments(external_reference);
CREATE INDEX IF NOT EXISTS idx_tickets_customer ON public.support_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
