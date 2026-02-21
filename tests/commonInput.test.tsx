import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ChangeEvent } from 'react';
import { Input } from '../components/ui/Common';

describe('Common Input', () => {
  it('associates label with control', () => {
    render(<Input label="Montant" value="" onChange={() => {}} />);
    expect(screen.getByLabelText('Montant')).toBeInTheDocument();
  });

  it('renders numeric mode as text input with decimal hints', () => {
    render(<Input label="Prix" type="number" value="" onChange={() => {}} />);
    const input = screen.getByLabelText('Prix');

    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveAttribute('inputmode', 'decimal');
    expect(input).toHaveAttribute('pattern', '[0-9]*[.]?[0-9]*');
  });

  it('normalizes comma decimals before calling onChange', () => {
    const changes: string[] = [];
    const handleChange = vi.fn((event: ChangeEvent<HTMLInputElement>) => {
      changes.push(event.currentTarget.value);
    });

    render(<Input label="Prix" type="number" value="" onChange={handleChange} />);
    const input = screen.getByLabelText('Prix');
    fireEvent.change(input, { target: { value: '12,5' } });

    expect(handleChange).toHaveBeenCalledOnce();
    expect(changes[0]).toBe('12.5');
  });

  it('uses explicit id when provided', () => {
    render(<Input id="my-input-id" label="Salaire" value="" onChange={() => {}} />);
    const input = screen.getByLabelText('Salaire');

    expect(input).toHaveAttribute('id', 'my-input-id');
  });
});
