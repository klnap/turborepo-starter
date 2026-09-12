# Local Development

Developer workflow for this monorepo shell. Architecture context: [architecture.md](./architecture.md).

---

## 1. Prerequisites

- **Bun** `>= 1.4.0` (required — npm, pnpm, and yarn are blocked by `preinstall`)
- **Node.js** `^24.0.0` or `>= 20.9.0` (compatibility baseline for tooling)

```bash
bun --version
node -v
```

---

## 2. Setup

```bash
git clone https://github.com/your-org/turborepo-starter.git my-monorepo
cd my-monorepo

bun install
```

`bun root install` runs `bun install` at the repository root. CI uses `bun install --frozen-lockfile` directly.

---

## 3. Adopting and Configuring Applications

Add your applications into `apps/` and wire them into the monorepo:

```bash
# Example: create or import an application into apps/web
bun create next-app apps/web
bun adopt apps/web

# Pull secrets or configure environment
bun ws web secrets       # or: cp apps/web/.env.example apps/web/.env.local
```

`SKIP_ENV_VALIDATION=1` skips validation during CI and container builds.

---

## 4. Development

```bash
bun run dev              # Run all adopted workspaces concurrently
bun ws <app> dev         # Run dev server for a specific workspace (e.g. bun ws web dev)
```

---

## 5. Verification Ladder

Before committing or pushing:

```bash
bun run gate:quick       # Anti-slop pre-commit gate (Biome, Oxlint, typecheck, boundaries)
bun run gate:push        # Pre-push gate (unit tests, builds, smoke tests)
bun run gate:full        # Deep audit (Gitleaks history, Trivy, SBOM)
```
