# Play Console: App content answers

Everything below matches build 21 and later. Copy the answers as written.

## Privacy policy
`https://habbit-track-daily.netlify.app/privacy`

## Ads
**No**, my app does not contain ads.

## App access
**All functionality is available without special access.** (No login. During testing the paywall never blocks reviewers in the first 7 days.)

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
