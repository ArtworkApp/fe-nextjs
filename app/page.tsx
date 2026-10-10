"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Artist = {
  id: number;
  name: string;
};

type Artwork = {
  id: number;
  title: string;
  imageUrl?: string | null;
  price?: number | null;
  currency?: string | null;
  artists?: Artist[];
};

type ArtworkResponse = {
  data: Artwork[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

const DEFAULT_SORT = "year_desc";
const PAGE_LIMIT = 21;

function formatPrice(price: number | null | undefined, currency?: string | null) {
  if (price == null) return "Price on Request";

  if (currency) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(price);
  }

  return `$${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(price)}`;
}

function buildArtworkUrl(sort: string, page: number) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(PAGE_LIMIT),
    sort,
  });

  return `${process.env.NEXT_PUBLIC_API_URL}/artworks?${params.toString()}`;
}

export default function Home() {
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncUrl = (nextSort: string) => {
    const params = new URLSearchParams(window.location.search);

    if (nextSort && nextSort !== DEFAULT_SORT) {
      params.set("sort", nextSort);
    } else {
      params.delete("sort");
    }

    const nextUrl = params.toString() ? `/?${params.toString()}` : "/";
    window.history.replaceState({}, "", nextUrl);
  };

  const fetchArtworkPage = async (nextSort: string, nextPage: number, replace = false) => {
    const url = buildArtworkUrl(nextSort, nextPage);

    try {
      if (replace) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      setError(null);

      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Unable to load artworks.");
      }

      const payload = (await response.json()) as ArtworkResponse;
      const nextArtworks = Array.isArray(payload.data) ? payload.data : [];
      const totalPages = payload.pagination?.totalPages ?? 1;
      setHasNext(nextPage < totalPages);

      if (replace) {
        setArtworks(nextArtworks);
      } else {
        setArtworks((prev) => [...prev, ...nextArtworks]);
      }
    } catch {
      setError("Unable to load artworks.");
    } finally {
      if (replace) {
        setIsLoading(false);
      } else {
        setIsLoadingMore(false);
      }
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialSort = params.get("sort") ?? DEFAULT_SORT;

    if (initialSort !== DEFAULT_SORT) {
      setSort(initialSort);
    }

    setPage(1);
    void fetchArtworkPage(initialSort, 1, true);
     
  }, []);

  useEffect(() => {
    if (!window.location.search && sort === DEFAULT_SORT) {
      return;
    }

    syncUrl(sort);
  }, [sort]);

  const handleSortChange = async (value: string) => {
    setSort(value);
    setPage(1);
    syncUrl(value);
    await fetchArtworkPage(value, 1, true);
  };

  const handleLoadMore = async () => {
    if (!hasNext || isLoadingMore) {
      return;
    }

    const nextPage = page + 1;
    setPage(nextPage);
    await fetchArtworkPage(sort, nextPage, false);
  };

  const handleClearFilters = async () => {
    setSort(DEFAULT_SORT);
    setPage(1);
    syncUrl(DEFAULT_SORT);
    await fetchArtworkPage(DEFAULT_SORT, 1, true);
  };

  return (
    <main className="min-h-screen bg-stone-50 text-stone-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-stone-500">
              Artwork collection
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Original artworks</h1>
          </div>

          <label className="flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-2 text-sm shadow-sm">
            <span className="sr-only">Sort artworks</span>
            <span>Sort</span>
            <select
              aria-label="Sort artworks"
              value={sort}
              onChange={(event) => void handleSortChange(event.target.value)}
              className="bg-transparent text-sm outline-none"
            >
              <option value="year_desc">Year: Newest First</option>
              <option value="year_asc">Year: Oldest First</option>
              <option value="price_asc">Price: Lowest First</option>
              <option value="price_desc">Price: Highest First</option>
            </select>
          </label>
        </header>

        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Filters</h2>
            <div className="mt-4 space-y-4 text-sm text-stone-600">
              <div className="rounded-2xl border border-dashed border-stone-200 p-4">
                <p className="font-medium text-stone-800">Artist</p>
                <p className="mt-2">Autocomplete coming soon.</p>
              </div>
              <div className="rounded-2xl border border-dashed border-stone-200 p-4">
                <p className="font-medium text-stone-800">Artwork type</p>
                <p className="mt-2">Type filters will load from the backend.</p>
              </div>
              <div className="rounded-2xl border border-dashed border-stone-200 p-4">
                <p className="font-medium text-stone-800">Materials</p>
                <p className="mt-2">Material selections are part of the backend contract.</p>
              </div>
            </div>
          </aside>

          <section>
            {error ? (
              <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
                <p className="text-xl font-semibold">Unable to load artworks.</p>
                <p className="mt-2">Please try again.</p>
                <button
                  type="button"
                  onClick={() => void fetchArtworkPage(sort, page || 1, true)}
                  className="mt-4 rounded-full bg-red-600 px-4 py-2 font-medium text-white"
                >
                  Retry
                </button>
              </div>
            ) : isLoading ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-80 animate-pulse rounded-3xl border border-stone-200 bg-stone-200"
                  />
                ))}
              </div>
            ) : artworks.length === 0 ? (
              <div className="rounded-3xl border border-stone-200 bg-white p-10 text-center shadow-sm">
                <p className="text-2xl font-semibold text-stone-900">No artworks found.</p>
                <p className="mt-3 text-stone-600">Try changing your filters.</p>
                <button
                  type="button"
                  onClick={() => void handleClearFilters()}
                  className="mt-6 rounded-full bg-stone-900 px-4 py-2 font-medium text-white"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {artworks.map((artwork) => {
                    const artists = artwork.artists?.length ? artwork.artists.map((artist) => artist.name).join(", ") : "Unknown artist";

                    return (
                      <article
                        key={artwork.id}
                        className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm"
                      >
                        <div className="relative h-56 overflow-hidden bg-stone-100">
                          {artwork.imageUrl ? (
                            <Image
                              src={artwork.imageUrl}
                              alt={`${artwork.title} by ${artists}`}
                              fill
                              unoptimized
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center bg-gradient-to-br from-stone-200 to-stone-100 text-sm font-medium uppercase tracking-[0.2em] text-stone-500">
                              Artwork
                            </div>
                          )}
                        </div>

                        <div className="space-y-3 p-4">
                          <h3 className="line-clamp-2 text-lg font-semibold text-stone-900">
                            {artwork.title}
                          </h3>
                          <p className="line-clamp-2 text-sm text-stone-600">{artists}</p>
                          <p className="text-lg font-semibold text-stone-900">
                            {formatPrice(artwork.price, artwork.currency)}
                          </p>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {hasNext && (
                  <div className="mt-8 flex justify-center">
                    <button
                      type="button"
                      onClick={() => void handleLoadMore()}
                      disabled={isLoadingMore}
                      className="rounded-full bg-stone-900 px-6 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-stone-400"
                    >
                      {isLoadingMore ? "Loading..." : "Load More"}
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
