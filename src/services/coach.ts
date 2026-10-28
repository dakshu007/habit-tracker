import { callFunction, rpc } from '@/services/backend';
import { coachContext } from '@/logic/coachContext';
import { useHabitStore } from '@/store/useHabitStore';
import { aiPlan } from '@/store/useLicense';
import { useCoachStore, type CoachMessage } from '@/store/useCoachStore';
import { resolveLang } from '@/i18n/core';
import { dayKey } from '@/utils/date';

export type CoachResult = { ok: true; text: string } | { ok: false; reason: 'limit' | 'pro' | 'offline' | 'down' | 'error' };

const id = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

function context() {
  const s = useHabitStore.getState();
  return coachContext(s.habits, s.logs, dayKey(), s.settings.weekStart, s.profile.name);
}

async function ask(mode: 'chat' | 'weekly', messages: { role: string; content: string }[]): Promise<CoachResult> {
  const lang = resolveLang(useHabitStore.getState().settings.language);
  try {
    const { status, data } = await callFunction<{ reply?: string; remaining?: number; error?: string }>('coach', {
      mode,
      plan: aiPlan(),
      lang,
      context: context(),
      messages,
    });
    if (status === 0) return { ok: false, reason: 'offline' };
    if (typeof data?.remaining === 'number' && mode === 'chat') useCoachStore.getState().setRemaining(data.remaining);
    if (status === 429) return { ok: false, reason: aiPlan() === 'free' && mode === 'chat' ? 'pro' : 'limit' };
    if (status >= 500) return { ok: false, reason: 'down' };
    if (status !== 200 || !data?.reply) return { ok: false, reason: 'error' };
    return { ok: true, text: data.reply };
  } catch {
    return { ok: false, reason: 'offline' };
  }
}

/** Ask the server how many chat replies are left (no AI call). */
export async function refreshRemaining(): Promise<void> {
  try {
    const { status, data } = await callFunction<{ remaining?: number }>('coach', { mode: 'chat', plan: aiPlan(), status: true });
    if (status === 200 && typeof data?.remaining === 'number') useCoachStore.getState().setRemaining(data.remaining);
  } catch {
    // Offline: keep the last known number.
  }
}

/** Send a chat message; stores both sides on the phone. */
export async function sendToCoach(text: string): Promise<CoachResult> {
  const store = useCoachStore.getState();
  const mine: CoachMessage = { id: id(), role: 'user', text: text.trim(), at: Date.now() };
  store.add(mine);
  const history = useCoachStore.getState().messages.map((m) => ({ role: m.role, content: m.text }));
  const res = await ask('chat', history);
  if (res.ok) useCoachStore.getState().add({ id: id(), role: 'assistant', text: res.text, at: Date.now() });
  return res;
}

/** ISO-ish week key for caching the weekly insight. */
export function weekKey(d = new Date()): string {
  const jan1 = new Date(d.getFullYear(), 0, 1);
  return `${d.getFullYear()}-${Math.floor((d.getTime() - jan1.getTime()) / (7 * 86_400_000))}`;
}

/** This week's insight (one per week on every plan, cached). */
export async function weeklyInsight(): Promise<CoachResult> {
  const cached = useCoachStore.getState().weekly;
  const week = weekKey();
  if (cached?.week === week) return { ok: true, text: cached.text };
  const res = await ask('weekly', []);
  if (res.ok) useCoachStore.getState().setWeekly({ week, text: res.text });
  return res;
}

/** Report an AI reply as wrong or offensive. */
export async function reportReply(text: string, reason: string): Promise<boolean> {
  try {
    await rpc('report_ai', { p_reply: text, p_reason: reason });
    return true;
  } catch {
    return false;
  }
}
