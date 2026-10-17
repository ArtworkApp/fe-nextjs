> * **Version:** 1.1  
> * **Application:** ArtworkApp Web (Next.js)  
> * **Feature:** Artwork Listing  
> * **Status:** Ready for implementation planning

---

## 1. User Story

**As a** user of the web application,  
**I want** to browse and filter available original artworks through an intuitive interface,  
**So that** I can efficiently discover artworks that match my preferences.

## 2. Scope

### Included

- Artwork listing page and artwork cards
- Artist, artwork type, material, year, and country filters
- Sorting by year and price
- Load More pagination
- Responsive layout
- Loading, empty, and error states
- URL query parameter synchronization
- Accessibility and frontend tests

### Excluded

- Artwork detail page
- Checkout and purchase flow
- User accounts and favorites
- Sold artwork listings and Sold badges
- Artist-name sorting
- Artwork image gallery and image uploads

**Visibility:** Only artworks with status `AVAILABLE` shall appear. The backend enforces this rule.

## 3. Page Structure

```text
ArtworkListingPage
├── Header
├── ArtworkFilterPanel
│   ├── ArtistAutocomplete
│   ├── ArtworkTypeSelector
│   ├── MaterialMultiSelect
│   ├── YearRangeSelector
│   └── ArtistLocationSelector
├── ArtworkSortDropdown
├── ArtworkGrid
│   └── ArtworkCard
├── LoadMoreButton
├── EmptyState
└── ErrorState
```

Reuse existing shared components and styling conventions wherever possible.

## 4. Responsive Layout

| Breakpoint | Artwork grid | Filter interface |
|---|---|---|
| Desktop (≥1024px) | 3 columns | Visible sidebar alongside grid |
| Tablet (768–1023px) | 2 columns | Responsive, non-obstructing filter controls |
| Mobile (<768px) | 2 columns | Filter button opening bottom sheet |

- Initially display up to **21 artworks**.
- Keep sorting controls accessible above the grid.
- Mobile bottom sheet contains all filters and an **Apply** button.
- Dismissing the sheet without applying discards uncommitted changes.

## 5. Artwork Card

Each card displays:

1. Artwork image
2. Artwork title
3. Artist name(s)
4. Price

### 5.1 Image

- Artwork API exposes a nullable `primaryImage` object with `url` and `altText`.
- If present, render the image with meaningful alt text.
- If null or empty, render an artwork placeholder.
- Maintain a consistent image aspect ratio.
- **Backend dependency:** add `primaryImage: { url, altText } | null` to the Artwork model and serialized listing response.

### 5.2 Artist Names

- The backend supports many-to-many artwork–artist relationships.
- Display multiple associated artist names, with visual truncation for lengthy text.
- Treat the `artist` response field as an array, not a single object.
- Handle an empty array gracefully.

### 5.3 Price

- Display the price and its currency when available.
- If price is null, display **Price on Request**.
- Do not assume USD or convert currencies in the MVP.

### 5.4 Status

- Only `AVAILABLE` artworks appear.
- Do not render a Sold badge or offer a sold-artwork filter.

## 6. Filters

All filtering is performed by the backend.

### 6.1 Artist Filter — `ArtistAutocomplete`

- Search by artist name through the existing Artists API.
- Select one artist and store its ID as `artistId`.
- Allow clearing the selection.
- An artwork can have multiple artists, although this filter is single-select.

### 6.2 Artwork Type Filter — `ArtworkTypeSelector`

- Load options through the existing Artwork Types API.
- Select one type and store its ID as `artworkTypeId`.
- Allow clearing the selection.
- Artworks may belong to multiple types; the filter remains single-select.

### 6.3 Material Filter — `MaterialMultiSelect`

- Load options through the existing Materials API.
- Allow multiple selections, stored as `materialIds`.
- When an artwork type is selected, show materials associated with that type.
- On type change, clear selected materials no longer valid for the new type.
- With no type selected, show all available materials.
- The backend determines matching artwork records.

### 6.4 Year Range Filter — `YearRangeSelector`

- Optional `yearStart` and `yearEnd` fields.
- Accept nonnegative integer years.
- Allow equal start and end years.
- If both exist, require `yearStart <= yearEnd`.
- Both boundaries are inclusive.
- Display validation feedback for invalid values.

### 6.5 Artist Location Filter — `ArtistLocationSelector`

- Filter using the associated artist's `country` field.
- Send the backend's `country` query parameter.
- Allow clearing the selection.
- Do not infer country from artwork metadata or user location.
- For multiple artists, matching is handled by the backend.

## 7. Sorting

| UI label | API value |
|---|---|
| Year: Oldest First | `year_asc` |
| Year: Newest First | `year_desc` |
| Price: Lowest First | `price_asc` |
| Price: Highest First | `price_desc` |

**Default:** `year_desc`.

- Artist-name sorting is excluded.
- Sorting occurs on the backend; do not sort only the currently loaded page.

## 8. State Management

### Filter state

```json
{
  "artistId": 10,
  "artworkTypeId": 1,
  "materialIds": [2, 3],
  "yearStart": 1900,
  "yearEnd": 1950,
  "country": "France"
}
```

All filters are optional.

### Sort state

```json
{ "sort": "price_asc" }
```

### Pagination state

```json
{ "page": 1, "limit": 21, "hasNext": true }
```

Derive `hasNext` from backend pagination metadata.

### State transitions

- Changing applied filters or sorting resets pagination to page 1 and replaces the results.
- **Load More** fetches the next page and appends results.
- Prevent duplicate pagination requests.
- Prevent stale responses from overwriting newer results.

## 9. API Integration

### Artwork listing endpoint

`GET /artworks`

| Parameter | Type | Description |
|---|---|---|
| `page` | integer | Page number, starting at 1 |
| `limit` | integer | Page size, maximum 21 |
| `artistId` | integer | Selected artist |
| `artworkTypeId` | integer | Selected artwork type |
| `materialIds` | string | Comma-separated material IDs |
| `yearStart` | integer | Inclusive start year |
| `yearEnd` | integer | Inclusive end year |
| `country` | string | Artist country |
| `sort` | string | One of the four supported sort values |

Example:

```text
/artworks?artistId=10&artworkTypeId=1&materialIds=2,3&yearStart=1900&yearEnd=1950&country=France&sort=price_asc&page=1&limit=21
```

### Pagination response

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 21,
    "total": 100,
    "totalPages": 5
  }
}
```

- Artwork records shall include `primaryImage: { url, altText } | null` after the backend change.
- Treat artist, artwork type, and material relationship fields as arrays.

### Filter-option endpoints

Reuse existing:

- `GET /artists`
- `GET /artwork-types`
- `GET /materials`

Use their supported query parameters and response shapes. Do not add duplicate frontend-specific endpoints without a demonstrated need.

## 10. URL State Management

Example:

```text
/artworks?artworkTypeId=1&materialIds=2,3&yearStart=1900&yearEnd=1950&country=France&sort=price_asc
```

- Initialize filters and sorting from the URL.
- Update the URL when applied filters or sorting change.
- Support browser Back/Forward navigation and shareable URLs.
- Omit unset filters.
- Handle invalid or unsupported URL values gracefully.
- Keep pagination consistent with URL state.

## 11. Loading States

### Initial loading

- Display skeleton artwork cards.
- Preserve grid layout and minimize layout shifts.

### Load More loading

- Change button label from **Load More** to **Loading...**.
- Disable repeated activation during the request.
- Keep previously loaded artworks visible.

### Filter changes

- Show an appropriate loading state while replacing results.
- Ensure results correspond to the latest applied filters.

## 12. Empty State

When no artworks match:

```text
No artworks found.

Try changing your filters.

[Clear Filters]
```

**Clear Filters** removes active filters, updates the URL, resets pagination, and reloads the listing.

## 13. Error Handling

For initial request failures:

```text
Unable to load artworks.

Please try again.

[Retry]
```

- Retry without discarding current filter/sort selections.
- If Load More fails, preserve existing artworks and provide a retry action.
- Handle filter-option API failures without crashing the page.

## 14. Accessibility

Support:

- Keyboard navigation
- Accessible filter controls and screen reader labels
- Meaningful image alt text
- Visible focus indicators
- Accessible loading/error announcements
- Keyboard-accessible mobile filter dialog with appropriate focus management

## 15. Testing Requirements

Frontend tests cover:

- Card rendering, missing image, missing price, multiple artists
- Artist autocomplete and artwork type selection
- Material multi-selection and type dependency
- Year validation and country filtering
- Four sorting options
- URL state initialization and synchronization
- Pagination and Load More
- Loading, empty, and error states
- Responsive filter behavior and basic keyboard accessibility

Mock responses must match the backend contract.

## 16. Implementation Dependencies

### Backend

Before completing frontend integration:

- Add nullable `primaryImage: { url, altText } | null` to the Artwork model.
- Include the `primaryImage` object in the artwork listing response.
- Update backend tests.

No backend work is needed for artist-name sorting or Sold badges because those features are excluded.

### Frontend

- Follow existing Next.js project conventions.
- Reuse shared UI components and the current API integration approach.
- Avoid unnecessary state-management dependencies.
- Keep components modular and testable.

## 17. Action Items

- [ ] Inspect frontend conventions and confirm current backend DTOs, query parameters, and endpoint behavior; present a file-level plan and gaps.
- [ ] Implement filter/sort state, validation, URL synchronization, and distinct loading/empty/error states.
- [ ] Implement taxonomy filters, material/type compatibility, and accessible artist autocomplete.
- [ ] Implement responsive artwork cards/grid and backend-provided image handling.
- [ ] Implement 21-item pagination, Load More retry, and stale-request protection.
- [ ] Implement the accessible mobile filter sheet and responsive layout.
- [ ] Add frontend tests for the requirements above.
- [ ] Run available tests, lint, typecheck, and production build; report results and unresolved dependencies.

## 18. Definition of Done

- [ ] Artwork listing page and cards implemented
- [ ] Image and placeholder supported
- [ ] Multiple artists displayed correctly
- [ ] Artist autocomplete implemented
- [ ] Artwork type filter implemented
- [ ] Material filter and dependency implemented
- [ ] Year range and country filters implemented
- [ ] Year and price sorting implemented
- [ ] Load More pagination implemented
- [ ] URL state synchronized
- [ ] Loading, empty, and error states implemented
- [ ] Responsive desktop, tablet, and mobile layouts implemented
- [ ] Accessibility requirements completed
- [ ] Frontend tests completed
- [ ] Backend `primaryImage` dependency satisfied

---

**End of Specification — Version 1.1**
