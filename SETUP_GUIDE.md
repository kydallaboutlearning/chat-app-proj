# Chat App - Setup & Testing Guide

## Prerequisites
- Node.js (v18+ recommended)
- npm or yarn
- PostgreSQL database (Neon/Supabase cloud DB is configured)

## Step 1: Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd chat-backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   - Copy `env.example` to `.env`:
     ```bash
     copy env.example .env
     ```
   - The `.env` file should already exist with your database URL and secrets

4. **Set up database:**
   ```bash
   npm run db:push
   ```
   This creates the database tables.

5. **Start the backend server:**
   ```bash
   npm run dev
   ```
   You should see: `Server running on http://localhost:3001`

## Step 2: Frontend Setup

1. **Open a NEW terminal window** (keep backend running)

2. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Set up environment variables:**
   - Copy `env.example` to `.env`:
     ```bash
     copy env.example .env
     ```
   - Edit `.env` and ensure it has:
     ```
     VITE_API_URL=http://localhost:3001
     VITE_GOOGLE_CLIENT_ID=377709171063-hfds1ttk8fr9vlfgd3orrf0gf4ua8t4v.apps.googleusercontent.com
     ```

5. **Start the frontend dev server:**
   ```bash
   npm run dev
   ```
   You should see: `Local: http://localhost:5173`

## Step 3: Testing the App

### Test Authentication:
1. Open browser to `http://localhost:5173`
2. You should be redirected to `/auth` page
3. **Register a new user:**
   - Enter name, email, password
   - Click "Sign Up"
   - Should redirect to `/chat`

4. **Test login:**
   - Logout (click logo → Log out)
   - Login with same credentials
   - Should redirect to `/chat`

### Test Chat Features:
1. **Create a conversation:**
   - Click "New Message" button
   - Search for a user
   - Click on a user to start conversation

2. **Send messages:**
   - Type a message in the input
   - Press Enter or click send button
   - Message should appear in chat

3. **Test real-time (requires 2 browsers):**
   - Open app in Chrome (logged in as User A)
   - Open app in Firefox/Incognito (logged in as User B)
   - Create conversation between them
   - Send message from User A → should appear instantly for User B

## Troubleshooting

### Backend won't start:
- Check if `.env` file exists in `chat-backend/`
- Verify `DATABASE_URL` is correct
- Check if port 3001 is already in use
- Run `npm run db:push` to ensure database is set up

### Frontend won't start:
- Check if `.env` file exists in `frontend/`
- Verify `VITE_API_URL` matches backend port
- Check if port 5173 is already in use
- Clear browser cache and localStorage

### CORS errors:
- Ensure backend `CLIENT_URL` in `.env` matches frontend URL (default: `http://localhost:5173`)

### Database connection errors:
- Verify `DATABASE_URL` in backend `.env` is correct
- Check if Neon database is accessible
- Run `npm run db:push` again

### Messages not appearing:
- Check browser console for errors (F12)
- Verify Socket.io connection (check Network tab → WS)
- Ensure both users are logged in

## Quick Test Commands

**Backend health check:**
```bash
curl http://localhost:3001/api/auth/me
# Should return 401 (not authenticated) - this means server is running
```

**Check if frontend can reach backend:**
- Open browser console (F12)
- Check Network tab when loading app
- API calls should go to `http://localhost:3001`

## Expected Behavior

✅ **Working correctly:**
- Auth page loads
- Can register/login
- Redirects to chat after login
- Can see user list
- Can create conversations
- Can send/receive messages
- Real-time updates work

❌ **Common issues:**
- Blank white screen → Check browser console for errors
- "Failed to fetch" → Backend not running or CORS issue
- "401 Unauthorized" → Token expired, logout and login again
- Messages not sending → Check Socket.io connection
