import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from '../App';

describe('App', () => {
  it('renders the BazaarSentinel heading', () => {
    render(<App />);
    expect(screen.getByText('BazaarSentinel')).toBeInTheDocument();
  });

  it('renders the Super Admin Console subtitle', () => {
    render(<App />);
    expect(screen.getByText('Super Admin Console')).toBeInTheDocument();
  });
});
