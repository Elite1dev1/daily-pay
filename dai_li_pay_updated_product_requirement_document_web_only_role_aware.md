# DaiLi Pay
## Product Requirement Document (PRD)
**Version:** v1.1 (Web‑Only, Role‑Aware)

---

## 1. Background

Informal workers in Nigeria save daily through agent‑based cash collections. These systems suffer from broken trust, fraud, poor record‑keeping, lack of transparency, and high risk of loss. Contributors often have no verifiable proof of deposits, while operators lack real‑time visibility and control over agents.

**DaiLi Pay** exists to create a **trust‑minimized, auditable, offline‑capable daily savings infrastructure** that mirrors real‑world cash collection behavior while enforcing strict digital accountability.

This version (v1.1) reflects a **web‑only, role‑aware system** built on a **single core API access channel**, with offline support via a Progressive Web App (PWA).

---

## 2. Product Goals

- Enforce institutional trust through non‑negotiable system rules
- Support offline‑first operations for agents (up to 72 hours)
- Prevent fraud and cash leakage via circuit breakers and reconciliation
- Provide verifiable proof of every transaction to contributors (SMS)
- Ensure auditability, compliance readiness, and investor readiness
- Maintain a single, scalable access channel across all roles

---

## 3. Non‑Goals (v1)

- No peer‑to‑peer transfers
- No interest or yield calculations
- No instant or self‑service withdrawals
- No direct bank integrations
- No pension or wallet interoperability
- No native mobile applications (web‑only)
- No contributor mobile/web app (SMS‑only)

---

## 4. Core Product Principles

- **API is the single source of truth**
- **All state‑changing actions go through the backend**
- **Frontend hides; backend enforces**
- **Ledger events are immutable**
- **Balances are derived, not directly edited**
- **Offline capability does not reduce system rules**

---

## 5. User Roles (RBAC)

### 5.1 Contributor
- Informal worker saving daily
- Passive participant

**Capabilities**
- Receive SMS confirmations for deposits
- Receive OTP for withdrawals
- View balance via SMS

**Restrictions**
- Cannot initiate deposits or withdrawals
- Cannot edit or reverse transactions

---

### 5.2 Agent
- Field collector handling cash and QR scanning
- Primary offline actor

**Capabilities**
- Onboard contributors (QR binding)
- Collect deposits (offline‑first)
- Initiate withdrawal requests

**Restrictions**
- Cannot approve withdrawals
- Cannot bypass circuit breaker
- Cannot edit synced transactions
- Cannot self‑reconcile

---

### 5.3 Operations Admin
- Back‑office operator

**Capabilities**
- Approve or reject withdrawals
- Reconcile agent ledgers
- Monitor agents and transactions
- View audit logs

**Restrictions**
- Cannot change system rules
- Cannot silently edit transactions

---

### 5.4 Super Admin
- System owner / platform authority

**Capabilities**
- Reverse transactions (with reason codes)
- Perform exceptional overrides
- Configure system‑level settings
- Full audit visibility

**Restrictions**
- All actions are logged and auditable

---

## 6. Access Channel Architecture

### 6.1 Core Access Channel

- **Single secure API** (REST)
- JWT‑based authentication
- Role embedded in token
- RBAC middleware on every protected endpoint

> The API is the only component allowed to change system state.

---

### 6.2 Client Architecture (Web‑Only)

- **Single Web Application**
- Role‑aware routing and UI shells
- Progressive Web App (PWA)

Routes:
- `/agent/*`
- `/admin/*`
- `/super-admin/*`

Contributors do not log in via web (SMS‑only).

---

## 7. Core System Logic (Immutable Rules)

### 7.1 Scanner‑Gate Rule
- Deposit screen inaccessible until a valid physical QR card is scanned

### 7.2 ₦10,000 Circuit Breaker
- Agent unreconciled balance capped at ₦10,000
- Hitting the limit locks deposit functionality

### 7.3 Data Immutability
- Synced ledger events cannot be edited
- Corrections require reversal + re‑entry + admin approval

### 7.4 Two‑Factor Withdrawals
- All withdrawals require contributor OTP
- OTP validation precedes admin approval

---

## 8. Functional Modules

### 8.1 Contributor Onboarding (Physical–Digital Binding)

**Inputs**
- Full name
- Phone number
- Address
- ID photograph

**Binding Logic**
- Agent scans new physical QR card
- System binds QR hash to contributor profile

**System Trigger**
- Automated SMS: “Welcome to DaiLi Pay. Your account is active. Always demand an SMS for every deposit.”

---

### 8.2 Deposit Engine (Offline‑First)

**Flow**
- Scan QR → Enter amount → Save locally → Sync

**Business Logic**
- GPS tagging required
- Contributor balance derived from ledger
- Agent unreconciled balance incremented

**Confirmation**
- On successful sync, SMS sent with:
  - Amount
  - Total balance
  - Reference ID

---

### 8.3 Withdrawal Queue (Risk‑Controlled)

**State Machine**
- REQUESTED → OTP_VERIFIED → PENDING_ADMIN → APPROVED → EXECUTED

**Process**
1. Agent initiates withdrawal
2. Contributor receives OTP
3. Agent submits OTP
4. Admin reviews and approves
5. Ledger debited immutably

---

### 8.4 Reconciliation & Ledger Unlock

**Triggers**
- ₦10,000 circuit breaker reached
- End‑of‑day reconciliation

**Process**
- Agent presents cash/teller
- Admin validates amount
- Admin clears ledger

**System Actions**
- Agent unreconciled balance reset to ₦0
- Deposit functionality unlocked
- Agent notified

---

## 9. Offline & PWA Requirements (Agent)

- Offline operation up to 72 hours
- IndexedDB for local transaction storage
- Service Workers for caching & sync
- Background sync retry every 15 minutes
- Supported browsers explicitly defined (Android Chrome primary)

---

## 10. Non‑Functional Requirements

- OTP delivery < 30 seconds
- Sync retry interval: 15 minutes
- 99% transaction durability
- Server‑side validation for all rules

---

## 11. Metrics & KPIs

- Deposit success rate
- Sync failure rate
- Agent lock frequency
- Reversal rate
- Average reconciliation time

---

## 12. Audit, Compliance & Logging

- Immutable event logs
- Actor, timestamp, device ID per action
- Reason codes for reversals
- Audit readiness for regulators and investors

---

## 13. Exception Handling & Edge Cases

- SMS failure → retry queue + admin alert
- OTP expiry → regenerate OTP
- GPS unavailable → transaction blocked
- Device loss → agent account suspension
- QR card damaged → re‑issuance workflow
- Sync conflict → server‑side last‑write validation

---

## 14. Summary

DaiLi Pay v1 is a **web‑only, API‑driven, role‑aware savings infrastructure** designed to digitize informal daily savings without sacrificing trust. The system prioritizes immutable rules, offline resilience, auditability, and operational clarity over feature breadth.

This PRD defines the foundation for a secure, scalable, and regulator‑ready platform.

