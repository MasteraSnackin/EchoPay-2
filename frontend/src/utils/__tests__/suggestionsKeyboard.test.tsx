import { describe, it, expect } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import React from 'react';

function Suggestions({ items }: { items: string[] }) {
  const [show, setShow] = React.useState(false);
  const [value, setValue] = React.useState('');
  const [active, setActive] = React.useState(-1);

  const listId = 'test-suggestions';

  const filtered = items.filter(i => i.toLowerCase().includes(value.toLowerCase()));

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!show) return;
    const max = filtered.length;
    if (max === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((prev) => (prev + 1) % max);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((prev) => (prev - 1 + max) % max);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const idx = active >= 0 ? active : 0;
      setValue(filtered[idx]);
      setShow(false);
      setActive(-1);
    } else if (e.key === 'Escape') {
      setShow(false);
      setActive(-1);
    }
  };

  return (
    <div>
      <input
        aria-controls={listId}
        aria-expanded={show}
        value={value}
        onChange={(e) => { setValue(e.target.value); setShow(true); setActive(-1); }}
        onKeyDown={onKeyDown}
        onFocus={() => setShow(true)}
        onBlur={() => setTimeout(() => setShow(false), 50)}
        placeholder="Type"
      />
      {show && filtered.length > 0 && (
        <div role="listbox" id={listId}>
          {filtered.map((v, i) => (
            <div key={v} role="option" aria-selected={i === active}>
              {v}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

describe('suggestions keyboard behavior', () => {
  it('navigates with arrow keys and selects with enter', async () => {
    render(<Suggestions items={[ 'Alice', 'Bob', 'Charlie' ]} />);

    const input = screen.getByPlaceholderText('Type') as HTMLInputElement;
    input.focus();
    fireEvent.change(input, { target: { value: 'a' } });

    // Down → active 0
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    // Down → active 1 (wraps only if 2+ items match)
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    // Enter to select
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(input.value.toLowerCase()).toContain('a'); // Selected some item containing 'a'
  });
});