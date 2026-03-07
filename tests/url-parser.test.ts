import { describe, expect, it } from 'vitest';
import { extractWishlistId } from '../src/lib/cardtrader-utils';

describe('extractWishlistId', () => {
  it('extracts ID from standard wishlist URL', () => {
    expect(extractWishlistId('https://www.cardtrader.com/wishlists/12345')).toBe('12345');
  });

  it('extracts ID from URL with locale prefix', () => {
    expect(extractWishlistId('https://www.cardtrader.com/en/wishlists/67890')).toBe('67890');
  });

  it('extracts ID from URL with two-letter locale', () => {
    expect(extractWishlistId('https://www.cardtrader.com/it/wishlists/11111')).toBe('11111');
  });

  it('throws on invalid URL without cardtrader domain', () => {
    expect(() => extractWishlistId('https://example.com/foo')).toThrow(
      'Invalid CardTrader wishlist URL',
    );
  });

  it('throws on cardtrader URL without wishlists path', () => {
    expect(() => extractWishlistId('https://www.cardtrader.com/marketplace')).toThrow(
      'Invalid CardTrader wishlist URL',
    );
  });

  it('throws on empty string', () => {
    expect(() => extractWishlistId('')).toThrow('Invalid CardTrader wishlist URL');
  });

  it('extracts ID from URL with trailing slash', () => {
    expect(extractWishlistId('https://www.cardtrader.com/wishlists/99999/')).toBe('99999');
  });

  it('extracts ID from URL with query parameters', () => {
    expect(extractWishlistId('https://www.cardtrader.com/wishlists/55555?page=1')).toBe('55555');
  });
});
