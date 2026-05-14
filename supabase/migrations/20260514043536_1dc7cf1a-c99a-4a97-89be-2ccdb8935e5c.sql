
CREATE TABLE IF NOT EXISTS public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan text NOT NULL CHECK (plan IN ('starter','essentielle','premium','ai_full')),
  reference text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','failure')),
  amount_fcfa integer NOT NULL,
  document_id uuid NULL,
  provider text NOT NULL DEFAULT 'taramoney',
  provider_payload jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS purchases_user_id_idx ON public.purchases(user_id);
CREATE INDEX IF NOT EXISTS purchases_reference_idx ON public.purchases(reference);

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own purchases" ON public.purchases;
CREATE POLICY "Users can read their own purchases"
  ON public.purchases FOR SELECT
  USING (auth.uid() = user_id);

-- No client INSERT/UPDATE policies: only service role (webhook + server fn) writes.

DROP TRIGGER IF EXISTS purchases_updated_at ON public.purchases;
CREATE TRIGGER purchases_updated_at
  BEFORE UPDATE ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.user_stats
  ADD COLUMN IF NOT EXISTS subscription_plan text NULL,
  ADD COLUMN IF NOT EXISTS subscription_until timestamptz NULL,
  ADD COLUMN IF NOT EXISTS ai_full_unlocked_at timestamptz NULL;
