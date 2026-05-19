
CREATE OR REPLACE FUNCTION public.get_or_create_daily_missions()
 RETURNS TABLE(id uuid, mission_id uuid, category text, text text, completed_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid UUID := auth.uid();
  today_d DATE := CURRENT_DATE;
  v_cat TEXT;
  picked UUID;
  cats TEXT[] := ARRAY['marketplace','prospection','carnet','relance','contenu'];
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  FOREACH v_cat IN ARRAY cats LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.user_daily_missions udm
      WHERE udm.user_id = uid AND udm.mission_date = today_d AND udm.category = v_cat
    ) THEN
      SELECT mc.id INTO picked
      FROM public.missions_catalog mc
      WHERE mc.category = v_cat
      ORDER BY random()
      LIMIT 1;

      IF picked IS NOT NULL THEN
        INSERT INTO public.user_daily_missions (user_id, mission_date, mission_id, category)
        VALUES (uid, today_d, picked, v_cat)
        ON CONFLICT (user_id, mission_date, category) DO NOTHING;
      END IF;
    END IF;
  END LOOP;

  RETURN QUERY
  SELECT udm.id, udm.mission_id, udm.category, mc.text, udm.completed_at
  FROM public.user_daily_missions udm
  JOIN public.missions_catalog mc ON mc.id = udm.mission_id
  WHERE udm.user_id = uid AND udm.mission_date = today_d
  ORDER BY array_position(cats, udm.category);
END;
$function$;
