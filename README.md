### 👑 Cadia - A story-driven Discord RPG with community tools | **80+** Commands and **35K+** Members.

💎 Cadia turns your Discord server into a persistent RPG world. Create a Warden, explore regions, fight encounters, collect gear, complete quests, defeat bosses, and progress with your community.

🎁 Moderation, logging, welcome messages, tickets, games, and utilities remain available as **Community Tools** that support the RPG community.

Start with `/rpg tutorial`, create your character with `/rpg create`, and enter your first encounter with `/rpg adventure`.

## Monorepo layout

Cadia is organized as a small npm workspace monorepo:

- `apps/bot` wraps the existing Discord bot entry point at `src/index.js`.
- `apps/dashboard` contains the placeholder dashboard service for the future web dashboard.
- `libs/ipc` contains the shared jszmq IPC boundary used by the bot and dashboard.
- `src`, `assets`, `config`, `scripts`, and `test` remain shared bot project folders.

Useful commands:

```bash
npm start
npm run start:bot
npm run start:dashboard
npm run dev:dashboard
npm test
npm run check:cycles:monorepo
npm run lint:cycles
npm run graph
```

PM2 runs both services from `ecosystem.config.js`:

- `cadia`
- `cadia-dashboard`

## Dashboard IPC

The dashboard uses `jszmq` over WebSocket IPC.

- Default endpoint: `ws://127.0.0.1:38650/cadia-ipc`
- Override with `CADIA_IPC_ENDPOINT`.
- Dashboard status route: `/api/bot/status`
- Dashboard health route: `/health`

Dependency direction is intentionally one-way:

- `apps/bot` -> `libs/ipc`
- `apps/dashboard` -> `libs/ipc`
- `libs/ipc` imports neither app

Keep this direction to avoid monorepo circular dependencies.
