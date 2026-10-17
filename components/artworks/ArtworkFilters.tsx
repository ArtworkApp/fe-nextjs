'use client';

import { useState, type FormEvent } from 'react';
import { useLookup } from '../../hooks/useLookup';
import { DEFAULT_SORT, hasActiveFilters, parseArtworkQuery, serializeArtworkQuery, validateYears, type ArtworkFilters as Filters } from '../../lib/artworks/query';

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

function FilterForm({ filters, onApply, lookups }: Props & {
  lookups: { types: ReturnType<typeof useLookup<ArtworkType>>; materials: ReturnType<typeof useLookup<Material>> };
}) {
  const [draft, setDraft] = useState(filters);
  const [error, setError] = useState<string | null>(null);
  const { types, materials } = lookups;
  const visibleMaterials = materials.data.filter((material) => !draft.artworkTypeId || material.artworkTypeId === draft.artworkTypeId);

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
      <div>
        <label htmlFor="artwork-type">Artwork type</label>
        <select id="artwork-type" className={controlClass} value={draft.artworkTypeId ?? ''}
          disabled={types.loading || types.failed || materials.loading || materials.failed}
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
          <label>Year from<input className={controlClass} inputMode="numeric" value={draft.yearStart ?? ''}
            aria-invalid={Boolean(error)} aria-describedby={error ? 'year-error' : undefined}
            onChange={(event) => setDraft({ ...draft, yearStart: event.target.value })} /></label>
          <label>Year to<input className={controlClass} inputMode="numeric" value={draft.yearEnd ?? ''}
            aria-invalid={Boolean(error)} aria-describedby={error ? 'year-error' : undefined}
            onChange={(event) => setDraft({ ...draft, yearEnd: event.target.value })} /></label>
        </div>
        {error && <p id="year-error" role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
      </fieldset>
      <label className="block">Artist country<input className={controlClass} value={draft.country ?? ''}
        onChange={(event) => setDraft({ ...draft, country: event.target.value })} /></label>
      <button type="submit" className="rounded-full bg-stone-900 px-4 py-2 text-white focus-visible:outline-2 focus-visible:outline-offset-2">Apply filters</button>
    </form>
  );
}

export function ArtworkFilters({ filters, onApply }: Props) {
  const types = useLookup<ArtworkType>('artwork-types');
  const materials = useLookup<Material>('materials');
  const key = serializeArtworkQuery({ filters, sort: DEFAULT_SORT }).toString();
  const selected = [
    filters.artistId && `Artist ID: ${filters.artistId}`,
    filters.artworkTypeId && (types.data.find((type) => type.id === filters.artworkTypeId)?.name ?? `Type ID: ${filters.artworkTypeId}`),
    ...filters.materialIds.map((id) => materials.data.find((material) => material.id === id)?.name ?? `Material ID: ${id}`),
    filters.yearStart !== undefined && `From ${filters.yearStart}`,
    filters.yearEnd !== undefined && `To ${filters.yearEnd}`,
    filters.country,
  ].filter((value): value is string => typeof value === 'string' && value.length > 0);
  return <aside className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
    <h2 className="text-lg font-semibold">Filters</h2>
    {hasActiveFilters(filters) && <div className="mt-3">
      <ul aria-label="Applied filters" className="flex flex-wrap gap-2">
        {selected.map((label, index) => <li key={`${index}-${label}`} className="rounded-full bg-stone-100 px-3 py-1 text-sm">{label}</li>)}
      </ul>
      <button type="button" onClick={() => onApply({ materialIds: [] })} className="mt-3 underline">Clear Filters</button>
    </div>}
    <FilterForm key={key} filters={filters} onApply={onApply} lookups={{ types, materials }} />
  </aside>;
}
