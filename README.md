# DaiLi Pay

**Version:** v1.1 (Web-Only, Role-Aware)

Trust-minimized, auditable, offline-capable daily savings infrastructure for informal workers in Nigeria.

## Overview

DaiLi Pay digitizes informal daily savings through agent-based cash collections while enforcing strict digital accountability. The system prevents fraud, provides verifiable proof of transactions, and maintains complete audit trails.

## Project Structure

```
daily-pay/
├── backend/          # REST API (Node.js + Express + TypeScript)
├── frontend/         # Web Application (React + TypeScript + PWA)
└── dai_li_pay_updated_product_requirement_document_web_only_role_aware.md
```

## Key Features

- **Single API Access Channel**: All state changes go through the backend
- **Role-Based Access Control**: Contributor, Agent, Operations Admin, Super Admin
- **Offline-First Operations**: Agents can operate offline for up to 72 hours
- **Circuit Breaker**: ₦10,000 unreconciled balance limit
- **Immutable Ledger**: All transactions are logged and cannot be edited
- **SMS Confirmations**: Verifiable proof for every transaction
- **Two-Factor Withdrawals**: OTP + Admin approval required
- **GPS Tracking**: Required for all deposits
- **Audit Ready**: Complete logging for compliance and investors

## Quick Start

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Deployment

### Deploy Frontend to Vercel

The frontend is configured for easy deployment to Vercel:

1. **Install Vercel CLI** (optional, you can also use the web interface):
   ```bash
   npm i -g vercel
   ```

2. **Deploy from the project root**:
   ```bash
   vercel
   ```
   Or connect your GitHub repository at [vercel.com](https://vercel.com) for automatic deployments.

3. **Set Environment Variables** in Vercel Dashboard:
   - `VITE_API_URL`: Your backend API URL (e.g., `https://your-backend-api.com/api/v1`)
   - Make sure your backend CORS settings allow requests from your Vercel domain

4. **Important Notes**:
   - The backend needs to be deployed separately (consider Railway, Render, or Heroku)
   - Update your backend's `CORS_ORIGIN` environment variable to include your Vercel domain
   - The frontend will be available at `https://your-project.vercel.app`

### Backend Deployment

The backend requires a persistent server (not serverless) due to Socket.io and MongoDB connections. Recommended platforms:
- **Railway**: Easy MongoDB integration
- **Render**: Free tier available
- **Heroku**: Traditional PaaS option

## Documentation

See the [Product Requirement Document](./dai_li_pay_updated_product_requirement_document_web_only_role_aware.md) for complete specifications.

## Core Principles

- **API is the single source of truth**
- **All state-changing actions go through the backend**
- **Frontend hides; backend enforces**
- **Ledger events are immutable**
- **Balances are derived, not directly edited**
- **Offline capability does not reduce system rules**

## License

ISC
