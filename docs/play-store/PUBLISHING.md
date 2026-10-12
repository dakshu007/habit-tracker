# Publishing Habit Tracker on Google Play: step by step

Files you need are all in `docs/play-store/`:
| What | File |
|---|---|
| Listing text | `listing.md` |
| App content answers (data safety, health, etc.) | `data-safety.md` |
| Prices and products | `monetization.md` |
| App icon 512 × 512 | `play-store-icon-512.png` |
| Feature graphic 1024 × 500 | `feature-graphic.png` |
| Phone screenshots 1080 × 1920 | `screenshots/` (made in step 5) |
| App bundle | `HabitTracker-build-21.aab` from the GitHub release |

---

## Step 1. Create the app
Play Console → **Home** → **Create app**
- App name: `Habit Tracker: Daily Routine`
- Default language: English (United States)
- App or game: **App**
- Free or paid: **Free** (Pro is sold inside the app; a free app can never be changed to paid, which is what we want)
- Tick both declarations → **Create app**

## Step 2. App content (left menu → Policy → App content)
Answer every card using `data-safety.md`:
1. Privacy policy → `https://habbit-track-daily.netlify.app/privacy`
2. App access → All functionality available without special access
3. Ads → No
4. Content rating → fill the questionnaire (email: support@mykavo.app)
5. Target audience → 18+ (13+ optional), not for children
6. News app → No
7. Data safety → **No data collected** (see the table for why)
8. Government apps, Financial features → No
9. Health apps → Yes, then the Health Connect permissions form
10. Advertising ID → **No** (the app has no AD_ID permission)
11. Foreground service permissions → Location, with the 30 second YouTube video

## Step 3. Store listing (Grow → Store presence → Main store listing)
- Paste name, short description, full description from `listing.md`
- Upload `play-store-icon-512.png` and `feature-graphic.png`
- Upload 4 to 8 images from `screenshots/` (Phone section)
- Store settings (left menu → Store presence → Store settings): category **Health & Fitness**, email **support@mykavo.app**, website
- **Save**

## Step 4. First upload: Internal testing
Test and release → Testing → **Internal testing** → **Create new release**
1. App signing: choose **Use Google-generated key** (recommended). Our `.aab` is signed with your upload key in `signing/`; Play remembers it.
2. Upload `HabitTracker-build-21.aab`
3. Release notes: `First test build.`
4. **Next** → **Save and publish**
5. Testers tab → create an email list with your own Gmail → copy the **join link**, open it on your phone, install from Play.

> The package name `app.mykavo.habittracker` is now permanent.
> The Play version is signed by Google, so it **cannot update** a GitHub APK. On each tester phone: Profile → Export backup, uninstall the GitHub app, install from Play, then Import backup.

## Step 5. Screenshots
Take these 8 on your phone (Power + Volume down), in **light mode**, with nice demo habits, full battery and no notification icons:

| Save as | Screen |
|---|---|
| `home.png` | Home with a card showing (half slid is nice) |
| `run.png` | A run in progress or a finished run with the map |
| `stats.png` | Stats with streak and heatmap |
| `review.png` | A weekly review story page |
| `sleep.png` | A sleep habit showing last night's sleep |
| `editor.png` | New habit editor with an artwork picked |
| `widgets.png` | Your home screen with the widgets |
| `voice.png` | Voice log sheet listening or showing the result |

Put them in `docs/play-store/kit/raw/` (or send them to Claude in chat). Claude runs `kit/render.mjs`, which puts each one in a phone frame with a caption from `kit/captions.json` and writes `screenshots/01-home.png` … `08-voice.png`.

## Step 6. Products and prices (Monetize)
Follow `monetization.md`:
1. Payments profile (already done if your other app sells anything)
2. Subscriptions: `pro_monthly` ₹59 (base plan `monthly`), `pro_yearly` ₹399 (base plan `yearly`) → Activate
3. One-time product: `pro_lifetime` ₹999 → Activate
4. All apps → Settings → **License testing** → add every tester Gmail → License response: RESPOND_NORMALLY. Their purchases are free.

## Step 7. Closed testing (12 testers × 14 days)
Test and release → Testing → **Closed testing** → **Alpha** → Manage track
1. **Countries/regions** → India (add more if you like)
2. **Testers** → create list "Habit testers" with **at least 12 Gmail addresses** (add 15 to 20 in case some drop out)
3. **Create new release** → **Add from library** → pick build 21 → release notes → **Next** → **Save**
4. **Publishing overview** (left menu) → **Send changes for review**. Google review takes 1 to 7 days.
5. When approved, copy the **Join on Android** link from the Testers tab and send it to testers. Each tester must:
   - open the link and tap **Become a tester**
   - install the app from Play (not the GitHub APK)
   - keep it installed and opened now and then for **14 days in a row**

## Step 8. Apply for production
After 14 days with 12+ opted-in testers: Dashboard → **Apply for production** → answer the questions about testing (what testers said, what you fixed). Approval takes up to 7 days. Then Production → Create release → add the latest `.aab` → roll out.

---

## Updating the app later
Every push to GitHub builds a new release with a higher build number. Upload the new `.aab` to the same track with **Create new release**. Never reuse an old `.aab`: Play rejects a build number it has already seen.

## Common rejections and fixes
| Rejection | Fix |
|---|---|
| Foreground service video missing or unclear | Re-record: start run, lock screen, show notification, finish |
| Health Connect declaration incomplete | Fill one reason per permission (in `data-safety.md`) |
| Metadata policy | No "best", "#1", "free" in the app name or icon |
| Broken functionality | Make sure the reviewer can use everything for 7 days without paying (it can) |
