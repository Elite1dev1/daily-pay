# Railway Environment Variables Guide

## Quick Answer

**PORT**: ✅ **LEAVE IT BLANK** - Railway automatically sets this for you
**NODE_ENV**: ✅ **Set to `production`** - This enables production optimizations

---

## Complete Environment Variables for Railway

When adding environment variables in Railway, here's what you need:

### Required Variables

| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | ✅ **Set this** - Enables production mode |
| `PORT` | _(leave blank)_ | ✅ **Railway sets this automatically** - Don't add it! |
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

## Step-by-Step: Adding Variables in Railway

1. **Go to your Railway project**
2. **Click on your backend service**
3. **Click "Variables" tab**
4. **Click "New Variable"**

### Add these one by one:

```
Name: NODE_ENV
Value: production
```

```
Name: MONGODB_URI
Value: mongodb+srv://username:password@cluster.mongodb.net/daili_pay?retryWrites=true&w=majority
```

```
Name: JWT_SECRET
Value: your-super-secret-jwt-key-here-make-it-long-and-random
```

```
Name: CORS_ORIGIN
Value: https://daili-pay.vercel.app,https://daili-pay-git-main.vercel.app
```
*(Add this after you deploy your frontend to Vercel)*

---

## Important Notes

### ✅ DO:
- ✅ Set `NODE_ENV=production`
- ✅ Leave `PORT` blank (Railway handles it)
- ✅ Use `MONGODB_URI` for MongoDB Atlas or Railway's MongoDB service
- ✅ Add your Vercel frontend URL to `CORS_ORIGIN` after frontend deployment

### ❌ DON'T:
- ❌ Don't set `PORT` manually - Railway will override it anyway
- ❌ Don't use `NODE_ENV=development` in production
- ❌ Don't commit secrets to GitHub (Railway variables are secure)

---

## How Your Code Handles This

Looking at your `server.ts`:

```typescript
const PORT = process.env.PORT || 3000;  // Railway sets PORT automatically
```

Railway will:
1. Automatically set `PORT` to the correct port (usually something like `3000` or `8080`)
2. Your code will use that port automatically
3. Railway routes traffic to that port

---

## Example: Complete Railway Setup

After adding all variables, your Railway Variables tab should look like:

```
NODE_ENV = production
MONGODB_URI = mongodb+srv://...
JWT_SECRET = your-secret-key
CORS_ORIGIN = https://daili-pay.vercel.app
```

**Notice**: No `PORT` variable! Railway handles it automatically.

---

## Troubleshooting

### "Port already in use" error
- **Solution**: Remove any `PORT` variable you added. Railway sets it automatically.

### "Cannot connect to database"
- **Solution**: Check your `MONGODB_URI` is correct and includes authentication

### CORS errors from frontend
- **Solution**: Make sure `CORS_ORIGIN` includes your Vercel domain

---

## Quick Checklist

- [ ] `NODE_ENV` = `production` ✅
- [ ] `PORT` = (not set - leave blank) ✅
- [ ] `MONGODB_URI` = (your MongoDB connection string) ✅
- [ ] `JWT_SECRET` = (your secret key) ✅
- [ ] `CORS_ORIGIN` = (your Vercel URL - add after frontend deploy) ✅
