# Secrets Management (Infisical)

This repository integrates with **[Infisical](https://infisical.com)** (open-source secret management) for zero-leak environment variables across all monorepo workspaces.

## Why Infisical over manual .env?
1. **Zero Secret Leaks**: Secrets never get committed to Git or shared over Slack/unencrypted channels.
2. **Monorepo Folder Scoping**: Infisical supports folder paths matching workspace structures:
   - `/` — Monorepo root shared secrets (`CI`, `TURBO_TOKEN`)
   - `/apps/web` — Frontend secrets (`NEXT_PUBLIC_*`, `AUTH_SECRET`)
   - `/apps/cms` — CMS & database secrets (`DATABASE_URL`, `PAYLOAD_SECRET`)
3. **E2EE (End-to-End Encryption)**: Self-hostable or cloud-hosted with SOC 2 / HIPAA compliance.

## Quickstart

### 1. Install Infisical CLI
```bash
# macOS
brew install infisical/get-cli/infisical

# Linux / WSL
curl -1sLf 'https://dl.cloudsmith.io/public/infisical/infisical-cli/setup.deb.sh' | sudo -E bash
sudo apt-get update && sudo apt-get install -y infisical
```

### 2. Login & Link Project
```bash
infisical login
infisical init
```

### 3. Pull Secrets into Workspaces
```bash
# Pull root environment
bun run secrets:pull

# Or run dev directly with injected secrets (without writing .env files):
infisical run -- bun dev
```
