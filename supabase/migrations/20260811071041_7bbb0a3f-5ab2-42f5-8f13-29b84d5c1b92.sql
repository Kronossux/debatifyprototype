-- soft delete columns
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS deleted_at timestamptz, ADD COLUMN IF NOT EXISTS deleted_by uuid;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS deleted_at timestamptz, ADD COLUMN IF NOT EXISTS deleted_by uuid;
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS deleted_at timestamptz, ADD COLUMN IF NOT EXISTS deleted_by uuid;

-- chat: hide deleted from normal users, allow soft delete, admin-only purge
DROP POLICY IF EXISTS "Chat is public" ON public.chat_messages;
CREATE POLICY "Chat is public" ON public.chat_messages FOR SELECT USING (deleted_at IS NULL OR is_staff(auth.uid()));
DROP POLICY IF EXISTS "Users delete own chat" ON public.chat_messages;
DROP POLICY IF EXISTS "Staff delete chat" ON public.chat_messages;
CREATE POLICY "Admin purges chat" ON public.chat_messages FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner or staff hide chat" ON public.chat_messages FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR is_staff(auth.uid())) WITH CHECK (auth.uid() = user_id OR is_staff(auth.uid()));

-- comments
DROP POLICY IF EXISTS "Comments are public" ON public.comments;
CREATE POLICY "Comments are public" ON public.comments FOR SELECT USING (deleted_at IS NULL OR is_staff(auth.uid()));
DROP POLICY IF EXISTS "Users delete own comments" ON public.comments;
DROP POLICY IF EXISTS "Staff delete comments" ON public.comments;
CREATE POLICY "Admin purges comments" ON public.comments FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Users edit own comments" ON public.comments;
CREATE POLICY "Owner or staff edit comments" ON public.comments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR is_staff(auth.uid())) WITH CHECK (auth.uid() = user_id OR is_staff(auth.uid()));

-- direct messages: participants + admin oversight, hide deleted
DROP POLICY IF EXISTS "Participants read their DMs" ON public.direct_messages;
CREATE POLICY "Participants read their DMs" ON public.direct_messages FOR SELECT TO authenticated
  USING ((deleted_at IS NULL AND (auth.uid() = sender_id OR auth.uid() = recipient_id)) OR has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Senders delete their DMs" ON public.direct_messages;
CREATE POLICY "Admin purges DMs" ON public.direct_messages FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Sender or staff hide DMs" ON public.direct_messages FOR UPDATE TO authenticated
  USING (auth.uid() = sender_id OR is_staff(auth.uid())) WITH CHECK (auth.uid() = sender_id OR is_staff(auth.uid()));

-- notification bookkeeping
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS messages_seen_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS reports_seen_at timestamptz NOT NULL DEFAULT now();

-- suggestion box
CREATE TABLE IF NOT EXISTS public.suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.suggestions TO authenticated;
GRANT ALL ON public.suggestions TO service_role;
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members send suggestions" ON public.suggestions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND NOT is_banned(auth.uid()));
CREATE POLICY "Author or admin reads suggestions" ON public.suggestions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_suggestions_updated_at BEFORE UPDATE ON public.suggestions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ban appeals: one thread per banned member
CREATE TABLE IF NOT EXISTS public.ban_appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ban_appeals_user_idx ON public.ban_appeals (user_id, created_at);
GRANT SELECT, INSERT ON public.ban_appeals TO authenticated;
GRANT ALL ON public.ban_appeals TO service_role;
ALTER TABLE public.ban_appeals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner or staff read appeals" ON public.ban_appeals FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR is_staff(auth.uid()));
CREATE POLICY "Owner or staff write appeals" ON public.ban_appeals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id AND (auth.uid() = user_id OR is_staff(auth.uid())));