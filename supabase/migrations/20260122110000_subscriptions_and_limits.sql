-- Subscription tiers and usage limits
CREATE TYPE public.plan_tier AS ENUM ('free', 'starter', 'agency', 'large_agency');

CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  tier plan_tier NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  billing_interval TEXT NOT NULL DEFAULT 'month',
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage subscriptions"
  ON public.subscriptions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Current plan lookup
CREATE OR REPLACE FUNCTION public.current_plan_tier()
RETURNS plan_tier
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT tier
      FROM public.subscriptions
      WHERE user_id = auth.uid()
        AND status = 'active'
      LIMIT 1
    ),
    'free'::plan_tier
  );
$$;

-- Limit helpers
CREATE OR REPLACE FUNCTION public.can_add_contractor()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tier plan_tier;
  limit_value INTEGER;
  current_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  tier := public.current_plan_tier();
  limit_value := CASE tier
    WHEN 'free' THEN 2
    WHEN 'starter' THEN 25
    WHEN 'agency' THEN 150
    ELSE NULL
  END;

  IF limit_value IS NULL THEN
    RETURN TRUE;
  END IF;

  SELECT COUNT(*) INTO current_count
  FROM public.contractors
  WHERE user_id = auth.uid();

  RETURN current_count < limit_value;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_set_active_project(_project_id UUID, _status TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tier plan_tier;
  limit_value INTEGER;
  current_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  IF _status IS DISTINCT FROM 'Active' THEN
    RETURN TRUE;
  END IF;

  tier := public.current_plan_tier();
  limit_value := CASE tier
    WHEN 'free' THEN 1
    ELSE NULL
  END;

  IF limit_value IS NULL THEN
    RETURN TRUE;
  END IF;

  SELECT COUNT(*) INTO current_count
  FROM public.projects
  WHERE user_id = auth.uid()
    AND status = 'Active'
    AND (_project_id IS NULL OR id <> _project_id);

  RETURN current_count < limit_value;
END;
$$;

-- Update signup hook to include a default subscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));

  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  -- Create default subscription
  INSERT INTO public.subscriptions (user_id, tier, status, billing_interval)
  VALUES (NEW.id, 'free', 'active', 'month')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Update trigger for subscriptions timestamps
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enforce limits on inserts/updates
DROP POLICY IF EXISTS "Users can create their own contractors" ON public.contractors;
CREATE POLICY "Users can create their own contractors"
  ON public.contractors FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.can_add_contractor());

DROP POLICY IF EXISTS "Users can create their own projects" ON public.projects;
CREATE POLICY "Users can create their own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.can_set_active_project(NULL, status));

DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
CREATE POLICY "Users can update their own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND public.can_set_active_project(id, status));
