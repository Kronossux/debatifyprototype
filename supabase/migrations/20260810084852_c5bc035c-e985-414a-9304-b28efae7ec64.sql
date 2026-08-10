CREATE TABLE IF NOT EXISTS public.user_ip_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address text NOT NULL,
  last_seen timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, ip_address)
);

GRANT ALL ON public.user_ip_log TO service_role;

ALTER TABLE public.user_ip_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read ip log" ON public.user_ip_log
FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));

CREATE INDEX IF NOT EXISTS user_ip_log_user_idx ON public.user_ip_log(user_id, last_seen DESC);