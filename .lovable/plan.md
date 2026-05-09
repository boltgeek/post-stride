# Logique de challenges de bout en bout

Découpé en **3 lots** pour éviter les régressions. Je propose de tout livrer dans cette session, mais on peut s'arrêter après chaque lot.

---

## LOT A — Scoring automatique + temps réel + UX inscription (Étapes 1, 2, 3)

### Base de données (migration)
- Ajouter colonnes `scoring_rules` manquantes : déjà OK (`post`, `daily_login`, `interaction`). On utilisera ces 3 clés (pas `posts`/`connexions` au pluriel — on garde le schéma existant pour ne pas casser le code déjà livré).
- Créer table `user_badges` : `id, user_id, badge_type ('championne'|'finaliste'|'top3'), challenge_id, awarded_at`. RLS : lecture publique, insert via service role uniquement.
- Trigger Postgres `on_post_published` sur `posts` (AFTER UPDATE/INSERT quand `status='published'`) qui incrémente `score` dans tous les `challenge_participants` actifs du user selon `scoring_rules.post`. Remplace la logique JS actuelle dans `store.ts` (plus fiable, atomique).
- Trigger sur `posts` quand `reactions`/`comments` augmentent → `+ scoring_rules.interaction` sur la participante propriétaire.
- Fonction `register_daily_login(uid)` appelée côté client une fois par jour (vérifie `last_active_date` sur `user_stats`) → `+ scoring_rules.daily_login`.
- **Gel post-fin** : trigger BEFORE UPDATE sur `challenge_participants` qui rejette toute modif si `challenges.actif = false` ou `now() > date_fin`.
- Activer Realtime sur `challenge_participants` (déjà fait normalement, on confirme).

### Frontend
- `joinChallenge` : déjà OK, ajouter toast "🎉 Tu as rejoint le challenge !".
- `challenge.$id.tsx` : abonnement Realtime sur `challenge_participants` filtré par `challenge_id` → re-fetch automatique du leaderboard. Highlight orange `#ec7a3c` sur la ligne courante. Bloc "Ta position" avec rang, score, "Il te manque X pts pour passer au rang supérieur", bouton "Publier maintenant" → `/`.
- Appeler `register_daily_login` au login dans `auth.tsx`.
- Retirer la logique de scoring manuelle dans `store.ts` (remplacée par les triggers DB).

---

## LOT B — Fin de challenge + récompenses (Étapes 5, 6, 7)

### Edge function + cron
- Server route `/api/public/hooks/close-expired-challenges` (TanStack Start, pas Edge Function Supabase) :
  1. Sélectionne les `challenges` avec `actif=true AND date_fin < today`.
  2. Pour chaque : passe `actif=false`, calcule top 3, insère 3 lignes dans `user_badges`.
  3. (Notifications : voir Lot C)
- `pg_cron` quotidien à 00:05 → appelle cette route.

### Frontend
- `challenge.$id.tsx` : si `actif=false` → mode "archive" : bandeau "Challenge terminé le [date] — [Pseudo] a remporté 🏆", classement figé avec 🥇🥈🥉, pas de bouton "Rejoindre".
- Onglet Challenges (`analytics.tsx` ou `challenges.tsx`) : section "Terminés" en plus de "En cours".
- Page profil (`account.tsx`) : afficher les badges `user_badges` (icônes + tooltip nom du challenge).

---

## LOT C — Notifications de dépassement (Étape 4)

Plus délicat : nécessite des notifications push. Le projet a déjà `use-notifications.ts` (browser Notifications API, fonctionne uniquement onglet ouvert).

**Approche pragmatique MVP** (cohérente avec l'existant) :
- Côté client, dans `challenge.$id.tsx`, écouter Realtime sur les participants du challenge :
  - Mémoriser le rang précédent du user courant ; si nouveau rang > ancien rang → toast "🔥 Tu t'es fait dépasser, tu es [rang]ème" + Notification browser si activées.
  - Si nouveau rang < ancien → toast "🎉 Tu viens de passer [rang]ème !".
- Pour les rappels J-2 / J-1 : ajout dans le cron quotidien d'un check, mais sans backend de push réel ce sera limité aux utilisateurs actifs. **Je laisse cette partie en "best-effort in-app"** — un vrai push (FCM/Web Push) nécessiterait un setup dédié (service worker + clés VAPID) que je peux ajouter plus tard si tu veux.

---

## Détails techniques

### Schéma scoring_rules
On garde `{post, daily_login, interaction}` comme déjà en DB. La spec parlait de `posts/connexions/interactions` (pluriel) — j'aligne sur le schéma existant pour éviter une migration cassante.

### Bonus de publication
La spec sépare "copier" et "publier" (publier = posts + bonus). Le projet n'a pas de notion de "copier sans publier" en challenge. **Proposition** : `score += scoring_rules.post` quand status passe à `published`. Pas de bonus séparé (sinon il faut une 4e clé).

### Sécurité
- Triggers utilisent `SECURITY DEFINER` + `search_path=public`.
- `user_badges` : insert uniquement via service role (cron).
- Le gel via trigger empêche toute manipulation côté client après `date_fin`.

---

**Question** : OK pour partir sur ce découpage et tout livrer (Lot A → B → C) en une fois ? Ou on s'arrête après le Lot A pour valider avant ?
