import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Home from "../components/artworks/ArtworkListingPage";

const mockArtworkPayload = {
  data: [
    {
      id: "1",
      title: "Mona Lisa",
      primaryImage: {
        id: "101",
        url: "/api/v1/artworks/1/images/101",
        altText: null,
        mimeType: "image/jpeg",
        isPrimary: true,
        sortOrder: 0,
        originalFilename: "mona.jpg",
      },
      price: 120000,
      currency: "USD",
      artist: [{ id: "10", name: "Leonardo da Vinci", country: "Italy" }],
      artworkType: [{ id: "1", name: "Painting" }],
    },
    {
      id: "2",
      title: "Sunflowers",
      primaryImage: null,
      price: null,
      currency: null,
      artist: [
        { id: "11", name: "Vincent van Gogh", country: "Netherlands" },
        { id: "12", name: "Paul Gauguin", country: "France" },
      ],
      artworkType: [{ id: "2", name: "Painting" }],
    },
    {
      id: "3",
      title: "Untitled study",
      primaryImage: null,
      price: 5000,
      currency: null,
      artist: [],
      artworkType: [],
    },
  ],
  pagination: { page: 1, limit: 21, total: 2, totalPages: 1 },
};

beforeEach(() => {
  window.history.replaceState({}, "", "/");
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:3001/api/v1");
  global.fetch = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);

    if (url.includes("/artworks")) {
      return Promise.resolve({
        ok: true,
        json: async () => mockArtworkPayload,
      } as Response);
    }

    return Promise.resolve({
      ok: true,
      json: async () => ({ data: [] }),
    } as Response);
  }) as typeof fetch;
});

describe("Artwork listing page", () => {
  it("renders artworks with artists and price information", async () => {
    render(<Home />);

    expect(await screen.findByText("Mona Lisa")).toBeInTheDocument();
    expect(screen.getByText("Leonardo da Vinci")).toBeInTheDocument();
    expect(screen.getByText("Vincent van Gogh, Paul Gauguin")).toBeInTheDocument();
    expect(screen.getByText("$120,000")).toBeInTheDocument();
    expect(screen.getByText("Price on Request")).toBeInTheDocument();
    expect(screen.getByText("5,000")).toBeInTheDocument();
    expect(screen.getByText("Unknown artist")).toBeInTheDocument();
    expect(screen.getAllByText("Artwork").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("img", { name: "Mona Lisa by Leonardo da Vinci" }),
    ).toHaveAttribute(
      "src",
      "http://localhost:3001/api/v1/artworks/1/images/101",
    );
  });

  it("shows the artwork placeholder when an image fails to load", async () => {
    render(<Home />);
    const image = await screen.findByRole("img", { name: "Mona Lisa by Leonardo da Vinci" });
    fireEvent.error(image);
    expect(screen.queryByRole("img", { name: "Mona Lisa by Leonardo da Vinci" })).not.toBeInTheDocument();
    expect(screen.getAllByText("Artwork").length).toBeGreaterThan(0);
  });

  it("shows the empty state when the backend returns no artworks", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ data: [], pagination: { page: 1, limit: 21, total: 0, totalPages: 0 } }),
      } as Response),
    ) as typeof fetch;

    render(<Home />);

    expect(await screen.findByText("No artworks found.")).toBeInTheDocument();
    expect(screen.getByText("Try changing your filters.")).toBeInTheDocument();
  });

  it("updates the sort parameter when the user changes sorting", async () => {
    render(<Home />);

    await screen.findByText("Mona Lisa");
    fireEvent.change(screen.getByLabelText(/sort artworks/i), {
      target: { value: "price_asc" },
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("sort=price_asc"),
        expect.anything(),
      );
    });
  });

  it("keeps loaded cards visible and retries the failed page after Load More errors", async () => {
    let pageTwoCalls = 0;
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith('/artworks') && url.searchParams.get('page') === '2') {
        pageTwoCalls += 1;
        if (pageTwoCalls === 1) return Promise.resolve({ ok: false } as Response);
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [mockArtworkPayload.data[1]], pagination: { page: 2, limit: 21, total: 22, totalPages: 2 } }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: [mockArtworkPayload.data[0]], pagination: { page: 1, limit: 21, total: 22, totalPages: 2 } }),
      } as Response);
    }) as typeof fetch;

    render(<Home />);
    expect(await screen.findByText('Mona Lisa')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Load More' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load more artworks.');
    expect(screen.getByText('Mona Lisa')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry Load More' }));
    expect(await screen.findByText('Sunflowers')).toBeInTheDocument();
    expect(pageTwoCalls).toBe(2);
  });
});
