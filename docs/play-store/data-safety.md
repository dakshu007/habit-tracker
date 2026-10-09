# Play Console — Data safety answers

| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | **No data collected** if Sentry DSN is *not* configured. With Sentry: **Yes — App info and performance → Crash logs, Diagnostics** (collected, not shared, not linked to identity, used for analytics/app functionality, optional? no — but processed ephemerally for crash fixing). |
| Is all of the user data collected by your app encrypted in transit? | Yes (Sentry uses HTTPS). |
| Do you provide a way for users to request that their data is deleted? | Yes — Profile → Erase all data (all data is on device). |
| Health data (Health Connect) | Read on device only, never transmitted → not "collected" per Play's definition (data processed only on device is not collected). |
| Photos | Profile photo is copied into app storage on device only → not collected. |
| Location (precise) | Used only during a run the user starts; route stored on device only, never transmitted → not "collected". Map tiles are fetched from OpenFreeMap (area + IP visible to their server, no user data sent). |
| Contacts, messages, financial info | Not accessed. |

## Health Connect declaration (required)
- Permissions: READ_STEPS, READ_DISTANCE, READ_EXERCISE, READ_FLOORS_CLIMBED, READ_SLEEP
- Use: fill habit progress automatically, shown only to the user, never shared or used for ads.
- Privacy policy URL must describe this (see PRIVACY.md) and be publicly reachable.

## Foreground service declaration (required, Android 14+)
- Type: **location** (`FOREGROUND_SERVICE_LOCATION`)
- Use: records a GPS run the user starts with "Start run", so tracking continues with the screen off. An ongoing "Run in progress" notification is shown; it stops when the user finishes the run.
- Play asks for a short video: open a running habit → tap the route button → Start run → lock screen → show the notification → finish.
- No background location permission (`ACCESS_BACKGROUND_LOCATION` is explicitly removed).

## Other declarations
- Ads: **No**
- Target audience: 13+ (not designed for children)
- App access: no login required
- Notifications permission: used for habit reminders and focus timers
