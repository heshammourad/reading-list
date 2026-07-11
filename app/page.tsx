import { prisma } from "@/lib/db";
import FilterBar from "./components/FilterBar";
import Pagination from "./components/Pagination";
import ReadingList from "./components/ReadingList";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
  }>;
}

export default async function Home({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const page = Math.max(1, parseInt(resolvedParams.page || "1", 10));
  const search = resolvedParams.search || "";
  const status = resolvedParams.status || "Unread";

  const limit = 15;
  const offset = (page - 1) * limit;

  const searchVal = search ? `%${search.trim()}%` : null;
  const statusVal = status && status !== "all" ? status : null;

  // Build the dynamic SQL query with filters
  let query = `
    SELECT
      b.id,
      v.name,
      v.author,
      v.status,
      b.cover_image_url,
      b.series_id,
      b.series_order,
      v.points,
      v.weeks,
      v.high,
      v.last
    FROM book_rank_summary v
    LEFT JOIN books b ON b.name = v.name AND b.author = v.author
    WHERE 1=1
  `;

  const params: any[] = [];

  if (searchVal) {
    params.push(searchVal);
    query += ` AND (v.name ILIKE $${params.length} OR v.author ILIKE $${params.length})`;
  }

  if (statusVal) {
    if (statusVal === "Unread") {
      query += ` AND (v.status = 'Unread' OR v.status = 'On Hold' OR v.status = 'Available' OR v.status = 'Unavailable' OR v.status IS NULL)`;
    } else {
      params.push(statusVal);
      query += ` AND v.status = $${params.length}`;
    }
  }

  // View is already ordered, but let's enforce view sort keys explicitly to prevent Postgres random sorting
  query += ` ORDER BY v.points DESC, v.weeks DESC, v.high ASC, v.last ASC, v.name ASC`;

  // Add pagination limits
  params.push(limit);
  query += ` LIMIT $${params.length}`;

  params.push(offset);
  query += ` OFFSET $${params.length}`;

  // Count query for pagination totals
  let countQuery = `
    SELECT COUNT(*)::int as count
    FROM book_rank_summary v
    WHERE 1=1
  `;

  const countParams: any[] = [];

  if (searchVal) {
    countParams.push(searchVal);
    countQuery += ` AND (v.name ILIKE $${countParams.length} OR v.author ILIKE $${countParams.length})`;
  }

  if (statusVal) {
    if (statusVal === "Unread") {
      countQuery += ` AND (v.status = 'Unread' OR v.status = 'On Hold' OR v.status = 'Available' OR v.status = 'Unavailable' OR v.status IS NULL)`;
    } else {
      countParams.push(statusVal);
      countQuery += ` AND v.status = $${countParams.length}`;
    }
  }

  let books: any[] = [];
  let totalEntries = 0;
  let latestChartBookIds: number[] = [];

  try {
    const [booksRes, countRes, latestChartsRes] = await Promise.all([
      prisma.$queryRawUnsafe<any[]>(query, ...params),
      prisma.$queryRawUnsafe<{ count: number }[]>(countQuery, ...countParams),
      prisma.$queryRawUnsafe<{ book_id: number }[]>(`
        SELECT DISTINCT book_id 
        FROM charts 
        WHERE date = (SELECT MAX(date) FROM charts) 
          AND book_id IS NOT NULL
      `),
    ]);
    books = booksRes.map(b => ({
      ...b,
      series_order: b.series_order ? Number(b.series_order) : null
    }));
    totalEntries = countRes[0]?.count ?? 0;
    latestChartBookIds = latestChartsRes.map(c => c.book_id);
  } catch (err: any) {
    console.error("Database query failed:", err.message);
  }

  // Fetch all series info if any book belongs to a series
  const seriesIds = books.map((b) => b.series_id).filter(Boolean) as number[];
  
  let allSeriesBooks: any[] = [];
  let seriesMap: Record<number, string> = {};

  if (seriesIds.length > 0) {
    const [seriesList, dbBooks] = await Promise.all([
      prisma.series.findMany({
        where: { id: { in: seriesIds } }
      }),
      prisma.books.findMany({
        where: { series_id: { in: seriesIds } }
      })
    ]);
    
    allSeriesBooks = dbBooks.map(b => ({
      ...b,
      series_order: b.series_order ? Number(b.series_order) : null // normalize Decimal to number
    }));

    seriesList.forEach((s) => {
      seriesMap[s.id] = s.name;
    });
  }

  const totalPages = Math.ceil(totalEntries / limit);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-zinc-800 selection:text-white font-sans antialiased">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        
        {/* Header */}
        <header className="text-center mb-12 border-b border-zinc-850 pb-8">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight font-serif text-zinc-50 uppercase mb-3">
            My Reading List
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 uppercase tracking-widest font-semibold font-sans">
            NYTimes Best Sellers · Score-Weighted Rank
          </p>
        </header>

        {/* Filter & Search Bar */}
        <FilterBar />

        {/* Book List */}
        <ReadingList
          books={books}
          allSeriesBooks={allSeriesBooks}
          seriesMap={seriesMap}
          offset={offset}
          statusFilter={status}
          latestChartBookIds={latestChartBookIds}
        />

        {/* Pagination */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalEntries={totalEntries}
          pageSize={limit}
        />
      </div>
    </div>
  );
}
