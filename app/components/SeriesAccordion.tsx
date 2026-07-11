"use client";

import { useState } from "react";
import BookCover from "./BookCover";
import StatusBadge from "./StatusBadge";

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

interface SeriesAccordionProps {
  rank: number;
  primaryBook: BookData;
  seriesName: string;
  allMatchingBooks: BookData[]; // All books in the series matching the current filter
  onEditSeries: () => void;
}

export default function SeriesAccordion({
  rank,
  primaryBook,
  seriesName,
  allMatchingBooks,
  onEditSeries,
}: SeriesAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Sort series books by order
  const sortedBooks = [...allMatchingBooks].sort((a, b) => {
    const orderA = a.series_order !== null ? Number(a.series_order) : 999;
    const orderB = b.series_order !== null ? Number(b.series_order) : 999;
    return orderA - orderB;
  });

  // Filter out the primary book to list the "other" books in the expanded view
  const otherBooks = sortedBooks.filter((b) => b.id !== primaryBook.id);

  // Format last seen date
  const formattedDate = primaryBook.last
    ? new Date(primaryBook.last).toLocaleDateString("en-US", {
        timeZone: "UTC",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "N/A";

  return (
    <div className="border-b border-zinc-900/80 py-6 hover:bg-zinc-900/5 transition-all duration-200 px-2 rounded -mx-2">
      {/* Primary / Header Book Card */}
      <div className="flex gap-4 sm:gap-6 items-start">
        {/* Rank */}
        <div className="text-xl sm:text-2xl font-black text-zinc-700 w-8 sm:w-10 shrink-0 text-center font-mono pt-1">
          {rank}
        </div>

        {/* Cover */}
        <BookCover
          title={primaryBook.name}
          author={primaryBook.author}
          initialCover={primaryBook.cover_image_url}
          bookId={primaryBook.id}
        />

        {/* Book Details */}
        <div className="flex-grow min-w-0 flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex-grow min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-zinc-100 font-serif leading-snug uppercase">
                {primaryBook.name}
              </h2>
              {/* Series badge */}
              <span className="inline-flex items-center bg-blue-950/30 text-blue-400 border border-blue-900/40 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                {seriesName} #{primaryBook.series_order !== null ? Number(primaryBook.series_order) : "?"}
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-3">
              by {primaryBook.author}
            </p>

            {/* Metadata badges row */}
            <div className="flex flex-wrap gap-2.5 items-center text-xs">
              {primaryBook.points !== undefined && (
                <span className="inline-flex items-center gap-1.5 bg-amber-950/30 text-amber-400 border border-amber-900/40 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">
                  <svg className="w-3 h-3 text-amber-400/90 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span>{primaryBook.points} pts</span>
                </span>
              )}
              {primaryBook.points !== undefined && <span className="text-zinc-800 select-none">•</span>}
              <span className="text-zinc-500 font-medium">
                Last seen: {formattedDate}
              </span>
              <span className="text-zinc-800 select-none">•</span>
              <button
                onClick={onEditSeries}
                className="text-zinc-500 hover:text-zinc-300 font-bold uppercase text-[10px] tracking-wider transition-colors cursor-pointer flex items-center gap-1"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Edit Series
              </button>
            </div>
          </div>

          {/* Stats & Status Badge on the right */}
          <div className="flex flex-row md:flex-col md:items-end justify-between md:justify-start gap-3 shrink-0">
            {/* Status badge */}
            <StatusBadge bookId={primaryBook.id} initialStatus={primaryBook.status || "Unread"} />

            {/* Longevity metric */}
            {primaryBook.weeks !== undefined && (
              <div className="text-right">
                <p className="text-xs sm:text-sm font-bold text-zinc-300 font-mono">
                  {primaryBook.weeks} {primaryBook.weeks === 1 ? "week" : "weeks"}
                </p>
                <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">
                  High #{primaryBook.high}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Accordion Toggle Trigger */}
      {otherBooks.length > 0 && (
        <div className="pl-12 sm:pl-16 mt-3">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-zinc-900/60 border border-zinc-850 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 text-xs font-semibold tracking-wide uppercase transition-all duration-200 cursor-pointer"
          >
            <span>
              {isOpen ? "Hide Series" : `Show Series (${sortedBooks.length} Books)`}
            </span>
            <svg
              className={`h-3.5 w-3.5 transition-transform duration-200 text-zinc-500 ${isOpen ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      )}

      {/* Expanded Accordion List */}
      {isOpen && otherBooks.length > 0 && (
        <div className="pl-12 sm:pl-16 mt-4 space-y-4 border-l-2 border-zinc-800/60 ml-4 sm:ml-5 animate-in fade-in slide-in-from-top-2 duration-200">
          {sortedBooks.map((book) => {
            const isPrimary = book.id === primaryBook.id;
            return (
              <div
                key={book.id}
                className={`flex gap-4 p-3 rounded-lg border transition-all ${
                  isPrimary
                    ? "bg-zinc-900/20 border-zinc-800/40 opacity-70"
                    : "bg-zinc-950/40 border-zinc-900/50 hover:bg-zinc-950/70"
                }`}
              >
                {/* Cover (mini size inside accordion) */}
                <div className="shrink-0">
                  <BookCover
                    title={book.name}
                    author={book.author}
                    initialCover={book.cover_image_url}
                    bookId={book.id}
                    size="small"
                  />
                </div>

                {/* Details */}
                <div className="flex-grow min-w-0 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h4 className="text-sm font-bold tracking-tight text-zinc-200 font-serif leading-snug uppercase truncate">
                        {book.name}
                      </h4>
                      <span className="text-[10px] font-bold text-blue-400 bg-blue-950/20 border border-blue-900/30 px-1.5 py-0.2 rounded font-mono uppercase tracking-wider shrink-0">
                        Book {book.series_order !== null ? Number(book.series_order) : "?"}
                      </span>
                      {isPrimary && (
                        <span className="text-[9px] font-bold text-amber-500 bg-amber-950/20 border border-amber-900/30 px-1.5 py-0.2 rounded uppercase tracking-wider shrink-0">
                          Current Charted
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider mt-0.5">
                      by {book.author}
                    </p>
                  </div>

                  {/* Interactive StatusBadge */}
                  <div className="shrink-0 pt-0.5">
                    <StatusBadge bookId={book.id} initialStatus={book.status || "Unread"} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
