/**
 * Génère le jeu d'icônes embarqué.
 *
 * Par défaut, `@iconify/react` télécharge chaque icône depuis
 * `api.iconify.design`. C'est inacceptable ici : le cahier des charges
 * (§19) vise des établissements à connectivité instable, et une
 * interface dont les icônes disparaissent hors ligne est illisible.
 *
 * Ce script lit le catalogue `ICONS`, extrait uniquement ces icônes
 * des paquets `@iconify-json/*`, et écrit un module qui les enregistre
 * au démarrage. On embarque une trentaine d'icônes, pas les 7 000 du
 * jeu Solar.
 *
 * Usage : node scripts/build-icons.mjs
 * Il est rejoué automatiquement avant chaque build (`prebuild`).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

// pnpm range les paquets dans un magasin adressé par contenu : un chemin
// en dur vers node_modules ne tient pas. On passe par la résolution de
// module, qui trouve le paquet où qu'il soit.
const require = createRequire(import.meta.url)

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')

// ── 1. Lire les noms d'icônes du catalogue ───────────────────────────────────

const source = readFileSync(resolve(root, 'src/components/ui/Icon.tsx'), 'utf8')

const names = new Set()
for (const m of source.matchAll(/'([a-z0-9-]+):([a-z0-9-]+)'/g)) {
  names.add(`${m[1]}:${m[2]}`)
}

if (names.size === 0) {
  console.error('Aucune icône trouvée dans Icon.tsx — le format a-t-il changé ?')
  process.exit(1)
}

// ── 2. Regrouper par collection ──────────────────────────────────────────────

const byPrefix = new Map()
for (const full of names) {
  const [prefix, icon] = full.split(':')
  if (!byPrefix.has(prefix)) byPrefix.set(prefix, [])
  byPrefix.get(prefix).push(icon)
}

// ── 3. Extraire les définitions ──────────────────────────────────────────────

const collections = []
let extracted = 0
const missing = []

for (const [prefix, icons] of byPrefix) {
  let data
  try {
    data = JSON.parse(
      readFileSync(require.resolve(`@iconify-json/${prefix}/icons.json`), 'utf8')
    )
  } catch {
    console.error(`Collection @iconify-json/${prefix} introuvable — l'avez-vous installée ?`)
    process.exit(1)
  }

  const picked = {}
  for (const name of icons) {
    if (data.icons[name]) {
      picked[name] = data.icons[name]
      extracted++
    } else if (data.aliases?.[name]) {
      // Un alias pointe vers une icône réelle : on résout la cible.
      const target = data.aliases[name].parent
      if (data.icons[target]) {
        // `parent` n'a de sens que dans un alias : une fois la cible
        // fusionnée, le garder ferait échouer le typage `IconifyIcon`.
        const { parent: _parent, ...overrides } = data.aliases[name]
        picked[name] = { ...data.icons[target], ...overrides }
        extracted++
      } else {
        missing.push(`${prefix}:${name}`)
      }
    } else {
      missing.push(`${prefix}:${name}`)
    }
  }

  collections.push({
    prefix,
    icons: picked,
    width: data.width ?? 24,
    height: data.height ?? 24,
  })
}

if (missing.length) {
  // On avertit sans bloquer : une icône absente s'affiche vide, ce qui
  // se voit tout de suite, alors qu'un build cassé bloquerait tout.
  console.warn(`Icônes introuvables (${missing.length}) : ${missing.join(', ')}`)
}

// ── 4. Écrire le module ──────────────────────────────────────────────────────

const out = `// ⚠️ Fichier généré par scripts/build-icons.mjs — ne pas modifier à la main.
//
// Les icônes du catalogue \`ICONS\` sont embarquées dans le bundle plutôt
// que téléchargées depuis api.iconify.design : l'interface doit rester
// lisible hors ligne (§19).
//
// Régénérer : node scripts/build-icons.mjs
import { addCollection, type IconifyJSON } from '@iconify/react'

// Le type explicite est nécessaire : sans lui, TypeScript infère une
// union des formes exactes de chaque collection, incompatible avec la
// signature d'index d'\`IconifyJSON\`.
const COLLECTIONS: IconifyJSON[] = ${JSON.stringify(collections, null, 2)}

export function registerIcons(): void {
  for (const c of COLLECTIONS) {
    addCollection(c)
  }
}
`

mkdirSync(resolve(root, 'src/components/ui'), { recursive: true })
writeFileSync(resolve(root, 'src/components/ui/icons.generated.ts'), out, 'utf8')

const kb = Math.round(Buffer.byteLength(out) / 1024)
console.log(`${extracted} icônes embarquées depuis ${collections.length} collection(s) — ${kb} Ko`)
