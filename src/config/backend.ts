/**
 * Supabase project for invites and the AI coach (see supabase/schema.sql).
 * Both values are public by design (the anon / publishable key only allows
 * what the database functions allow). Leave empty to turn the backend off:
 * invites and the coach then hide themselves.
 */
export const SUPABASE_URL = 'https://rjiguxaeuwrrqbcfnjsv.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_u3kUlwB9Zkx8ehgusodvug_OP6B1jol';

export const backendEnabled = () => !!SUPABASE_URL && !!SUPABASE_KEY;
