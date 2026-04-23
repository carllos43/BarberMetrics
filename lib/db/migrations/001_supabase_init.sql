-- Idempotent schema for BarberMetrics on Supabase Postgres.
-- The `users` table mirrors auth.users: same UUID, no password column.

CREATE TABLE IF NOT EXISTS public.barbershops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'barber',
  commission_percent integer NOT NULL DEFAULT 60,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.memberships (
  id serial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'barber',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS memberships_user_bs_uniq ON public.memberships(user_id, barbershop_id);

CREATE TABLE IF NOT EXISTS public.appointments (
  id serial PRIMARY KEY,
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  duration_minutes integer NOT NULL,
  service text NOT NULL,
  value numeric(10,2) NOT NULL,
  barber_earnings numeric(10,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS appointments_bs_date_idx ON public.appointments(barbershop_id, date);
CREATE INDEX IF NOT EXISTS appointments_bs_user_idx ON public.appointments(barbershop_id, user_id);

CREATE TABLE IF NOT EXISTS public.bills (
  id serial PRIMARY KEY,
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  value numeric(10,2) NOT NULL,
  due_day integer NOT NULL,
  category text DEFAULT 'Fixa',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bills_bs_idx ON public.bills(barbershop_id);

CREATE TABLE IF NOT EXISTS public.timer_sessions (
  id serial PRIMARY KEY,
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  is_active boolean NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS timer_bs_user_active_idx ON public.timer_sessions(barbershop_id, user_id, is_active);

CREATE TABLE IF NOT EXISTS public.settings (
  id serial PRIMARY KEY,
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS settings_bs_user_key_uniq ON public.settings(barbershop_id, user_id, key);

-- Drop legacy column if migrating from previous local-auth schema
ALTER TABLE public.users DROP COLUMN IF EXISTS password_hash;
