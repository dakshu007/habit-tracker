import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const tint = z.enum(['sky', 'lav', 'peach', 'mint']);
const faq = z.array(z.object({ q: z.string(), a: z.string() })).default([]);

/** Long-form articles at /blog/<file name>. */
const blog = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    seoTitle: z.string().max(65).optional(),
    description: z.string().min(110).max(170),
    keyword: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    category: z.enum(['Habit science', 'Routines', 'Productivity', 'Apps', 'Wellbeing']),
    art: z.string(),
    tint,
    faq,
    related: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
  }),
});

/** One page per app feature at /<file name>. */
const features = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/features' }),
  schema: z.object({
    name: z.string(),
    title: z.string().max(65),
    description: z.string().min(110).max(170),
    headline: z.string(),
    lede: z.string(),
    plan: z.enum(['free', 'pro', 'mixed']),
    planNote: z.string(),
    icon: z.string(),
    art: z.string(),
    tint,
    category: z.enum(['Core', 'Auto-tracking', 'Motivation', 'Insights', 'Tools', 'Your data']),
    order: z.number(),
    highlights: z.array(z.object({ icon: z.string(), title: z.string(), text: z.string() })).min(3).max(6),
    steps: z.array(z.object({ title: z.string(), text: z.string() })).min(3).max(5),
    faq,
    related: z.array(z.string()).default([]),
  }),
});

/** Competitor comparisons at /alternatives/<file name>. */
const alternatives = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/alternatives' }),
  schema: z.object({
    competitor: z.string(),
    title: z.string().max(65),
    description: z.string().min(110).max(170),
    headline: z.string(),
    lede: z.string(),
    summary: z.string(),
    theirPricing: z.string(),
    platforms: z.string(),
    table: z.array(z.object({ feature: z.string(), us: z.string(), them: z.string() })).min(8),
    reasons: z.array(z.object({ title: z.string(), text: z.string() })).min(3).max(5),
    theyDoWell: z.array(z.string()).min(2),
    considerations: z.array(z.string()).min(2),
    verdict: z.string(),
    faq,
    lastChecked: z.string(),
    sources: z.array(z.string()).min(1),
    order: z.number(),
  }),
});

export const collections = { blog, features, alternatives };
