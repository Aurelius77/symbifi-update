-- Allow users to change their own plan tier (no billing integration yet)
CREATE OR REPLACE FUNCTION public.set_subscription_tier(_tier plan_tier)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _tier = 'large_agency' THEN
    RAISE EXCEPTION 'Contact sales to upgrade to Large Agency';
  END IF;

  INSERT INTO public.subscriptions (user_id, tier, status, billing_interval)
  VALUES (auth.uid(), _tier, 'active', 'month')
  ON CONFLICT (user_id)
  DO UPDATE SET
    tier = EXCLUDED.tier,
    status = 'active';
END;
$$;

REVOKE ALL ON FUNCTION public.set_subscription_tier(plan_tier) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_subscription_tier(plan_tier) TO authenticated;
