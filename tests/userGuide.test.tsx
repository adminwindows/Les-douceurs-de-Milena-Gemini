import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserGuide } from '../components/views/UserGuide';

describe('UserGuide', () => {
  it('shows the beginner startup section by default', () => {
    render(<UserGuide />);

    expect(screen.getByText(/ordre recommande pour debuter/i)).toBeInTheDocument();
    expect(screen.getByText(/comment la sauvegarde fonctionne/i)).toBeInTheDocument();
  });

  it('switches to screen-by-screen documentation', async () => {
    const user = userEvent.setup();
    render(<UserGuide />);

    await user.click(screen.getByRole('button', { name: /par ecran/i }));

    expect(screen.getByRole('heading', { name: /ecran parametres/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /bilan mensuel/i })).toBeInTheDocument();
  });

  it('searches across all categories', async () => {
    const user = userEvent.setup();
    render(<UserGuide />);

    await user.type(screen.getByTestId('guide-search-input'), 'pdf');

    expect(screen.getByText(/pdf mobile: que se passe-t-il au clic/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /bilan mensuel/i })).toBeInTheDocument();
  });

  it('shows an explicit no-result state for unknown terms', async () => {
    const user = userEvent.setup();
    render(<UserGuide />);

    await user.type(screen.getByTestId('guide-search-input'), 'zzz-no-result');

    expect(screen.getByTestId('guide-no-results')).toBeInTheDocument();
  });
});
