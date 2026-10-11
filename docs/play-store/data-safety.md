# Play Console: App content answers

Everything below matches build 21 and later. Copy the answers as written.

## Privacy policy
`https://habbit-track-daily.netlify.app/privacy`

## Ads
**No**, my app does not contain ads.

## Sign in details (was "App access")
**Is any part of your app restricted?** → **Yes** (Pro needs a payment after the 7-day in-app trial)

Add instructions:
- Name: `Pro access code`
- Username / email: leave empty, or write `No account needed`
- Password: `PLAYREVIEW-HT26`
- Any other information:
  ```
  No sign-in or account is needed. Every feature is free for 7 days after first launch, with no payment details asked. To unlock Habit Tracker Pro without paying: Profile tab > Habit Tracker Pro > "Have an access code?" > enter PLAYREVIEW-HT26 > Apply. This unlocks every feature for 30 days.
  ```
- Tick "Allow Android to use the credentials you provide for performance and app compatibility testing" if shown.

The code lives in `src/store/useLicense.ts` (`ACCESS_CODES`). Change it there if it ever leaks.

## Content rating (IARC questionnaire)
- Category: **Utility, Productivity, Communication or Other** (pick "All other app types" if asked)
- Violence, sexuality, language, drugs, gambling: **No** to all
- Does the app let users interact or exchange content? **No** (friend challenges are codes shared through the phone's share sheet; there is no chat or user content inside the app)
- Shares the user's location with others? **No**
- Digital purchases? **Yes** (Habit Tracker Pro)
- Expected result: **Everyone / 3+**

## Target audience and content
- Target age: **18 and over** (you may also tick 13 to 15 and 16 to 17). Do not tick anything under 13.
- Appeals to children? **No**

## News app
**No**

## Data safety
> Two sets of answers. Use **"Offline build"** while `src/config/backend.ts` is empty (invites and the coach are off).
> Switch to **"With invites and the AI coach"** in Play Console **before** you publish the build that fills in the backend config.

### With invites and the AI coach
**Does your app collect or share any of the required user data types?** → **Yes**
- **Is all of the user data collected by your app encrypted in transit?** → Yes
- **Do you provide a way for users to request that their data is deleted?** → Yes (email support@mykavo.app; erasing the app's data also drops the anonymous ID)

Data types to tick:
| Category → type | Collected | Shared | Optional? | Purpose |
|---|---|---|---|---|
| **App info and performance → Other app performance data**: none | | | | |
| **Device or other IDs → Device or other IDs** (anonymous user ID, hashed device ID) | Yes | No | Required | App functionality (invites), Fraud prevention |
| **App activity → Other user-generated content** (AI coach questions) | Yes, processed ephemerally | Yes, with Anthropic as a service provider only (Google does not count service providers as sharing, so answer **No**) | Optional | App functionality |
| **App activity → Other actions** (days the app was opened, for invites) | Yes | No | Optional | App functionality |
| **Health and fitness → Fitness info** (habit summary sent with an AI question: habit names, streaks, completion) | Yes, processed ephemerally | No | Optional | App functionality |

Everything else stays as in the offline answers below (location, Health Connect raw data, photos, voice and purchases stay on the phone).

### Offline build
**Does your app collect or share any of the required user data types?** → **No**

Why this is correct (Google counts data as "collected" only when it leaves the device):
| Data | What the app does |
|---|---|
| Habits, notes, mood | Stored on the phone only |
| Location | Only during a run you start; the route is saved on the phone only. Map tiles come from OpenFreeMap (no user data is sent) |
| Health Connect (steps, distance, exercise, floors, sleep) | Read on the phone only, never sent anywhere |
| Usage access | Only screen on and off times in your bedtime window, read on the phone for sleep |
| Photos | Profile photo picked from the gallery, kept on the phone |
| Voice | The phone's own speech recognizer turns speech into text; the app never records audio |
| Purchases | Handled by Google Play Billing; the app stores only "Pro is active" |
| Crash report | Only if the user taps "Send" in an email they can read first |

Then:
- Is all data encrypted in transit? **Yes**
- Can users ask for their data to be deleted? **Yes** (Profile → Erase all data, or uninstall)

## Health apps declaration
- Is your app a health app? **Yes** → features: **Activity and fitness**, **Sleep management**, **Habit tracking / wellness**
- **Health Connect permissions** form (one line per permission):
  - READ_STEPS: "Fills walking habits with the user's step count automatically."
  - READ_DISTANCE: "Fills running, walking and cycling habits with distance."
  - READ_EXERCISE: "Marks workout, swim and ride habits done from recorded sessions."
  - READ_FLOORS_CLIMBED: "Fills stair climbing habits with floors climbed."
  - READ_SLEEP: "Fills sleep habits with hours slept."
  - Shared with third parties? **No**. Used for ads? **No**. Stored off device? **No**.

## Foreground service permissions
- Type: **Location** (`FOREGROUND_SERVICE_LOCATION`)
- Task: **User-initiated location sharing / fitness tracking**: "Records a GPS run the user starts with Start run, so distance keeps counting with the screen off. A Run in progress notification is shown until the user taps Finish."
- Video link (YouTube, unlisted is fine). Record your screen for about 30 seconds:
  1. Home → **Start a run** → **Start**
  2. Lock the phone, unlock it, pull down the notification shade to show **Run in progress**
  3. Back in the app tap **Finish**

## Government apps / Financial features / Health research
**No** to all.

## Notes
- No `ACCESS_BACKGROUND_LOCATION`, `CAMERA`, `RECORD_AUDIO` or `ACTIVITY_RECOGNITION` in the app (blocked in `app.json`).
- Usage access (`PACKAGE_USAGE_STATS`) has no declaration form. It is explained in the privacy policy and asked for only when a user turns on "Sleep from phone use".
