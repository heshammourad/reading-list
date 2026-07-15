"use client";

import { useState } from "react";
import BookCover from "./BookCover";
import StatusBadge from "./StatusBadge";
import SeriesAccordion from "./SeriesAccordion";
import SeriesManager from "./SeriesManager";

interface BookData {
  id: number;
  name: string;
  author: string;
  status: string | null;
  cover_image_url: string | null;
  series_id: number | null;
  series_order: number | null;
  points?: number;
  weeks?: number;
  high?: number;
  last?: string;
}

interface ReadingListProps {
  books: BookData[];
  allSeriesBooks: BookData[];
  seriesMap: Record<number, string>;
  offset: number;
  statusFilter: string;
  latestChartBookIds: number[];
}

export default function ReadingList({
  books,
  allSeriesBooks,
  seriesMap,
  offset,
  statusFilter,
  latestChartBookIds = [],
}: ReadingListProps) {
  const [activeModalBook, setActiveModalBook] = useState<BookData | null>(null);

  const handleOpenSeriesModal = (book: BookData) => {
    setActiveModalBook(book);
  };

  const handleCloseSeriesModal = () => {
    setActiveModalBook(null);
  };

  // Filter matching check (replicates SQL logic on client side for series books)
  const matchesFilter = (bStatus: string | null) => {
    const active = statusFilter || "Unread";
    if (active === "all") return true;
    if (active === "Unread") {
      return !bStatus || ["Unread", "On Hold", "Available", "Unavailable"].includes(bStatus);
    }
    return bStatus === active;
  };

  const handledSeries = new Set<number>();

  return (
    <main className="flex flex-col">
      {books.length > 0 ? (
        books.map((book, index) => {
          const rank = offset + index + 1;
          const formattedDate = book.last
            ? new Date(book.last).toLocaleDateString("en-US", {
                timeZone: "UTC",
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "N/A";

          // If the book belongs to a series, see if we should group it
          if (book.series_id) {
            const seriesName = seriesMap[book.series_id] || "Series";
            
            // Find all books in this series from our full list that match the current filter
            const matchingSeriesBooks = allSeriesBooks.filter(
              (sb) => sb.series_id === book.series_id && matchesFilter(sb.status)
            );

            // Group only if there is more than 1 book in the series matching the filter
            if (matchingSeriesBooks.length > 1) {
              if (handledSeries.has(book.series_id)) {
                // Skip rendering because this book is grouped in the accordion
                return null;
              }
              handledSeries.add(book.series_id);

              return (
                <SeriesAccordion
                  key={`series-${book.series_id}`}
                  rank={rank}
                  primaryBook={book}
                  seriesName={seriesName}
                  allMatchingBooks={matchingSeriesBooks}
                  onEditSeries={() => handleOpenSeriesModal(book)}
                  latestChartBookIds={latestChartBookIds}
                />
              );
            }
          }

          // Otherwise, render as a standard individual book card
          const isOnLatestChart = latestChartBookIds.includes(book.id);

          return (
            <div
              key={book.id || `${book.name}-${book.author}`}
              className={`flex gap-4 sm:gap-6 py-6 border-b items-start transition-all duration-200 px-2 rounded -mx-2 ${
                isOnLatestChart 
                  ? "border-zinc-850 bg-amber-500/[0.02] hover:bg-amber-500/[0.04]" 
                  : "border-zinc-900/80 hover:bg-zinc-900/20"
              }`}
            >
              {/* Rank */}
              <div className="text-xl sm:text-2xl font-black text-zinc-700 w-8 sm:w-10 shrink-0 text-center font-mono pt-1">
                {rank}
              </div>

              {/* Cover */}
              <BookCover
                title={book.name}
                author={book.author}
                initialCover={book.cover_image_url}
                bookId={book.id}
              />

              {/* Book Details */}
              <div className="flex-grow min-w-0 flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-grow min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                    <h2 className="text-sm sm:text-base md:text-lg font-bold tracking-tight text-zinc-100 font-serif leading-snug uppercase">
                      {book.name}
                    </h2>
                    {isOnLatestChart && (
                      <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 sm:px-2 py-0.5 rounded text-[8px] sm:text-[9px] font-bold uppercase tracking-wider shrink-0">
                        <svg className="w-3 h-3 text-amber-400 fill-current" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span>On Chart</span>
                      </span>
                    )}
                    {book.series_id && (
                      <span className="inline-flex items-center bg-blue-950/30 text-blue-400 border border-blue-900/40 px-1.5 sm:px-2 py-0.5 rounded text-[8px] sm:text-[9px] font-bold uppercase tracking-wider">
                        {seriesMap[book.series_id]} #{book.series_order !== null ? Number(book.series_order) : "?"}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] sm:text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-2 sm:mb-3">
                    by {book.author}
                  </p>

                  {/* Metadata badges row */}
                  <div className="flex flex-wrap gap-1.5 sm:gap-2.5 items-center text-[10px] sm:text-xs">
                    <span className="inline-flex items-center gap-1 sm:gap-1.5 bg-amber-950/30 text-amber-400 border border-amber-900/40 px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                      <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400/90 fill-current" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span>{book.points} pts</span>
                    </span>
                    <span className="text-zinc-800 select-none">•</span>
                    {isOnLatestChart ? (
                      <span className="inline-flex items-center gap-1 sm:gap-1.5 text-amber-400 font-semibold">
                        Last seen: {formattedDate}
                        <span className="bg-amber-500/15 text-amber-400 px-1 sm:px-1.5 py-0.2 rounded text-[8px] sm:text-[9px] font-bold uppercase tracking-wider border border-amber-500/20 animate-pulse">
                          Current
                        </span>
                      </span>
                    ) : (
                      <span className="text-zinc-500 font-medium font-sans">
                        Last seen: {formattedDate}
                      </span>
                    )}
                    <span className="text-zinc-800 select-none">•</span>
                    <button
                      onClick={() => handleOpenSeriesModal(book)}
                      className="text-zinc-500 hover:text-zinc-300 font-bold uppercase text-[9px] sm:text-[10px] tracking-wider transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      <span>{book.series_id ? "Edit Series" : "Add to Series"}</span>
                    </button>
                  </div>
                </div>

                {/* Stats & Status Badge on the right */}
                <div className="flex flex-row md:flex-col md:items-end justify-between md:justify-start gap-3 shrink-0">
                  {/* Status badge */}
                  <StatusBadge bookId={book.id} initialStatus={book.status || "Unread"} />

                  {/* Longevity metric */}
                  <div className="text-right">
                    <p className="text-xs sm:text-sm font-bold text-zinc-300 font-mono">
                      {book.weeks} {book.weeks === 1 ? "week" : "weeks"}
                    </p>
                    <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">
                      High #{book.high}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <div className="py-20 text-center border border-dashed border-zinc-800/80 rounded-lg">
          <h3 className="text-base font-semibold text-zinc-400 mb-1">No books found</h3>
          <p className="text-xs text-zinc-600">
            Try adjusting your search query or status filter.
          </p>
        </div>
      )}

      {/* Series Manager Modal */}
      {activeModalBook && (
        <SeriesManager
          isOpen={!!activeModalBook}
          onClose={handleCloseSeriesModal}
          bookId={activeModalBook.id}
          bookName={activeModalBook.name}
          bookAuthor={activeModalBook.author}
          currentSeriesId={activeModalBook.series_id}
          currentSeriesOrder={activeModalBook.series_order}
        />
      )}
    </main>
  );
}
