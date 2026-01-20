# Quick Testing Guide

## 🚀 How to Run the App

### Step 1: Start Backend
```bash
cd chat-backend
npm run dev
```
✅ Should see: `Server running on http://localhost:3001`

### Step 2: Start Frontend (New Terminal)
```bash
cd frontend
npm run dev
```
✅ Should see: `Local: http://localhost:5173`

### Step 3: Open Browser
Go to: `http://localhost:5173`

---

## ✅ What Should Happen

### 1. **Auto-Redirect to Auth Page** ✅
- When you open `http://localhost:5173`, you should **automatically** be redirected to `/auth`
- You should see a beautiful auth page with:
  - Left side: Green gradient with features and social proof
  - Right side: Login/Register form

### 2. **Test Registration**
- Click "Sign up" or fill the form
- Enter:
  - Name: `Test User`
  - Email: `test@example.com`
  - Password: `password123`
- Click "Create Account"
- ✅ Should redirect to `/chat` automatically

### 3. **Test Chat Features**
- ✅ Should see conversation list (empty at first)
- ✅ Click "New Message" button
- ✅ Should see list of users
- ✅ Click on a user to start conversation
- ✅ Type a message and press Enter
- ✅ Message should appear in chat

### 4. **Test Real-Time (2 Browsers)**
1. Open Chrome → Register as `User A`
2. Open Firefox/Incognito → Register as `User B`
3. User A: Click "New Message" → Select User B
4. User A: Send message "Hello!"
5. ✅ User B should see message appear instantly (real-time!)

---

## 🐛 Troubleshooting

### Issue: Still not redirecting to `/auth`
**Fix:**
1. Clear browser localStorage: Open DevTools (F12) → Application → Local Storage → Clear
2. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
3. Check browser console for errors

### Issue: "Failed to fetch" errors
**Fix:**
- Make sure backend is running on port 3001
- Check `frontend/.env` has: `VITE_API_URL=http://localhost:3001`
- Restart frontend after changing `.env`

### Issue: Blank white screen
**Fix:**
- Open browser console (F12)
- Check for errors in Console tab
- Check Network tab for failed requests

### Issue: Can't see users
**Fix:**
- Make sure you're logged in
- Check backend console for errors
- Try refreshing the page

---

## ✅ Requirements Checklist

- [x] **Auth page** - You should see it automatically when not logged in
- [x] **Google OAuth** - "Sign in with Google" button (if configured)
- [x] **JWT Auth** - Email/password registration and login
- [x] **User List** - Click "New Message" to see all users
- [x] **Online/Offline Status** - Green dot = online, no dot = offline
- [x] **Start Chat** - Click user to start conversation
- [x] **User Info** - Name, picture (Google or auto-generated), email
- [x] **Messages Saved** - Send message, refresh page, message still there
- [x] **Real-time** - Messages appear instantly (test with 2 browsers)

---

## 🎯 All Features Working?

If you can:
1. ✅ See auth page automatically
2. ✅ Register/Login
3. ✅ See user list with online status
4. ✅ Start conversations
5. ✅ Send/receive messages
6. ✅ See messages persist after refresh
7. ✅ See real-time updates (2 browsers)

**Then everything is working perfectly!** 🎉
