import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const localCache = new Map<string, string>();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title");
  const author = searchParams.get("author");

  if (!title || !author) {
    return NextResponse.json({ error: "Missing title or author" }, { status: 400 });
  }

  const cacheKey = `${title.toLowerCase()}|${author.toLowerCase()}`;
  if (localCache.has(cacheKey)) {
    return NextResponse.json({ cover_image_url: localCache.get(cacheKey) });
  }

  try {
    // 1. Check database first
    const book = await prisma.books.findFirst({
      where: {
        name: { equals: title, mode: "insensitive" },
        author: { equals: author, mode: "insensitive" },
      },
      select: {
        id: true,
        cover_image_url: true,
      },
    });

    if (book?.cover_image_url) {
      localCache.set(cacheKey, book.cover_image_url);
      return NextResponse.json({ cover_image_url: book.cover_image_url });
    }

    // 2. Fetch from NYTimes Books API using the last chart date (if API key is present)
    if (process.env.NYTIMES_API_KEY && book?.id) {
      try {
        const latestChart = await prisma.charts.findFirst({
          where: { book_id: book.id },
          orderBy: { date: "desc" },
          select: { date: true },
        });

        if (latestChart?.date) {
          const formattedDate = latestChart.date.toISOString().split("T")[0];
          const nytUrl = `https://api.nytimes.com/svc/books/v3/lists/${formattedDate}/combined-print-and-e-book-fiction.json?api-key=${process.env.NYTIMES_API_KEY}`;
          
          let nytRes = await fetch(nytUrl);
          
          // Handle NYT API rate limits with retry backoff
          let retries = 3;
          let delay = 2000;
          while (nytRes.status === 429 && retries > 0) {
            console.warn(`NYTimes API rate limited (429). Retrying in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            nytRes = await fetch(nytUrl);
            retries--;
            delay *= 2;
          }

          if (nytRes.ok) {
            const data = await nytRes.json();
            // Match the book by title (ignoring case and punctuation)
            const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]/g, "");
            const nytBook = data.results?.books?.find((b: any) => {
              const bClean = b.title.toLowerCase().replace(/[^a-z0-9]/g, "");
              return bClean === cleanTitle;
            });

            const coverUrl = nytBook?.book_image;
            if (coverUrl) {
              const secureCoverUrl = coverUrl.replace(/^http:/, "https:");

              await prisma.books.update({
                where: { id: book.id },
                data: { cover_image_url: secureCoverUrl },
              });

              localCache.set(cacheKey, secureCoverUrl);
              return NextResponse.json({ cover_image_url: secureCoverUrl });
            }
          }
        }
      } catch (err: any) {
        console.error("NYTimes Books API fetch failed:", err.message);
      }

      // If NYTimes API key is configured, do not fall back to other sources to maintain consistency
      return NextResponse.json({ cover_image_url: null });
    }

    // 3. Fetch from iTunes Search API (Fallback only if NYTIMES_API_KEY is not set)
    const iTunesQuery = encodeURIComponent(`${title} ${author}`);
    try {
      const iTunesRes = await fetch(
        `https://itunes.apple.com/search?term=${iTunesQuery}&entity=ebook&limit=1`
      );
      if (iTunesRes.ok) {
        const data = await iTunesRes.json();
        const result = data.results?.[0];
        const coverUrl = result?.artworkUrl100;
        if (coverUrl) {
          // Replace 100x100bb size suffix with 500x500bb to get a high-quality cover image
          const secureCoverUrl = coverUrl
            .replace("100x100bb", "500x500bb")
            .replace(/^http:/, "https:");

          if (book?.id) {
            await prisma.books.update({
              where: { id: book.id },
              data: { cover_image_url: secureCoverUrl },
            });
          }

          localCache.set(cacheKey, secureCoverUrl);
          return NextResponse.json({ cover_image_url: secureCoverUrl });
        }
      }
    } catch (err: any) {
      console.error("iTunes fetch failed, trying Google Books:", err.message);
    }

    // 4. Fetch from Google Books API (Fallback only if NYTIMES_API_KEY is not set)
    const googleQuery = encodeURIComponent(`intitle:"${title}" inauthor:"${author}"`);
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${googleQuery}&maxResults=1`
    );

    if (res.ok) {
      const data = await res.json();
      const volumeInfo = data.items?.[0]?.volumeInfo;
      const coverUrl = volumeInfo?.imageLinks?.thumbnail || volumeInfo?.imageLinks?.smallThumbnail;

      if (coverUrl) {
        const secureCoverUrl = coverUrl.replace(/^http:/, "https:");

        if (book?.id) {
          await prisma.books.update({
            where: { id: book.id },
            data: { cover_image_url: secureCoverUrl },
          });
        }

        localCache.set(cacheKey, secureCoverUrl);
        return NextResponse.json({ cover_image_url: secureCoverUrl });
      }
    }

    // 5. Fetch from Open Library (Fallback only if NYTIMES_API_KEY is not set)
    try {
      const olRes = await fetch(
        `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}&limit=5`
      );
      if (olRes.ok) {
        const olData = await olRes.json();
        const docWithCover = olData.docs?.find((d: any) => d.cover_i);
        const coverId = docWithCover?.cover_i;
        if (coverId) {
          const secureCoverUrl = `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;

          if (book?.id) {
            await prisma.books.update({
              where: { id: book.id },
              data: { cover_image_url: secureCoverUrl },
            });
          }

          localCache.set(cacheKey, secureCoverUrl);
          return NextResponse.json({ cover_image_url: secureCoverUrl });
        }
      }
    } catch (err: any) {
      console.error("Open Library fallback failed:", err.message);
    }

    return NextResponse.json({ cover_image_url: null });
  } catch (err: any) {
    console.error("Cover resolver failed:", err.message);
    return NextResponse.json({ cover_image_url: null });
  }
}
