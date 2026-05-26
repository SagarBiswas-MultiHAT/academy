import type { MetadataRoute } from 'next';

interface Book {
  slug: string;
  updatedAt: string;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/books`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error('Failed to fetch books');
    const { data } = await res.json();
    const bookUrls = data.books.map((b: Book) => ({
      url: `${process.env.NEXT_PUBLIC_SITE_URL}/books/${b.slug}`,
      lastModified: b.updatedAt,
    }));
    return [
      { url: process.env.NEXT_PUBLIC_SITE_URL!, lastModified: new Date() },
      ...bookUrls,
    ];
  } catch {
    return [{ url: process.env.NEXT_PUBLIC_SITE_URL!, lastModified: new Date() }];
  }
}
