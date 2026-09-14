import { z } from 'astro/zod';
import { PROJECT_STATUSES } from './projects';

export const projectSchema = z
  .object({
    title: z.string().min(1),
    role: z.string().min(1),
    stack: z.array(z.string().min(1)).min(1),
    status: z.enum(PROJECT_STATUSES),
    summary: z.string().min(1).max(300),
    order: z.number().int().positive(),
    repo: z
      .string()
      .url()
      .refine((value) => value.startsWith('http://') || value.startsWith('https://'), {
        message: 'repo must be an http(s) URL',
      })
      .optional(),
  })
  .strict();

export type ProjectFrontmatter = z.infer<typeof projectSchema>;
