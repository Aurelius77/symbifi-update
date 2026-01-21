-- Allow users to delete their own account and related data
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, storage
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.activity_logs
  WHERE user_id = auth.uid();

  DELETE FROM public.expenses
  WHERE user_id = auth.uid();

  DELETE FROM storage.objects
  WHERE bucket_id = 'logos'
    AND (storage.foldername(name))[1] = auth.uid()::text;

  DELETE FROM auth.users
  WHERE id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;
