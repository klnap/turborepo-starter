# Turborepo Remote Caching

Turborepo can share build artifacts across team members and GitHub Actions runners.

## 1. Vercel Remote Cache (Recommended default)
```bash
bunx turbo login
bunx turbo link
```

## 2. Self-Hosted Remote Cache (AWS S3 / Cloudflare R2 / MinIO)
Run an open-source remote cache container (e.g. `ducktors/turborepo-remote-cache`):
```bash
export TURBO_API="https://turbo-cache.yourdomain.com"
export TURBO_TOKEN="your-secure-token"
export TURBO_TEAM="team"
```
Turborepo will automatically direct cache reads and writes to your self-hosted endpoint.
