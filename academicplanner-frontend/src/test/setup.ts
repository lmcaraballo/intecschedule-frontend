import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

beforeEach(() => {
  // Testing Library's microtask drain detects the Jest timer API. Bridge it to
  // Vitest so awaited user interactions also resolve with controlled timers.
  vi.stubGlobal('jest', { advanceTimersByTime: vi.advanceTimersByTime });
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  // jsdom has no native modal implementation; browser QA verifies the real one.
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
    this.querySelector<HTMLElement>('button')?.focus();
  } });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  } });
});

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
