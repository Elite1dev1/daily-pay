# Vercel Deployment Guide

This guide will help you deploy the DaiLi Pay frontend to Vercel.

## Deployment Strategy

**Yes, you deploy frontend and backend separately!**

1. **Backend** → Deploy to Railway/Render/Heroku (get backend URL)
2. **Frontend** → Deploy to Vercel (set backend URL as environment variable)

This is the recommended approach and gives you flexibility to update each independently.

## Prerequisites

1. A GitHub account
2. Your code pushed to GitHub (https://github.com/Elite1dev1/daili-pay)
3. A Vercel account (sign up at https://vercel.com - it's free)
4. A backend deployment platform account (Railway/Render/Heroku)

## Step-by-Step Deployment

### Step 1: Deploy Backend First (Get Your API URL)

Deploy your backend to one of these platforms to get your API URL:

**Option A: Railway (Recommended - Easy MongoDB setup)**
1. Go to https://railway.app
2. Sign up/login with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your `daili-pay` repository
5. Set Root Directory to `backend`
6. Add environment variables from your `.env` file
7. Once deployed, you'll get a URL like: `https://your-app.railway.app`
8. **Your API URL will be**: `https://your-app.railway.app/api/v1`

**Option B: Render**
1. Go to https://render.com
2. Sign up/login
3. Click "New" → "Web Service"
4. Connect your GitHub repo
5. Set:
   - Root Directory: `backend`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
6. Add environment variables
7. **Your API URL will be**: `https://your-app.onrender.com/api/v1`

**Important**: After backend is deployed, update your backend's `CORS_ORIGIN` environment variable to include your Vercel domain (you'll add this after frontend deployment).

### Step 2: Deploy Frontend to Vercel

#### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**
   - Visit https://vercel.com
   - Sign in with your GitHub account

2. **Import Your Project**
   - Click "Add New..." → "Project"
   - Select your GitHub repository: `Elite1dev1/daili-pay`
   - Click "Import"

3. **Configure Project Settings**
   - **Framework Preset**: Vite (should auto-detect)
   - **Root Directory**: Leave as root (`.`)
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Output Directory**: `frontend/dist`
   - **Install Command**: `cd frontend && npm install`

4. **Set Environment Variables** (This is where you set your backend URL!)
   - Click "Environment Variables" (or "Configure" → "Environment Variables")
   - Click "Add New"
   - **Name**: `VITE_API_URL`
   - **Value**: Your backend API URL from Step 1 (e.g., `https://your-app.railway.app/api/v1`)
   - **Environment**: Select all (Production, Preview, Development)
   - Click "Save"
   
   **This tells your frontend where to find your backend API!**

5. **Deploy**
   - Click "Deploy"
   - Wait for the build to complete (usually 2-3 minutes)

6. **Get Your Live URL**
   - Once deployed, you'll get a URL like: `https://daili-pay.vercel.app`
   - Share this URL with others!

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy from Project Root**
   ```bash
   vercel
   ```
   - Follow the prompts
   - When asked for settings, use:
     - Build command: `cd frontend && npm install && npm run build`
     - Output directory: `frontend/dist`

4. **Set Environment Variables**
   ```bash
   vercel env add VITE_API_URL
   ```
   - Enter your backend API URL when prompted

5. **Deploy to Production**
   ```bash
   vercel --prod
   ```

## Summary: The Two-Step Process

**Yes, you deploy them separately! Here's the simple flow:**

1. **Deploy Backend** → Get your API URL (e.g., `https://your-app.railway.app/api/v1`)
2. **Deploy Frontend to Vercel** → Set `VITE_API_URL` environment variable to your backend URL
3. **Update Backend CORS** → Add your Vercel domain to backend's `CORS_ORIGIN`

That's it! Your frontend will now talk to your backend.

### Quick Reference

**Backend Deployment Platforms:**
- **Railway** (recommended): https://railway.app - Easy MongoDB setup
- **Render**: https://render.com - Free tier available
- **Heroku**: https://heroku.com - Traditional option

**Frontend Environment Variable in Vercel:**
- Name: `VITE_API_URL`
- Value: Your backend API URL (e.g., `https://your-app.railway.app/api/v1`)

**Backend CORS Setting:**
- Variable: `CORS_ORIGIN`
- Value: `https://your-project.vercel.app,https://your-project-git-main.vercel.app`

### Automatic Deployments

Once connected to GitHub, Vercel will automatically:
- Deploy on every push to `main` branch (production)
- Create preview deployments for pull requests
- Rebuild when you update environment variables

### Custom Domain (Optional)

1. Go to your project settings in Vercel
2. Click "Domains"
3. Add your custom domain (e.g., `dailipay.com`)
4. Follow DNS configuration instructions

## Troubleshooting

### Build Fails
- Check that all dependencies are in `frontend/package.json`
- Ensure Node.js version is compatible (Vercel uses Node 18+ by default)

### API Requests Fail
- Verify `VITE_API_URL` is set correctly in Vercel
- Check backend CORS settings include your Vercel domain
- Check browser console for CORS errors

### 404 Errors on Routes
- This is normal for SPAs - Vercel is configured to redirect all routes to `index.html`
- If issues persist, check the `rewrites` in `vercel.json`

## Support

For more help:
- Vercel Docs: https://vercel.com/docs
- Vercel Discord: https://vercel.com/discord
