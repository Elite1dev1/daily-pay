# Quick Deployment Guide

## ✅ Yes! Deploy Frontend and Backend Separately

This is the **recommended approach**. Here's the simple 3-step process:

---

## Step 1: Deploy Backend → Get API URL

Deploy your backend to get an API URL:

**Railway (Easiest):**
1. Go to https://railway.app
2. New Project → Deploy from GitHub
3. Select `daili-pay` repo
4. Set Root Directory: `backend`
5. Add your environment variables
6. **Copy your API URL**: `https://your-app.railway.app/api/v1`

---

## Step 2: Deploy Frontend to Vercel → Set Backend URL

1. Go to https://vercel.com
2. Import your GitHub repo: `Elite1dev1/daili-pay`
3. Configure:
   - Build Command: `cd frontend && npm install && npm run build`
   - Output Directory: `frontend/dist`
4. **Add Environment Variable:**
   - Name: `VITE_API_URL`
   - Value: `https://your-app.railway.app/api/v1` (from Step 1)
5. Deploy!
6. **Copy your frontend URL**: `https://daili-pay.vercel.app`

---

## Step 3: Update Backend CORS

Go back to your backend platform (Railway/Render) and add:

**Environment Variable:**
- Name: `CORS_ORIGIN`
- Value: `https://daili-pay.vercel.app,https://daili-pay-git-main.vercel.app`

Restart your backend service.

---

## 🎉 Done!

- **Frontend**: `https://daili-pay.vercel.app` (share this!)
- **Backend**: `https://your-app.railway.app/api/v1` (internal)

Your frontend will automatically use the backend URL you set in Step 2!

---

## Changing the Backend URL Later

Just update the `VITE_API_URL` environment variable in Vercel and redeploy. No code changes needed!
