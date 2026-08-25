# IoTProgrammers Portfolio (MERN)

React (Vite) + Express + MongoDB portfolio site with admin dashboard, GTM tracking, and WhatsApp lead forms.

```
Portfolio Website/
├── package.json          # Root scripts for install / build / start
├── client/               # Frontend (Vite + React)
├── server/               # Backend (Express + MongoDB)
├── .gitignore
└── README.md
```

## Local development

```bash
# 1) Install
npm run install:all

# 2) Server env
copy server\.env.example server\.env
# edit MONGODB_URI, JWT_SECRET, ADMIN_PASSWORD

# 3) Run API (terminal 1)
npm run dev:server

# 4) Run Vite (terminal 2)
npm run dev:client
```

- Frontend: http://localhost:5173  
- API: http://localhost:5000  
- Admin: http://localhost:5173/admin (default first seed: `admin` / `admin123` — change after login)

## Production (same Origin — Hostinger Node.js)

Express serves the built React app **and** `/api` + `/uploads` on one domain.

### 1. MongoDB
Use [MongoDB Atlas](https://www.mongodb.com/atlas) (recommended). Whitelist Hostinger server IP / `0.0.0.0/0` if needed. Copy the `mongodb+srv://...` URI.

### 2. Push to GitHub
```bash
git init
git add .
git commit -m "Prepare MERN app for Hostinger deploy"
git branch -M main
git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
git push -u origin main
```

Do **not** commit `server/.env` or `node_modules`.

### 3. Hostinger Node.js app
1. Create a **Node.js** website / app (or VPS).
2. Connect the GitHub repo (or upload the project).
3. Set application root to the project folder that contains root `package.json`.
4. **Build command:** `npm run build`  
5. **Start command:** `npm start`  
6. Create `server/.env` on the server (File Manager or SSH):

```env
PORT=3000
NODE_ENV=production
MONGODB_URI=mongodb+srv://USER:PASS@cluster.mongodb.net/iotprogrammers-portfolio?retryWrites=true&w=majority
CLIENT_ORIGIN=https://yourdomain.com
JWT_SECRET=paste-a-long-random-secret-here
JWT_EXPIRES_IN=7d
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-strong-password
```

Use the **PORT** Hostinger shows in the panel (often `3000` or injected automatically).

7. Restart the Node app after saving `.env`.

### 4. Client API URL
For same-domain deploy, build with empty API URL (default in production):

```bash
# optional client/.env.production
VITE_API_URL=
```

`npm run build` already produces a production bundle that calls `/api` on the same host.

If you ever host the frontend separately, set:

```env
VITE_API_URL=https://api.yourdomain.com
CLIENT_ORIGIN=https://yourdomain.com
```

…rebuild the client, and point CORS via `CLIENT_ORIGIN`.

### 5. After go-live checklist
- [ ] Open `https://yourdomain.com` — site loads  
- [ ] Open `https://yourdomain.com/api/health` (or `/api/content`) — JSON OK  
- [ ] Login `/admin` — change password  
- [ ] Admin → Tracking / GTM — paste `GTM-XXXX` and Save  
- [ ] Upload a test image — URL under `/uploads/...` works  

## Useful scripts

| Command | Purpose |
|---------|---------|
| `npm run install:all` | Install server + client deps |
| `npm run build` | Build React → `client/dist` |
| `npm start` | Start Express (serves API + `client/dist`) |
| `npm run dev:server` | API with nodemon (if installed) / node |
| `npm run dev:client` | Vite dev server |

## Security notes
- Never commit real `JWT_SECRET` or DB passwords.
- Change `ADMIN_PASSWORD` before production.
- Keep Hostinger Node and Mongo Atlas credentials private.
