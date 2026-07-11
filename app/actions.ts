"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateBookStatus(bookId: number, status: string) {
  if (!bookId) {
    throw new Error("Book ID is required");
  }

  // Allowed status values
  const allowedStatuses = ["Unread", "Reading", "Read", "On Hold", "Available", "Unavailable"];
  if (!allowedStatuses.includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }

  await prisma.books.update({
    where: { id: bookId },
    data: { status },
  });

  revalidatePath("/");
}

export async function getSeriesList() {
  return await prisma.series.findMany({
    orderBy: { name: "asc" },
  });
}

export async function createSeries(name: string) {
  if (!name.trim()) throw new Error("Series name is required");
  
  const existing = await prisma.series.findUnique({
    where: { name: name.trim() },
  });
  if (existing) return existing;

  const newSeries = await prisma.series.create({
    data: { name: name.trim() },
  });
  
  revalidatePath("/");
  return newSeries;
}

export async function updateBookCover(bookId: number, coverImageUrl: string | null) {
  if (!bookId) throw new Error("Book ID is required");

  await prisma.books.update({
    where: { id: bookId },
    data: {
      cover_image_url: coverImageUrl ? coverImageUrl.trim() : null,
    },
  });
  revalidatePath("/");
}

export async function saveBookSeries(
  bookId: number,
  seriesId: number | null,
  seriesOrder: number | null
) {
  await prisma.books.update({
    where: { id: bookId },
    data: {
      series_id: seriesId,
      series_order: seriesOrder,
    },
  });
  revalidatePath("/");
}

export async function addSeriesBooks(
  seriesId: number,
  booksList: { name: string; author: string; seriesOrder: number; status: string }[]
) {
  for (const b of booksList) {
    if (!b.name.trim() || !b.author.trim()) continue;
    
    // Check if book already exists
    const existing = await prisma.books.findUnique({
      where: {
        name_author: {
          name: b.name.trim(),
          author: b.author.trim(),
        },
      },
    });

    if (existing) {
      await prisma.books.update({
        where: { id: existing.id },
        data: {
          series_id: seriesId,
          series_order: b.seriesOrder,
          status: existing.status === "Unread" || !existing.status ? b.status : existing.status,
        },
      });
    } else {
      await prisma.books.create({
        data: {
          name: b.name.trim(),
          author: b.author.trim(),
          series_id: seriesId,
          series_order: b.seriesOrder,
          status: b.status || "Unread",
        },
      });
    }
  }
  revalidatePath("/");
}

export async function searchExistingBooks(query: string) {
  if (!query || query.trim().length < 2) return [];
  
  return await prisma.books.findMany({
    where: {
      name: {
        contains: query.trim(),
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      name: true,
      author: true,
    },
    take: 8,
  });
}
