# Déploiement Supabase — EduSchool

## 1. Créer le projet

```bash
# Installer la CLI Supabase
npm install -g supabase

# Login
supabase login

# Créer un nouveau projet sur supabase.com
# Puis lier le repo local
supabase init
supabase link --project-ref YOUR_PROJECT_REF
```

## 2. Appliquer les migrations

```bash
# Appliquer toutes les migrations dans l'ordre
supabase db push

# Ou en développement local
supabase start
supabase db reset
```

## 3. Configurer les Storage buckets

```bash
# Dans le dashboard Supabase → Storage → New Bucket :
# - user-media    (public: false, 5MB max)
# - school-assets (public: true,  10MB max)
# - exports       (public: false, 50MB max)
# - receipts      (public: false, 10MB max)
```

## 4. Configurer les Secrets (Edge Functions)

```bash
# IA
supabase secrets set GEMINI_API_KEY=AIza...

# WhatsApp / Twilio
supabase secrets set TWILIO_ACCOUNT_SID=AC...
supabase secrets set TWILIO_AUTH_TOKEN=...
supabase secrets set TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# SMS — Africa's Talking
supabase secrets set AT_API_KEY=...
supabase secrets set AT_USERNAME=eduschool

# Supabase internal (auto-fourni dans Edge Functions)
# SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
# → disponibles automatiquement dans Deno.env
```

## 5. Déployer les Edge Functions

```bash
supabase functions deploy ai-proxy
supabase functions deploy generate-receipt
supabase functions deploy send-alert
supabase functions deploy payroll
```

## 6. Configurer les variables mobiles

Dans `apps/mobile/.env.local` :
```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Dans `apps/web/.env.local` :
```
VITE_SUPABASE_URL=https://YOUR_REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

## 7. Configurer l'Auth

Dans le dashboard Supabase → Authentication → Settings :
- Site URL: `https://your-web-app.com`
- Redirect URLs: `exp://localhost:8081, https://your-web-app.com`
- JWT Expiry: 3600s
- Email templates: personnaliser en français

## 8. Activer le Realtime

Dans Supabase Dashboard → Database → Replication :
Activer Realtime sur les tables :
- bulletins
- announcements
- messages
- attendance_sessions
- discipline_records
- export_jobs

## 9. Vérifier les RLS

```sql
-- Test en console SQL
SET LOCAL "request.jwt.claims" = '{"role":"student","school_id":"xxx"}';
SELECT * FROM bulletins LIMIT 5;
-- Doit retourner seulement les bulletins publiés de l'élève
```

## Différences clés Firebase → Supabase

| Concept Firebase | Équivalent Supabase |
|-----------------|---------------------|
| `onSnapshot()`  | `channel().on('postgres_changes').subscribe()` |
| `setDoc({merge:true})` | `upsert({onConflict:'...'})` |
| `arrayUnion(x)` | `append_to_array_if_not_exists()` RPC |
| `serverTimestamp()` | `DEFAULT NOW()` en PostgreSQL |
| `FieldValue.increment(n)` | `UPDATE SET col = col + n` |
| Batch writes | Transaction PostgreSQL |
| Collection group query | JOIN ou vue SQL |
| Custom Claims | `user.user_metadata.role` + colonne `profiles.role` |
| Security Rules | Row Level Security (RLS) |
| Cloud Functions | Edge Functions (Deno) + Database Functions |
