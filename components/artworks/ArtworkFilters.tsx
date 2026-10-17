'use client';

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useLookup } from '../../hooks/useLookup';
import { DEFAULT_SORT, hasActiveFilters, parseArtworkQuery, serializeArtworkQuery, validateYears, type ArtworkFilters as Filters } from '../../lib/artworks/query';
import { COUNTRY_NAMES } from '../../util/countries';
import { ArtistAutocomplete, type ArtistOption } from './ArtistAutocomplete';

interface ArtworkType {
  id: string;
  name: string;
  active: boolean;
}
interface Material extends ArtworkType {
  artworkTypeId: string;
  artworkType: { id: string; name: string } | null;
}
interface Props {
  filters: Filters;
  onApply: (filters: Filters) => void;
}

const controlClass = 'mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900';

function FilterForm({ filters, onApply, selectedArtist, onArtistSelect, lookups }: Props & {
  selectedArtist: ArtistOption | null;
  onArtistSelect: (artist: ArtistOption | null) => void;
  lookups: {
    types: ReturnType<typeof useLookup<ArtworkType>>;
    materials: ReturnType<typeof useLookup<Material>>;
  };
}) {
  const [draft, setDraft] = useState(filters);
  const [error, setError] = useState<string | null>(null);
  const [countryOpen, setCountryOpen] = useState(false);
  const [activeCountryIndex, setActiveCountryIndex] = useState(-1);
  const { types, materials } = lookups;
  const countryQuery = draft.country?.trim().toLocaleLowerCase() ?? '';
  const countryOptions = countryQuery
    ? COUNTRY_NAMES.filter((country) => country.toLocaleLowerCase().includes(countryQuery))
    : COUNTRY_NAMES;
  const visibleMaterials = materials.data.filter((material) => !draft.artworkTypeId || material.artworkTypeId === draft.artworkTypeId);

  function selectCountry(country: string) {
    setDraft((previous) => ({ ...previous, country }));
    setCountryOpen(false);
    setActiveCountryIndex(-1);
  }

  function handleCountryKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setCountryOpen(true);
      setActiveCountryIndex((index) => Math.min(index + 1, countryOptions.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveCountryIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && countryOpen && activeCountryIndex >= 0) {
      event.preventDefault();
      selectCountry(countryOptions[activeCountryIndex]);
    } else if (event.key === 'Escape') {
      setCountryOpen(false);
      setActiveCountryIndex(-1);
    }
  }

  function changeType(typeId: string) {
    setDraft((previous) => ({
      ...previous,
      artworkTypeId: typeId,
      materialIds: typeId
        ? previous.materialIds.filter((id) => materials.data.some((material) => material.id === id && material.artworkTypeId === typeId))
        : previous.materialIds,
    }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateYears(draft.yearStart ?? '', draft.yearEnd ?? '');
    setError(validation);
    if (validation) return;
    // The same normalization is used for form submissions and incoming URLs.
    const params = serializeArtworkQuery({ filters: draft, sort: DEFAULT_SORT });
    onApply(parseArtworkQuery(params).filters);
  }

  return (
    <form onSubmit={submit} noValidate className="mt-4 space-y-5">
      <ArtistAutocomplete selectedId={draft.artistId}
        selectedArtist={selectedArtist?.id === draft.artistId ? selectedArtist : null} onSelect={(artist) => {
        onArtistSelect(artist);
        setDraft((previous) => ({ ...previous, artistId: artist?.id }));
      }} />
      <div>
        <label htmlFor="artwork-type">Artwork type</label>
        <select id="artwork-type" className={controlClass} value={draft.artworkTypeId ?? ''}
        disabled={types.loading || types.failed || materials.loading}
          onChange={(event) => changeType(event.target.value)}>
          <option value="">All artwork types</option>
          {draft.artworkTypeId && !types.data.some((type) => type.id === draft.artworkTypeId) &&
            <option value={draft.artworkTypeId}>Selected type ({draft.artworkTypeId})</option>}
          {types.data.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
        </select>
        {types.loading && <p role="status">Loading artwork types...</p>}
        {types.failed && <div role="alert">Unable to load artwork types. <button type="button" onClick={types.retry} className="underline">Retry artwork types</button></div>}
      </div>
      <fieldset>
        <legend>Materials</legend>
        {materials.loading && <p role="status">Loading materials...</p>}
        {materials.failed && <div role="alert">Unable to load materials. <button type="button" onClick={materials.retry} className="underline">Retry materials</button></div>}
        {!materials.loading && !materials.failed && visibleMaterials.length === 0 && <p>No materials available.</p>}
        {visibleMaterials.map((material) => <label key={material.id} className="flex items-center gap-2 py-1">
          <input type="checkbox" checked={draft.materialIds.includes(material.id)} onChange={(event) => {
            const checked = event.target.checked;
            setDraft((previous) => ({ ...previous, materialIds: checked ? [...previous.materialIds, material.id] : previous.materialIds.filter((id) => id !== material.id) }));
          }} />
          {material.name}
        </label>)}
      </fieldset>
      <fieldset>
        <legend>Year range</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label>From<input className={controlClass} type="number" min={0} step={1} inputMode="numeric" value={draft.yearStart ?? ''}
            aria-invalid={Boolean(error)} aria-describedby={error ? 'year-error' : undefined}
            onChange={(event) => setDraft({ ...draft, yearStart: event.target.value })} /></label>
          <label>To<input className={controlClass} type="number" min={0} step={1} inputMode="numeric" value={draft.yearEnd ?? ''}
            aria-invalid={Boolean(error)} aria-describedby={error ? 'year-error' : undefined}
            onChange={(event) => setDraft({ ...draft, yearEnd: event.target.value })} /></label>
        </div>
        {error && <p id="year-error" role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
      </fieldset>
      <div className="block">
        <label htmlFor="artist-country">Artist country</label>
        <div className="relative w-full">
          <input id="artist-country" className={controlClass} role="combobox" aria-autocomplete="list"
            aria-expanded={countryOpen && countryOptions.length > 0} aria-controls="artist-country-options"
            aria-activedescendant={activeCountryIndex >= 0 ? `artist-country-option-${activeCountryIndex}` : undefined}
            autoComplete="off" value={draft.country ?? ''}
            onFocus={() => setCountryOpen(true)}
            onBlur={() => window.setTimeout(() => setCountryOpen(false), 100)}
            onKeyDown={handleCountryKeyDown}
            onChange={(event) => {
              setDraft({ ...draft, country: event.target.value });
              setCountryOpen(true);
              setActiveCountryIndex(-1);
            }} />
          {countryOpen && countryQuery && <ul id="artist-country-options" role="listbox"
            className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-stone-300 bg-white py-1 shadow-lg">
            {countryOptions.length > 0 ? countryOptions.map((country, index) => <li key={country} className="w-full">
              <button id={`artist-country-option-${index}`} type="button" role="option" aria-selected={index === activeCountryIndex}
                className="block w-full px-3 py-2 text-left hover:bg-stone-100 focus-visible:bg-stone-100"
                onMouseDown={(event) => event.preventDefault()} onClick={() => selectCountry(country)}>{country}</button>
            </li>) : <li className="px-3 py-2 text-sm text-stone-500">No countries found</li>}
          </ul>}
        </div>
      </div>
      <button type="submit" className="rounded-full bg-stone-900 px-4 py-2 text-white focus-visible:outline-2 focus-visible:outline-offset-2">Apply filters</button>
    </form>
  );
}

export function ArtworkFilters({ filters, onApply }: Props) {
  const types = useLookup<ArtworkType>('artwork-types');
  const materials = useLookup<Material>('materials');
  const [selectedArtist, setSelectedArtist] = useState<ArtistOption | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [formVersion, setFormVersion] = useState(0);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const key = serializeArtworkQuery({ filters, sort: DEFAULT_SORT }).toString();
  const selected = [
    filters.artistId && `Artist ID: ${filters.artistId}`,
    filters.artworkTypeId && (types.data.find((type) => type.id === filters.artworkTypeId)?.name ?? `Type ID: ${filters.artworkTypeId}`),
    ...filters.materialIds.map((id) => materials.data.find((material) => material.id === id)?.name ?? `Material ID: ${id}`),
    filters.yearStart !== undefined && `From ${filters.yearStart}`,
    filters.yearEnd !== undefined && `To ${filters.yearEnd}`,
    filters.country,
  ].filter((value): value is string => typeof value === 'string' && value.length > 0);

  function closeMobileSheet() {
    setFormVersion((version) => version + 1);
    setMobileOpen(false);
  }

  function applyFilters(nextFilters: Filters) {
    onApply(nextFilters);
    setMobileOpen(false);
  }

  useEffect(() => {
    if (!mobileOpen) return;
    const filterTrigger = filterTriggerRef.current;
    closeButtonRef.current?.focus();
    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') closeMobileSheet();
    }
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      filterTrigger?.focus();
    };
  }, [mobileOpen]);

  function trapDialogFocus(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== 'Tab') return;
    const focusable = event.currentTarget.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return <>
    <button ref={filterTriggerRef} type="button" aria-expanded={mobileOpen} aria-controls="artwork-filter-panel"
      onClick={() => setMobileOpen(true)} className="mb-4 rounded-full border border-stone-300 bg-white px-4 py-2 font-medium lg:hidden">
      Open filters{hasActiveFilters(filters) ? ` (${selected.length})` : ''}
    </button>
    {mobileOpen && <button type="button" aria-label="Close filters" onClick={closeMobileSheet}
      className="fixed inset-0 z-40 bg-black/50 lg:hidden" />}
    <aside id="artwork-filter-panel" onKeyDown={trapDialogFocus}
      role={mobileOpen ? 'dialog' : undefined} aria-modal={mobileOpen || undefined} aria-labelledby="artwork-filter-heading"
      className={mobileOpen
        ? 'fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] overflow-y-auto rounded-t-3xl border border-stone-200 bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl lg:sticky lg:top-4 lg:block lg:max-h-[calc(100vh-2rem)] lg:rounded-3xl'
        : 'hidden rounded-3xl border border-stone-200 bg-white p-5 shadow-sm lg:sticky lg:top-4 lg:block'}>
      <div className="flex items-center justify-between gap-4">
        <h2 id="artwork-filter-heading" className="text-lg font-semibold">Filters</h2>
        {mobileOpen && <button ref={closeButtonRef} type="button" onClick={closeMobileSheet} className="rounded-full px-3 py-2 underline lg:hidden">Close</button>}
      </div>
      {hasActiveFilters(filters) && <div className="mt-3">
        <ul aria-label="Applied filters" className="flex flex-wrap gap-2">
          {selected.map((label, index) => <li key={`${index}-${label}`} className="rounded-full bg-stone-100 px-3 py-1 text-sm">{label}</li>)}
        </ul>
        <button type="button" onClick={() => {
          setSelectedArtist(null);
          onApply({ materialIds: [] });
          setMobileOpen(false);
        }} className="mt-3 underline">Clear Filters</button>
      </div>}
      <FilterForm key={`${key}-${formVersion}`} filters={filters} onApply={applyFilters} selectedArtist={selectedArtist}
        onArtistSelect={setSelectedArtist} lookups={{ types, materials }} />
    </aside>
  </>;
}
