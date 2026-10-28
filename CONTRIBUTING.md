# Contributing to ClinicPilot

Thank you for contributing to ClinicPilot. To ensure security, multi-tenant isolation, and regulatory compliance, all contributors must strictly adhere to our development and credential policies.

---

## 🔒 Security & Credential Governance

### Permanent Rule
> **Mandatory Policy**: Never place a real credential in code, tests, fixtures, default fallbacks, comments or commit messages; real values live only in environment variables, and any code reading them must fail clearly when missing.

### Rules of Engagement
1. **Zero Real Credentials in Code**:
   - Under no circumstances should real API keys (SMS gateways, Fast2SMS, Twilio, Redis/Upstash, AWS, Google Cloud, Stripe) or cryptographic secrets be committed.
   - Do not commit secrets in test fixtures, mock handlers, default parameter fallbacks, or comments.
2. **Environment Variable Enforcement**:
   - Secrets must be loaded exclusively via `process.env`.
   - Any service or helper requiring credentials must fail closed (throw or return a 500/503) if the expected environment variable is absent.
   - Default fallback strings (e.g. `secret || "fallback-secret"`) are strictly forbidden.
3. **Local Development Configuration**:
   - Copy `.env.example` to `.env.local` for local secrets.
   - `.env.local` and all `.env*.local` patterns are strictly ignored by `.gitignore`. Never use `--force` to add env files to git.
4. **Pre-Commit and CI Verification**:
   - A pre-commit hook runs `gitleaks protect --staged` automatically on every commit.
   - Continuous Integration runs `gitleaks detect` across all commits. Commits containing detected credentials will fail the build.

---

## 🧪 Testing & Code Quality
- Ensure all tests pass before opening a PR: `npm test`.
- Ensure TypeScript compiles cleanly: `npx tsc --noEmit`.
- Run automated accessibility and security checks: `npx playwright test`.
- All routes must meet Lighthouse performance ($\ge 0.90$, calendar $\ge 0.85$), accessibility ($\ge 0.95$), and best practices ($\ge 0.95$) budgets.
