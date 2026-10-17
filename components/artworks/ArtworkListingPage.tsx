"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArtworkFilters } from "./ArtworkFilters";
import { DEFAULT_SORT, parseArtworkQuery, serializeArtworkQuery, writeArtworkQuery, type ArtworkQuery, type ArtworkFilters as FilterValues } from "../../lib/artworks/query";

type Artist = {
  id: string;
  name: string;
  country: string | null;
};

type ArtworkImage = {
  id: string;
  url: string;
  altText: string | null;
  mimeType: string;
  isPrimary: boolean;
  sortOrder: number;
  originalFilename: string;
};

type Artwork = {
  id: string;
  title: string;
  primaryImage: ArtworkImage | null;
  price?: number | null;
  currency?: string | null;
  artist: Artist[];
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

function buildArtworkUrl(query: ArtworkQuery, page: number) {
  const params = serializeArtworkQuery(query);
  params.set("page", String(page));
  params.set("limit", String(PAGE_LIMIT));
  params.set("sort", query.sort);
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  return `${base}/artworks?${params.toString()}`;
}

function resolveArtworkImageUrl(imageUrl: string | null | undefined) {
  if (!imageUrl) {
    return null;
  }

  if (/^https?:\/\//i.test(imageUrl)) {
    return imageUrl;
  }

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiBaseUrl) {
    return null;
  }

  try {
    return new URL(imageUrl, new URL(apiBaseUrl).origin).toString();
  } catch {
    return null;
  }
}

export default function Home() {
  const [query, setQuery] = useState<ArtworkQuery>({ filters: { materialIds: [] }, sort: DEFAULT_SORT });
  const requestController = useRef<AbortController | null>(null);
  const sort = query.sort;
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchArtworkPage = useCallback(async (options: { query: ArtworkQuery; page: number; replace: boolean }) => {
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    const url = buildArtworkUrl(options.query, options.page);
    try {
      if (options.replace) {
        setIsLoading(true);
        setIsLoadingMore(false);
      } else {
        setIsLoadingMore(true);
      }
      setError(null);
      const response = await fetch(url, { cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error("Unable to load artworks.");
      const payload = (await response.json()) as ArtworkResponse;
      if (controller.signal.aborted) return;
      const nextArtworks = Array.isArray(payload.data) ? payload.data : [];
      setHasNext(options.page < (payload.pagination?.totalPages ?? 1));
      if (options.replace) setArtworks(nextArtworks);
      else setArtworks((previous) => [...previous, ...nextArtworks]);
    } catch {
      if (!controller.signal.aborted) setError("Unable to load artworks.");
    } finally {
      if (!controller.signal.aborted) {
        if (options.replace) setIsLoading(false);
        else setIsLoadingMore(false);
      }
    }
  }, []);

  useEffect(() => {
    function restoreQuery() {
      const restored = parseArtworkQuery(new URLSearchParams(window.location.search));
      setQuery(restored);
      setPage(1);
      writeArtworkQuery(restored, "replace");
      void fetchArtworkPage({ query: restored, page: 1, replace: true });
    }
    restoreQuery();
    window.addEventListener("popstate", restoreQuery);
    return () => {
      window.removeEventListener("popstate", restoreQuery);
      requestController.current?.abort();
    };
  }, [fetchArtworkPage]);

  function applyQuery(next: ArtworkQuery) {
    if (serializeArtworkQuery(next).toString() === serializeArtworkQuery(query).toString()) return;
    setQuery(next);
    setPage(1);
    writeArtworkQuery(next, "push");
    void fetchArtworkPage({ query: next, page: 1, replace: true });
  }

  function handleSortChange(value: string) {
    const params = serializeArtworkQuery(query);
    params.set("sort", value);
    applyQuery(parseArtworkQuery(params));
  }

  function handleFiltersChange(filters: FilterValues) {
    applyQuery({ filters, sort });
  }

  async function handleLoadMore() {
    if (!hasNext || isLoadingMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchArtworkPage({ query, page: nextPage, replace: false });
  }

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
          <ArtworkFilters filters={query.filters} onApply={handleFiltersChange} />

          <section>
            {error ? (
              <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
                <p className="text-xl font-semibold">Unable to load artworks.</p>
                <p className="mt-2">Please try again.</p>
                <button
                  type="button"
                  onClick={() => void fetchArtworkPage({ query, page: page || 1, replace: true })}
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

              </div>
            ) : (
              <>
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {artworks.map((artwork) => {
                    const artistNames = artwork.artist.map((artist) => artist.name);
                    const artists = artistNames.length
                      ? artistNames.join(", ")
                      : "Unknown artist";
                    const imageUrl = resolveArtworkImageUrl(
                      artwork.primaryImage?.url,
                    );
                    const imageAlt =
                      artwork.primaryImage?.altText?.trim() ||
                      `${artwork.title} by ${artists}`;

                    return (
                      <article
                        key={artwork.id}
                        className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm"
                      >
                        <div className="relative h-56 overflow-hidden bg-stone-100">
                          {imageUrl ? (
                            <Image
                              src={imageUrl}
                              alt={imageAlt}
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
