# Player-Driven RPG Growth

Cadia now provides social growth loops that reward participation and sharing without selling or granting combat power.

## Global competition

`/rpg global-leaderboard` displays global Rank, Gold, Victory, or Relic Shard standings across Cadia communities. The existing `/rpg leaderboard` remains scoped to the current server.

## Shareable progress

`/rpg share type:Character` creates a public character card.

`/rpg share type:Achievement` creates a public card for an unlocked achievement. Newly unlocked achievements are surfaced after victories with the share command.

## Cooperative server boss

`/rpg server-boss action:View` displays the current seasonal community boss.

`/rpg server-boss action:Attack` contributes damage based on the player's existing Warden progression. Each player can attack once every 30 minutes. Every contributor receives the cooperative cosmetic when the boss is defeated.

## Seasons

`/rpg season action:View` displays the current quarterly quest. Players complete it through in-season victories and RPG activity on multiple days.

`/rpg season action:Claim` grants that quarter's limited cosmetic. Seasonal progress resets with the next quarter; core character progression does not.

## Referrals

`/rpg refer action:My Code` provides a personal referral code.

After creating a Warden, a referred player can use `/rpg refer action:Redeem code:<code>`. Both players receive the Gatebound Crest cosmetic. Codes are single-use per referred player and cannot be self-redeemed.

## Safety and economy

- Growth rewards are cosmetic only.
- Referral rewards do not grant XP, currency, items, stats, or boss progress.
- Cooperative boss damage uses existing progression but does not alter normal combat balance.
- Seasonal cosmetics are unique to their season.
- All systems use the existing RPG database and error handling.

Developers can review aggregate adoption through `/rpg admin analytics view:Player Growth`.
