### 👑 Cadia - A story-driven Discord RPG with community tools | **80+** Commands and **35K+** Members.

💎 Cadia turns your Discord server into a persistent RPG world. Create a Warden, explore regions, fight encounters, collect gear, complete quests, defeat bosses, and progress with your community.

🎁 Moderation, logging, welcome messages, tickets, games, and utilities remain available as **Community Tools** that support the RPG community.

Start with `/rpg tutorial`, create your character with `/rpg create`, and enter your first encounter with `/rpg adventure`.

## Monorepo layout

Cadia is organized as a small npm workspace monorepo:

- `apps/bot` wraps the existing Discord bot entry point at `src/index.js`.
- `apps/dashboard` contains the placeholder dashboard service for the future web dashboard.
- `src`, `assets`, `config`, `scripts`, and `test` remain shared bot project folders.

Useful commands:

```bash
npm start
npm run start:bot
npm run start:dashboard
npm run dev:dashboard
npm test
```

PM2 runs both services from `ecosystem.config.js`:

- `cadia`
- `cadia-dashboard`
