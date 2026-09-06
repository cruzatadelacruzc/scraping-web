import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CodeEditor } from '../CodeEditor';

// Mock @uiw/react-codemirror — CodeMirror requires DOM APIs not available in jsdom
vi.mock('@uiw/react-codemirror', () => ({
  default: vi.fn(
    ({
      value,
      onChange,
      placeholder,
      editable,
    }: {
      value?: string;
      onChange?: (v: string) => void;
      placeholder?: string;
      editable?: boolean;
    }) => (
      <textarea
        data-testid="code-editor"
        value={value ?? ''}
        placeholder={placeholder}
        readOnly={!editable}
        onChange={(e) => {
          if (onChange) onChange(e.target.value);
        }}
      />
    ),
  ),
}));

describe('CodeEditor', () => {
  it('renders with the given value', () => {
    render(<CodeEditor preset="json" value='{"key": "value"}' onChange={vi.fn()} />);
    const editor = screen.getByTestId('code-editor');
    expect(editor).toHaveValue('{"key": "value"}');
  });

  it('renders in readOnly mode when readOnly is true', () => {
    render(<CodeEditor preset="json" value="[]" readOnly onChange={vi.fn()} />);
    const editor = screen.getByTestId('code-editor');
    expect(editor).toHaveAttribute('readOnly');
  });

  it('renders as editable when readOnly is false (default)', () => {
    render(<CodeEditor preset="json" value="[]" onChange={vi.fn()} />);
    const editor = screen.getByTestId('code-editor');
    expect(editor).not.toHaveAttribute('readOnly');
  });

  it('renders placeholder text', () => {
    render(<CodeEditor preset="json" value="" onChange={vi.fn()} placeholder="Enter JSON" />);
    const editor = screen.getByTestId('code-editor');
    expect(editor).toHaveAttribute('placeholder', 'Enter JSON');
  });

  it('calls onChange when value changes', () => {
    const handleChange = vi.fn();
    render(<CodeEditor preset="json" value="" onChange={handleChange} />);
    const editor = screen.getByTestId('code-editor');
    fireEvent.change(editor, { target: { value: '{"a": 1}' } });
    expect(handleChange).toHaveBeenCalledWith('{"a": 1}');
  });

  it('renders without error when no extensions are provided', () => {
    const { container } = render(<CodeEditor preset="json" value="[]" onChange={vi.fn()} />);
    expect(container.querySelector('[data-testid="code-editor"]')).toBeInTheDocument();
  });

  it('renders with the jsonata preset', () => {
    render(<CodeEditor preset="jsonata" value="$sum(items.price)" onChange={vi.fn()} />);
    expect(screen.getByTestId('code-editor')).toHaveValue('$sum(items.price)');
  });

  it('renders with the markdown preset', () => {
    render(<CodeEditor preset="markdown" value="# Prompt" onChange={vi.fn()} />);
    expect(screen.getByTestId('code-editor')).toHaveValue('# Prompt');
  });

  it('exposes a vertical resize affordance when resizable is set', () => {
    const { container } = render(
      <CodeEditor preset="jsonata" value="" onChange={vi.fn()} resizable />,
    );
    expect(container.querySelector('.resize-y')).not.toBeNull();
  });

  it('does not expose a resize affordance by default', () => {
    const { container } = render(<CodeEditor preset="json" value="" onChange={vi.fn()} />);
    expect(container.querySelector('.resize-y')).toBeNull();
  });

  it('builds the extension set without error when given an ariaLabel', () => {
    render(
      <CodeEditor preset="jsonata" value="" onChange={vi.fn()} ariaLabel="JSONata expression" />,
    );
    expect(screen.getByTestId('code-editor')).toBeInTheDocument();
  });
});
