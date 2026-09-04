import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';

import { webcrypto } from 'node:crypto';
import { configure } from '@testing-library/react';

configure({ asyncUtilTimeout: 10_000 });

if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto });
}

if (!globalThis.matchMedia) {
  Object.defineProperty(globalThis, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

if (!globalThis.URL.createObjectURL) {
  Object.defineProperty(globalThis.URL, 'createObjectURL', { value: vi.fn(() => 'blob:test') });
  Object.defineProperty(globalThis.URL, 'revokeObjectURL', { value: vi.fn() });
}

if (!globalThis.ResizeObserver) {
  Object.defineProperty(globalThis, 'ResizeObserver', {
    value: class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  });
}

if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '');
  };
}

const nativeClose = HTMLDialogElement.prototype.close;
HTMLDialogElement.prototype.close = function close(returnValue = '') {
  if (nativeClose) {
    nativeClose.call(this, returnValue);
    return;
  }
  this.returnValue = returnValue;
  this.removeAttribute('open');
  this.dispatchEvent(new Event('close'));
};

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
