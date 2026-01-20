# ⚠️ IMPORTANT: Backend Server Must Be Running!

## The Problem
If you see "Loading..." stuck on the login screen with no error messages, it means **the backend server is not running**.

## Quick Fix

### Step 1: Start the Backend Server
Open a terminal and run:
```bash
cd chat-backend
npm run dev
```

You should see:
```
Server running on http://localhost:3001
```

**Keep this terminal open!** The backend must stay running.

### Step 2: Start the Frontend (if not already running)
Open a **NEW terminal** and run:
```bash
cd frontend
npm run dev
```

### Step 3: Try Logging In Again
Now go back to your browser and try logging in. It should work!

---

## Full Setup (if backend isn't configured)

If you haven't set up the backend yet:

1. **Navigate to backend:**
   ```bash
   cd chat-backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment:**
   - Copy `env.example` to `.env`
   - Make sure `.env` has `DATABASE_URL` and `JWT_SECRET`

4. **Set up database:**
   ```bash
   npm run db:push
   ```

5. **Start backend:**
   ```bash
   npm run dev
   ```

See `SETUP_GUIDE.md` for complete instructions.
