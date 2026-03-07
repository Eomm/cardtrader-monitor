import { describe, expect, it } from 'vitest';
import { languageToFlag } from '../src/lib/cardtrader-utils';

describe('languageToFlag', () => {
  it.each([
    ['en', '\u{1F1EC}\u{1F1E7}'], // GB
    ['it', '\u{1F1EE}\u{1F1F9}'], // IT
    ['de', '\u{1F1E9}\u{1F1EA}'], // DE
    ['fr', '\u{1F1EB}\u{1F1F7}'], // FR
    ['es', '\u{1F1EA}\u{1F1F8}'], // ES
    ['pt', '\u{1F1F5}\u{1F1F9}'], // PT
    ['ja', '\u{1F1EF}\u{1F1F5}'], // JP
    ['ko', '\u{1F1F0}\u{1F1F7}'], // KR
    ['zh', '\u{1F1E8}\u{1F1F3}'], // CN
    ['ru', '\u{1F1F7}\u{1F1FA}'], // RU
  ])('maps %s to correct flag emoji', (lang, expected) => {
    expect(languageToFlag(lang)).toBe(expected);
  });

  it('returns uppercase text for unknown language code', () => {
    expect(languageToFlag('unknown')).toBe('UNKNOWN');
  });

  it('returns uppercase text for empty string', () => {
    expect(languageToFlag('')).toBe('');
  });
});
