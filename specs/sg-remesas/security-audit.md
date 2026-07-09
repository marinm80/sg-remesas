# Security Audit: SG-Remesas

Date: 2026-07-09
Scope: local project review for portfolio readiness and future VPS deployment.

## Verdict

The project is suitable as a local MVP/portfolio codebase, but it is not production-ready for a public VPS until the hardening items below are resolved. The main risks are default secrets, default credentials, broad KYC access, missing rate limiting, and token handling.

## Critical Findings

1. JWT secrets are known/default.
   - Evidence: `backend/.env`, `backend/.env.example`, `backend/src/utils/crypto.ts`.
   - Risk: tokens can be forged if these values reach a reachable environment.
   - Fix: ignore real `.env` files, remove fallback JWT secrets, require strong secrets at startup, and rotate secrets before deploy.

2. Default admin credentials are documented and seeded.
   - Evidence: `README.md`, `backend/src/migrations/003_seed_data.sql`.
   - Risk: direct admin login if seed data is deployed unchanged.
   - Fix: use one-time generated admin credentials, force password rotation, and document demo credentials separately from production setup.

## High Findings

3. PostgreSQL is published to the host with a fixed password.
   - Evidence: `docker-compose.yml`.
   - Risk: database exposure if the VPS firewall or host network is misconfigured.
   - Fix: do not publish Postgres publicly in production; keep it on the Docker network or bind to localhost only, and use unique secrets per environment.

4. KYC document access is too broad for internal users.
   - Evidence: `backend/src/routes/kyc.routes.ts`, `backend/src/controllers/kyc.controller.ts`.
   - Risk: internal users without explicit KYC review permission can list/view sensitive identity documents.
   - Fix: require `clients.kyc_review` or a dedicated KYC permission for document list/view endpoints.

5. Public auth endpoints lack rate limiting.
   - Evidence: `backend/src/routes/auth.routes.ts`, `backend/package.json`.
   - Risk: brute force and password spraying against login/reset/register.
   - Fix: add rate limits by IP and account identifier, plus lockout/backoff for repeated failures.

## Medium Findings

6. OAuth callback sends access and refresh tokens in the URL, and the frontend stores them in `localStorage`.
   - Evidence: `backend/src/controllers/auth.controller.ts`, `frontend/src/pages/Login.tsx`, `frontend/src/store/useAuthStore.ts`.
   - Risk: tokens can leak through browser history, logs, referers, screenshots, or XSS.
   - Fix: use an HttpOnly Secure SameSite cookie or one-time authorization code exchange.

7. Transaction preview accepts arbitrary `clientId`.
   - Evidence: `backend/src/controllers/transaction.controller.ts`, `backend/src/services/transaction.service.ts`.
   - Risk: an authenticated client can infer another client's KYC level and monthly limit state if they know the UUID.
   - Fix: force `clientId = req.user.id` for client role and audit internal previews.

8. KYC uploads validate extension and MIME only.
   - Evidence: `backend/src/routes/kyc.routes.ts`.
   - Risk: malicious or polyglot files can be uploaded and later opened by staff.
   - Fix: validate magic bytes, serve as attachment, add `nosniff`, consider malware scanning and encryption at rest.

9. Missing defensive headers and CSP.
   - Evidence: `backend/src/index.ts`, `frontend/nginx.conf`.
   - Risk: increased impact of XSS, clickjacking, content sniffing, and CDN script compromise.
   - Fix: add Helmet/CSP in backend and security headers in Nginx.

## Positive Controls Observed

- Backend and frontend TypeScript checks pass.
- Backend dependencies audit reported no known production vulnerabilities.
- SQL access uses parameterized `pg` queries in reviewed repositories.
- Password hashing uses bcrypt with cost 12.
- JWT middleware checks `token_version` against the database for active-session invalidation.
- Transaction execution uses database transactions and account row locks.

## Verification Notes

- Backend typecheck: passed with `node_modules/.bin/tsc.CMD --noEmit`.
- Frontend typecheck: passed with `node_modules/.bin/tsc.CMD -b --noEmit`.
- Frontend lint: failed with 155 reported problems; mostly explicit `any`, unused imports, and React hook lint rules.
- Frontend dependency audit was not completed because it requires sending dependency metadata to npm.

## Next Quality Gate

Before VPS deployment, fix all Critical and High findings, then re-run:

```bash
cd backend
pnpm build
pnpm audit --prod

cd ../frontend
pnpm build
pnpm lint
pnpm audit --prod
```
