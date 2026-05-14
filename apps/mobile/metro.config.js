const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot  = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// Surveiller tout le workspace (pour shared-types etc.)
config.watchFolders = [workspaceRoot]

// Chercher les modules d'abord dans le projet, puis dans le workspace
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]

// Activer la résolution des symlinks pnpm
config.resolver.unstable_enableSymlinks = true

// Ne pas désactiver la recherche hiérarchique
config.resolver.disableHierarchicalLookup = false

module.exports = config
