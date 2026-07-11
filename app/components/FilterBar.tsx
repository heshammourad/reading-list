"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

export default function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentSearch = searchParams.get("search") || "";
  const currentStatus = searchParams.get("status") || "Unread";

  const [search, setSearch] = useState(currentSearch);

  // Sync state with URL parameter if it changes elsewhere
  useEffect(() => {
    setSearch(currentSearch);
  }, [currentSearch]);

  const updateParams = (newSearch: string, newStatus: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (newSearch) {
      params.set("search", newSearch);
    } else {
      params.delete("search");
    }

    if (newStatus && newStatus !== "Unread") {
      params.set("status", newStatus);
    } else {
      params.delete("status");
    }

    // Reset to page 1 on search/filter change
    params.delete("page");

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams(search, currentStatus);
  };

  const handleStatusChange = (status: string) => {
    updateParams(search, status);
  };

  const statusOptions = [
    { value: "all", label: "All Books" },
    { value: "Unread", label: "Unread" },
    { value: "Reading", label: "Reading" },
    { value: "Read", label: "Read" },
  ];

  return (
    <div className="w-full flex flex-col sm:flex-row gap-4 items-center justify-between border-b border-zinc-800/80 pb-6 mb-8">
      {/* Search form */}
      <form onSubmit={handleSearchSubmit} className="relative w-full sm:max-w-md">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title or author..."
          className="w-full bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700/80 focus:border-zinc-600 focus:outline-none rounded pl-4 pr-28 py-2 text-xs text-zinc-100 placeholder-zinc-500 transition-colors font-sans"
        />
        {search && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              updateParams("", currentStatus);
            }}
            className="absolute right-20 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1 rounded-full hover:bg-zinc-800/50 transition-all cursor-pointer flex items-center justify-center"
            title="Clear search"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        <button
          type="submit"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 text-xs font-semibold tracking-wider uppercase border-l border-zinc-800 pl-3 cursor-pointer"
        >
          Search
        </button>
      </form>

      {/* Status tabs */}
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <div className="flex bg-zinc-950/80 p-0.5 rounded border border-zinc-800/80 w-full sm:w-auto overflow-x-auto">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleStatusChange(opt.value)}
              className={`px-3 py-1 rounded text-xs font-semibold tracking-wider uppercase transition-all whitespace-nowrap cursor-pointer ${
                currentStatus === opt.value
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {isPending && (
          <div className="h-1.5 w-1.5 rounded-full bg-zinc-500 animate-ping" />
        )}
      </div>
    </div>
  );
}
