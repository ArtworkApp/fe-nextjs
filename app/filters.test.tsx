import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Home from '../components/artworks/ArtworkListingPage';

const types = [{ id: '1', name: 'Painting', active: true }, { id: '2', name: 'Sculpture', active: true }];
const materials = [
  { id: '10', name: 'Oil', artworkTypeId: '1', active: true, artworkType: types[0] },
  { id: '11', name: 'Canvas', artworkTypeId: '1', active: true, artworkType: types[0] },
  { id: '20', name: 'Bronze', artworkTypeId: '2', active: true, artworkType: types[1] },
];
const empty = { data: [], pagination: { page: 1, limit: 21, total: 0, totalPages: 0 } };
function artworkRequests() {
  return vi.mocked(fetch).mock.calls.map(([url]) => new URL(String(url))).filter((url) => url.pathname.endsWith('/artworks'));
}
function latestParams() {
  return artworkRequests().at(-1)!.searchParams;
}

beforeEach(() => {
  window.history.replaceState({}, '', '/');
  vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:3001/api/v1');
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const path = new URL(String(input)).pathname;
    const payload = path.endsWith('/artwork-types') ? { data: types } : path.endsWith('/materials') ? { data: materials } : empty;
    return { ok: true, json: async () => payload } as Response;
  }));
});

describe('artwork filters', () => {
  it('applies type, multiple materials, inclusive years and country, preserving sort', async () => {
    window.history.replaceState({}, '', '/?sort=price_asc&page=3');
    render(<Home />);
    await screen.findByRole('option', { name: 'Painting' });
    fireEvent.change(screen.getByLabelText('Artwork type'), { target: { value: '1' } });
    fireEvent.click(screen.getByLabelText('Oil'));
    fireEvent.click(screen.getByLabelText('Canvas'));
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '1900' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '1900' } });
    fireEvent.change(screen.getByLabelText('Artist country'), { target: { value: ' France ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));
    await waitFor(() => expect(latestParams().get('country')).toBe('France'));
    expect(Object.fromEntries(latestParams())).toMatchObject({ artworkTypeId: '1', materialIds: '10,11', yearStart: '1900', yearEnd: '1900', sort: 'price_asc', page: '1', limit: '21' });
    expect(new URLSearchParams(location.search).get('materialIds')).toBe('10,11');
    expect(new URLSearchParams(location.search).has('page')).toBe(false);
    const count = artworkRequests().length;
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));
    expect(artworkRequests()).toHaveLength(count);
  });

  it('clears incompatible materials on type changes and shows all with no type', async () => {
    render(<Home />);
    await screen.findByLabelText('Oil');
    fireEvent.click(screen.getByLabelText('Oil'));
    fireEvent.change(screen.getByLabelText('Artwork type'), { target: { value: '2' } });
    expect(screen.queryByLabelText('Oil')).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Bronze'));
    fireEvent.change(screen.getByLabelText('Artwork type'), { target: { value: '' } });
    expect(screen.getByLabelText('Oil')).not.toBeChecked();
    expect(screen.getByLabelText('Bronze')).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));
    await waitFor(() => expect(latestParams().get('materialIds')).toBe('20'));
  });

  it('prevents invalid years from reaching the API', async () => {
    render(<Home />);
    await screen.findByLabelText('Oil');
    const count = artworkRequests().length;
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2000' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '1900' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Start year must not exceed end year');
    expect(artworkRequests()).toHaveLength(count);
  });

  it('restores URL filters on history navigation and clears filters without resetting sort', async () => {
    window.history.replaceState({}, '', '/?artistId=10&country=France&sort=price_desc');
    render(<Home />);
    await screen.findByDisplayValue('France');
    expect(latestParams().get('artistId')).toBe('10');
    act(() => {
      window.history.pushState({}, '', '/?country=Italy&yearStart=0&sort=year_asc');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await screen.findByDisplayValue('Italy');
    expect(screen.getByLabelText('From')).toHaveValue(0);
    await waitFor(() => expect(latestParams().get('country')).toBe('Italy'));
    fireEvent.click(screen.getByRole('button', { name: 'Clear Filters' }));
    await waitFor(() => expect(latestParams().has('country')).toBe(false));
    expect(latestParams().get('sort')).toBe('year_asc');
    expect(screen.queryByRole('button', { name: 'Clear Filters' })).not.toBeInTheDocument();
  });

  it('keeps other controls usable when a taxonomy lookup fails and supports retry', async () => {
    const original = vi.mocked(fetch).getMockImplementation()!;
    vi.mocked(fetch).mockImplementation(async (input, options) => {
      if (String(input).endsWith('/materials')) return { ok: false } as Response;
      return original(input, options);
    });
    render(<Home />);
    expect(await screen.findByText('Unable to load materials.')).toBeInTheDocument();
    expect(screen.getByLabelText('Artist country')).toBeEnabled();
    vi.mocked(fetch).mockImplementation(original);
    fireEvent.click(screen.getByRole('button', { name: 'Retry materials' }));
    expect(await screen.findByLabelText('Oil')).toBeInTheDocument();
  });
  it('resets an already paginated listing when filters are applied', async () => {
    const original = vi.mocked(fetch).getMockImplementation()!;
    vi.mocked(fetch).mockImplementation(async (input, options) => {
      if (String(input).includes('/artworks?')) return {
        ok: true,
        json: async () => ({
          data: [{ id: new URL(String(input)).searchParams.get('page')!, title: 'A painting', artist: [], primaryImage: null, price: null }],
          pagination: { page: 1, limit: 21, total: 42, totalPages: 2 },
        }),
      } as Response;
      return original(input, options);
    });
    render(<Home />);
    fireEvent.click(await screen.findByRole('button', { name: 'Load More' }));
    await waitFor(() => expect(latestParams().get('page')).toBe('2'));
    fireEvent.change(screen.getByLabelText('Artist country'), { target: { value: 'France' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));
    await waitFor(() => expect(latestParams().get('page')).toBe('1'));
    expect(latestParams().get('country')).toBe('France');
  });

  it('ignores a response from before the latest applied filters', async () => {
    const original = vi.mocked(fetch).getMockImplementation()!;
    let resolveOldRequest!: (response: Response) => void;
    const oldRequest = new Promise<Response>((resolve) => { resolveOldRequest = resolve; });
    vi.mocked(fetch).mockImplementation(async (input, options) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith('/artworks') && !url.searchParams.has('country')) return oldRequest;
      return original(input, options);
    });
    render(<Home />);
    await screen.findByLabelText('Oil');
    fireEvent.change(screen.getByLabelText('Artist country'), { target: { value: 'France' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));
    await screen.findByText('No artworks found.');
    await act(async () => {
      resolveOldRequest({ ok: true, json: async () => ({
        ...empty,
        data: [{ id: '99', title: 'Outdated artwork', artist: [], primaryImage: null }],
      }) } as Response);
      await oldRequest;
    });
    expect(screen.queryByText('Outdated artwork')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Artist country')).toHaveValue('France');
  });


  it('uses native year selectors labeled From and To', async () => {
    render(<Home />);
    expect(await screen.findByLabelText('From')).toHaveAttribute('type', 'number');
    expect(screen.getByLabelText('To')).toHaveAttribute('type', 'number');
  });

  it('searches all country suggestions and applies one selection', async () => {
    render(<Home />);
    const country = await screen.findByLabelText('Artist country');
    fireEvent.change(country, { target: { value: 'apan' } });
    const japan = await screen.findByRole('option', { name: 'Japan' });
    expect(screen.queryByRole('option', { name: 'France' })).not.toBeInTheDocument();
    expect(japan.parentElement).toHaveClass('w-full');
    fireEvent.click(japan);
    expect(country).toHaveValue('Japan');
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));
    await waitFor(() => expect(latestParams().get('country')).toBe('Japan'));
  });
});
