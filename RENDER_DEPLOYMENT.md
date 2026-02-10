# Render Deployment Guide

## Render Configuration for Backend

Fill out the Render form with these settings:

### Basic Settings

**Name**: `daily-pay-backend` ✅ (you already have this)

**Project**: (Optional - create new or select existing)

**Environment**: `Production` (or `Staging` for testing)

**Language**: `Node` ✅ (you already have this)

**Branch**: `main` ✅ (you already have this)

---

## Advanced Settings (Click "Advanced" to expand)

### Build & Deploy

**Root Directory**: `backend`

**Build Command**: 
```bash
npm install --include=dev && npm run build
```

**OR** (if the above doesn't work):
```bash
npm ci && npm run build
```

**Start Command**: 
```bash
npm start
```

**Environment**: `Node` (or `Docker` if using Docker)

---

## Environment Variables

After creating the service, go to **Environment** tab and add:

### Required Variables

| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | ✅ Set this |
| `PORT` | _(leave blank)_ | ✅ Render sets this automatically |
| `MONGODB_URI` | `mongodb+srv://...` | Your MongoDB connection string |
| `JWT_SECRET` | `your-secret-key` | Secret for JWT token signing |
| `CORS_ORIGIN` | `https://your-frontend.vercel.app` | Your Vercel frontend URL |

### Optional Variables (with defaults)

| Variable | Default | When to Set |
|----------|---------|-------------|
| `DB_HOST` | `localhost` | Only if not using `MONGODB_URI` |
| `DB_PORT` | `27017` | Only if not using `MONGODB_URI` |
| `DB_NAME` | `daili_pay` | Only if not using `MONGODB_URI` |
| `CIRCUIT_BREAKER_LIMIT` | `10000` | Override if needed |
| `OTP_EXPIRY_MINUTES` | `10` | Override if needed |
| `GPS_REQUIRED` | `false` | Set to `true` if GPS is mandatory |

---

## Step-by-Step Render Setup

### 1. Create Web Service

1. Go to https://render.com
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository: `Elite1dev1/daili-pay`
4. Fill in the form:

```
Name: daily-pay-backend
Environment: Production
Language: Node
Branch: main
```

### 2. Configure Build Settings

Click **"Advanced"** and set:

```
Root Directory: backend
Build Command: npm install && npm run build
Start Command: npm start
```

### 3. Add Environment Variables

After the service is created:

1. Go to **"Environment"** tab
2. Click **"Add Environment Variable"**
3. Add each variable:

```
NODE_ENV = production
MONGODB_URI = mongodb+srv://username:password@cluster.mongodb.net/daili_pay
JWT_SECRET = your-super-secret-jwt-key-here
CORS_ORIGIN = https://daili-pay.vercel.app
```

**Important**: 
- ✅ Set `NODE_ENV=production`
- ✅ Leave `PORT` blank (Render sets it automatically)
- ✅ Add `CORS_ORIGIN` after you deploy your frontend to Vercel

### 4. Deploy

1. Click **"Create Web Service"**
2. Render will:
   - Install dependencies
   - Run `npm run build` (compiles TypeScript)
   - Run `npm start` (starts the server)
3. Wait for deployment (usually 3-5 minutes)
4. Get your URL: `https://daily-pay-backend.onrender.com`

--

## Your API URL

After deployment, your backend will be available at:
```
https://daily-pay-backend.onrender.com
```

Your API endpoints will be at:
```
https://daily-pay-backend.onrender.com/api/v1/auth
https://daily-pay-backend.onrender.com/api/v1/contributors
... etc
```

**Set this in your Vercel frontend as**: `VITE_API_URL=https://daily-pay-backend.onrender.com/api/v1`

---

## Socket.io Support

✅ **Render fully supports Socket.io!** 

Your WebSocket connections will work perfectly on Render. No special configuration needed.

---

## Important Notes

### ✅ DO:
- ✅ Set `NODE_ENV=production`
- ✅ Leave `PORT` blank (Render handles it)
- ✅ Use `MONGODB_URI` for MongoDB Atlas
- ✅ Set `Root Directory` to `backend`
- ✅ Add your Vercel frontend URL to `CORS_ORIGIN` after frontend deployment

### ❌ DON'T:
- ❌ Don't set `PORT` manually - Render will override it
- ❌ Don't use `NODE_ENV=development` in production
- ❌ Don't forget to set `Root Directory` to `backend`

---

## Troubleshooting

### Build Fails
- Check that `Root Directory` is set to `backend`
- Verify `Build Command` is: `npm install && npm run build`
- Check build logs for TypeScript errors

### "Cannot connect to database"
- Verify `MONGODB_URI` is correct
- Check MongoDB Atlas allows connections from Render's IPs (0.0.0.0/0)

### CORS errors from frontend
- Make sure `CORS_ORIGIN` includes your Vercel domain
- Restart the service after adding `CORS_ORIGIN`

### Socket.io not working
- Render supports WebSockets natively
- Check that your frontend is connecting to the correct URL
- Verify CORS settings allow WebSocket connections

---

## Quick Checklist

- [ ] Name: `daily-pay-backend` ✅
- [ ] Root Directory: `backend` ✅
- [ ] Build Command: `npm install && npm run build` ✅
- [ ] Start Command: `npm start` ✅
- [ ] `NODE_ENV` = `production` ✅
- [ ] `PORT` = (not set - leave blank) ✅
- [ ] `MONGODB_URI` = (your MongoDB connection string) ✅
- [ ] `JWT_SECRET` = (your secret key) ✅
- [ ] `CORS_ORIGIN` = (your Vercel URL - add after frontend deploy) ✅

---

## Free Tier Limitations

Render's free tier:
- ✅ Supports Socket.io/WebSockets
- ⚠️ Service spins down after 15 minutes of inactivity
- ⚠️ First request after spin-down takes ~30 seconds (cold start)
- 💡 Consider upgrading to paid tier for always-on service

---

## Next Steps

1. Deploy backend to Render (this guide)
2. Deploy frontend to Vercel (see `VERCEL_DEPLOYMENT.md`)
3. Update `CORS_ORIGIN` in Render with your Vercel URL
4. Set `VITE_API_URL` in Vercel with your Render URL

Done! 🎉
