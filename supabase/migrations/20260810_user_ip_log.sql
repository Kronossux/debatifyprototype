-- Create user IP log table for tracking user IPs
CREATE TABLE IF NOT EXISTS public.user_ip_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address text NOT NULL,
  last_seen timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, ip_address)
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS user_ip_log_user_id_idx ON public.user_ip_log(user_id);
CREATE INDEX IF NOT EXISTS user_ip_log_last_seen_idx ON public.user_ip_log(last_seen DESC);

-- Grant permissions
GRANT SELECT ON public.user_ip_log TO authenticated;
GRANT ALL ON public.user_ip_log TO service_role;

-- Enable RLS
ALTER TABLE public.user_ip_log ENABLE ROW LEVEL SECURITY;

-- Allow staff to read IP logs
CREATE POLICY "Staff read IP logs" ON public.user_ip_log FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

-- Allow service role to insert and update
CREATE POLICY "Service role manages IP logs" ON public.user_ip_log FOR ALL TO service_role USING (true);
