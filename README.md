# ClinicPilot — Complete Clinic Management & Patient Discovery Suite

ClinicPilot is an end-to-end, dual-portal healthcare operations platform designed for clinics, multi-doctor healthcare hubs, and patients. Built with a futuristic **"Clear Signal"** light theme design system.

---

## 🌟 Dual-Portal Architecture

### 1. 🏥 Receptionist & Clinic Staff Operations Portal
- **Today's Operational Command (`/today`)**: Real-time appointment timeline, check-in flows, doctor availability toggles, delay push alerts, and walk-in queue management.
- **Multi-Doctor Calendar (`/calendar`)**: Grid and list views across multiple doctors, drag/tap booking, and conflict detection.
- **WhatsApp Inbox (`/inbox`)**: Real-time WhatsApp chat simulator, human-in-the-loop AI bot handoff, bilingual quick replies (English & Hinglish), and patient detail sheets.
- **Patient Directory (`/patients`)**: Medical history, privacy-first masked phone numbers with tap-to-reveal, and notes.
- **Follow-ups Tracker (`/followups`)**: Post-consultation automated follow-up cadences with 1-click WhatsApp messaging.
- **Billing & Payments (`/billing`)**: Invoicing, payment collection (UPI, Card, Cash), and receipt generation.
- **Analytics & Reports (`/reports`)**: Revenue charts, patient volume, no-show rates, and doctor performance.
- **Clinic Administration (`/admin`)**: Doctor schedules, consultation fees, services, and staff profiles.
- **PWA & Offline Resilience**: Service worker support, offline mutations queue with auto-sync, and low-connectivity indicators.

### 2. 🩺 Patient Doctor Discovery & Online Booking Portal (`/patient`)
- **Doctor Discovery**: Search and browse across 6 major Indian cities (Bengaluru, Mumbai, Delhi NCR, Hyderabad, Pune, Chennai) and multiple medical specialties (Dentistry, Dermatology, Cardiology, Pediatrics, Orthopedics, General Medicine).
- **Interactive Symptoms Strip**: Quick filtering by common symptoms (Toothache, Skin Rash, Chest Pain, Fever, Knee Pain, etc.).
- **Smart 3-Step Booking Flow**:
  - Step 1: Real-time date & time slot selection with consultation type (Clinic Visit vs Video Consultation).
  - Step 2: Patient details, symptom description, and previous medical record / prescription upload.
  - Step 3: Instant confirmed digital booking pass with unique booking code and token number.
- **Live Queue & Token Tracker**: Real-time queue badge showing current token being served (*"Now Serving #3"*), personal token (*"Your Token #6"*), estimated wait time, and alert pulse (*"Your Turn Now!"*).
- **Interactive WhatsApp Phone Simulator**: Realistic smartphone mockup simulating the clinic's verified WhatsApp assistant with instant interactive bot replies for queue checks, clinic directions, and emergency support.
- **Digital Prescriptions (Rx) & Lab PDF Downloader**: Printable digital Rx slip with clinic letterhead, doctor credentials, tabulated medicine dosages, advice, and 1-click native PDF print/save.

---

## 🎨 Design System: "Clear Signal" (Futuristic Light)

- **Surfaces**:
  - Frost (`#F5F8FB`): Glare-free app background canvas.
  - Pane (`#FFFFFF`): Main cards, dialogs, and appointment rows.
  - Mist (`#E9EFF5`): Inset rails, secondary chips, and input fills.
  - Glass (`rgba(255, 255, 255, 0.85)` + `backdrop-blur-md`): Translucent top header and bottom tabs.
- **Ink & Typography**:
  - Deep Ink (`#0D1B2A`): Primary text (14.6:1 AAA contrast on Frost).
  - Slate Ink (`#4A5B6D`): Secondary text (4.9:1 AA contrast).
  - Display & Tabular Numerals: **Sora** (geometric, crisp, tabular figures).
  - Body & UI: **Figtree** (high legibility on mobile).
- **Signals & Status (Accessible Pairings)**:
  - Signal Cobalt (`#1F6FEB`): Primary actions, active navigation, and live time rail marker.
  - Mint (`#14B87A`): Confirmed & Arrived (`CheckCircle2`).
  - Amber (`#F2A31B`): Booked & In-Queue (`Clock`).
  - Coral (`#E5484D`): Cancelled & No-Show (`UserX`).

> **Zero Color-Alone Rule**: Every status badge couples color with an accessible icon and text label.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+
- npm or yarn

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to access the Portal Selector, or go directly to:
- **Patient Portal**: [http://localhost:3000/patient](http://localhost:3000/patient)
- **Receptionist Dashboard**: [http://localhost:3000/today](http://localhost:3000/today)

### 4. Run Test Suite
```bash
npm test
```
Runs 15 test suites and 43 unit tests via Vitest & React Testing Library.

### 5. Production Build
```bash
npm run build
npm start
```

---

## 🛠️ Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (Strict mode)
- **Styling**: Tailwind CSS with custom Design Tokens & Lucide Icons
- **State & Mock Server**: In-memory server-store with persistent simulation & MSW handlers
- **Testing**: Vitest, React Testing Library, Playwright, axe-core

---

## 🔒 Security & Credential Governance

### Permanent Credential Policy
> **Permanent Rule**: Never place a real credential in code, tests, fixtures, default fallbacks, comments or commit messages; real values live only in environment variables, and any code reading them must fail clearly when missing.

1. **Environment-Only Secrets**: All live secrets, API tokens (e.g. `FAST2SMS_API_KEY`, `UPSTASH_REDIS_REST_TOKEN`), and session signing keys (`SESSION_SECRET`) reside exclusively in environment variables or `.env.local` (which is strictly `.gitignore`d).
2. **Fail-Closed Missing Credentials**: Any function or route handler attempting to access a missing production credential must fail immediately with a descriptive error. Code must never silently fall back to insecure default strings or hardcoded mock keys.
3. **Automated Gitleaks Enforcement**: Pre-commit hooks (`.githooks/pre-commit`) and CI pipelines scan all staged changes and git commits to block credentials prior to merge.

---

## 📊 Performance, Accessibility & Audits

- **Lighthouse & Accessibility (axe-core)**: Continuous integration audits run on production builds across both unauthenticated public routes and authenticated staff sessions.

> [!NOTE]
> **Post-Persistence Verification**: Re-measure Lighthouse with realistic data after persistence. As database persistence layers replace mock in-memory stores, re-run `node scripts/run-lh.js` to verify that real database queries and latency profiles keep mobile performance and time-to-interactive within the $\ge 0.90$ budget.
