# Cadia Dashboard Workspace

This is a small placeholder dashboard service for the future Cadia web dashboard.

Current behavior:

- `GET /health` returns JSON health status.
- All other routes return a plain-text placeholder.

Commands:

```bash
npm run start:dashboard
npm run dev:dashboard
```

The dashboard implementation can replace `server.js` with Express, Fastify, Next.js, or another framework later.
