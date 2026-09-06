import { createId } from './model';

describe('createId', () => {
  it('uses cryptographic random bytes when randomUUID is unavailable', () => {
    const descriptor = Object.getOwnPropertyDescriptor(crypto, 'randomUUID');
    Object.defineProperty(crypto, 'randomUUID', {
      configurable: true,
      value: undefined,
    });

    try {
      const first = createId();
      const second = createId();
      expect(first).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
      expect(second).not.toBe(first);
    } finally {
      if (descriptor) Object.defineProperty(crypto, 'randomUUID', descriptor);
      else Reflect.deleteProperty(crypto, 'randomUUID');
    }
  });
});
