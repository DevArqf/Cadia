# Cadia Growth Roadmap

## Growth Foundation

Primary target: increase active servers.

North-star metric: weekly active guilds that complete at least one meaningful command during the trailing seven days.

Supporting metrics:

- Guild activation rate.
- Median time from installation to first meaningful command.
- Seven-day and thirty-day guild retention.
- Guild removal rate.
- Unique command users.
- Meaningful command runs by category, including RPG adoption.

## Definitions

A meaningful command is a successful, non-developer command other than `/help`, `/ping`, or `/invite`.

A guild is activated after completing two distinct meaningful command paths. Subcommands are distinct paths, so `/rpg tutorial` and `/rpg create` satisfy activation together while two runs of `/rpg tutorial` do not.

Denied commands and command errors are reliability signals, not successful activity. Member joins do not create tracked command users.

Test and development guilds must be listed in `GROWTH_EXCLUDED_GUILDS`.

Retention cohorts begin only after this instrumentation records a guild installation. Historical guild records are intentionally excluded because their prior activity days cannot be reconstructed reliably.

## Funnel

The developer `/bot-analytics view:funnel` report measures:

1. Guild joined.
2. Onboarding delivered to the owner or an eligible channel.
3. First meaningful command.
4. Activation through two distinct meaningful commands.
5. Meaningful activity at or after seven days.
6. Meaningful activity at or after thirty days.

The first fourteen instrumented calendar days are the baseline window. Numerical 30-, 60-, and 90-day targets must not be assigned until that window is complete.

## Onboarding experiment

The control message introduces `/help` and support. The guided message leads with general server setup and moderation, then presents RPG as an optional path.

Configuration:

- `GROWTH_ONBOARDING_EXPERIMENT=control`: collect the baseline.
- `GROWTH_ONBOARDING_EXPERIMENT=guided`: deliver only the guided variant.
- `GROWTH_ONBOARDING_EXPERIMENT=split`: assign guilds deterministically 50/50.

Start the split experiment only after the fourteen-day baseline. Evaluate after at least 30 joined guilds per variant or 28 days, whichever takes longer.

Success requires:

- Guided activation rate improves by at least 10% relative to control.
- Guided seven-day removal rate is no more than 2 percentage points above control.
- Onboarding delivery remains at or above 95%.

Rollback to `control` if onboarding delivery drops below 95%, delivery errors materially increase, or the guided removal rate exceeds control by 5 percentage points after both variants have eligible seven-day cohorts.

## Next milestone

After the baseline and onboarding experiment, select the next roadmap milestone from the largest measured funnel loss:

- Poor onboarding delivery: improve destination selection and owner messaging.
- Poor first-command conversion: improve setup calls to action.
- Poor activation: add task-oriented setup guidance.
- Poor retention: improve recurring value in the highest-adoption command category.
