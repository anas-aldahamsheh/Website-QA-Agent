<div align="center">

# 🔎 Website QA Agent

### Automated Website Quality Console — English / العربية

Run controlled scans of any website, follow their progress live, and review organized findings across **SEO, accessibility, performance, frontend, network / API, security and privacy** — with evidence, suggested fixes, severity levels and issue triage.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Playwright](https://img.shields.io/badge/Scanner-Playwright-2EAD33?logo=playwright&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-SQLite-2D3748?logo=prisma&logoColor=white)
![Turborepo](https://img.shields.io/badge/Monorepo-Turborepo_+_pnpm-EF4444?logo=turborepo&logoColor=white)

**Engineered by Anas Aldahamsheh — تطوير: أنس الدحامشة**

</div>

---

## 📖 Overview

Website QA Agent is a full **Turborepo monorepo**:

- a **Next.js dashboard** (the *Run Center*) to configure scans, watch live progress and triage results, and
- a **Playwright-powered worker** that crawls the target site in a real Chromium browser and records issues, metrics, logs and screenshot evidence.

Scans can run locally with a simple polling worker, or through a **BullMQ + Redis** queue with an optional scheduler for resilient, distributed execution.

---

## ✨ Features

### 🚀 Run Center
- Scan launcher with configurable **crawl depth, page limits, network request limits, retries and scan mode**
- Choose which checks to run
- **Live progress** without refreshing the page, plus a **Stop** button to cancel active scans
- Saved scan profiles and a recent-work panel

### 📊 Results Workspace
- Filters by **issue category, page, severity and status**
- Issue evidence, **suggested fixes** and triage status updates
- Run logs, navigation steps, metrics, recent events and an audit trail

### 🎨 Experience
- **English / Arabic** interface switching
- **Light / dark** modes
- Responsive layout for desktop and smaller screens

---

## 🧪 What the Scanner Checks

| Area | Checks |
|---|---|
| **Discovery & crawl** | Page discovery, recursive internal links, broken links, crawl depth & page limits, blocked / skipped / failed / queued URLs, downloads and non-HTML resources |
| **SEO** | Title quality, meta description, heading structure, canonical conflicts, crawlable links, indexability status codes, structured data / JSON-LD validity |
| **Accessibility** | Accessibility signals, screen-reader friendly structure, heading & content structure, mobile usability |
| **Performance** | Navigation duration, **LCP**, **CLS**, **TBT**, resource count, transfer size, large resources |
| **Frontend & UX** | Visual layout signals, duplicate element IDs, missing viewport meta, runtime page state, navigation signals |
| **Network & API** | Failed resources, HTTP 4xx / 5xx, duplicate requests, API endpoint discovery, failure classification |
| **Security & privacy** | Passive security headers / content checks, cookies & consent banners, tracking signals, **SSRF target validation**, safe external-link policy |

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Dashboard | [Next.js 15](https://nextjs.org/) (App Router), React 19, TypeScript, Tailwind CSS |
| Scanner | [Playwright](https://playwright.dev/) (Chromium) |
| Database | [Prisma](https://www.prisma.io/) + SQLite |
| Queue (optional) | [BullMQ](https://docs.bullmq.io/) + Redis |
| Validation | [Zod](https://zod.dev/) |
| Monorepo | [Turborepo](https://turbo.build/) + [pnpm](https://pnpm.io/) workspaces |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js 20+** (Node 22 LTS recommended — see [`.nvmrc`](.nvmrc))
- **pnpm 11.9+** — `corepack enable` or `npm install -g pnpm`
- **Redis** *(optional)* — only for the BullMQ queue mode

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/anas-aldahamsheh/Website-QA-Agent.git
cd Website-QA-Agent

# 2. Install dependencies
pnpm install

# 3. Install the Chromium browser used by the scanner
pnpm --filter worker exec playwright install chromium

# 4. Create your environment file
cp .env.example .env            # on Windows (PowerShell): copy .env.example .env

# 5. Prepare the database (SQLite)
pnpm run db:generate
pnpm run db:migrate
```

### Run

```bash
# Dashboard
pnpm --filter web dev

# Scan worker (in another terminal) — required for scans to execute
pnpm --filter worker dev
```

Open **[http://localhost:3000](http://localhost:3000)** to reach the Run Center.

**Queue mode (optional):** start Redis with `docker compose up -d redis`, set `REDIS_URL=redis://localhost:6380` in `.env`, and optionally run the scheduler with `pnpm --filter scheduler dev`. Without `REDIS_URL`, the worker simply polls the database for queued runs.

### Environment Variables

All variables are documented in [`.env.example`](.env.example). The most important ones:

| Variable | Description |
|---|---|
| `DATABASE_URL` | SQLite database (default `file:./dev.db`, relative to the Prisma schema) |
| `REDIS_URL` | Optional — enables BullMQ queue mode |
| `ENCRYPTION_MASTER_KEY` | Random value (32+ bytes) used to encrypt stored credentials |
| `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` | Authentication settings |
| `APP_BASIC_AUTH_USER` / `APP_BASIC_AUTH_PASSWORD` | **Required in production** — protects the dashboard with HTTP Basic Auth (serve it over HTTPS) |

> ⚠️ Never commit your real `.env` file. It is already excluded by `.gitignore`.

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `pnpm run dev` | Run every app in development mode (Turborepo) |
| `pnpm --filter web dev` | Dashboard only |
| `pnpm --filter worker dev` | Scan worker only |
| `pnpm run build` | Build all apps and packages |
| `pnpm run lint` | Lint |
| `pnpm run typecheck` | Type-check every workspace |
| `pnpm run test:unit` | Scanner unit tests |
| `pnpm run db:generate` | Generate the Prisma client |
| `pnpm run db:migrate` | Apply database migrations |

---

## 🏗️ Project Structure

```txt
apps/
├── web/               # Next.js dashboard: Run Center, live progress, results workspace
├── worker/            # Playwright scan runner (local polling or BullMQ consumer)
└── scheduler/         # Optional: re-enqueues queued runs in Redis mode
packages/
├── test-engine/       # Crawl & audit checks (SEO, a11y, performance, network, security…)
├── database/          # Prisma schema, migrations and client (SQLite)
├── queue/             # BullMQ queues and Redis connection
├── contracts/         # Shared Zod schemas: check IDs, scan modes, scope config
├── security/          # Env validation, SSRF-safe URL validation, encryption helpers
├── auth/              # Authentication (Better Auth)
├── storage/           # Evidence storage helpers
├── logger/            # Structured logging
├── projects/          # Project helpers
├── eslint-config/     # Shared ESLint config
└── tsconfig/          # Shared TypeScript configs
```

---

## 🛡️ Usage Notes

1. Open the Run Center, enter the target URL, choose the scan mode, limits and checks, then start the scan.
2. Watch live progress; use **Stop** to cancel an active scan.
3. Open **Results** to filter, review evidence and triage findings.

- Only scan websites you own or have permission to test.
- URL and DNS checks reduce SSRF risk, but DNS can change between validation and connection — run the worker on isolated, trusted infrastructure for untrusted targets.
- Screenshot evidence is stored on the worker's local filesystem; back it up if evidence retention matters.
- The crawler currently visits HTML pages sequentially at a `1440×900` viewport.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

## 👨‍💻 Author

**Anas Aldahamsheh — أنس الدحامشة**

- 📞 Phone: `+962 789 495 167`
- 💼 LinkedIn: [linkedin.com/in/anas-aldahamsheh](https://www.linkedin.com/in/anas-aldahamsheh)
- 🐙 GitHub: [github.com/anas-aldahamsheh](https://github.com/anas-aldahamsheh)

---

<div align="center">

⭐ If you find this project useful, consider giving it a star!

</div>
