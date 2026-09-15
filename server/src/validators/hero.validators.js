import { z } from 'zod';

const THEMES = ['orange', 'gold'];

// POST /admin/hero-slides body. Admins can add any number of slides.
export const createHeroSlideSchema = z.object({
  eyebrow: z.string().trim().max(60).optional().default(''),
  title: z.string().trim().min(1, 'Title is required').max(120),
  description: z.string().trim().max(500).optional().default(''),
  imageUrl: z.string().trim().url('Image must be a valid URL').max(2000),
  buttonLabel: z.string().trim().max(40).optional().default('Shop Now'),
  buttonLink: z.string().trim().max(500).optional().default('/'),
  theme: z.enum(THEMES).optional().default('orange'),
  position: z.number().int().min(0).max(9999).optional().default(0),
  isActive: z.boolean().optional().default(true),
});

// PATCH /admin/hero-slides/:id body — every field optional and, crucially,
// without defaults, so a partial update (e.g. toggling visibility) never
// overwrites fields the caller left out.
export const updateHeroSlideSchema = z.object({
  eyebrow: z.string().trim().max(60).optional(),
  title: z.string().trim().min(1, 'Title is required').max(120).optional(),
  description: z.string().trim().max(500).optional(),
  imageUrl: z.string().trim().url('Image must be a valid URL').max(2000).optional(),
  buttonLabel: z.string().trim().max(40).optional(),
  buttonLink: z.string().trim().max(500).optional(),
  theme: z.enum(THEMES).optional(),
  position: z.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
});
