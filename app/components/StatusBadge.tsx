"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { updateBookStatus } from "@/app/actions";

interface StatusBadgeProps {
  bookId: number;
  initialStatus: string;
}

export default function StatusBadge({ bookId, initialStatus }: StatusBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState(initialStatus || "Unread");
  const [isPending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleStatusSelect = (newStatus: string) => {
    if (newStatus === status) {
      setIsOpen(false);
      return;
    }

    // Optimistically update the UI status
    const previousStatus = status;
    setStatus(newStatus);
    setIsOpen(false);

    startTransition(async () => {
      try {
        await updateBookStatus(bookId, newStatus);
      } catch (error) {
        console.error("Failed to update status:", error);
        // Revert on failure
        setStatus(previousStatus);
      }
    });
  };

  // Color styles for status pill badges
  let statusBadgeClass = "bg-zinc-800/40 text-zinc-400 border-zinc-700/50 hover:bg-zinc-700/30 hover:text-zinc-300";
  let dotClass = "bg-zinc-500";
  if (status === "Read") {
    statusBadgeClass = "bg-emerald-950/40 text-emerald-400 border-emerald-900/50 hover:bg-emerald-900/30 hover:text-emerald-300";
    dotClass = "bg-emerald-400";
  } else if (status === "Reading") {
    statusBadgeClass = "bg-amber-950/40 text-amber-400 border-amber-900/50 hover:bg-amber-900/30 hover:text-amber-300";
    dotClass = "bg-amber-400";
  } else if (status === "On Hold") {
    statusBadgeClass = "bg-blue-950/40 text-blue-400 border-blue-900/50 hover:bg-blue-900/30 hover:text-blue-300";
    dotClass = "bg-blue-400";
  } else if (status === "Available") {
    statusBadgeClass = "bg-purple-950/40 text-purple-400 border-purple-900/50 hover:bg-purple-900/30 hover:text-purple-300";
    dotClass = "bg-purple-400";
  } else if (status === "Unavailable") {
    statusBadgeClass = "bg-rose-950/40 text-rose-400 border-rose-900/50 hover:bg-rose-900/30 hover:text-rose-300";
    dotClass = "bg-rose-400";
  }

  const statusOptions = [
    { value: "Unread", label: "Unread", badgeClass: "bg-zinc-800/40 text-zinc-400 border-zinc-700/50 hover:bg-zinc-850 hover:text-zinc-200", dot: "bg-zinc-500" },
    { value: "Reading", label: "Reading", badgeClass: "bg-amber-950/40 text-amber-400 border-amber-900/50 hover:bg-amber-950/80 hover:text-amber-300", dot: "bg-amber-400" },
    { value: "On Hold", label: "On Hold", badgeClass: "bg-blue-950/40 text-blue-400 border-blue-900/50 hover:bg-blue-950/80 hover:text-blue-300", dot: "bg-blue-400" },
    { value: "Available", label: "Available", badgeClass: "bg-purple-950/40 text-purple-400 border-purple-900/50 hover:bg-purple-950/80 hover:text-purple-300", dot: "bg-purple-400" },
    { value: "Unavailable", label: "Unavailable", badgeClass: "bg-rose-950/40 text-rose-400 border-rose-900/50 hover:bg-rose-950/80 hover:text-rose-300", dot: "bg-rose-400" },
    { value: "Read", label: "Read", badgeClass: "bg-emerald-950/40 text-emerald-400 border-emerald-900/50 hover:bg-emerald-950/80 hover:text-emerald-300", dot: "bg-emerald-400" },
  ];

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => !isPending && setIsOpen(!isOpen)}
        disabled={isPending}
        className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest px-2.5 py-1.5 rounded border transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-zinc-700 ${statusBadgeClass} ${
          isPending ? "opacity-60 cursor-not-allowed" : "cursor-pointer active:scale-95"
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${isPending ? "animate-pulse bg-zinc-400" : dotClass}`} />
        <span>{isPending ? "Updating..." : status}</span>
        
        {isPending ? (
          <svg className="animate-spin h-3 w-3 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <svg
            className={`h-3 w-3 transition-transform duration-200 text-zinc-500 group-hover:text-zinc-300 ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="3"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-40 origin-top-right rounded border border-zinc-800 bg-zinc-900/90 backdrop-blur-md shadow-xl ring-1 ring-black/5 focus:outline-none z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-100">
          <div className="py-1">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleStatusSelect(option.value)}
                className={`w-full flex items-center justify-between text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors duration-150 ${
                  status === option.value
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${option.dot}`} />
                  <span>{option.label}</span>
                </div>
                {status === option.value && (
                  <svg className="h-3 w-3 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
