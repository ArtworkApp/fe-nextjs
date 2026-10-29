'use client';

import { useEffect, useState, type KeyboardEvent } from 'react';
import { apiBaseUrl } from '../../lib/apiBaseUrl';

export interface ArtistOption {
  id: string;
  name: string;
  country: string | null;
}

interface Props {
  selectedId?: string;
  selectedArtist: ArtistOption | null;
  onSelect: (artist: ArtistOption | null) => void;
}

interface ArtistResponse {
  data: ArtistOption[];
}

const controlClass = 'mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900';

export function ArtistAutocomplete({ selectedId, selectedArtist, onSelect }: Props) {
  const [search, setSearch] = useState(selectedArtist?.name ?? '');
  const [results, setResults] = useState<ArtistOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const term = search.trim();
    if (term.length < 2 || selectedArtist?.name === term) {
      setResults([]);
      setLoading(false);
      setFailed(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setFailed(false);
    const timeout = window.setTimeout(() => {
      async function searchArtists() {
        try {
          const base = apiBaseUrl();
          if (!base) throw new Error('API URL is not configured');
          const params = new URLSearchParams({ search: term, limit: '21' });
          const response = await fetch(`${base}/artists?${params}`, { credentials: 'include', signal: controller.signal });
          if (!response.ok) throw new Error('Artist search failed');
          const payload = await response.json() as ArtistResponse;
          if (!Array.isArray(payload.data)) throw new Error('Invalid artist search response');
          if (!controller.signal.aborted) setResults(payload.data);
        } catch {
          if (!controller.signal.aborted) {
            setResults([]);
            setFailed(true);
          }
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      }
      void searchArtists();
    }, 300);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [search, selectedArtist, attempt]);

  function select(artist: ArtistOption | null) {
    onSelect(artist);
    setSearch(artist?.name ?? '');
    setOpen(false);
    setActiveIndex(-1);
    setResults([]);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && open && activeIndex >= 0) {
      event.preventDefault();
      select(results[activeIndex]);
    } else if (event.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return <div className="block">
    <label htmlFor="artist-search">Artist</label>
    <div className="relative w-full">
      <input id="artist-search" className={controlClass} role="combobox" aria-autocomplete="list"
        aria-expanded={open && results.length > 0} aria-controls="artist-search-options"
        aria-activedescendant={activeIndex >= 0 ? `artist-search-option-${activeIndex}` : undefined}
        autoComplete="off" value={search} placeholder="Search artist name"
        onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 100)}
        onKeyDown={handleKeyDown}
        onChange={(event) => {
          const value = event.target.value;
          setSearch(value);
          setOpen(true);
          setActiveIndex(-1);
          if (selectedArtist || selectedId) onSelect(null);
        }} />
      {open && search.trim().length >= 2 && <ul id="artist-search-options" role="listbox"
        className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-stone-300 bg-white py-1 shadow-lg">
        {loading && <li role="status" className="px-3 py-2 text-sm text-stone-500">Searching artists...</li>}
        {failed && <li className="px-3 py-2 text-sm text-red-700">Artist search failed. <button type="button" className="underline" onMouseDown={(event) => event.preventDefault()} onClick={() => setAttempt((value) => value + 1)}>Retry</button></li>}
        {!loading && !failed && results.length === 0 && <li className="px-3 py-2 text-sm text-stone-500">No artists found</li>}
        {!loading && results.map((artist, index) => <li key={artist.id} className="w-full">
          <button id={`artist-search-option-${index}`} type="button" role="option" aria-selected={index === activeIndex}
            className="block w-full px-3 py-2 text-left hover:bg-stone-100 focus-visible:bg-stone-100"
            onMouseDown={(event) => event.preventDefault()} onClick={() => select(artist)}>
            {artist.name}{artist.country ? ` · ${artist.country}` : ''}
          </button>
        </li>)}
      </ul>}
    </div>
    {selectedId && !selectedArtist && <p className="mt-1 text-sm text-stone-600">Selected artist ID: {selectedId}</p>}
    {(selectedArtist || selectedId) && <button type="button" className="mt-1 text-sm underline" onClick={() => select(null)}>Clear artist</button>}
  </div>;
}
