CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.sentiment_label AS ENUM ('Positive', 'Neutral', 'Negative');

CREATE TABLE public.service_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.service_types TO anon;
GRANT SELECT ON public.service_types TO authenticated;
GRANT ALL ON public.service_types TO service_role;
ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service types are public" ON public.service_types FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.service_types (slug, name, description) VALUES
  ('licence-booking', 'Licence Booking', 'Learner and driving licence test bookings'),
  ('vehicle-registration', 'Vehicle Registration', 'Vehicle registration, licensing and discs'),
  ('traffic-fines', 'Traffic Fines', 'Fine payments, disputes and enquiries'),
  ('applications', 'Applications', 'Permits, renewals and general applications');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  email text,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Own roles read" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  service_id uuid NOT NULL REFERENCES public.service_types(id) ON DELETE RESTRICT,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text NOT NULL,
  sentiment public.sentiment_label,
  vader_compound numeric,
  model_label text,
  model_confidence numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.feedback TO anon;
GRANT SELECT, INSERT ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit feedback" ON public.feedback FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Own feedback read" ON public.feedback FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all feedback" ON public.feedback FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX feedback_created_at_idx ON public.feedback (created_at DESC);
CREATE INDEX feedback_service_idx ON public.feedback (service_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();