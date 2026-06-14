CREATE TABLE public.assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('seed','upload')),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.borrower_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_borrower_records_assessment ON public.borrower_records(assessment_id);
CREATE INDEX idx_assessments_created_at ON public.assessments(created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessments TO authenticated;
GRANT ALL ON public.assessments TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.borrower_records TO authenticated;
GRANT ALL ON public.borrower_records TO service_role;

ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrower_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace can view assessments" ON public.assessments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Workspace can insert assessments" ON public.assessments FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Workspace can update assessments" ON public.assessments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Workspace can delete assessments" ON public.assessments FOR DELETE TO authenticated USING (true);
CREATE POLICY "Workspace can view borrower_records" ON public.borrower_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Workspace can insert borrower_records" ON public.borrower_records FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Workspace can update borrower_records" ON public.borrower_records FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Workspace can delete borrower_records" ON public.borrower_records FOR DELETE TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  org TEXT,
  role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();