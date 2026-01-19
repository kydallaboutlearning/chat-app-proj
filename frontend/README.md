## Chat App Frontend (React + Vite)

This is the React + Vite conversion of the existing static chat UI (`index.html` / `styles.css` / `app.js`), keeping the **same class names and layout** so the design matches 1:1.

### Run locally

```bash
cd frontend
npm install
npm run dev
```

### Environment variables

Create `frontend/.env` (Vite reads `.env` automatically) using `frontend/env.example` as a template:

```env
VITE_API_URL=http://localhost:3001
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

Notes:
- If `VITE_GOOGLE_CLIENT_ID` is not set, the app will still run and you can use email/password (dev stub).

