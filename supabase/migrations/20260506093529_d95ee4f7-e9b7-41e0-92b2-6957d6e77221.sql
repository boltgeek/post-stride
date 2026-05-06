
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_name text;
BEGIN
  v_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'name', ''),
    NULLIF(split_part(NEW.email, '@', 1), ''),
    'Vendeuse'
  );
  INSERT INTO public.user_stats (user_id, display_name)
  VALUES (NEW.id, v_name);
  RETURN NEW;
END;
$function$;

UPDATE public.user_stats us
SET display_name = COALESCE(
  NULLIF(u.raw_user_meta_data->>'full_name', ''),
  NULLIF(u.raw_user_meta_data->>'name', ''),
  NULLIF(split_part(u.email, '@', 1), ''),
  'Vendeuse'
)
FROM auth.users u
WHERE us.user_id = u.id
  AND (us.display_name IS NULL OR us.display_name = 'Vendeuse');
