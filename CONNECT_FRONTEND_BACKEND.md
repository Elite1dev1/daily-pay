# Connecting Frontend (Vercel) to Backend (Render)

## Your Backend URL
```
https://daily-pay-backend-vfc2.onrender.com
```

## Step 1: Set API URL in Vercel (Frontend)

1. Go to **Vercel Dashboard** → Your Frontend Project
2. **Settings** → **Environment Variables**
3. Click **"Add New"**
4. Add:
   ```
   Name: VITE_API_URL
   Value: https://daily-pay-backend-vfc2.onrender.com/api/v1
   Environment: Production, Preview, Development (select all)
   ```
5. Click **Save**
6. **Redeploy**: Go to **Deployments** → Click **"..."** → **Redeploy**

## Step 2: Update CORS in Render (Backend)

1. Go to **Render Dashboard** → Your Backend Service
2. **Environment** tab
3. Add/Update:
   ```
   Name: CORS_ORIGIN
   Value: https://your-frontend.vercel.app,https://your-frontend-git-main.vercel.app
   ```
   *(Replace `your-frontend` with your actual Vercel project name)*
4. Click **Save Changes**
5. Render will automatically redeploy

## Verify Connection

After both are deployed:

1. Visit your Vercel frontend URL
2. Open browser DevTools → Network tab
3. Try logging in or making an API call
4. You should see requests going to: `https://daily-pay-backend-vfc2.onrender.com/api/v1/...`

## Troubleshooting

### CORS Errors
- Make sure `CORS_ORIGIN` in Render includes your exact Vercel domain
- Include both the main domain and preview domains
- Restart the backend service after updating CORS

### API Not Found (404)
- Verify `VITE_API_URL` is set correctly in Vercel
- Make sure it ends with `/api/v1`
- Redeploy frontend after adding environment variable

### WebSocket Connection Failed
- WebSocket URL is automatically derived from `VITE_API_URL`
- Make sure your backend supports WebSockets (Render does!)
- Check that CORS allows WebSocket connections

## Quick Checklist

- [ ] `VITE_API_URL` set in Vercel = `https://daily-pay-backend-vfc2.onrender.com/api/v1`
- [ ] Frontend redeployed on Vercel
- [ ] `CORS_ORIGIN` set in Render with your Vercel URL
- [ ] Backend redeployed on Render
- [ ] Test API connection from frontend

Done! 🎉
