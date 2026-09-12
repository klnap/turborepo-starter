<div align="center">

# Turborepo Starter

A production-ready monorepo platform built on **[Bun](https://bun.sh)**, **[Turborepo](https://turbo.build)**, **[Biome](https://biomejs.dev)**, and integrated quality tooling.

Designed as a **modular shell**: bring your own applications (Next.js, Vite, Astro, Hono, Payload CMS, or docs) and orchestrate them with unified governance.

</div>

---

## Architectural Philosophy: Monorepo Shell

This repository functions as the **core developer platform and governance layer** without locking you into a monolithic codebase:

- **Pluggable Workspaces (`apps/`)**: Applications live as independent, decoupled packages inside `apps/<app>/`. You can adopt any starter in seconds using the automated adoption CLI (`bun adopt apps/<app>`).
- **Unified Governance**: CI/CD pipelines, secret management ([**Infisical**](https://infisical.com)), automated versioning ([**Changesets**](https://github.com/changesets/changesets)), and multi-tier quality gates apply universally to all workspaces.
- **Maximum Execution Speed**: Powered by **[Bun](https://bun.sh)** (`>= 1.4.0`) for instant package resolution and TypeScript execution, combined with **[Turborepo](https://turbo.build)** task parallelization and Rust linter engines ([**Biome**](https://biomejs.dev) + [**Oxlint**](https://oxc.rs)).

---

## Tech Stack & Tooling

| Capability | Technology | Purpose |
| :--- | :--- | :--- |
| **Runtime & Package Manager** | [Bun](https://bun.sh) (`>= 1.4.0`) | Instant installs, native TypeScript execution, and zero-config test runner |
| **Orchestration** | [Turborepo](https://turbo.build) | Task dependency graphs, remote caching, and parallel task execution |
| **Linter & Formatter** | [Biome](https://biomejs.dev) + [Oxlint](https://oxc.rs) | Sub-second code formatting, anti-slop checks, and strict type verification |
| **Secrets Management** | [Infisical](https://infisical.com) | Zero-leak encrypted environment management with folder-based scoping |
| **Security Scanning** | [Gitleaks](https://github.com/gitleaks/gitleaks) + [Trivy](https://trivy.dev) | Pre-commit secret leak prevention and automated dependency CVE scanning |
| **Versioning & Releases** | [Changesets](https://github.com/changesets/changesets) (`@changesets/cli`) | Automated multi-workspace SemVer versioning and changelog generation |
| **Dev Environment** | [DevContainers](https://containers.dev) ([`.devcontainer`](./.devcontainer/devcontainer.json)) | 1-click cloud and local VS Code containerized dev environment setup |
| **AI / Agent Rules** | [`AGENTS.md`](./AGENTS.md) + [`.agents/skills/`](./.agents/skills/INDEX.md) | Standardized procedural guidance, rules, and workflows for AI coding agents |

---

## Quick Start

### 1. Prerequisites
- **[Bun](https://bun.sh)** (`>= 1.4.0`)
- **Node.js** (`^24.0.0` or `>= 20.9.0` for tooling compatibility)

### 2. Clone and Initialize
```bash
git clone https://github.com/your-org/turborepo-starter.git my-monorepo
cd my-monorepo

bun install
```

### 3. Add Applications to `apps/`

You can create a new application or bring an existing project into `apps/`:

#### Option A: Create a New App (e.g. Next.js or Vite)
```bash
bun create next-app apps/web
# or: bun create vite apps/web

# Wire the app into Turborepo governance:
bun adopt apps/web
```

#### Option B: Adopt an Existing Application
```bash
# Move or clone an existing project into apps/
mv /path/to/my-existing-app apps/my-app
# (ensure nested .git is removed if cloned)
rm -rf apps/my-app/.git

# Wire into Turborepo governance:
bun adopt apps/my-app
```

### 4. Start Development
```bash
bun root install
bun run dev
```
Turborepo automatically runs tasks for all workspaces defined under `apps/*` in parallel with remote/local caching.

---

## Commands & Scoped CLI

All commands must be executed through the scoped CLI or Turbo graph to prevent dependency leakage and preserve architectural boundaries. See [`docs/commands.md`](./docs/commands.md) and [`docs/cli.md`](./docs/cli.md).

| Scope | Command | Description |
| :--- | :--- | :--- |
| **Repository Root** | `bun root <task>` | Run task across the entire repository (e.g. `bun root install`, `bun root doctor`) |
| **Application** | `bun ws <app> <task>` | Target specific workspace (e.g. `bun ws web dev`, `bun ws cms dev`) |
| **Workspace Install** | `bun ws <app> add <pkg>` | Install dependency inside a specific workspace (never `bun add` at root) |
| **Adoption** | `bun adopt <path>` | Validate and wire an existing project into the monorepo graph |
| **Root Secrets** | `bun root secrets [env]` | Pull root secrets (defaults to `dev`, e.g. `bun root secrets prod`) |
| **Workspace Secrets** | `bun ws <app> secrets [env]` | Pull secrets directly to `apps/<app>` (e.g. `bun ws web secrets dev`) |
| **Releases** | `bun run changeset` | Interactively declare SemVer version bumps for modified packages |

---

## Secrets Management (Infisical)

This starter integrates with **[Infisical](https://infisical.com)** for centralized, encrypted secrets management with native monorepo folder-level scoping. See [`docs/guides/secrets-management.md`](./docs/guides/secrets-management.md).

### Pulling Secrets with Scoped CLI (`bun ws` / `bun root`)

Secrets are fully integrated into the scoped CLI convention:

```bash
# 1. Pull root secrets (writes to root .env)
bun root secrets          # Pulls 'dev' environment by default
bun root secrets staging  # Pulls 'staging' environment
bun root secrets prod     # Pulls 'prod' environment

# 2. Pull workspace secrets directly to the application
# Pulls Infisical path '/apps/web' directly to apps/web/.env.local:
bun ws web secrets        # Pulls 'dev' secrets for web
bun ws web secrets prod   # Pulls 'prod' secrets for web

# Pulls Infisical path '/apps/cms' directly to apps/cms/.env:
bun ws cms secrets        # Pulls 'dev' secrets for cms
bun ws cms secrets prod   # Pulls 'prod' secrets for cms
```

### Zero-File Dev Mode (Inject Without Writing Files)
You can launch dev servers directly with secrets injected in-memory, without creating `.env` files on disk:
```bash
infisical run -- bun run dev
```

---

## Quality Gates (Anti-Slop Ladder)

Every pull request and commit is validated through a 4-tier verification ladder. See [`docs/ci-cd.md`](./docs/ci-cd.md):

```bash
# 1. Anti-Slop (Pre-Commit hook — ~1 minute)
# Runs Biome formatting, Oxlint strict checks, typecheck, and architectural boundaries.
bun run gate:quick

# 2. Verification (Pre-Push hook)
# Runs unit tests, production Next.js/Turbopack builds, and browser smoke tests.
bun run gate:push

# 3. CI Gate (Executed by GitHub Actions on PRs & main branch)
# Combines anti-slop verification and build integrity checks.
bun run gate:ci

# 4. Deep Audit (Manual or scheduled)
# Executes Trivy filesystem vulnerability scans, Gitleaks commit history audits, and SBOM analysis.
bun run gate:full
```

---

## Application Adoption (`bun adopt`)

The adoption engine (`scripts/cli/entries/adopt.ts`) automates onboarding external codebases into this monorepo shell:

```bash
bun adopt apps/<my-app>
```

### What `bun adopt` Performs Under the Hood:
1. **Workspace Validation**: Checks `package.json` for required metadata, engine constraints, and script contracts (`dev`, `build`, `typecheck`, `lint`, `test`).
2. **Turbo Pipeline Registration**: Ensures all package scripts map cleanly to root `turbo.json` task dependency trees.
3. **TypeScript Inheritance**: Configures the application `tsconfig.json` to extend the shared `tsconfig.base.json`.
4. **CLI Resolution**: Registers the workspace name so `bun ws <app> <cmd>` works immediately without monorepo re-indexing.
5. **Git Hygiene**: Strips nested `.git` repositories so the application becomes tracked within the monorepo root.

---

## Repository Layout

```text
apps/              # Application workspaces (adopt your apps here)
.agents/skills/    # Procedural agent skills & guidelines
.changeset/        # Multi-package release & SemVer version management
.devcontainer/     # Cloud & VS Code containerized dev environment
.githooks/         # Native Git pre-commit and pre-push hook orchestrators
.github/           # GitHub Actions CI/CD workflows and security scans
.infisical.json    # Centralized secret management project config
docs/              # Reference documentation, guides, and ADR records (docs/adr/)
scripts/           # CLI orchestrators, quality gates, and security audits
specs/             # Feature specifications (Tier 1 Global, Tier 2 Workspace)
turbo.json         # Turborepo task pipeline definitions & caching rules
biome.json         # Unified Biome linter & formatter configuration
oxlint.config.ts   # Oxlint rules and anti-slop filters
```
