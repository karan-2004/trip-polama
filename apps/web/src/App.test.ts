// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import App from './App';

vi.mock('./components/ChatHub', () => ({ ChatHub: () => createElement('div', null, 'Trip workspace') }));

it('renders the trip-polama product name', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(createElement(App)));
    expect(container.querySelector('h1')?.textContent).toBe('trip-polama');
    expect(container.textContent).toContain('Trip workspace');
  } finally {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  }
});
