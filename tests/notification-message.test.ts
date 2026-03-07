import { describe, it, expect } from 'vitest';
import {
  escapeMarkdownV2,
  escapeMarkdownV2Url,
  formatAlertMessage,
  formatEurCents,
} from '../src/lib/telegram-utils';

describe('escapeMarkdownV2', () => {
  it('escapes underscores', () => {
    expect(escapeMarkdownV2('Hello_World')).toBe('Hello\\_World');
  });

  it('escapes dots', () => {
    expect(escapeMarkdownV2('Price: €15.00')).toBe('Price: €15\\.00');
  });

  it('escapes all 18 special characters', () => {
    const special = '_*[]()~`>#+-=|{}.!\\';
    const escaped = escapeMarkdownV2(special);
    // Every character should be prefixed with backslash
    for (const char of special) {
      expect(escaped).toContain(`\\${char}`);
    }
  });
});

describe('escapeMarkdownV2Url', () => {
  it('escapes closing parenthesis in URLs', () => {
    expect(escapeMarkdownV2Url('https://example.com/path)more')).toBe(
      'https://example.com/path\\)more',
    );
  });

  it('escapes backslash in URLs', () => {
    expect(escapeMarkdownV2Url('https://example.com/path\\more')).toBe(
      'https://example.com/path\\\\more',
    );
  });
});

describe('formatEurCents', () => {
  it('formats cents as EUR string', () => {
    expect(formatEurCents(1727)).toBe('€17.27');
  });

  it('formats zero cents', () => {
    expect(formatEurCents(0)).toBe('€0.00');
  });

  it('formats single-digit cents with leading zero', () => {
    expect(formatEurCents(5)).toBe('€0.05');
  });
});

describe('formatAlertMessage', () => {
  it('formats a single price drop alert', () => {
    const msg = formatAlertMessage([
      {
        cardName: 'Dark Magician',
        blueprintId: 12345,
        oldPriceCents: 1727,
        newPriceCents: 1500,
        percentChange: -13.15,
      },
    ]);
    // Green circle for price drop
    expect(msg).toContain('\u{1F7E2}');
    // Card name as link
    expect(msg).toContain('[Dark Magician]');
    expect(msg).toContain('https://www.cardtrader.com/en/cards/12345');
    // Prices (escaped for MarkdownV2: dots become \.)
    expect(msg).toContain('€17\\.27');
    expect(msg).toContain('€15\\.00');
    // Arrow separator must have > escaped for MarkdownV2
    expect(msg).toContain('\\-\\>');
  });

  it('formats a single price rise alert with red circle', () => {
    const msg = formatAlertMessage([
      {
        cardName: 'Dark Magician',
        blueprintId: 12345,
        oldPriceCents: 1500,
        newPriceCents: 1727,
        percentChange: 15.13,
      },
    ]);
    // Red circle for price rise
    expect(msg).toContain('\u{1F534}');
  });

  it('formats multiple alerts as newline-separated lines', () => {
    const msg = formatAlertMessage([
      {
        cardName: 'Card A',
        blueprintId: 1,
        oldPriceCents: 1000,
        newPriceCents: 800,
        percentChange: -20,
      },
      {
        cardName: 'Card B',
        blueprintId: 2,
        oldPriceCents: 500,
        newPriceCents: 600,
        percentChange: 20,
      },
    ]);
    const lines = msg.split('\n');
    expect(lines.length).toBe(2);
  });
});
