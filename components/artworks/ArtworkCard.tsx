'use client';

import Image from 'next/image';
import { useState } from 'react';
import { apiBaseUrl } from '../../lib/apiBaseUrl';

export interface ArtworkCardData {
  id: string;
  title: string;
  primaryImage: {
    url: string;
    altText: string | null;
  } | null;
  price?: number | null;
  currency?: string | null;
  artist: { name: string }[];
}

interface Props {
  artwork: ArtworkCardData;
}

function resolveImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;

  const baseUrl = apiBaseUrl();
  if (!baseUrl) return null;
  try {
    return new URL(path, new URL(baseUrl).origin).toString();
  } catch {
    return null;
  }
}

function formatPrice(price: number | null | undefined, currency?: string | null): string {
  if (price == null) return 'Price on Request';
  if (currency) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(price);
  }
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(price);
}

export function ArtworkCard({ artwork }: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const artistNames = artwork.artist.map((artist) => artist.name);
  const artistLabel = artistNames.length ? artistNames.join(', ') : 'Unknown artist';
  const imageUrl = resolveImageUrl(artwork.primaryImage?.url);
  const imageAlt = artwork.primaryImage?.altText?.trim() || `${artwork.title} by ${artistLabel}`;

  return <article aria-label={`${artwork.title} by ${artistLabel}`}
    className="h-full min-w-0 overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
    <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
      {imageUrl && !imageFailed ? <Image src={imageUrl} alt={imageAlt} fill unoptimized
        sizes="(max-width: 1023px) 50vw, 33vw" className="object-cover"
        onError={() => setImageFailed(true)} /> : <div aria-label="Artwork image unavailable"
          className="flex h-full items-center justify-center bg-gradient-to-br from-stone-200 to-stone-100 text-sm font-medium uppercase tracking-[0.2em] text-stone-500">
        Artwork
      </div>}
    </div>
    <div className="space-y-3 p-4">
      <h3 className="line-clamp-2 text-lg font-semibold text-stone-900">{artwork.title}</h3>
      <p className="line-clamp-2 text-sm text-stone-600">{artistLabel}</p>
      <p className="text-lg font-semibold text-stone-900">{formatPrice(artwork.price, artwork.currency)}</p>
    </div>
  </article>;
}
