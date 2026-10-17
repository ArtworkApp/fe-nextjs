import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Home from './page';

describe('home route', () => {
  it('provides a main page entry with a link to artwork listings', () => {
    render(<Home />);
    expect(screen.getByRole('link', { name: 'ArtworkApp' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse artworks' })).toHaveAttribute('href', '/artworks');
    expect(screen.queryByLabelText('Sort artworks')).not.toBeInTheDocument();
  });
});
