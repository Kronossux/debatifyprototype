-- 1. Roles: rename founder -> vice_admin, make Kronos_sux the only admin
ALTER TYPE public.app_role RENAME VALUE 'founder' TO 'vice_admin';

UPDATE public.user_roles SET role = 'admin'
WHERE user_id = (SELECT id FROM public.profiles WHERE username_lower = 'kronos_sux');

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM public.profiles WHERE username_lower = 'kronos_sux'
ON CONFLICT (user_id, role) DO NOTHING;

DELETE FROM public.user_roles ur
WHERE ur.role = 'admin'
  AND ur.user_id <> (SELECT id FROM public.profiles WHERE username_lower = 'kronos_sux');

-- 2. Bans on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banned_at timestamptz,
  ADD COLUMN IF NOT EXISTS ban_reason text;

CREATE OR REPLACE FUNCTION public.is_banned(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND banned_at IS NOT NULL)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','vice_admin','moderator')
  )
$$;

-- 3. Featured debates
ALTER TABLE public.debates ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;

-- 4. Categories
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon;
GRANT SELECT ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories are public" ON public.categories FOR SELECT USING (true);
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.categories (name, sort_order) VALUES
  ('Culture', 1), ('Sports', 2), ('Tech', 3), ('Science', 4), ('Entertainment', 5)
ON CONFLICT (name) DO NOTHING;

-- 5. Reports
CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('debate','comment','chat','article','user')),
  target_id uuid NOT NULL,
  reason text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','dismissed')),
  handled_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users create own reports" ON public.reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id AND NOT public.is_banned(auth.uid()));
CREATE POLICY "Reporters and staff read reports" ON public.reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id OR public.is_staff(auth.uid()));
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Staff audit log
CREATE TABLE IF NOT EXISTS public.staff_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL DEFAULT '',
  target_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.staff_audit_log TO authenticated;
GRANT ALL ON public.staff_audit_log TO service_role;
ALTER TABLE public.staff_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read audit log" ON public.staff_audit_log FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

-- 7. Site settings
CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Site settings are public" ON public.site_settings FOR SELECT USING (true);
INSERT INTO public.site_settings (key, value) VALUES
  ('general', '{"site_name":"Debatify","tagline":"Opinions, ranked by the crowd.","allow_signups":true,"allow_debate_creation":true,"allow_chat":true,"maintenance_mode":false}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 8. Block banned users from posting
DROP POLICY IF EXISTS "Users post own chat" ON public.chat_messages;
CREATE POLICY "Users post own chat" ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND NOT public.is_banned(auth.uid()));

DROP POLICY IF EXISTS "Users write own comments" ON public.comments;
CREATE POLICY "Users write own comments" ON public.comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND NOT public.is_banned(auth.uid()));

DROP POLICY IF EXISTS "Signed in users create debates" ON public.debates;
CREATE POLICY "Signed in users create debates" ON public.debates FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND NOT public.is_banned(auth.uid()));

DROP POLICY IF EXISTS "Authors create articles" ON public.articles;
CREATE POLICY "Authors create articles" ON public.articles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id AND NOT public.is_banned(auth.uid()));

DROP POLICY IF EXISTS "Users cast own vote" ON public.votes;
CREATE POLICY "Users cast own vote" ON public.votes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND NOT public.is_banned(auth.uid()));

-- 9. Staff moderation delete powers
CREATE POLICY "Staff delete debates" ON public.debates FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff delete comments" ON public.comments FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff delete chat" ON public.chat_messages FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff delete articles" ON public.articles FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));