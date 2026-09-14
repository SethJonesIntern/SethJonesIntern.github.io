import { z } from 'astro/zod';
import { parsePostDate } from './posts';

export const postSchema = z
  .object({
    title: z.string().min(1),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be a quoted YYYY-MM-DD string')
      .refine((value) => parsePostDate(value) !== null, {
        message: 'date must be a real calendar date',
      }),
    description: z.string().min(1).max(300),
    tags: z.array(z.string().min(1)).default([]),
    draft: z.boolean().default(false),
  })
  .strict();

export type PostFrontmatter = z.infer<typeof postSchema>;
