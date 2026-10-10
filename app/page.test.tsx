import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Home from "./page";

const mockArtworkPayload = {
  data: [
    {
      id: 1,
      title: "Mona Lisa",
      imageUrl: "https://example.com/mona.jpg",
      price: 120000,
      currency: "USD",
      artists: [{ id: 10, name: "Leonardo da Vinci" }],
      artworkType: { id: 1, name: "Painting" },
    },
    {
      id: 2,
      title: "Sunflowers",
      imageUrl: null,
      price: null,
      currency: null,
      artists: [{ id: 11, name: "Vincent van Gogh" }, { id: 12, name: "Paul Gauguin" }],
      artworkType: { id: 2, name: "Painting" },
    },
  ],
  pagination: { page: 1, limit: 21, total: 2, totalPages: 1 },
};

beforeEach(() => {
  window.history.replaceState({}, "", "/");
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
    expect(screen.getByText("$120,000")).toBeInTheDocument();
    expect(screen.getByText("Price on Request")).toBeInTheDocument();
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
});
