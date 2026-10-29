"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArtworkFilters } from "./ArtworkFilters";
import { ArtworkCard, type ArtworkCardData } from "./ArtworkCard";
import { apiBaseUrl } from "../../lib/apiBaseUrl";
import { SiteHeader } from "../SiteHeader";
import { DEFAULT_SORT, parseArtworkQuery, serializeArtworkQuery, writeArtworkQuery, type ArtworkQuery, type ArtworkFilters as FilterValues } from "../../lib/artworks/query";

type ArtworkResponse = {
  data: ArtworkCardData[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

const PAGE_LIMIT = 21;

function buildArtworkUrl(query: ArtworkQuery, page: number) {
  const params = serializeArtworkQuery(query);
  params.set("page", String(page));
  params.set("limit", String(PAGE_LIMIT));
  params.set("sort", query.sort);
  const base = apiBaseUrl();
  return `${base}/artworks?${params.toString()}`;
}

export default function ArtworkListingPage() {
  const [query, setQuery] = useState<ArtworkQuery>({ filters: { materialIds: [] }, sort: DEFAULT_SORT });
  const requestController = useRef<AbortController | null>(null);
  const loadingMoreRef = useRef(false);
  const sort = query.sort;
  const [artworks, setArtworks] = useState<ArtworkCardData[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState(false);

  const fetchArtworkPage = useCallback(async (options: { query: ArtworkQuery; page: number; replace: boolean }) => {
    if (!options.replace && loadingMoreRef.current) return;
    if (options.replace) loadingMoreRef.current = false;
    else loadingMoreRef.current = true;
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    const url = buildArtworkUrl(options.query, options.page);
    try {
      if (options.replace) {
        setIsLoading(true);
        setIsLoadingMore(false);
        setLoadMoreError(false);
      } else {
        setIsLoadingMore(true);
        setLoadMoreError(false);
      }
      setError(null);
      const response = await fetch(url, { credentials: 'include', cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error("Unable to load artworks.");
      const payload = (await response.json()) as ArtworkResponse;
      if (controller.signal.aborted) return;
      const nextArtworks = Array.isArray(payload.data) ? payload.data : [];
      setHasNext(options.page < (payload.pagination?.totalPages ?? 1));
      if (options.replace) setArtworks(nextArtworks);
      else setArtworks((previous) => [...previous, ...nextArtworks]);
    } catch {
      if (!controller.signal.aborted) {
        if (options.replace) setError("Unable to load artworks.");
        else setLoadMoreError(true);
      }
    } finally {
      if (!controller.signal.aborted) {
        if (options.replace) setIsLoading(false);
        else {
          setIsLoadingMore(false);
          loadingMoreRef.current = false;
        }
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
        <SiteHeader currentPath="/artworks" />
        <div className="mb-8 mt-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-stone-500">
              Artwork collection
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Original artworks</h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
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
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <ArtworkFilters filters={query.filters} onApply={handleFiltersChange} />

          <section>
            {error ? (
              <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
                <p className="text-xl font-semibold">Unable to load artworks.</p>
                <p className="mt-2">Please try again.</p>
                <button
                  type="button"
                  onClick={() => void fetchArtworkPage({ query, page: 1, replace: true })}
                  className="mt-4 rounded-full bg-red-600 px-4 py-2 font-medium text-white"
                >
                  Retry
                </button>
              </div>
            ) : isLoading ? (
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
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
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                  {artworks.map((artwork) => <ArtworkCard key={artwork.id} artwork={artwork} />)}
                </div>

                {loadMoreError && <div role="alert" className="mt-6 text-center text-red-700">
                  <p>Unable to load more artworks.</p>
                  <button type="button" onClick={() => void fetchArtworkPage({ query, page, replace: false })}
                    className="mt-2 rounded-full border border-red-300 px-4 py-2 font-medium underline">
                    Retry Load More
                  </button>
                </div>}

                {hasNext && !loadMoreError && (
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
