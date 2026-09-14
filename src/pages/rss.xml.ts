import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';
import { assignSlugs, parsePostDate, postHref, publishedPosts, sortPostsByDate } from '../lib/posts';

export const GET: APIRoute = async (context) => {
  const entries = await getCollection('blog');
  // The same slug derivation as the pages, so every feed link matches a real URL.
  const slugs = assignSlugs(entries.map((entry) => ({ id: entry.id, title: entry.data.title })));

  const posts = sortPostsByDate(
    publishedPosts(
      entries.map((entry) => ({
        id: entry.id,
        title: entry.data.title,
        date: entry.data.date,
        description: entry.data.description,
        tags: entry.data.tags,
        draft: entry.data.draft,
        slug: slugs[entry.id],
      })),
    ),
  );

  const items = posts.map((post) => ({
    title: post.title,
    description: post.description,
    link: postHref(post.slug),
    // The schema's refine rejects any date parsePostDate cannot read, so this is never null.
    pubDate: new Date(parsePostDate(post.date)!),
    categories: post.tags,
  }));

  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site!,
    items,
    trailingSlash: true,
  });
};
