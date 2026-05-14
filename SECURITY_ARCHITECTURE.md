# Architecture de Sécurité - Plateforme Éducative

## Vue d'ensemble du système

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (App Web/Mobile)                   │
│  Firebase Auth SDK + App Check (anti-bot)                        │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS + JWT signé
┌────────────────────────────▼────────────────────────────────────┐
│                      FIREBASE (europe-west1)                      │
│                                                                   │
│  ┌─────────────────┐  ┌───────────────┐  ┌──────────────────┐   │
│  │  Firebase Auth  │  │   Firestore   │  │ Cloud Functions  │   │
│  │  Custom Claims  │  │ Security Rules│  │  (TypeScript)    │   │
│  └────────┬────────┘  └───────┬───────┘  └────────┬─────────┘   │
│           │                   │                   │              │
│           └───────────────────┴───────────────────┘             │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Secret Manager (clés API IA, clé chiffrement)│   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Modèle de rôles et autorisations

| Action                      | direction | professeur | élève |
|-----------------------------|:---------:|:----------:|:-----:|
| Créer un compte élève        |     ✓     |     ✗      |   ✗   |
| Voir profil autre élève      |     ✓     |   partiel  |   ✗   |
| Voir données privées élève   |     ✓     |     ✗      |   ✗   |
| Créer un cours               |     ✓     |     ✓      |   ✗   |
| Voir sa propre progression   |     ✓     |     ✓      |   ✓   |
| Voir progression d'un élève  |     ✓     |   partiel  |   ✗   |
| Envoyer notification         |     ✓     |     ✓      |   ✗   |
| Appeler l'IA                 |     ✓     |     ✓      |   ✓*  |
| Générer quiz IA              |     ✓     |     ✓      |   ✗   |
| Exporter données RGPD        |     ✓     |     ✗      |  soi  |
| Voir logs d'audit            |     ✓     |     ✗      |   ✗   |
| Voir métriques système       |     ✓     |     ✗      |   ✗   |

*Élève : 20 requêtes/heure maximum

## Structure Firestore

```
/users/{uid}                          # Profils (tous rôles)
/students/{uid}                       # Profils élèves (non sensible)
/students/{uid}/private/data          # Données chiffrées (direction only)
/courses/{courseId}                   # Cours
/courses/{courseId}/lessons/{id}      # Leçons
/courses/{courseId}/quizzes/{id}      # Quiz
/progress/{uid}/courses/{courseId}    # Progression élève
/notifications/{id}                   # Notifications (TTL 72h par défaut)
/classes/{classeId}                   # Classes
/auditLogs/{id}                       # Logs immuables (5 ans)
/_rateLimits/{key}                    # Rate limiting (interne)
/_deletionQueue/{id}                  # File RGPD (interne)
/_aiUsage/{schoolId}/daily/{date}     # Quotas IA (interne)
/_securityIncidents/{id}              # Incidents signalés (interne)
/_systemMetrics/{id}                  # Métriques horaires (interne)
```

## Politique RGPD

### Données jamais stockées en clair
- Mots de passe (Firebase Auth gère le hachage)
- Dates de naissance des élèves → chiffrées AES-256-GCM
- Emails des parents → chiffrés AES-256-GCM
- Numéros de téléphone → chiffrés AES-256-GCM
- Numéros d'identification nationale → chiffrés AES-256-GCM
- Notes médicales → chiffrées AES-256-GCM

### Données pseudonymisées dans les logs
- Adresses IP → hashées HMAC-SHA256
- Emails des acteurs dans les logs → hashés HMAC-SHA256
- Noms des élèves dans les métadonnées → initiale uniquement

### Durées de rétention
| Type de données            | Durée          | Justification           |
|---------------------------|----------------|-------------------------|
| Logs d'audit              | 5 ans          | Obligation légale (CNIL)|
| Données pédagogiques      | Fin de scolarité + 1 an | Usage pédagogique |
| Notifications             | 72h (défaut)   | Pertinence temporelle   |
| Exports RGPD              | 24h            | Sécurité du lien        |
| Rate limit records        | 24h            | Technique               |
| Tokens FCM invalides      | Supprimés immédiatement | Hygiène       |

### Droit à l'oubli (Article 17 RGPD)
1. Demande reçue → Document créé dans `_deletionQueue` avec `scheduledFor = now + 30j`
2. Délai de 30 jours (rétractation possible)
3. À J+30 : `processDataDeletionQueue` (03:00 chaque nuit) traite la suppression
4. Suppression effective :
   - Compte Firebase Auth supprimé
   - Profil `/users/{uid}` supprimé
   - Données privées `/students/{uid}/private/data` supprimées
   - Profil élève anonymisé (nom → "[COMPTE SUPPRIMÉ]", stats conservées)
   - Progression supprimée
   - Notifications supprimées
   - Fichiers Storage supprimés
   - Log d'audit final créé (immuable, 5 ans)

### Notification de violation (Article 33 RGPD)
- Incidents "high" ou "critical" : délai de notification 72h (CNIL)
- Champ `notificationDeadline` calculé automatiquement
- Collection `_securityIncidents` pour suivi

## Variables d'environnement requises

```bash
# Secret Manager (jamais en .env ordinaire)
ENCRYPTION_KEY=<clé-aes-256-bits-base64>    # Chiffrement données sensibles
HASH_SALT=<sel-hmac-sha256>                  # Pseudonymisation logs
GEMINI_API_KEY=<clé-google-ai-studio>        # Proxy IA

# firebase.json / Cloud Functions config
REGION=europe-west1                          # Hébergement UE (RGPD)
```

## Checklist de déploiement

- [ ] App Check activé (reCAPTCHA Enterprise pour web, DeviceCheck pour iOS, Play Integrity pour Android)
- [ ] Secret Manager configuré avec ENCRYPTION_KEY et GEMINI_API_KEY
- [ ] Région forcée à `europe-west1` (Belgique) pour conformité RGPD
- [ ] Firebase Auth : session duration configurée (1 semaine max)
- [ ] Firestore : indexes déployés (`firestore.indexes.json`)
- [ ] Storage : CORS configuré pour les domaines autorisés uniquement
- [ ] Alertes Cloud Monitoring configurées sur les Cloud Functions
- [ ] Politique de sauvegarde Firestore activée (rétention 7 jours)
- [ ] Cloud Armor configuré (protection DDoS)
- [ ] Audit logs Cloud exportés vers BigQuery (long terme)
