# Vercel Deployment Guide

## 🚀 Quick Deploy Steps

### Option 1: Deploy via Vercel CLI (Recommended)

#### Backend Deployment

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Navigate to backend directory**:
   ```bash
   cd chat-backend
   ```

3. **Login to Vercel**:
   ```bash
   vercel login
   ```

4. **Deploy backend**:
   ```bash
   vercel
   ```
   - Follow prompts:
     - Set up and deploy? **Yes**
     - Which scope? **Your account**
     - Link to existing project? **No**
     - Project name? **chat-backend** (or your choice)
     - Directory? **./** (current directory)
     - Override settings? **No**

5. **Set environment variables**:
   ```bash
   vercel env add DATABASE_URL
   vercel env add JWT_SECRET
   vercel env add JWT_EXPIRES_IN
   vercel env add GOOGLE_CLIENT_ID
   vercel env add CLIENT_URL
   ```
   - For each variable, paste the value when prompted
   - For `CLIENT_URL`, use your frontend URL (we'll get this after frontend deploy)

6. **Redeploy with environment variables**:
   ```bash
   vercel --prod
   ```

7. **Copy the backend URL** (e.g., `https://chat-backend.vercel.app`)

#### Frontend Deployment

1. **Navigate to frontend directory**:
   ```bash
   cd ../frontend
   ```

2. **Deploy frontend**:
   ```bash
   vercel
   ```
   - Follow prompts:
     - Set up and deploy? **Yes**
     - Which scope? **Your account**
     - Link to existing project? **No**
     - Project name? **chat-frontend** (or your choice)
     - Directory? **./** (current directory)
     - Override settings? **No**

3. **Set environment variables**:
   ```bash
   vercel env add VITE_API_URL
   vercel env add VITE_GOOGLE_CLIENT_ID
   ```
   - `VITE_API_URL`: Your backend URL from step 7 above (e.g., `https://chat-backend.vercel.app`)
   - `VITE_GOOGLE_CLIENT_ID`: Your Google OAuth Client ID

4. **Redeploy with environment variables**:
   ```bash
   vercel --prod
   ```

5. **Update backend CLIENT_URL**:
   ```bash
   cd ../chat-backend
   vercel env rm CLIENT_URL
   vercel env add CLIENT_URL
   ```
   - Paste your frontend URL (e.g., `https://chat-frontend.vercel.app`)
   - Redeploy: `vercel --prod`

---

### Option 2: Deploy via Vercel Dashboard

#### Backend Deployment

1. **Go to [vercel.com](https://vercel.com)** and sign in

2. **Click "Add New Project"**

3. **Import Git Repository** (recommended) OR **Upload** the `chat-backend` folder

4. **Configure Project**:
   - **Framework Preset**: Other
   - **Root Directory**: `chat-backend` (if deploying from root) or `.` (if deploying chat-backend folder)
   - **Build Command**: `npm run vercel-build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

5. **Add Environment Variables**:
   - `DATABASE_URL` - Your PostgreSQL connection string
   - `JWT_SECRET` - A secure random string
   - `JWT_EXPIRES_IN` - `7d`
   - `GOOGLE_CLIENT_ID` - Your Google OAuth Client ID
   - `CLIENT_URL` - Your frontend URL (update after frontend deploy)
   - `PORT` - Leave empty (Vercel handles this)

6. **Click "Deploy"**

7. **Copy the deployment URL** (e.g., `https://chat-backend-xxx.vercel.app`)

#### Frontend Deployment

1. **Click "Add New Project"** again

2. **Import Git Repository** OR **Upload** the `frontend` folder

3. **Configure Project**:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend` (if deploying from root) or `.` (if deploying frontend folder)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `dist` (auto-detected)
   - **Install Command**: `npm install` (auto-detected)

4. **Add Environment Variables**:
   - `VITE_API_URL` - Your backend URL (from step 7 above)
   - `VITE_GOOGLE_CLIENT_ID` - Your Google OAuth Client ID

5. **Click "Deploy"**

6. **Update Backend CLIENT_URL**:
   - Go back to backend project settings
   - Update `CLIENT_URL` environment variable with frontend URL
   - Redeploy backend

---

## 📋 Environment Variables Checklist

### Backend (chat-backend)
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `JWT_SECRET` - Secure random string (generate with: `openssl rand -base64 32`)
- [ ] `JWT_EXPIRES_IN` - `7d`
- [ ] `GOOGLE_CLIENT_ID` - Your Google OAuth Client ID
- [ ] `CLIENT_URL` - Frontend URL (e.g., `https://your-frontend.vercel.app`)
- [ ] `PORT` - Leave empty (Vercel auto-assigns)

### Frontend (frontend)
- [ ] `VITE_API_URL` - Backend URL (e.g., `https://your-backend.vercel.app`)
- [ ] `VITE_GOOGLE_CLIENT_ID` - Your Google OAuth Client ID

---

## ⚠️ Important Notes

### Socket.io on Vercel
**Vercel Serverless Functions DON'T support WebSockets**. Socket.io requires persistent connections.

**Current Setup**: Backend code is configured to skip Socket.io initialization on Vercel (checks `process.env.VERCEL`). REST API will work, but real-time features won't.

**Recommended Solutions:**

1. **Deploy Entire Backend to Railway** (Easiest - Recommended):
   - Railway supports WebSockets natively
   - Free tier available
   - Deploy entire backend there
   - Update frontend `VITE_API_URL` to Railway URL

2. **Hybrid Approach** (Advanced):
   - REST API → Vercel (for fast API responses)
   - Socket.io Server → Railway (for WebSockets)
   - Requires splitting the backend code

3. **Use Vercel Pro Plan** (if available):
   - Check if Vercel Pro supports WebSockets
   - May have WebSocket support in newer plans

### Prisma on Vercel
- Prisma client is generated during build (`vercel-build` script)
- Make sure `prisma generate` runs before TypeScript compilation
- Generated client is in `src/generated/prisma/`

### Database Setup
- Ensure your PostgreSQL database (Neon) allows connections from Vercel IPs
- Update `DATABASE_URL` with production connection string
- Run `prisma db push` locally first to ensure schema is synced

---

## 🔧 Troubleshooting

### Build Fails
- Check that all environment variables are set
- Ensure Prisma generates successfully
- Check build logs in Vercel dashboard

### WebSocket Connection Fails
- Vercel serverless functions don't support persistent WebSocket connections
- Consider deploying Socket.io server to Railway/Render
- Update frontend `VITE_API_URL` to point to Socket.io server

### CORS Errors
- Ensure `CLIENT_URL` in backend matches your frontend URL exactly
- Check that frontend `VITE_API_URL` points to backend

### Database Connection Errors
- Verify `DATABASE_URL` is correct
- Check that database allows connections from Vercel
- Ensure database is not paused (Neon free tier pauses after inactivity)

---

## 🎯 Quick Test After Deployment

1. **Test Backend**:
   ```bash
   curl https://your-backend.vercel.app/health
   ```
   Should return: `{"ok":true}`

2. **Test Frontend**:
   - Visit your frontend URL
   - Should see auth page
   - Try logging in

3. **Test Real-time**:
   - Open two browser windows
   - Login as different users
   - Send messages - should appear in real-time

---

## 📝 Deployment Checklist

- [ ] Backend deployed to Vercel
- [ ] Frontend deployed to Vercel
- [ ] All environment variables set
- [ ] Database connection working
- [ ] Authentication working
- [ ] Real-time messaging working (if Socket.io deployed)
- [ ] Test link shared

---

## 🚨 Alternative: Deploy Backend to Railway (Better for WebSockets)

If WebSockets don't work on Vercel, deploy backend to Railway:

1. **Go to [railway.app](https://railway.app)**
2. **New Project** → **Deploy from GitHub** (or upload)
3. **Select chat-backend directory**
4. **Set environment variables** (same as backend list above)
5. **Deploy**
6. **Update frontend `VITE_API_URL`** to Railway URL

Railway supports WebSockets natively and is free for small projects.
