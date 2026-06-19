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

## Completed milestones

- RPG-first guild onboarding.
- RPG-first help, mention, bot information, README, and presence positioning.
- Tutorial offered, started, completed, and skipped tracking.
- Character creation, first adventure, first victory, second active day, and seven-day return tracking.
- RPG admin exclusion from engagement.
- RPG funnel and onboarding variant reporting.
- Community Tools retained as supporting functionality.
- Explicit content-change gate based on measured funnel loss.
