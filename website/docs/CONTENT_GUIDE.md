# Content guide for the Habit Tracker website

Read `docs/app-facts.md` first. Every product claim must come from it.

## Voice
- Warm, direct, practical. Write for a smart 22–35 year old in India or anywhere, often on a phone.
- Short paragraphs (1–3 sentences). Concrete examples ("put your shoes by the door"), not abstractions.
- Plain English. No hype words: never "revolutionary", "game-changer", "unlock your potential", "in today's fast-paced world", "delve", "embark", "journey" (as a cliché), "seamless", "leverage", "elevate".
- Don't use em dashes (—). Use commas, colons, full stops or parentheses.
- Indian context is welcome where natural (chai, metro commute, exams, ₹), but keep it global.
- Never invent statistics, studies, quotes or testimonials. Only cite research you are sure is real and describe it accurately (e.g. Lally et al., 2009, European Journal of Social Psychology: median 66 days to automaticity, range 18–254). If unsure, leave it out.
- No medical advice. For health topics, add a short line suggesting a doctor where appropriate.

## Internal links (use real URLs only)
Feature pages (root level): /ai-coach, /invite-friends, /habit-cards, /habit-templates, /streaks, /quit-bad-habits, /gps-run-tracker, /health-connect, /sleep-tracking, /voice-logging, /widgets, /quick-log, /themes-and-icons, /focus-timer, /routines, /mood-tracking, /reminders, /stats-and-insights, /habit-calendar, /weekly-review, /year-in-review, /habit-challenges, /achievements, /monthly-reports, /share-progress, /accountability-buddy, /backup-and-restore, /hindi-habit-tracker, /private-habit-tracker
Other pages: /, /features, /pricing, /blog, /alternatives, /support
Blog posts (/blog/<slug>): habits-to-track, how-to-break-a-bad-habit, morning-routine, how-to-build-good-habits, atomic-habits-summary, how-to-stop-procrastinating, dopamine-detox, how-long-does-it-take-to-form-a-habit, night-routine, best-habit-tracker-app-android
Alternatives (/alternatives/<slug>): habitica-alternative, fabulous-alternative, habitify-alternative, loop-habit-tracker-alternative, habitnow-alternative, productive-alternative, streaks-for-android

Use Markdown links like `[streak freezes](/streaks)`. Link naturally, 4–8 internal links per blog post, 2–4 per feature page.

## Download box
Put a line on its own (blank line before and after):

```
[[cta]]
```
or with custom text:
```
[[cta: Build your morning routine in Habit Tracker | Chain habits into a routine and play it one card at a time. 7 days free.]]
```
It renders as a styled box with the tagged Google Play link. Never hand-write Play links in body text.

## Files and front matter
Markdown files, UTF-8. File name = URL slug. Strings with colons must be quoted. Allowed `art` values (illustrations): anything, cleaning, coding, cycling, dancing, digital-detox, gardening, healthy, journal, learning, mindful, morning, music, reading, running, self-care, sleep, staircase-climbing, swimming, walking, water, workout. `tint`: sky, lav, peach or mint. `icon` values are Lucide icon names in PascalCase (e.g. Bot, Gift, Flame, Moon, Mic, LayoutGrid, Footprints, Route, Timer, Bell, ChartColumn, CalendarDays, Trophy, Users, FileText, Share2, CloudUpload, Languages, ShieldCheck, Smile, ListChecks, Ban, HeartPulse, Sparkles, Snowflake, Palette, Target, Zap, Clock, MessageCircle, Award, BookOpen, Coins, AlarmClock, Brain, Lightbulb, Star, Medal, Image, Smartphone, Lock, Repeat, Hourglass, Leaf, Sun, Moon, Heart, TrendingUp, PartyPopper, Crown, MapPin).

### Blog post: `src/content/blog/<slug>.md`
```yaml
---
title: "How to Break a Bad Habit: 11 Steps That Actually Work"   # H1, include the keyword
seoTitle: "How to Break a Bad Habit: 11 Steps That Work"        # optional, <= 60 chars, for <title>
description: "..."            # 140-160 chars, keyword near the start, a reason to click
keyword: "how to break a bad habit"
date: 2026-11-23
category: "Habit science"     # Habit science | Routines | Productivity | Apps | Wellbeing
art: "digital-detox"
tint: "peach"
featured: false
related: ["how-to-build-good-habits", "dopamine-detox", "habits-to-track"]
faq:
  - q: "..."
    a: "..."                  # 3-5 FAQs, 40-80 words each, answer directly
---
```
Body: **1,800–2,000 words** (front matter excluded). Start with a 2–3 sentence intro that answers the search intent fast (no H1 in the body; the title is the H1). Use H2s (`##`) for main sections and H3s for steps. Include at least one list, one table or comparison, a short "Quick summary" or "Key takeaways" near the top, 2 `[[cta]]` boxes (one around 40%, one near the end), and a closing section. Mention Habit Tracker naturally where it genuinely helps the reader (2–4 times), never as a hard sell. The FAQ goes only in front matter (it is rendered for you), don't repeat it in the body.

### Feature page: `src/content/features/<slug>.md`
```yaml
---
name: "AI Coach"
title: "AI Habit Coach App for Android | Habit Tracker"        # <= 60 chars
description: "..."            # 140-160 chars
headline: "A coach that actually knows your habits."            # H1
lede: "..."                   # 1-2 sentences under the H1
plan: "mixed"                 # free | pro | mixed
planNote: "Chat is included in Pro and the 7-day free trial. Everyone gets one free AI weekly insight."
icon: "Bot"
art: "mindful"
tint: "lav"
category: "Core"              # Core | Auto-tracking | Motivation | Insights | Tools | Your data
order: 1
highlights:                   # 3-6
  - icon: "MessageCircle"
    title: "..."
    text: "..."               # 1-2 sentences
steps:                        # 3-5, "how it works"
  - title: "..."
    text: "..."
faq:                          # 3-5
  - q: "..."
    a: "..."
related: ["stats-and-insights", "weekly-review", "invite-friends"]   # 3 feature slugs
---
```
Body: **350–600 words** of unique explanation with 2–4 `##` sections (who it's for, how it works in detail, tips). One `[[cta]]` near the end.

### Alternative page: `src/content/alternatives/<slug>.md`
```yaml
---
competitor: "Habitify"
title: "Best Habitify Alternative for Android (2026) | Habit Tracker"   # <= 60 chars
description: "..."            # 140-160 chars
headline: "Looking for a Habitify alternative on Android?"
lede: "..."
summary: "..."                # 2-3 sentences: what the competitor is, fairly
theirPricing: "..."           # what you verified, with currency, or "Free" / "Free with ads"
platforms: "Android, iOS, web"
table:                        # 8-12 rows; values short: "Yes", "No", "Pro", or a few words
  - feature: "Illustrated habit cards"
    us: "Yes, 22 illustrations"
    them: "No"
reasons:                      # 3-5 reasons someone switches
  - title: "..."
    text: "..."
theyDoWell: ["...", "..."]    # honest strengths of the competitor
considerations: ["...", "..."] # where Habit Tracker may NOT be the better fit (be honest: e.g. no iOS, no cloud sync)
verdict: "..."                # 2-3 sentences, who should pick which
lastChecked: "November 2026"
sources: ["https://..."]      # pages you actually read to verify competitor facts
order: 1
faq:
  - q: "..."
    a: "..."
---
```
Body: **700–1,000 words**: who the competitor suits, what's different in daily use, how to switch (export/start fresh, templates), pricing comparison in prose. One `[[cta]]`. Be fair and factual about competitors; only state facts you verified from their official site or store listing in the last few days, and phrase prices as "at the time of writing". No logos, no disparaging language.

## Check your files
Run from `website/`: `node scripts/check-content.mjs` (validates front matter fields and word counts). Do **not** run `npm run build` or `astro dev` (other writers are working in parallel).
