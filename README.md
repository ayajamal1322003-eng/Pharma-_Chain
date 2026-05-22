# PharmaChain — Pharmaceutical QR Tracking System

A full-stack pharmaceutical supply-chain tracking platform where **every QR Code lifecycle event is permanently recorded as an immutable block on a real blockchain ledger**.  Every action — from drug registration to a patient's final scan — is mined with Proof-of-Work, Merkle-root-validated, and stored in the database.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [QR Lifecycle & Ledger Workflow](#qr-lifecycle--ledger-workflow)
3. [Blockchain Implementation](#blockchain-implementation)
4. [Admin Dashboard](#admin-dashboard)
5. [API Documentation](#api-documentation)
6. [Setup & Run Instructions](#setup--run-instructions)
7. [Database Schema](#database-schema)
8. [Security Features](#security-features)
9. [Deployment](#deployment)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Vanilla JS)                 │
│  dashboard · blockchain · ledger · verify · transfer    │
│  qr-control · audit · add-drug · attack-demo            │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP / JWT
┌──────────────────────▼──────────────────────────────────┐
│              ASP.NET Core 6 Web API                      │
│                                                          │
│  AuthController     → JWT login / register               │
│  DrugsController    → drug CRUD + DRUG_REGISTERED block  │
│  QRController       → QR generate (QR_GENERATED block)   │
│                       QR verify  (CUSTOMER_SCAN block)   │
│  TransactionController → transfers + search + stats      │
│  VerifyController   → public drug info + history         │
│  AuditController    → tamper-evident audit log           │
│                                                          │
│  ┌──────────────────────────────────────┐               │
│  │          BlockchainService           │               │
│  │  Proof-of-Work mining (difficulty 2) │               │
│  │  SHA-256 hash chaining               │               │
│  │  Merkle Root (8-leaf binary tree)    │               │
│  │  JSON backup persistence             │               │
│  └──────────────────────────────────────┘               │
└──────────────────────┬──────────────────────────────────┘
                       │ EF Core
┌──────────────────────▼──────────────────────────────────┐
│         Database  (SQL Server / SQLite)                  │
│  Drugs  Users  DrugTransactions  AuditLogs               │
│  QrScanLogs  QrQuotas  QrIssuances                       │
└─────────────────────────────────────────────────────────┘
```

**Tech stack:** ASP.NET Core 6 · Entity Framework Core · JWT Bearer Auth · BCrypt · HMAC-SHA256 · QRCoder · Anthropic Claude API (AI token fallback to SHA-256+GUID)

---

## QR Lifecycle & Ledger Workflow

Every stage below writes a **real mined block** to `DrugTransactions` with `ActionType` set accordingly.

```
Stage 1 — DRUG_REGISTERED
  POST /api/drugs
  Actor: Factory / Admin
  Block: FromRole=SYSTEM → ToRole=Factory
  Meaning: Drug enters the supply chain; immutable fingerprint created.

Stage 2 — QR_GENERATED
  GET /api/qr/{drugId}?token=...
  Actor: Factory / Distributor / Pharmacy
  Block: FromRole=<issuer role> → ToRole=Customer
  Linked to: QrIssuances.Id (QrIssuanceId FK)
  Meaning: A signed QR code is issued; recorded on ledger before image is returned.

Stage 3 — TRANSFER  (repeatable, ordered)
  POST /api/transaction/transfer
  Allowed paths: Factory → Distributor → Pharmacy → Customer
  Block: FromRole → ToRole with Proof-of-Work
  Meaning: Physical custody of the drug changes hands.

Stage 4 — CUSTOMER_SCAN
  GET /api/qr/verify-signature?id=&prod=&ts=&sig=
  Actor: End consumer (unauthenticated)
  Block: FromRole=Customer → ToRole=Customer
  Only written on VALID scans — failed/attack scans are logged to QrScanLogs only.
  Meaning: Drug is verified as authentic at point of consumption.
```

**Block linkage diagram:**

```
DRUG_REGISTERED → QR_GENERATED → [TRANSFER x N] → CUSTOMER_SCAN
     Block 1           Block 2        Block 3…N        Block N+1
  PrevHash=0000  PrevHash=B1Hash  PrevHash=…       PrevHash=BN-1Hash
```

---

## Blockchain Implementation

### Proof of Work
- Difficulty: 2 (block hash must start with `00`)
- Hash input: `BlockNumber | DrugId | FromRole | ToRole | Timestamp | PreviousHash | Nonce`
- Hash function: SHA-256, truncated to 16 hex characters
- Average ~256 nonce iterations per block

### Merkle Root
Binary tree over 8 leaves:
```
DrugId · DrugName · FromRole · FromUsername · ToRole · ToUsername · Timestamp · Status
```
Root truncated to 16 hex characters and stored per block for data-integrity verification.

### Chain Verification (`GET /api/transaction/verify-chain`)
Three checks on every block in sequence:
1. **Proof of Work** — hash prefix matches difficulty
2. **Hash Continuity** — `block.PreviousHash == prev.BlockHash`
3. **Merkle Root** — recomputed and compared to stored value

### JSON Backup
Full chain serialised to `blockchain_chain.json` after every new block, enabling demo restore.

---

## Admin Dashboard

| Page | URL | Access |
|---|---|---|
| Dashboard | `/dashboard.html` | All roles |
| Blockchain chain view | `/blockchain.html` | All roles |
| **Full Ledger** | `/ledger.html` | Admin, LedgerAdmin |
| QR Control | `/qr-control.html` | All roles |
| Audit Log | `/audit.html` | Admin |
| Drug info | `/drug-info.html` | All roles |
| Transfer | `/transfer.html` | Factory, Distributor, Pharmacy |

### Ledger page features
- Stats chips: total blocks, count per ActionType
- Filter by ActionType (DRUG_REGISTERED / QR_GENERATED / TRANSFER / CUSTOMER_SCAN)
- Local search: drug name, drug ID, block hash, username
- Expandable row showing: previous hash, block hash, Merkle root, nonce, QrIssuanceId, ISO timestamp
- All data sourced from `GET /api/transaction/search` — no mock data

### Dashboard activity feed
Admins see the 10 most recent blockchain events with action badge, drug name, block hash, and timestamp sourced from `GET /api/transaction/stats`.

---

## API Documentation

All endpoints require `Authorization: Bearer <JWT>` unless noted.

### Authentication

| Method | Endpoint | Body | Response |
|---|---|---|---|
| POST | `/api/auth/register` | `{username, password, role}` | `{token, username, role}` |
| POST | `/api/auth/login` | `{username, password}` | `{token, username, role}` |

Roles: `Factory` · `Distributor` · `Pharmacy` · `Admin` · `LedgerAdmin`

### Drugs

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/drugs` | Required | List all drugs with tamper detection |
| POST | `/api/drugs` | Factory/Admin | Add drug; auto-generates AI token, checksum, **DRUG_REGISTERED block** |
| DELETE | `/api/drugs/{id}` | Admin | Delete drug |

### QR Codes

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/qr/{drugId}?token=` | Query JWT | Generate QR PNG; writes **QR_GENERATED block** |
| GET | `/api/qr/verify-signature?id=&prod=&ts=&sig=` | None | Verify QR; writes **CUSTOMER_SCAN block** on success |
| GET | `/api/qr/quota` | Required | Current user quota status |
| GET | `/api/qr/quota/all` | Admin | All quotas summary |
| POST | `/api/qr/quota/set` | Admin | `{role, username?, limit, periodType}` |
| GET | `/api/qr/issuances?status=&role=&limit=` | Admin | Issuance history |
| GET | `/api/qr/scan-logs?attackType=&limit=` | Admin | Scan logs with attack stats |

### Blockchain / Ledger

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/transaction/transfer` | Required | Transfer drug; writes **TRANSFER block** |
| GET | `/api/transaction/history/{drugId}` | Required | All lifecycle events for one drug |
| GET | `/api/transaction/chain` | Required | Full blockchain (all blocks, all action types) |
| GET | `/api/transaction/search?actionType=&drugId=&drugName=&fromDate=&toDate=&status=&limit=` | Admin/LedgerAdmin | Filtered search |
| GET | `/api/transaction/stats` | Required | Total blocks, counts by ActionType, 10 recent blocks |
| GET | `/api/transaction/verify-chain` | Required | Validate PoW + hash chain + Merkle roots |
| GET | `/api/transaction/nodes` | Required | Peer node list |
| POST | `/api/transaction/receive-block` | None | Accept block from peer node |
| POST | `/api/transaction/demo-tamper/{blockId}` | Admin | Simulate chain tampering |
| POST | `/api/transaction/demo-restore` | Admin | Restore from JSON backup |

### Verify (Public)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/verify/{drugId}` | None | Public drug info + full tracking history |

### Audit

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/audit` | Admin | All audit log entries |

---

## Setup & Run Instructions

### Prerequisites
- .NET 6 SDK
- SQL Server LocalDB (Windows) **or** SQLite (any platform)

### Local Development

```bash
# 1. Clone the repository
git clone https://github.com/<your-org>/PharmaChain.git
cd PharmaChain

# 2. Configure the JWT key and connection string
#    Edit appsettings.json:
#    "Jwt": { "Key": "YourSecretKeyHere_AtLeast32Chars" }
#    "ConnectionStrings": { "DefaultConnection": "Server=(localdb)\\..." }

# 3. Run (database is auto-created via EnsureCreated on first start)
dotnet run

# 4. Open browser
#    http://localhost:7036/login.html   ← web app
#    http://localhost:7036/swagger      ← API docs (dev mode)
```

### SQLite (cross-platform / Railway)

```json
// appsettings.Production.json
{
  "DatabaseProvider": "Sqlite",
  "ConnectionStrings": {
    "DefaultConnection": "Data Source=/app/pharmachain.db"
  }
}
```

### Environment Variables (Railway / Docker)

| Variable | Description |
|---|---|
| `PORT` | HTTP port (default 7036) |
| `ASPNETCORE_ENVIRONMENT` | `Production` |
| `ConnectionStrings__DefaultConnection` | Database connection string |
| `Jwt__Key` | JWT signing key (min 32 chars) |
| `Anthropic__ApiKey` | Claude API key (optional; falls back to crypto token) |

### First-time Admin Setup

```
POST /api/auth/register
{ "username": "admin", "password": "Admin123!", "role": "Admin" }
```

---

## Database Schema

### DrugTransactions (Blockchain Ledger)

| Column | Type | Description |
|---|---|---|
| Id | int PK | Auto-increment |
| BlockNumber | int | Sequential block position in chain |
| DrugId | int | FK → Drugs |
| DrugName | nvarchar | Denormalised for chain integrity |
| FromRole | nvarchar | Sender role |
| FromUsername | nvarchar | Sender username / IP |
| ToRole | nvarchar | Recipient role |
| ToUsername | nvarchar | Recipient username / IP |
| Status | nvarchar | Registered / Issued / Transferred / Verified / Blocked |
| **ActionType** | nvarchar | DRUG_REGISTERED / QR_GENERATED / TRANSFER / CUSTOMER_SCAN |
| **QrIssuanceId** | int? | FK → QrIssuances (for QR_GENERATED blocks) |
| Timestamp | datetime2 | UTC |
| BlockHash | nvarchar(16) | PoW hash (starts with `00`) |
| PreviousHash | nvarchar(16) | Previous block's hash |
| Nonce | int | Mining nonce |
| MerkleRoot | nvarchar(16) | 8-leaf Merkle root |

---

## Security Features

| Feature | Implementation |
|---|---|
| Password hashing | BCrypt (cost factor 12) |
| API authentication | JWT Bearer (8-hour expiry) |
| QR signature | HMAC-SHA256 of `drugId\|date\|timestamp\|aiToken` |
| AI token | Claude `claude-haiku-4-5` or SHA-256+GUID fallback |
| Drug checksum | SHA-256 of all drug fields — detects DB tampering |
| Blockchain integrity | PoW + hash chain + Merkle root — three independent checks |
| Brute force protection | 5 failed logins → 5-minute lockout |
| Burst detection | >10 QR codes in 60 s from one user → Suspicious flag |
| QR quota | Monthly/yearly per-role limits enforced server-side |
| Attack types detected | SIGNATURE_MISMATCH · DATE_MISMATCH · DRUG_NOT_FOUND · QR_EXPIRED · QUOTA_EXCEEDED · MISSING_PARAMS |
| XSS prevention | `HtmlEncode` on all user string inputs |
| Constant-time comparison | `CryptographicEquals` for HMAC check |

---

## Deployment

The project ships with a `Dockerfile` and is preconfigured for **Railway**:

```bash
# Railway auto-detects Dockerfile and sets PORT env var
railway up
```

The production profile (`appsettings.Production.json`) switches to SQLite automatically.  All DB schema patches are applied at startup — no manual migrations required.
