# 🩸 Apex Hospital Blood Donation Management & Automated 3-Month Reminder System

A full-stack medical college hospital web application engineered to manage donor registries, enforce mandatory **3-month health-safety gaps** between donations, and automate donor recall reminders across **WhatsApp Business API** and **Nodemailer Email** (standby by default).

Designed with a high-contrast **Neon Cyber-Medical** visual theme with large touch targets and intuitive workflows accessible for medical staff aged 20 to 80 on desktop and mobile tablets.

---

## 🏗️ System Architecture & Workflow

```
                         ┌─────────────────────────────────────────────────────────┐
                         │   Phase 1: Initial Excel Migration (One-Time Setup)     │
                         │   - Bulk .xlsx / .csv parse with fuzzy column matching  │
                         │   - Strict row validation & detailed rejection reports  │
                         └────────────────────────────┬────────────────────────────┘
                                                      │
                                                      ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                   PostgreSQL Database (Self-Hosted On-Premise)                   │
│   - Donors Master (Phone, Email, Blood Group, Last Donation, Next Eligible)      │
│   - Donation History Events Timeline                                             │
│   - Notification Dispatch Logs                                                   │
│   - System & Security Audit Logs                                                 │
└─────────────────────────────▲───────────────────────────────▲────────────────────┘
                              │                               │
                              │                               │
┌─────────────────────────────┴─────────────┐   ┌─────────────┴────────────────────┐
│  Phase 2: Live Camp Entry (Ongoing Mode)  │   │ Daily Cron Background Scheduler  │
│  - Real-time 10-digit phone lookup        │   │ - Scans next_eligible_date <= today│
│  - Instant duplicate profile auto-suggest │   │ - Dispatches WhatsApp & Email    │
│  - Prominent 3-Month Safety BLOCK Banner  │   │ - Respects Email Standby Toggle  │
└───────────────────────────────────────────┘   └──────────────────────────────────┘
```

---

## 🚀 Tech Stack

| Layer | Technology | Key Capabilities |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite, Lucide Icons | Responsive neon UI, 48px+ touch targets, instant inline validation, tablet optimized |
| **Backend** | Node.js, Express.js | Parameterized queries, Helmet, CORS, Rate-Limiting, Multer, xlsx |
| **Database** | PostgreSQL (Self-Hosted) | Schema migration script, triggers, relational integrity (with SQLite fallback for local test) |
| **Authentication** | JWT + TOTP 2FA | Short-lived access tokens, refresh token rotation, Google Authenticator / Authy compatible |
| **WhatsApp** | Abstracted `NotificationService` | Swappable provider interface (Mock, Meta Cloud API, Twilio, Gupshup) |
| **Email** | Nodemailer | Templated HTML reminders; **Standby / disabled by default** until IT activates SMTP |
| **Scheduler** | `node-cron` | Daily 08:00 AM automated scan for donors crossing the 3-month mark |

---

## 📂 Project Structure

```
hospital-blood-bank/
├── backend/
│   ├── src/
│   │   ├── config/            # Env configuration & loader
│   │   ├── controllers/       # Auth, Donors, Excel, Notifications, Dashboard, Settings, Audit
│   │   ├── db/                # Unified DB layer (PostgreSQL + SQLite fallback) & Seed script
│   │   ├── middleware/        # JWT verify, RBAC, Rate-Limiters (login, file ops), Audit logger
│   │   ├── routes/            # Express API route declarations
│   │   ├── services/          # AuthService (2FA), DonorService, ExcelService, NotificationService, SchedulerService
│   │   ├── app.js             # Express app setup with Helmet & CORS
│   │   └── server.js          # Entry point & graceful shutdown
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/        # Navbar, Dashboard, LiveCampEntry, ExcelMigration, DonorsDirectory, Notifications, Settings, SecurityAudit, DonorDetailsModal
│   │   ├── context/           # AuthContext (JWT + 2FA Session state)
│   │   ├── services/          # API fetch client
│   │   ├── index.css          # Neon cyber-medical design system & high-contrast tokens
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   └── package.json
│
├── database/
│   ├── schema.sql             # PostgreSQL production DDL schema
│   ├── sample_donors_valid.csv
│   └── sample_donors_mixed_with_errors.csv
└── README.md
```

---

## ⚡ Self-Hosting Installation & Quickstart

### Prerequisites
- **Node.js**: v18.0+ or v20.0+
- **PostgreSQL Server**: v13+ (or use the built-in SQLite auto-fallback for zero-setup evaluation)

---

### Step 1: Database Setup (PostgreSQL)
Create the database on your self-hosted server:
```bash
# In PostgreSQL CLI (psql):
CREATE DATABASE hospital_blood_bank;
```

Apply the SQL schema:
```bash
psql -U postgres -d hospital_blood_bank -f database/schema.sql
```

---

### Step 2: Backend Setup
```bash
cd backend
npm install

# Copy environment template
cp .env.example .env

# Run database seeder (seeds default admin, staff, and sample donors)
npm run seed

# Start the server
npm run dev
# Server will listen on http://localhost:5000
```

#### Default Seed Credentials:
- **Chief Medical Officer (Admin):** `admin@hospital.med` / `admin123`
- **Camp Coordinator (Staff):** `nurse.mary@hospital.med` / `Nurse@Hospital2026!`
- *(Demo TOTP key is pre-seeded; also supports QR code enrollment on new accounts)*

---

### Step 3: Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
# Frontend will be live on http://localhost:5173
```

---

## 🛡️ Penetration Testing (Pen-Test) Verification Checklist

As specified in the requirements, this application is engineered with security-first defensive controls. A security penetration tester should verify the following 7 vulnerability vectors:

### 1. Authentication Bypass & Credential Stuffing
- **Test:** Submit brute-force login attempts against `/api/auth/login` and `/api/auth/verify-2fa-login`.
- **Defense Built In:** `loginLimiter` (`express-rate-limit`) strictly enforces a maximum of **5 attempts per 15 minutes** per IP address. Exceeded attempts receive HTTP `429 Too Many Requests`.
- **Password Security:** Passwords hashed with `bcryptjs` using a work factor of 10.
- **2FA Enforcement:** Standard session tokens cannot be issued without valid 6-digit TOTP verification from Google Authenticator / Authy.

### 2. SQL Injection (SQLi)
- **Test:** Inject SQL syntax payloads (e.g. `' OR '1'='1`, `1; DROP TABLE donors;--`) into search, donor fields, and query parameters.
- **Defense Built In:** **Zero dynamic SQL string concatenation**. 100% of queries use parameterized prepared statement placeholders (`$1, $2, ...`) across all database operations.

### 3. Cross-Site Scripting (XSS) & Content Injection
- **Test:** Input `<script>alert(1)</script>` or malicious SVG payloads into donor names, notes, and camp locations.
- **Defense Built In:** React JSX automatic context-aware escaping prevents DOM injection. `helmet.js` is active with strict `Content-Security-Policy (CSP)` and `X-Content-Type-Options: nosniff`.

### 4. Insecure Direct Object References (IDOR)
- **Test:** Attempt to mutate or query donor records via `/api/donors/:id` or system settings without authentication headers.
- **Defense Built In:** Centralized `verifyToken` middleware requires valid Bearer JWT. Administrative settings mutations (`/api/settings`, `/api/notifications/test-*`, `/api/audit/logs`) require `requireRole(['admin'])`.

### 5. Cross-Origin Resource Sharing (CORS) Policy
- **Test:** Initiate fetch requests from unauthorized origins (e.g., `http://malicious-site.com`).
- **Defense Built In:** Express CORS is explicitly locked to whitelisted hospital host origins defined in `FRONTEND_URL`.

### 6. JWT Replay & Session Lifespan
- **Test:** Intercept access tokens and attempt to reuse after expiry.
- **Defense Built In:** Short-lived access token expiry (**15 minutes**), signed separate refresh token rotation (**7 days**), and dedicated purpose-scoped tokens for 2FA enrollment.

### 7. Input Validation & File Upload Safety
- **Test:** Upload non-spreadsheet MIME types or oversized files (>10MB).
- **Defense Built In:** Multer memory storage with 10MB limit; row-level phone validation enforces strict 10 digits numeric only; email is validated via RFC compliant regex.

---

## ⚙️ Configuration & Operational Toggles

### Email Notification Standby Toggle
- Configured in `.env` (`EMAIL_ENABLED=false`) or via the **Admin Settings UI**.
- When `false`, all reminder templates render and log to `notification_logs` with status `standby_skipped`.
- When hospital IT provides active SMTP credentials, flipping the toggle immediately activates live email delivery.

### WhatsApp Provider Swapping
- The backend uses an abstracted `NotificationService` architecture.
- Change `WHATSAPP_PROVIDER=mock | meta_cloud | twilio | gupshup` in `.env` or the Admin Settings UI.

---

## 📜 License
Internal Medical College Hospital Blood Donation Management System.
