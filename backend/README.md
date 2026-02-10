# DaiLi Pay Backend

Trust-minimized daily savings infrastructure - Backend API

## Overview

This is the backend API for DaiLi Pay, a web-only, role-aware savings platform designed for informal workers in Nigeria. The API enforces immutable rules, supports offline-first operations, and provides audit-ready transaction logging.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **Authentication**: JWT
- **Logging**: Winston

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Request handlers
│   ├── database/        # Database migrations, seeds, models
│   ├── middleware/      # Express middleware (auth, validation, etc.)
│   ├── models/          # Data models
│   ├── routes/          # API route definitions
│   ├── services/        # Business logic services
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   ├── validators/      # Input validation schemas
│   └── server.ts        # Application entry point
├── logs/                # Application logs
├── .env.example         # Environment variables template
├── package.json
└── tsconfig.json
```

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Set up database**:
   - Create a PostgreSQL database
   - Update database credentials in `.env`
   - Run migrations (when available):
     ```bash
     npm run migrate
     ```

4. **Run development server**:
   ```bash
   npm run dev
   ```

   The server will start on `http://localhost:3000`

## API Endpoints

Endpoints will be organized by module:
- `/api/v1/auth` - Authentication
- `/api/v1/contributors` - Contributor management
- `/api/v1/deposits` - Deposit operations
- `/api/v1/withdrawals` - Withdrawal operations
- `/api/v1/reconciliation` - Reconciliation operations
- `/api/v1/admin` - Admin operations

## Core Features

- **Role-Based Access Control (RBAC)**: Contributor, Agent, Operations Admin, Super Admin
- **Circuit Breaker**: ₦10,000 unreconciled balance limit
- **Offline Support**: Queue-based sync for agent operations
- **SMS Integration**: Transaction confirmations and OTP delivery
- **GPS Tracking**: Required for all deposits
- **Immutable Ledger**: All transactions are logged and cannot be edited
- **Audit Logging**: Complete audit trail for compliance

## Development

- **Linting**: `npm run lint`
- **Build**: `npm run build`
- **Start production**: `npm start`

## Environment Variables

See `.env.example` for all required environment variables.

## License

ISC
