ALTER TABLE public.community_assignments
  DROP CONSTRAINT IF EXISTS community_assignments_slot_time_check;

ALTER TABLE public.community_assignments
  ADD CONSTRAINT community_assignments_slot_time_check
  CHECK (slot_time IN ('10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'));

DO $$
DECLARE p RECORD;
  slots TEXT[] := ARRAY['10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00'];
BEGIN
  FOR p IN
    SELECT id FROM public.community_posts WHERE post_date = CURRENT_DATE
  LOOP
    WITH ordered AS (
      SELECT id, row_number() OVER (ORDER BY created_at, id) - 1 AS rn
      FROM public.community_assignments
      WHERE community_post_id = p.id AND completed_at IS NULL
    )
    UPDATE public.community_assignments ca
    SET slot_time = slots[(ordered.rn % array_length(slots,1)) + 1]
    FROM ordered
    WHERE ca.id = ordered.id;
  END LOOP;
END $$;

-- Now tighten the constraint to only allow new slots
ALTER TABLE public.community_assignments
  DROP CONSTRAINT IF EXISTS community_assignments_slot_time_check;

ALTER TABLE public.community_assignments
  ADD CONSTRAINT community_assignments_slot_time_check
  CHECK (slot_time IN ('10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00'));