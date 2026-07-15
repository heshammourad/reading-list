"use client";

import { useEffect, useState, useTransition } from "react";
import { updateBookCover } from "@/app/actions";
import { prefixUrl } from "@/config";

interface BookCoverProps {
  title: string;
  author: string;
  initialCover: string | null;
  bookId?: number;
  size?: "normal" | "small";
}

export default function BookCover({ title, author, initialCover, bookId, size = "normal" }: BookCoverProps) {
  const [coverUrl, setCoverUrl] = useState<string | null>(initialCover);
  const [loading, setLoading] = useState<boolean>(!initialCover);
  const [isEditingCover, setIsEditingCover] = useState(false);
  const [inputUrl, setInputUrl] = useState(initialCover || "");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (initialCover) {
      setCoverUrl(initialCover);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const fetchCover = async () => {
      try {
        const res = await fetch(
          prefixUrl(`/api/cover?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}`)
        );
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.cover_image_url) {
            setCoverUrl(data.cover_image_url);
          }
        }
      } catch (err) {
        console.error("Error fetching cover:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchCover();

    return () => {
      isMounted = false;
    };
  }, [title, author, initialCover]);

  const handleOpenEditCover = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setInputUrl(coverUrl || "");
    setIsEditingCover(true);
  };

  const handleSaveCover = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!bookId) return;

    startTransition(async () => {
      try {
        await updateBookCover(bookId, inputUrl.trim() || null);
        setCoverUrl(inputUrl.trim() || null);
        setIsEditingCover(false);
      } catch (err) {
        console.error("Failed to update cover:", err);
        alert("Failed to update cover image.");
      }
    });
  };

  const containerClasses = size === "small" ? "h-20 w-14 sm:h-24 sm:w-16" : "h-28 w-20 sm:h-36 sm:w-24";

  if (loading) {
    return (
      <div className={`flex shrink-0 animate-pulse items-center justify-center rounded bg-zinc-800 border border-zinc-700 shadow-md ${containerClasses}`}>
        <span className={`${size === "small" ? "text-[10px]" : "text-xs"} text-zinc-500 font-medium`}>Loading...</span>
      </div>
    );
  }

  // Common pencil hover button
  const renderEditButton = () => {
    if (!bookId) return null;
    return (
      <button
        onClick={handleOpenEditCover}
        type="button"
        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center cursor-pointer text-white z-20"
        title="Edit Cover Image"
      >
        <svg className="h-5 w-5 hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </button>
    );
  };

  return (
    <>
      {!coverUrl ? (
        <div className={`relative group flex shrink-0 flex-col items-center justify-between rounded bg-gradient-to-br from-zinc-800 to-zinc-950 p-2 text-center border border-zinc-700/50 shadow-md overflow-hidden ${containerClasses}`}>
          <div className="w-full flex-grow flex items-center justify-center">
            <p className={`${size === "small" ? "text-[8px] sm:text-[10px] leading-none line-clamp-3" : "text-[9px] sm:text-xs leading-tight line-clamp-4"} font-bold text-zinc-300 uppercase font-serif`}>
              {title}
            </p>
          </div>
          {size !== "small" && (
            <p className="text-[8px] sm:text-[10px] text-zinc-500 truncate w-full border-t border-zinc-850 pt-1">
              {author}
            </p>
          )}
          {renderEditButton()}
        </div>
      ) : (
        <div className={`relative group overflow-hidden rounded shadow-md hover:shadow-xl transition-all duration-300 border border-zinc-800 shrink-0 ${containerClasses}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverUrl}
            alt={`${title} cover`}
            className={`object-cover object-center group-hover:scale-105 transition-transform duration-300 ${containerClasses}`}
          />
          {renderEditButton()}
        </div>
      )}

      {/* Edit Cover Modal */}
      {isEditingCover && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg w-full max-w-md shadow-2xl relative text-zinc-100 animate-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-2 border-b border-zinc-800 pb-2">
              Edit Cover Image
            </h3>
            <p className="text-[11px] text-zinc-400 mb-4 leading-normal">
              Enter a custom image URL for <span className="text-zinc-200 font-semibold">&quot;{title}&quot;</span>. Leave blank to reset to default.
            </p>
            
            <div className="space-y-3">
              <input
                type="url"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://example.com/cover.jpg"
                disabled={isPending}
                className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700/80 focus:border-zinc-600 focus:outline-none rounded px-3 py-2 text-xs text-zinc-200 transition-colors"
                autoFocus
              />
            </div>

            <div className="mt-6 flex justify-end gap-3 text-xs">
              <button
                type="button"
                onClick={() => setIsEditingCover(false)}
                disabled={isPending}
                className="px-4 py-2 rounded text-zinc-400 hover:bg-zinc-850 hover:text-zinc-255 transition-all font-semibold uppercase tracking-wider cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCover}
                disabled={isPending}
                className="px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-950 rounded font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {isPending && (
                  <svg className="animate-spin h-3.5 w-3.5 text-zinc-950" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
