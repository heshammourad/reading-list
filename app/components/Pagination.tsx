"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalEntries: number;
  pageSize: number;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalEntries,
  pageSize,
}: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const startEntry = (currentPage - 1) * pageSize + 1;
  const endEntry = Math.min(currentPage * pageSize, totalEntries);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 2) {
        end = 4;
      } else if (currentPage >= totalPages - 1) {
        start = totalPages - 3;
      }

      if (start > 2) {
        pages.push("...");
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 1) {
        pages.push("...");
      }

      pages.push(totalPages);
    }
    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-zinc-800/80 pt-6 mt-8 mb-12">
      <p className="text-xs text-zinc-500 font-sans">
        Showing <span className="font-semibold text-zinc-300">{startEntry}</span> to{" "}
        <span className="font-semibold text-zinc-300">{endEntry}</span> of{" "}
        <span className="font-semibold text-zinc-300">{totalEntries}</span> books
      </p>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1 || isPending}
          className="px-3 py-1.5 rounded border border-zinc-800 text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 disabled:opacity-30 disabled:hover:text-zinc-400 disabled:hover:border-zinc-800 transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          Prev
        </button>

        <div className="hidden sm:flex items-center gap-1">
          {getPageNumbers().map((p, idx) => {
            if (p === "...") {
              return (
                <span
                  key={`ell-${idx}`}
                  className="px-2 text-zinc-600 text-xs font-semibold select-none"
                >
                  ...
                </span>
              );
            }
            return (
              <button
                key={`page-${p}`}
                onClick={() => handlePageChange(p as number)}
                disabled={isPending}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer ${
                  currentPage === p
                    ? "bg-zinc-800 text-white border border-zinc-700"
                    : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages || isPending}
          className="px-3 py-1.5 rounded border border-zinc-800 text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 disabled:opacity-30 disabled:hover:text-zinc-400 disabled:hover:border-zinc-800 transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}
