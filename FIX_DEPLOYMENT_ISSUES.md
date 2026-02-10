# Fix Deployment Issues

## Issue 1: Frontend Using Localhost (CORS Error)

**Problem**: Frontend is trying to connect to `http://localhost:3000` instead of Render backend.

**Fix**:

1. **Go to Vercel Dashboard** → Your Frontend Project
2. **Settings** → **Environment Variables**
3. **Check if `VITE_API_URL` exists**:
   - If it exists, make sure value is: `https://daily-pay-backend-vfc2.onrender.com/api/v1`
   - If it doesn't exist, **Add New**:
     ```
     Name: VITE_API_URL
     Value: https://daily-pay-backend-vfc2.onrender.com/api/v1
     Environment: Production, Preview, Development (all)
     ```
4. **Save**
5. **Redeploy**: Go to **Deployments** → Click **"..."** → **Redeploy**

**Important**: You MUST redeploy after adding/updating environment variables!

---

## Issue 2: CORS Error - Backend Not Allowing Vercel Domain

**Problem**: Backend CORS is set to `http://localhost:5173` instead of your Vercel URL.

**Fix**:

1. **Go to Render Dashboard** → Your Backend Service (`daily-pay-backend`)
2. **Environment** tab
3. **Add/Update `CORS_ORIGIN`**:
   ```
   Name: CORS_ORIGIN
   Value: https://daily-payfrontend.vercel.app,https://daily-payfrontend-git-main.vercel.app
   ```
4. **Save Changes**
5. Render will automatically redeploy

**Your Vercel URL**: `https://daily-payfrontend.vercel.app`

---

## Issue 3: Missing PWA Icons

**Problem**: PWA manifest references icons that don't exist.

**Quick Fix** (Remove icon requirement):

Update `frontend/vite.config.ts` to make icons optional or use a default icon.

**OR Create Placeholder Icons**:

1. Create `frontend/public/pwa-192x192.png` (192x192 PNG)
2. Create `frontend/public/pwa-512x512.png` (512x512 PNG)
3. Commit and push
4. Redeploy on Vercel

---

## Step-by-Step Fix

### Step 1: Fix Vercel Environment Variable

```
1. Vercel Dashboard → Your Project
2. Settings → Environment Variables
3. Add/Update: VITE_API_URL = https://daily-pay-backend-vfc2.onrender.com/api/v1
4. Save
5. Redeploy (IMPORTANT!)
```

### Step 2: Fix Render CORS

```
1. Render Dashboard → daily-pay-backend
2. Environment tab
3. Add/Update: CORS_ORIGIN = https://daily-payfrontend.vercel.app,https://daily-payfrontend-git-main.vercel.app
4. Save (auto-redeploys)
```

### Step 3: Verify

1. Wait for both deployments to complete
2. Visit: `https://daily-payfrontend.vercel.app`
3. Open DevTools → Network tab
4. Try to login
5. Check that requests go to: `https://daily-pay-backend-vfc2.onrender.com/api/v1/auth/login`

---

## Quick Checklist

- [ ] `VITE_API_URL` set in Vercel = `https://daily-pay-backend-vfc2.onrender.com/api/v1`
- [ ] Frontend **redeployed** on Vercel (after setting env var)
- [ ] `CORS_ORIGIN` set in Render = `https://daily-payfrontend.vercel.app,https://daily-payfrontend-git-main.vercel.app`
- [ ] Backend redeployed on Render (automatic)
- [ ] Test login - should work now!

---

## Why This Happened

1. **Environment variables** in Vercel are only available **after redeploy**
2. **CORS_ORIGIN** in backend was still set to localhost
3. Frontend falls back to `http://localhost:3000` if `VITE_API_URL` is not set

---

## After Fixing

Your app should:
- ✅ Connect to Render backend
- ✅ No CORS errors
- ✅ Login should work
- ⚠️ PWA icon warning (cosmetic, doesn't break functionality)
