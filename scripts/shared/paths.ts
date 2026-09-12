/**
 * Centralized filesystem path resolvers for monorepo scripts.
 *
 * @packageDocumentation
 */

import path from 'node:path'

export const ROOT_DIR = path.resolve(import.meta.dir, '../..')
export const APPS_DIR = path.join(ROOT_DIR, 'apps')
export const PACKAGES_DIR = path.join(ROOT_DIR, 'packages')
export const SCRIPTS_DIR = path.join(ROOT_DIR, 'scripts')
export const GENERATED_DIR = path.join(ROOT_DIR, '.generated')
