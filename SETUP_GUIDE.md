# DaiLi Pay - Setup & Access Guide

## What is DaiLi Pay?

**DaiLi Pay** is a **trust-minimized daily savings infrastructure** for informal workers in Nigeria. It solves the problem of broken trust, fraud, and poor record-keeping in traditional cash collection systems.

### Core Purpose:
- **Agents** collect daily cash savings from **Contributors** (informal workers)
- **Contributors** receive SMS confirmations for every deposit
- **Operations Admins** approve withdrawals and reconcile agent accounts
- **Super Admins** manage the entire system

### Key Features:
- ✅ **Offline-First**: Agents can work offline for up to 72 hours
- ✅ **QR Code System**: Physical QR cards bind contributors to accounts
- ✅ **Circuit Breaker**: Agents locked at ₦10,000 unreconciled balance
- ✅ **SMS Confirmations**: Every deposit sends SMS to contributor
- ✅ **Audit Trail**: All actions are logged and immutable

---

## System Status

### ✅ Backend (Ready)
- MongoDB connected and initialized
- All services migrated to MongoDB
- API endpoints working
- Authentication & authorization ready

### ⚠️ Frontend (Needs Setup)
- Frontend code exists but needs to be started
- Requires environment configuration

---

## Getting Started

### Step 1: Create First Super Admin

Run the seed script to create your first Super Admin user:

```bash
cd backend
npm run seed
```

**Default Credentials:**
- **Email**: `admin@dailipay.com`
- **Password**: `Admin123!@#`

⚠️ **IMPORTANT**: Change this password after first login!

**Custom Credentials** (optional):
Set these in your `.env` file:
```env
SUPER_ADMIN_EMAIL=your-email@example.com
SUPER_ADMIN_PASSWORD=YourSecurePassword123!
SUPER_ADMIN_NAME=Your Name
```

### Step 2: Start Backend Server

```bash
cd backend
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

Backend runs on: `http://localhost:3000`

### Step 3: Start Frontend

```bash
cd frontend
npm install  # First time only
npm run dev
```

Frontend runs on: `http://localhost:5173`

---

## Accessing Dashboards by Role

### 1. Super Admin Dashboard
**URL**: `http://localhost:5173/super-admin`

**Access**: Login with Super Admin credentials

**Capabilities**:
- Create users (agents, operations admins)
- Configure system settings
- View full audit logs
- Reverse transactions (with reason codes)
- System-wide monitoring

**How to Access**:
1. Go to `http://localhost:5173/login`
2. Login with Super Admin credentials
3. You'll be redirected to `/super-admin` dashboard

---

### 2. Operations Admin Dashboard
**URL**: `http://localhost:5173/admin`

**Access**: Must be created by Super Admin first

**Capabilities**:
- Approve/reject withdrawal requests
- Reconcile agent accounts
- Monitor agent transactions
- View audit logs
- Manage pending withdrawals

**How to Access**:
1. Super Admin creates Operations Admin user via `/super-admin` dashboard
2. Operations Admin logs in at `/login`
3. Automatically redirected to `/admin` dashboard

---

### 3. Agent Dashboard
**URL**: `http://localhost:5173/agent`

**Access**: Must be created by Super Admin first

**Capabilities**:
- Onboard new contributors (scan QR cards)
- Collect deposits (offline-capable)
- Initiate withdrawal requests
- View own transactions
- Request reconciliation

**How to Access**:
1. Super Admin creates Agent user via `/super-admin` dashboard
2. Agent logs in at `/login`
3. Automatically redirected to `/agent` dashboard

**Offline Features**:
- Works offline for up to 72 hours
- Transactions stored locally
- Auto-syncs when online

---

### 4. Contributors (No Dashboard)
**Access**: SMS-only, no web login

**Capabilities**:
- Receive SMS confirmations for deposits
- Receive OTP for withdrawals
- Check balance via SMS

**How it Works**:
- Agents onboard contributors by scanning QR cards
- Contributors receive SMS for every deposit
- Contributors receive OTP when withdrawal is requested

---

## Creating Users for Different Roles

### As Super Admin:

1. Login to Super Admin dashboard
2. Navigate to "User Management" or "Create User"
3. Fill in:
   - Email
   - Password
   - Full Name
   - Phone Number (optional)
   - Role: `agent` or `operations_admin`
4. User can immediately login with those credentials

### Via API (Alternative):

```bash
# Create Operations Admin
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "SecurePass123!",
    "fullName": "Operations Admin",
    "role": "operations_admin"
  }'

# Create Agent
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "agent@example.com",
    "password": "SecurePass123!",
    "fullName": "Field Agent",
    "role": "agent"
  }'
```

---

## Workflow Overview

### Typical Agent Workflow:
1. **Login** → Agent Dashboard
2. **Onboard Contributor** → Scan QR card, enter details
3. **Collect Deposit** → Scan QR, enter amount, GPS captured
4. **Sync** → Transactions sync when online
5. **Request Reconciliation** → When balance reaches limit

### Typical Operations Admin Workflow:
1. **Login** → Admin Dashboard
2. **Review Pending Withdrawals** → Approve/reject
3. **Reconcile Agents** → Review cash presented, approve
4. **Monitor Activity** → View audit logs

### Typical Super Admin Workflow:
1. **Login** → Super Admin Dashboard
2. **Create Users** → Agents and Operations Admins
3. **Configure System** → Settings, limits
4. **Monitor System** → Full audit visibility

---

## Environment Variables

### Backend (.env):
```env
# MongoDB
MONGODB_URI=mongodb+srv://...

# Server
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# CORS
CORS_ORIGIN=http://localhost:5173

# Super Admin (optional, for seed script)
SUPER_ADMIN_EMAIL=admin@dailipay.com
SUPER_ADMIN_PASSWORD=Admin123!@#
SUPER_ADMIN_NAME=Super Administrator
```

### Frontend (.env):
```env
VITE_API_URL=http://localhost:3000
```

---

## Quick Start Checklist

- [ ] Backend: MongoDB connected (`npm run migrate`)
- [ ] Backend: Super Admin created (`npm run seed`)
- [ ] Backend: Server running (`npm start`)
- [ ] Frontend: Dependencies installed (`npm install`)
- [ ] Frontend: Server running (`npm run dev`)
- [ ] Login as Super Admin
- [ ] Create test users (Agent, Operations Admin)
- [ ] Test workflows

---

## Troubleshooting

### Can't Login?
- Check if Super Admin was created: `npm run seed`
- Verify MongoDB connection
- Check backend logs

### Frontend Not Loading?
- Ensure backend is running on port 3000
- Check `VITE_API_URL` in frontend `.env`
- Check browser console for errors

### Role-Based Redirect Not Working?
- Verify JWT token includes correct role
- Check browser localStorage for auth token
- Clear cache and re-login

---

## Support

For issues or questions, check:
- Backend logs: `backend/logs/`
- Browser console for frontend errors
- MongoDB connection status
