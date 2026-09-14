import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Every .md file in src/content/blog/ becomes a post.
// These are the fields you may put at the top of a post, between the --- lines.
const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string().optional(),   // one-line summary, shown in the list
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),    // true = written but not published
  }),
});

export const collections = { blog };
