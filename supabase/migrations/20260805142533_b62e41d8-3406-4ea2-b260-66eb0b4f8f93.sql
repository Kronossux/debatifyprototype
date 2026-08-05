CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL,
  username_lower text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are public" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.debates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL,
  option_a text NOT NULL DEFAULT 'Yes',
  option_b text NOT NULL DEFAULT 'No',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX debates_category_idx ON public.debates(category);
GRANT SELECT ON public.debates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.debates TO authenticated;
GRANT ALL ON public.debates TO service_role;
ALTER TABLE public.debates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Debates are public" ON public.debates FOR SELECT USING (true);
CREATE POLICY "Signed in users create debates" ON public.debates FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Owners update debates" ON public.debates FOR UPDATE TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Owners delete debates" ON public.debates FOR DELETE TO authenticated USING (auth.uid() = created_by);

CREATE TABLE public.votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id uuid NOT NULL REFERENCES public.debates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  choice text NOT NULL CHECK (choice IN ('a','b')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (debate_id, user_id)
);
CREATE INDEX votes_debate_idx ON public.votes(debate_id);
GRANT SELECT ON public.votes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.votes TO authenticated;
GRANT ALL ON public.votes TO service_role;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Votes are public" ON public.votes FOR SELECT USING (true);
CREATE POLICY "Users cast own vote" ON public.votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users change own vote" ON public.votes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove own vote" ON public.votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id uuid NOT NULL REFERENCES public.debates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX comments_debate_idx ON public.comments(debate_id);
GRANT SELECT ON public.comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments are public" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Users write own comments" ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users edit own comments" ON public.comments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own comments" ON public.comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE VIEW public.debate_stats WITH (security_invoker = true) AS
SELECT d.id AS debate_id,
       COALESCE(v.votes_a, 0) AS votes_a,
       COALESCE(v.votes_b, 0) AS votes_b,
       COALESCE(v.votes_a, 0) + COALESCE(v.votes_b, 0) AS total_votes,
       COALESCE(c.comment_count, 0) AS comment_count
FROM public.debates d
LEFT JOIN (
  SELECT debate_id,
         count(*) FILTER (WHERE choice = 'a') AS votes_a,
         count(*) FILTER (WHERE choice = 'b') AS votes_b
  FROM public.votes GROUP BY debate_id
) v ON v.debate_id = d.id
LEFT JOIN (
  SELECT debate_id, count(*) AS comment_count FROM public.comments GROUP BY debate_id
) c ON c.debate_id = d.id;
GRANT SELECT ON public.debate_stats TO anon, authenticated;
GRANT ALL ON public.debate_stats TO service_role;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uname text;
BEGIN
  uname := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
  INSERT INTO public.profiles (id, username, username_lower)
  VALUES (NEW.id, uname, lower(uname))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.debates (title, description, category, option_a, option_b) VALUES
('Should social media require real name verification?', 'Anonymity protects speech, but it also shields abuse. Where should the line be?', 'Culture', 'Require it', 'Keep anonymity'),
('Is remote work better than the office?', 'Productivity, culture and commute time all pull in different directions.', 'Culture', 'Remote', 'Office'),
('Should VAR stay in football?', 'Video review improved accuracy but slowed the game down.', 'Sports', 'Keep VAR', 'Scrap VAR'),
('Is the GOAT debate settled?', 'Every generation thinks its stars are untouchable.', 'Sports', 'Settled', 'Not settled'),
('Will AI replace most software engineers by 2035?', 'Tools are getting scarily good, but shipping software is more than typing code.', 'Tech', 'Yes', 'No'),
('Should smartphones be banned in schools?', 'Focus versus connectivity in the classroom.', 'Tech', 'Ban them', 'Allow them'),
('Should humans prioritise Mars over ocean exploration?', 'Two frontiers, one budget.', 'Science', 'Mars', 'Oceans'),
('Is nuclear energy the fastest path to net zero?', 'Reliable baseload power versus cost and waste.', 'Science', 'Yes', 'No'),
('Are movie franchises killing original storytelling?', 'Sequels dominate the box office year after year.', 'Entertainment', 'Killing it', 'It is fine'),
('Should streaming services release full seasons at once?', 'Binge culture versus weekly water-cooler buzz.', 'Entertainment', 'All at once', 'Weekly');