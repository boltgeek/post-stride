
-- 1. Catalog table
CREATE TABLE public.missions_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('marketplace','prospection','carnet','relance','contenu')),
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.missions_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Catalog is readable by authenticated users"
ON public.missions_catalog FOR SELECT
TO authenticated
USING (true);

-- 2. Per-user daily missions
CREATE TABLE public.user_daily_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  mission_date DATE NOT NULL,
  mission_id UUID NOT NULL REFERENCES public.missions_catalog(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, mission_date, category)
);

CREATE INDEX idx_udm_user_date ON public.user_daily_missions(user_id, mission_date);

ALTER TABLE public.user_daily_missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own daily missions"
ON public.user_daily_missions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily missions"
ON public.user_daily_missions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily missions"
ON public.user_daily_missions FOR UPDATE
USING (auth.uid() = user_id);

-- 3. Seed 60 missions
INSERT INTO public.missions_catalog (category, text) VALUES
('marketplace', 'Publie 10 nouvelles annonces sur Facebook Marketplace aujourd''hui'),
('marketplace', 'Publie 20 annonces sur Marketplace — varie les photos et les titres'),
('marketplace', 'Renouvelle toutes tes annonces Marketplace de plus de 5 jours'),
('marketplace', 'Publie 15 annonces Marketplace en changeant les descriptions'),
('marketplace', 'Mets à jour les prix de 10 annonces Marketplace existantes'),
('marketplace', 'Publie 5 annonces Marketplace avec des photos sous différents angles'),
('marketplace', 'Crée 30 annonces Marketplace aujourd''hui — quantité = visibilité'),
('marketplace', 'Duplique tes 10 meilleures annonces avec de nouveaux titres'),
('marketplace', 'Publie 25 annonces Marketplace dans différentes catégories'),
('marketplace', 'Vérifie tes messages Marketplace et réponds à tous sous 1h'),
('prospection', 'Rejoins 3 groupes Facebook actifs de ta niche aujourd''hui'),
('prospection', 'Identifie 20 personnes dans un groupe Facebook et note leurs noms'),
('prospection', 'Envoie un message personnalisé à 5 personnes qui ont commenté dans un groupe'),
('prospection', 'Dans un groupe de 1000+ membres, identifie 10 profils qui correspondent à ta cible'),
('prospection', 'Écris à 10 personnes qui ont posté dans un groupe Facebook aujourd''hui'),
('prospection', 'Commente de manière utile sur 5 posts dans tes groupes cibles'),
('prospection', 'Trouve un groupe Facebook actif avec plus de 5000 membres et rejoins-le'),
('prospection', 'Identifie 15 personnes qui cherchent exactement ce que tu vends dans les groupes'),
('prospection', 'Envoie 8 messages à des personnes actives dans tes groupes Facebook'),
('prospection', 'Note dans ton carnet les 10 profils les plus prometteurs de la semaine'),
('carnet', 'Ouvre ton carnet et note les noms de 10 nouvelles personnes contactées aujourd''hui'),
('carnet', 'Relis ton carnet — relance 5 personnes contactées il y a plus de 7 jours'),
('carnet', 'Classe ton carnet en 3 colonnes : contacté / intéressé / client'),
('carnet', 'Ajoute 15 nouveaux noms dans ton carnet de prospects aujourd''hui'),
('carnet', 'Relance 3 personnes de ton carnet qui n''ont pas encore répondu'),
('carnet', 'Vérifie ton carnet : qui a montré de l''intérêt sans acheter ce mois-ci ?'),
('carnet', 'Note dans ton carnet le résultat de chaque conversation d''aujourd''hui'),
('carnet', 'Identifie dans ton carnet tes 5 prospects les plus chauds à relancer maintenant'),
('carnet', 'Mets à jour ton carnet avec les noms de toutes tes conversations de cette semaine'),
('carnet', 'Relis les 30 derniers noms de ton carnet et envoie un message de suivi à 5 d''entre eux'),
('relance', 'Contacte 5 personnes qui t''ont demandé un prix sans acheter'),
('relance', 'Envoie un message à 3 anciens clients : "J''ai quelque chose pour toi"'),
('relance', 'Relance toutes les conversations restées sans réponse depuis 3 jours'),
('relance', 'Envoie une photo d''un nouveau produit à 5 clients qui ont déjà acheté'),
('relance', 'Contacte 10 personnes qui ont commenté tes posts sans jamais acheter'),
('relance', 'Envoie un message vocal à 3 clients fidèles pour personnaliser la relation'),
('relance', 'Relance 5 personnes qui ont dit "je vais réfléchir" il y a plus de 5 jours'),
('relance', 'Propose une offre exclusive à tes 3 meilleurs clients du mois'),
('relance', 'Contacte quelqu''un qui a visité ta page plusieurs fois sans acheter'),
('relance', 'Envoie un message de suivi à ta dernière livraison : "Tu es satisfaite ?"'),
('contenu', 'Publie une photo produit avec un texte qui commence par une question'),
('contenu', 'Fais un post "Avant/Après" avec un témoignage client réel'),
('contenu', 'Publie dans 5 groupes Facebook différents avec le même post adapté'),
('contenu', 'Fais une vidéo courte de toi présentant un produit — même 30 secondes'),
('contenu', 'Publie un post avec le prix clairement visible et un appel à l''action direct'),
('contenu', 'Partage un avis client positif reçu cette semaine'),
('contenu', 'Publie une story Facebook avec un compte à rebours sur une offre'),
('contenu', 'Fais un post "Questions/Réponses" sur ton produit le plus vendu'),
('contenu', 'Publie une liste de 5 avantages de ton produit en format simple'),
('contenu', 'Fais un live Facebook de 10 minutes pour présenter tes nouveautés');

-- 4. Function: get or create today's missions
CREATE OR REPLACE FUNCTION public.get_or_create_daily_missions()
RETURNS TABLE(id UUID, mission_id UUID, category TEXT, text TEXT, completed_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  today_d DATE := CURRENT_DATE;
  cat TEXT;
  picked UUID;
  cats TEXT[] := ARRAY['marketplace','prospection','carnet','relance','contenu'];
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  FOREACH cat IN ARRAY cats LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.user_daily_missions
      WHERE user_id = uid AND mission_date = today_d AND category = cat
    ) THEN
      SELECT mc.id INTO picked
      FROM public.missions_catalog mc
      WHERE mc.category = cat
      ORDER BY random()
      LIMIT 1;

      IF picked IS NOT NULL THEN
        INSERT INTO public.user_daily_missions (user_id, mission_date, mission_id, category)
        VALUES (uid, today_d, picked, cat)
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
$$;

-- 5. Toggle a mission
CREATE OR REPLACE FUNCTION public.toggle_daily_mission(_id UUID, _completed BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  UPDATE public.user_daily_missions
  SET completed_at = CASE WHEN _completed THEN now() ELSE NULL END
  WHERE id = _id AND user_id = auth.uid();
END;
$$;

-- 6. History stats
CREATE OR REPLACE FUNCTION public.get_mission_history_stats()
RETURNS TABLE(
  total_completed INT,
  full_days INT,
  week_consistency INT,
  daily_counts JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  WITH per_day AS (
    SELECT mission_date,
           COUNT(*) FILTER (WHERE completed_at IS NOT NULL)::INT AS done
    FROM public.user_daily_missions
    WHERE user_id = uid
    GROUP BY mission_date
  ),
  last90 AS (
    SELECT mission_date, done FROM per_day
    WHERE mission_date >= CURRENT_DATE - INTERVAL '90 days'
  ),
  week AS (
    SELECT COALESCE(SUM(done),0)::INT AS w_done, COALESCE(COUNT(*),0)::INT AS w_days
    FROM per_day
    WHERE mission_date >= date_trunc('week', CURRENT_DATE)::date
  )
  SELECT
    COALESCE((SELECT SUM(done) FROM per_day), 0)::INT,
    COALESCE((SELECT COUNT(*) FROM per_day WHERE done >= 5), 0)::INT,
    CASE WHEN (SELECT w_days FROM week) = 0 THEN 0
         ELSE ((SELECT w_done FROM week) * 100 / ((SELECT w_days FROM week) * 5))::INT
    END,
    COALESCE((SELECT jsonb_object_agg(mission_date::text, done) FROM last90), '{}'::jsonb);
END;
$$;
