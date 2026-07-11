"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { getSeriesList, createSeries, saveBookSeries, addSeriesBooks, searchExistingBooks, getSeriesBooks } from "@/app/actions";

interface SeriesManagerProps {
  isOpen: boolean;
  onClose: () => void;
  bookId: number;
  bookName: string;
  bookAuthor: string;
  currentSeriesId: number | null;
  currentSeriesOrder: number | null;
}

interface SeriesBookInput {
  name: string;
  author: string;
  seriesOrder: number;
  status: string;
  searchResults?: { id: number; name: string; author: string }[];
  showDropdown?: boolean;
}

export default function SeriesManager({
  isOpen,
  onClose,
  bookId,
  bookName,
  bookAuthor,
  currentSeriesId,
  currentSeriesOrder,
}: SeriesManagerProps) {
  const [seriesList, setSeriesList] = useState<{ id: number; name: string }[]>([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>(
    currentSeriesId ? currentSeriesId.toString() : ""
  );
  const [newSeriesName, setNewSeriesName] = useState("");
  const [seriesOrder, setSeriesOrder] = useState<string>(
    currentSeriesOrder ? currentSeriesOrder.toString() : ""
  );
  const [isPending, startTransition] = useTransition();

  // Sub-form for adding other books in the series
  const [newBooks, setNewBooks] = useState<SeriesBookInput[]>([]);

  const newSeriesInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedSeriesId === "new") {
      setTimeout(() => {
        newSeriesInputRef.current?.focus();
      }, 50);
    }
  }, [selectedSeriesId]);

  useEffect(() => {
    if (isOpen) {
      // Fetch available series
      getSeriesList().then(setSeriesList).catch(console.error);
      setSelectedSeriesId(currentSeriesId ? currentSeriesId.toString() : "");
      setSeriesOrder(currentSeriesOrder ? currentSeriesOrder.toString() : "");
      setNewSeriesName("");
    }
  }, [isOpen, currentSeriesId, currentSeriesOrder]);

  // Load other books in the series when selectedSeriesId changes
  useEffect(() => {
    if (isOpen) {
      const sId = selectedSeriesId && selectedSeriesId !== "new" ? parseInt(selectedSeriesId, 10) : null;
      if (sId && !isNaN(sId)) {
        getSeriesBooks(sId, bookId)
          .then(setNewBooks)
          .catch(console.error);
      } else {
        setNewBooks([]);
      }
    }
  }, [selectedSeriesId, isOpen, bookId]);

  if (!isOpen) return null;

  const handleAddBookRow = () => {
    setNewBooks([
      ...newBooks,
      {
        name: "",
        author: bookAuthor, // Default to the same author
        seriesOrder: newBooks.length > 0 ? Math.max(...newBooks.map(b => b.seriesOrder)) + 1 : 1,
        status: "Unread",
      },
    ]);
  };

  const handleRemoveBookRow = (idx: number) => {
    setNewBooks(newBooks.filter((_, i) => i !== idx));
  };

  const handleNewBookChange = (idx: number, field: keyof SeriesBookInput, value: any) => {
    const updated = [...newBooks];
    updated[idx] = { ...updated[idx], [field]: value };
    setNewBooks(updated);
  };

  const handleTitleInputChange = (idx: number, value: string) => {
    const updated = [...newBooks];
    updated[idx] = { 
      ...updated[idx], 
      name: value,
      showDropdown: value.trim().length >= 2,
    };
    setNewBooks(updated);

    if (value.trim().length >= 2) {
      searchExistingBooks(value)
        .then((results) => {
          setNewBooks((prev) => {
            const current = [...prev];
            if (current[idx] && current[idx].name === value) {
              current[idx] = {
                ...current[idx],
                searchResults: results,
              };
            }
            return current;
          });
        })
        .catch(console.error);
    } else {
      updated[idx].searchResults = [];
      setNewBooks(updated);
    }
  };

  const handleSelectAutocomplete = (idx: number, match: { id: number; name: string; author: string }) => {
    const updated = [...newBooks];
    updated[idx] = {
      ...updated[idx],
      name: match.name,
      author: match.author,
      searchResults: [],
      showDropdown: false,
    };
    setNewBooks(updated);
  };

  const handleSave = () => {
    startTransition(async () => {
      try {
        let finalSeriesId: number | null = null;

        if (selectedSeriesId === "new") {
          if (!newSeriesName.trim()) {
            alert("Please enter a new series name");
            return;
          }
          const created = await createSeries(newSeriesName);
          finalSeriesId = created.id;
        } else if (selectedSeriesId) {
          finalSeriesId = parseInt(selectedSeriesId, 10);
        }

        const parsedOrder = seriesOrder ? parseFloat(seriesOrder) : null;

        // Save current book series details
        await saveBookSeries(bookId, finalSeriesId, parsedOrder);

        // Add/update/remove additional books in the series
        if (finalSeriesId) {
          const booksToSend = newBooks.map((b) => ({
            name: b.name,
            author: b.author,
            seriesOrder: b.seriesOrder,
            status: b.status,
          }));
          await addSeriesBooks(finalSeriesId, booksToSend, bookId);
        }

        onClose();
      } catch (err: any) {
        console.error("Failed to save series:", err);
        alert(`Error saving series: ${err.message}`);
      }
    });
  };

  const allowedStatuses = ["Unread", "Reading", "Read", "On Hold", "Available", "Unavailable"];

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg w-full max-w-xl shadow-2xl relative my-8 text-zinc-100 max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="mb-5 pb-3 border-b border-zinc-800">
          <h3 className="text-base font-bold uppercase tracking-wider text-zinc-100 font-serif leading-tight">
            Manage Series
          </h3>
          <p className="text-xs text-zinc-400 mt-1 font-medium">
            Link <span className="text-zinc-200 font-semibold">"{bookName}"</span> to a reading series
          </p>
        </div>

        {/* Scrollable Form Area */}
        <div className="flex-grow overflow-y-auto pr-1 space-y-4 text-xs">
          
          {/* Series Selection */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Series Name
            </label>
            <select
              value={selectedSeriesId}
              onChange={(e) => setSelectedSeriesId(e.target.value)}
              disabled={isPending}
              className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700/80 focus:border-zinc-600 focus:outline-none rounded px-3 py-2 text-zinc-200 transition-colors"
            >
              <option value="">-- None / Remove from Series --</option>
              <option value="new">+ Create New Series...</option>
              {seriesList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* New Series Input */}
          {selectedSeriesId === "new" && (
            <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-150">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                New Series Name
              </label>
              <input
                ref={newSeriesInputRef}
                type="text"
                value={newSeriesName}
                onChange={(e) => setNewSeriesName(e.target.value)}
                placeholder="e.g. Nantucket Series"
                disabled={isPending}
                className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700/80 focus:border-zinc-600 focus:outline-none rounded px-3 py-2 text-zinc-200 transition-colors"
              />
            </div>
          )}

          {/* Order Input */}
          {selectedSeriesId && (
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Position / Order in Series (e.g. 3, 1.5)
              </label>
              <input
                type="number"
                step="any"
                value={seriesOrder}
                onChange={(e) => setSeriesOrder(e.target.value)}
                placeholder="e.g. 3"
                disabled={isPending}
                className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700/80 focus:border-zinc-600 focus:outline-none rounded px-3 py-2 text-zinc-200 transition-colors font-mono"
              />
            </div>
          )}

          {/* Add Prequels / Sequels Section */}
          {selectedSeriesId && (
            <div className="pt-4 border-t border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Add Prequels, Sequels or Other Books in this Series
                  </h4>
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    Include books in this series even if they didn't chart.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddBookRow}
                  disabled={isPending}
                  className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-700 rounded transition-colors cursor-pointer"
                >
                  + Add Book
                </button>
              </div>

              {/* Dynamic Rows */}
              {newBooks.length > 0 && (
                <div className="space-y-3 bg-zinc-950/40 border border-zinc-850 p-3 rounded max-h-60 overflow-y-auto">
                  {newBooks.map((book, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row gap-2.5 items-end border-b border-zinc-900 pb-3 last:border-0 last:pb-0">
                      
                      {/* Title */}
                      <div className="flex-grow w-full space-y-1 relative">
                        <label className="block text-[8px] font-bold uppercase tracking-wider text-zinc-500">Title</label>
                        <input
                          type="text"
                          value={book.name}
                          onChange={(e) => handleTitleInputChange(idx, e.target.value)}
                          onBlur={() => {
                            setTimeout(() => {
                              setNewBooks((prev) => {
                                const current = [...prev];
                                if (current[idx]) {
                                  current[idx].showDropdown = false;
                                }
                                return current;
                              });
                            }, 200);
                          }}
                          onFocus={() => {
                            if (book.name.trim().length >= 2) {
                              setNewBooks((prev) => {
                                const current = [...prev];
                                if (current[idx]) {
                                  current[idx].showDropdown = true;
                                }
                                return current;
                              });
                            }
                          }}
                          placeholder="The Castaways"
                          disabled={isPending}
                          required
                          className="w-full bg-zinc-900 border border-zinc-800 focus:outline-none focus:border-zinc-750 rounded px-2.5 py-1.5 text-xs text-zinc-200 transition-colors"
                        />
                        {book.showDropdown && book.searchResults && book.searchResults.length > 0 && (
                          <div className="absolute left-0 right-0 mt-1 bg-zinc-950 border border-zinc-800 rounded shadow-lg max-h-36 overflow-y-auto z-50">
                            {book.searchResults.map((match) => (
                              <button
                                key={match.id}
                                type="button"
                                onClick={() => handleSelectAutocomplete(idx, match)}
                                className="w-full text-left px-2.5 py-1.5 hover:bg-zinc-850 text-xs text-zinc-300 hover:text-white transition-colors border-b border-zinc-900/60 last:border-0 truncate flex flex-col cursor-pointer"
                              >
                                <span className="font-bold">{match.name}</span>
                                <span className="text-[10px] text-zinc-500 block">by {match.author}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Author */}
                      <div className="w-full sm:w-32 space-y-1">
                        <label className="block text-[8px] font-bold uppercase tracking-wider text-zinc-500">Author</label>
                        <input
                          type="text"
                          value={book.author}
                          onChange={(e) => handleNewBookChange(idx, "author", e.target.value)}
                          placeholder="Author name"
                          disabled={isPending}
                          required
                          className="w-full bg-zinc-900 border border-zinc-800 focus:outline-none focus:border-zinc-750 rounded px-2.5 py-1.5 text-xs text-zinc-200 transition-colors"
                        />
                      </div>

                      {/* Order & Status */}
                      <div className="flex gap-2 w-full sm:w-auto shrink-0">
                        {/* Order */}
                        <div className="w-16 space-y-1">
                          <label className="block text-[8px] font-bold uppercase tracking-wider text-zinc-500">Order</label>
                          <input
                            type="number"
                            step="any"
                            value={book.seriesOrder}
                            onChange={(e) => handleNewBookChange(idx, "seriesOrder", parseFloat(e.target.value) || 0)}
                            placeholder="#1"
                            disabled={isPending}
                            className="w-full bg-zinc-900 border border-zinc-800 focus:outline-none focus:border-zinc-750 rounded px-2.5 py-1.5 text-xs text-zinc-200 transition-colors font-mono"
                          />
                        </div>

                        {/* Status */}
                        <div className="w-24 space-y-1">
                          <label className="block text-[8px] font-bold uppercase tracking-wider text-zinc-500">Status</label>
                          <select
                            value={book.status}
                            onChange={(e) => handleNewBookChange(idx, "status", e.target.value)}
                            disabled={isPending}
                            className="w-full bg-zinc-900 border border-zinc-800 focus:outline-none focus:border-zinc-750 rounded px-2 py-1.5 text-xs text-zinc-200 transition-colors"
                          >
                            {allowedStatuses.map(statusOption => (
                              <option key={statusOption} value={statusOption}>{statusOption}</option>
                            ))}
                          </select>
                        </div>

                        {/* Remove */}
                        <button
                          type="button"
                          onClick={() => handleRemoveBookRow(idx)}
                          disabled={isPending}
                          className="px-2 py-1.5 text-red-500 hover:text-red-400 bg-red-950/20 border border-red-900/30 rounded transition-colors flex items-center justify-center shrink-0 cursor-pointer mb-0.5"
                          title="Remove Book"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Action Buttons */}
        <div className="mt-6 pt-3 border-t border-zinc-800 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 rounded text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200 transition-all font-semibold uppercase tracking-wider cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-950 rounded font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {isPending && (
              <svg className="animate-spin h-3.5 w-3.5 text-zinc-950" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            <span>{isPending ? "Saving..." : "Save Changes"}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
