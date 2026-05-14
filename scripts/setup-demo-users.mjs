/**
 * setup-demo-users.mjs
 * ─────────────────────────────────────────────────────────────
 * Crée les comptes Firebase Auth + Custom Claims + profils Firestore
 * pour les utilisateurs de démonstration.
 *
 * PRÉREQUIS :
 *   1. Télécharger la clé de compte de service depuis Firebase Console :
 *      → https://console.firebase.google.com/project/edu-school-bb515/settings/serviceaccounts/adminsdk
 *      → Cliquer "Générer une nouvelle clé privée"
 *      → Sauvegarder sous : scripts/service-account.json
 *
 *   2. Exécuter :
 *      node scripts/setup-demo-users.mjs
 * ─────────────────────────────────────────────────────────────
 */

import { readFileSync, existsSync } from 'fs'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

// ── Vérification du fichier service-account.json ────────────────────────────
const SERVICE_ACCOUNT_PATH = join(__dirname, 'service-account.json')

if (!existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error('\n❌ Fichier service-account.json introuvable !\n')
  console.error('   Téléchargez-le depuis :')
  console.error('   https://console.firebase.google.com/project/edu-school-bb515/settings/serviceaccounts/adminsdk\n')
  console.error('   → Cliquer "Générer une nouvelle clé privée"')
  console.error('   → Sauvegarder sous : scripts/service-account.json\n')
  process.exit(1)
}

// ── Init Firebase Admin ──────────────────────────────────────────────────────
const admin = require('firebase-admin')

const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'))

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'edu-school-bb515',
  })
}

const auth = admin.auth()
const db   = admin.firestore()

// ── Définition des utilisateurs demo ────────────────────────────────────────
const SCHOOL_ID = 'demo-school'

const DEMO_USERS = [
  {
    email:       'direction@demo.fr',
    password:    'demo1234',
    displayName: 'Marie Kourouma',
    role:        'direction',
    schoolId:    SCHOOL_ID,
  },
  {
    email:       'prof@demo.fr',
    password:    'demo1234',
    displayName: 'M. Jean Leblanc',
    role:        'teacher',
    schoolId:    SCHOOL_ID,
  },
  {
    email:       'prof2@demo.fr',
    password:    'demo1234',
    displayName: 'Mme Aïssatou Diallo',
    role:        'teacher',
    schoolId:    SCHOOL_ID,
  },
  {
    email:       'eleve@demo.fr',
    password:    'demo1234',
    displayName: 'Aminata Bah',
    role:        'student',
    schoolId:    SCHOOL_ID,
  },
]

// ── Fonction principale ──────────────────────────────────────────────────────
async function setupUser(userData) {
  const { email, password, displayName, role, schoolId } = userData
  let uid

  // 1. Créer ou récupérer le compte Firebase Auth
  try {
    const existing = await auth.getUserByEmail(email)
    uid = existing.uid
    console.log(`  ♻️  Compte existant : ${email} (uid: ${uid})`)

    // Mettre à jour le mot de passe et displayName si nécessaire
    await auth.updateUser(uid, { password, displayName })
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      const created = await auth.createUser({ email, password, displayName })
      uid = created.uid
      console.log(`  ✅ Compte créé : ${email} (uid: ${uid})`)
    } else {
      throw err
    }
  }

  // 2. Définir les Custom Claims (role + schoolId dans le JWT token)
  // Ces claims sont utilisés par les règles Firestore pour le contrôle d'accès
  await auth.setCustomUserClaims(uid, { role, schoolId })
  console.log(`  🔑 Custom claims définis : role=${role}, schoolId=${schoolId}`)

  // 3. Créer/mettre à jour le profil Firestore dans users/{uid}
  const profileRef = db.collection('users').doc(uid)
  await profileRef.set({
    id:          uid,
    email,
    displayName,
    role,
    schoolId,
    isActive:    true,
    createdAt:   admin.firestore.FieldValue.serverTimestamp(),
    updatedAt:   admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true })
  console.log(`  📄 Profil Firestore créé : users/${uid}`)

  return { uid, email, role }
}

async function main() {
  console.log('\n🚀 Setup des utilisateurs de démonstration\n')
  console.log(`   Projet : edu-school-bb515`)
  console.log(`   École  : ${SCHOOL_ID}\n`)

  const results = []

  for (const user of DEMO_USERS) {
    console.log(`\n👤 ${user.displayName} <${user.email}>`)
    try {
      const result = await setupUser(user)
      results.push(result)
    } catch (err) {
      console.error(`  ❌ Erreur pour ${user.email} :`, err.message)
    }
  }

  console.log('\n─────────────────────────────────────────────')
  console.log('✅ Setup terminé !\n')
  console.log('Comptes disponibles :')
  for (const r of results) {
    console.log(`   ${r.email}  →  rôle: ${r.role}  (uid: ${r.uid})`)
  }
  console.log('\nMot de passe par défaut : demo1234')
  console.log('\n⚠️  Note importante :')
  console.log('   Les Custom Claims sont mis en cache côté client.')
  console.log('   Après connexion, rafraîchir le token avec :')
  console.log('   await user.getIdToken(true)')
  console.log('   → C\'est géré automatiquement par useAuthInit()\n')

  process.exit(0)
}

main().catch((err) => {
  console.error('\n❌ Erreur fatale :', err)
  process.exit(1)
})
