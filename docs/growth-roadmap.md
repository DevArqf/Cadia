# Cadia RPG Growth Roadmap

## Product purpose

Cadia is a story-driven Discord RPG. Moderation, logging, welcome messages, tickets, games, and utilities are supporting Community Tools rather than competing product identities.

Primary growth target: increase guilds that actively play the RPG.

North-star metric: weekly RPG-active guilds, defined as guilds with at least one non-admin RPG activity during the trailing seven days.

## RPG activation funnel

The developer `/bot-analytics view:rpg-funnel` report measures:

1. Guild joined.
2. RPG tutorial started.
3. Character created.
4. First adventure started.
5. First victory completed.
6. Second RPG-active day reached.
7. RPG activity at least seven days after first engagement.

Supporting measurements include tutorial offers, completions and skips, active RPG users, character conversion, first-adventure conversion, onboarding delivery, and guild removal rate.

RPG admin commands are excluded from engagement. Test and development guilds must be listed in `GROWTH_EXCLUDED_GUILDS`.

## Product positioning

Public onboarding, `/help`, bot mentions, `/bot-info`, README content, and presence rotation lead with:

1. `/rpg tutorial`
2. `/rpg create`
3. `/rpg adventure`

Community Tools remain discoverable in `/help`, but are described as supporting the communities playing Cadia RPG.

## Onboarding experiment

The control message is the previous generic onboarding. The `rpg-first` variant introduces the RPG loop and keeps Community Tools secondary.

Configuration:

- `GROWTH_ONBOARDING_EXPERIMENT=control`: generic baseline.
- `GROWTH_ONBOARDING_EXPERIMENT=rpg-first`: RPG-first onboarding.
- `GROWTH_ONBOARDING_EXPERIMENT=split`: deterministic 50/50 assignment.

Experiment success requires:

- Higher character-creation conversion.
- Higher first-adventure conversion.
- Onboarding delivery at or above 95%.
- Seven-day guild removal no more than two percentage points above control.

Rollback to `control` if onboarding delivery drops below 95% or RPG-first removal exceeds control by five percentage points after both variants have eligible cohorts.

## Content decision gate

Do not redesign RPG encounters, classes, progression, rewards, economy, bosses, quests, or story content until the funnel identifies the largest production loss with an adequate sample.

Use the measured loss to select work:

- Joined → tutorial: improve RPG positioning and call to action.
- Tutorial → character: simplify character-entry guidance, not character mechanics.
- Character → adventure: improve the post-creation next step.
- Adventure → victory: investigate usability and difficulty separately before changing balance.
- Victory → second day: improve return prompts and recurring goals.
- Second day → seven-day return: improve long-term objectives only after confirming the retention loss.

An adequate experiment sample is at least 30 joined guilds per onboarding variant or 28 elapsed days, whichever takes longer.

## Experiment operations

Before launch:

1. Set `GROWTH_EXCLUDED_GUILDS` to every development, staging, support, and test guild ID.
2. Set `GROWTH_ONBOARDING_EXPERIMENT=split`.
3. Confirm startup logs report the split mode, the expected exclusion count, and no malformed guild IDs.
4. Confirm MySQL is connected; no RPG growth events are persisted without it.
5. Smoke-test tutorial start, character creation, adventure start, and victory tracking in an excluded test guild.

During the experiment:

1. Review `/bot-analytics view:rpg-funnel days:90` daily for data-quality warnings and onboarding delivery.
2. Export aggregate evidence with `/bot-analytics view:rpg-funnel days:90 export:true`.
3. Keep the JSON exports in a private release/operations location. Exports contain aggregate data only and omit guild, user, and character IDs.
4. Return to `control` if onboarding delivery falls below 95% or the documented removal-rate rollback threshold is reached.

At review:

1. Wait until the report marks the decision gate ready: at least 28 elapsed days and 30 joined guilds in each variant.
2. Verify data quality is healthy before accepting the largest-loss result.
3. Compare character creation, first adventure, and removal rates between control and RPG-first.
4. Select only the roadmap response corresponding to the largest measured funnel loss.
5. Do not change RPG content or balance when the decision gate is blocked.

## Completed milestones

- RPG-first guild onboarding.
- RPG-first help, mention, bot information, README, and presence positioning.
- Tutorial offered, started, completed, and skipped tracking.
- Character creation, first adventure, first victory, second active day, and seven-day return tracking.
- RPG admin exclusion from engagement.
- RPG funnel and onboarding variant reporting.
- Community Tools retained as supporting functionality.
- Explicit content-change gate based on measured funnel loss.
