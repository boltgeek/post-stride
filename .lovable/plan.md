# Soutien communautaire dans les challenges

Ajout d'un bloc à 2 onglets dans `/challenge/$id`, entre le bouton "Publier maintenant" et le Top 3, **activé par défaut sur tous les challenges communautaires**.

## 1. Base de données (migration)

Nouvelles tables :

- **`challenge_pods`** — un pod = jusqu'à 10 participantes d'un challenge
  - `challenge_id`, `pod_number`, `created_at`
- **`challenge_pod_members`** — `pod_id`, `user_id`, `joined_at` (unique sur user_id + challenge)
- **`community_posts`** — lien Facebook soumis par jour
  - `challenge_id`, `user_id`, `post_date`, `facebook_url`, `confirmed_at`, `created_at`
- **`community_assignments`** — qui soutient qui, quand
  - `community_post_id`, `assignee_user_id`, `slot_time` (`12:00` / `15:00` / `20:00`), `completed_at`, `created_at`

Colonne ajoutée :
- **`challenges.interactions_per_post`** (int, default 9, configurable par l'organisatrice — éditable depuis le panneau admin)

RLS :
- Pods/membres : visibles par participantes du même challenge
- `community_posts` : insert/select/update par le propriétaire ; select par les assignées
- `community_assignments` : select par owner ou assignée ; update (mark done) par assignée ; update (confirmer) par owner

## 2. Logique serveur (fonctions Postgres SECURITY DEFINER)

- **`assign_user_to_pod(challenge_id, user_id)`** — appelé automatiquement à `joinChallenge`. Trouve un pod existant avec <10 membres ou en crée un nouveau.
- **`submit_community_post(challenge_id, facebook_url)`** :
  1. insère `community_posts` pour aujourd'hui (idempotent)
  2. récupère le pod de l'auteure
  3. sélectionne `interactions_per_post` participantes d'autres pods, en excluant celles assignées à elle hier (rotation)
  4. distribue uniformément sur les 3 slots (`12:00`, `15:00`, `20:00`)
  5. insère les `community_assignments`
- **`get_my_community_post_today(challenge_id)`** — renvoie le post du jour + liste des assignées avec nom + statut
- **`get_my_community_assignments_today(challenge_id)`** — renvoie les posts à soutenir aujourd'hui groupés par slot
- **`mark_assignment_done(assignment_id)`** — assignée coche ✅
- **`confirm_community_post(post_id)`** — owner confirme tout reçu → ajoute points via `add_challenge_score` (un appel `interaction` par assignment validé)
- **Cron pg_cron à minuit** : pour chaque assignment `completed_at IS NULL` du jour passé → `apply_challenge_penalty` (retrait 5 pts à l'assignée, motif "soutien non effectué")

Backfill : rétroactivement créer pods pour participantes existantes.

## 3. Frontend

**`src/components/CommunitySupportBlock.tsx`** — nouveau composant inséré dans `src/routes/challenge.$id.tsx` entre le CTA "Publier maintenant" et la section Top 3. Affiché uniquement si `challenge.type === 'communautaire'`.

Structure :
- Tabs shadcn : **Mon post** | **Mes soutiens**
- Onglet 1 : input + bouton orange "Soumettre mon lien" ; après soumission, barre de progression X/Y, liste des assignées (nom + slot + ✅/⏳), bouton "Confirmer les interactions reçues" (actif quand tout est ✅)
- Onglet 2 : barre globale, liste groupée par slot 12h/15h/20h, slots futurs grisés/verrouillés jusqu'à leur heure, bouton "Marquer comme fait" par item, lien Facebook cliquable, nom du propriétaire

Hook React Query pour rafraîchissement et invalidation après mutations.

**`src/components/ChallengeAdminPanel.tsx`** — ajout d'un champ "Nombre de personnes à assigner par post" (`interactions_per_post`).

## 4. Design

- Couleur primaire orange existante (tokens sémantiques `--primary`)
- Cards, border-radius, espacements alignés sur les composants existants du challenge
- Mobile-first (viewport 360px)
- Aucune couleur custom — uniquement les tokens du design system

## Hors scope (explicite)

- Pas de push notifications (in-app uniquement — badge dans la liste)
- Pas de vérification réelle que la personne a vraiment commenté sur Facebook (honor system + pénalités)
- Pas de re-balance si une participante quitte le challenge en cours de journée
