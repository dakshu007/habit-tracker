---
name: "Private Habit Tracker"
title: "Private Habit Tracker: Offline, No Account, No Ads"
description: "A private habit tracker for Android: works offline, no account, no ads. Your habits, runs, sleep and moods stay on your phone. Here's exactly what doesn't."
headline: "No account. No ads. Your habits stay on your phone."
lede: "Habit Tracker works offline and never asks you to sign up. Your habit data lives on your device, and we're upfront about the few small things that don't."
plan: "free"
planNote: "Offline use, no account and no ads apply to every plan, free or Pro. AI coach chat, which sends your question to write a reply, is Pro and trial only."
icon: "ShieldCheck"
art: "digital-detox"
tint: "lav"
category: "Your data"
order: 29
highlights:
  - icon: "WifiOff"
    title: "Works offline"
    text: "Log habits, run focus sessions and check your stats with no internet connection."
  - icon: "UserX"
    title: "No account"
    text: "No email, no password, no sign-up screen. Install the app and start."
  - icon: "Ban"
    title: "No ads"
    text: "There are no ads in the app, on any plan."
  - icon: "Smartphone"
    title: "Your data on your phone"
    text: "Habits, logs, runs, sleep and moods are stored on your device, not on our server."
  - icon: "Server"
    title: "A small server, clearly listed"
    text: "It holds an anonymous ID, invite data, a hashed device ID with your trial start, and coach reply counts. That's the list."
  - icon: "Bot"
    title: "Coach questions, handled carefully"
    text: "When you chat with the AI coach, your question is sent to write the reply. It isn't stored or used for training."
steps:
  - title: "Install and start"
    text: "No sign-up. Finish onboarding and add your first habit."
  - title: "Track offline"
    text: "Habits, runs, sleep and moods are saved on your phone, connection or not."
  - title: "Back up to your own Drive (optional)"
    text: "Turn on Google Drive backup and it goes to a hidden app folder in your own Drive, which we never see."
  - title: "Use the coach when you choose"
    text: "Your questions leave the phone only when you ask the AI coach something, to get a reply."
faq:
  - q: "Does anything leave my phone?"
    a: "A little, and here's all of it. A small server holds an anonymous ID, invite data, a hashed device ID with your trial start date, and how many coach replies you've used. When you chat with the AI coach, your question and a short habit summary are sent to write the reply. Optional Drive backups go to your own Google Drive."
  - q: "Where is the server?"
    a: "It runs on Supabase in India. It doesn't hold your habits, logs, runs, sleep or moods. It stores the anonymous ID, invite data, hashed device ID with trial start, and coach reply counts."
  - q: "What happens to my AI coach questions?"
    a: "They're sent through our server to Anthropic so Claude can write the reply. They aren't stored on our server and Anthropic doesn't use them for training. Your chat history is saved only on your phone."
  - q: "What does sleep tracking from phone use read?"
    a: "Only when your screen turns on and off, inside your bedtime window. It never reads which apps you used, and that data doesn't leave your phone. GPS runs also stay on your phone, and location is only used while you're using the app."
related: ["backup-and-restore", "ai-coach", "sleep-tracking"]
---

## What stays on your phone

Habit apps know a lot about you: when you wake up, how often you skip the gym, how you felt last Tuesday. We think that belongs to you, so Habit Tracker keeps it on your device.

That includes:

- **Habits and logs**: every habit, goal and check-in
- **Runs**: routes from the [GPS run tracker](/gps-run-tracker) are stored only on your phone
- **Sleep**: whether from Health Connect or from phone use
- **Moods** and notes
- **AI coach chat history**, the last 60 messages

There's no account, so there's no profile of you on a server. The app works offline, and there are no ads, which means no ad networks tracking what you do.

Sleep tracking from phone use deserves a special mention. It reads only when your screen turns on and off inside your bedtime window, never which apps you opened, and that data stays on the phone. More on the [sleep tracking](/sleep-tracking) page.

## What our small server holds

We're not going to claim nothing ever leaves your phone, because a few features need a server. Ours is small, runs on Supabase in India, and holds exactly four things:

1. **An anonymous ID**, not linked to your name or email
2. **Invite data**, so invite links and rewards work
3. **A hashed device ID with your trial start**, so the 7-day trial happens once per phone
4. **Coach reply counts**, so monthly and daily limits work

None of your habits, logs, runs, sleep or moods are on that list.

## When you use the AI coach

The [AI coach](/ai-coach) needs to send data to answer you. When you ask something, the app sends your question, the recent chat and a short habit summary to our server, which passes it to Anthropic so Claude can write the reply. The question isn't stored on our server and isn't used for training. The free AI weekly insight is written by the same AI, from the same kind of short habit summary.

## Your choices

- **Back up, or don't.** [Google Drive backup](/backup-and-restore) saves to a hidden app folder in your own Drive, which we never see. You can use a local file instead, or skip backups entirely.
- **Turn off mood check-ins** if you'd rather not record how you feel.
- **Skip phone-use sleep tracking.** It needs Usage access, which you grant yourself and can take back in Android settings.

[[cta: Track habits privately | No account, no ads, works offline. Try every feature free for 7 days.]]
