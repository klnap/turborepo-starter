import fs from 'node:fs'
import path from 'node:path'

const FORBIDDEN_ROOT_PACKAGES = new Set([
  'react',
  'react-dom',
  'next',
  'payload',
  '@base-ui/react',
  '@conform-to/react',
  'tailwindcss',
  '@tailwindcss/postcss',
])

function collectDependencyOwnershipIssues(rootDir: string): { message: string }[] {
  const issues: { message: string }[] = []
  const rootPkgPath = path.join(rootDir, 'package.json')

  if (!fs.existsSync(rootPkgPath)) {
    issues.push({ message: 'Root package.json not found.' })
    return issues
  }

  const raw = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'))
  // SAFETY: package.json — only dependencies/devDependencies are read for ownership rules.
  const rootPkg = raw as {
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
  }

  if (rootPkg.dependencies && Object.keys(rootPkg.dependencies).length > 0) {
    issues.push({
      message:
        'Root package.json must not declare runtime dependencies. Use devDependencies for monorepo tooling only.',
    })
  }

  if (rootPkg.devDependencies) {
    for (const pkgName of Object.keys(rootPkg.devDependencies)) {
      if (FORBIDDEN_ROOT_PACKAGES.has(pkgName)) {
        issues.push({
          message: `'${pkgName}' is workspace-specific and must not be declared in root package.json.`,
        })
      }
    }
  }

  const scanDirs = [
    { type: 'app', dir: path.join(rootDir, 'apps') },
    { type: 'package', dir: path.join(rootDir, 'packages') },
  ]

  for (const { type, dir } of scanDirs) {
    if (!fs.existsSync(dir)) continue

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue

      const pkgJsonPath = path.join(dir, entry.name, 'package.json')
      if (!fs.existsSync(pkgJsonPath)) {
        issues.push({ message: `${type} '${entry.name}' is missing package.json.` })
        continue
      }

      try {
        const pkgRaw = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'))
        // SAFETY: package.json — only the name field is required for workspace discovery.
        const pkg = pkgRaw as { name?: string }
        if (!pkg.name) {
          issues.push({
            message: `${type} '${entry.name}/package.json' must specify a 'name' field.`,
          })
        }
      } catch {
        issues.push({ message: `Failed to parse '${pkgJsonPath}'.` })
      }
    }
  }

  return issues
}

export { collectDependencyOwnershipIssues }
