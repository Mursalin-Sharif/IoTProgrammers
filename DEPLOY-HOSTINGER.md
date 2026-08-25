# Hostinger Node.js — quick checklist

1. MongoDB Atlas URI ready
2. GitHub repo pushed (no `.env`)
3. Hostinger → Node.js app → connect repo
4. Build: `npm run build`
5. Start: `npm start`
6. Create `server/.env` from `server/.env.example`
7. Set `CLIENT_ORIGIN=https://yourdomain.com`
8. Restart app → test `/` and `/api/health` and `/admin`

See README.md for full steps.
