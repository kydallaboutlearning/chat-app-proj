# 🚀 Quick Deploy to Vercel - Step by Step

## Prerequisites
- Vercel account (sign up at vercel.com)
- Vercel CLI installed: `npm i -g vercel`

---

## Step 1: Deploy Backend

### Via CLI (Fastest):

```bash
cd chat-backend
vercel login
vercel
```

**Follow prompts:**
- Set up and deploy? → **Yes**
- Which scope? → **Your account**
- Link to existing project? → **No**
- Project name? → **chat-backend**
- Directory? → **./** (press Enter)
- Override settings? → **No**

**After first deploy, set environment variables:**

```bash
vercel env add DATABASE_URL
# Paste your PostgreSQL connection string

vercel env add JWT_SECRET
# Generate with: openssl rand -base64 32

vercel env add JWT_EXPIRES_IN
# Enter: 7d

vercel env add GOOGLE_CLIENT_ID
# Paste your Google OAuth Client ID

vercel env add CLIENT_URL
# We'll update this after frontend deploy - use placeholder: https://placeholder.vercel.app
```

**Redeploy with env vars:**
```bash
vercel --prod
```

**Copy your backend URL** (e.g., `https://chat-backend-xxx.vercel.app`)

---

## Step 2: Deploy Frontend

```bash
cd ../frontend
vercel
```

**Follow prompts:**
- Set up and deploy? → **Yes**
- Which scope? → **Your account**
- Link to existing project? → **No**
- Project name? → **chat-frontend**
- Directory? → **./** (press Enter)
- Override settings? → **No**

**Set environment variables:**

```bash
vercel env add VITE_API_URL
# Paste your backend URL from Step 1

vercel env add VITE_GOOGLE_CLIENT_ID
# Paste your Google OAuth Client ID
```

**Redeploy:**
```bash
vercel --prod
```

**Copy your frontend URL** (e.g., `https://chat-frontend-xxx.vercel.app`)

---

## Step 3: Update Backend CLIENT_URL

```bash
cd ../chat-backend
vercel env rm CLIENT_URL
vercel env add CLIENT_URL
# Paste your frontend URL from Step 2
vercel --prod
```

---

## Step 4: Test Your Deployment

1. **Test Backend Health:**
   ```bash
   curl https://your-backend.vercel.app/health
   ```
   Should return: `{"ok":true}`

2. **Visit Frontend:**
   - Go to your frontend URL
   - Should see auth page
   - Try logging in!

---

## ⚠️ Important: WebSocket Limitation

**Real-time messaging won't work on Vercel** because serverless functions don't support WebSockets.

**Quick Fix - Deploy Backend to Railway Instead:**

1. Go to [railway.app](https://railway.app)
2. New Project → Deploy from GitHub (or upload `chat-backend` folder)
3. Set same environment variables
4. Deploy
5. Update frontend `VITE_API_URL` to Railway URL
6. **Real-time messaging will work!** ✅

---

## ✅ Deployment Checklist

- [ ] Backend deployed to Vercel
- [ ] Frontend deployed to Vercel
- [ ] All environment variables set
- [ ] Backend CLIENT_URL updated with frontend URL
- [ ] Health check works
- [ ] Can login/register
- [ ] (Optional) Backend redeployed to Railway for WebSockets

---

## 🎯 Your Test Links

After deployment, you'll have:
- **Frontend**: `https://your-frontend.vercel.app`
- **Backend**: `https://your-backend.vercel.app`

Share the frontend URL as your test link!
