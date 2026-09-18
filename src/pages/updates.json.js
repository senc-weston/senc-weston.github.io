import { getCollection } from 'astro:content';
import { site } from '../site.config.mjs';

export async function GET() {
  const posts = (await getCollection('blog', ({ data }) => !data.draft))
    .map((post) => ({
      url: new URL(`/blog/${post.id}/`, site.url).href,
      title: post.data.title,
      description: post.data.description ?? '',
    }));
  return new Response(JSON.stringify({ posts }), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=60' },
  });
}
