---
task: "Fix Telegram MarkdownV2 escaping for > character"
status: complete
commit: 903bfba
---

# Quick Task 1: Summary

## What was done

Fixed `formatAlertMessage()` in `src/lib/telegram-utils.ts` — the arrow separator `->` between old and new prices was only escaping `-` but not `>`. Telegram MarkdownV2 requires both characters escaped.

**Change:** `\\->` → `\\-\\>` (line 144)

**Test:** Added assertion for `\\-\\>` in `tests/notification-message.test.ts`. All 11 tests pass.

## Root cause

Template literal `${oldPrice} \\-> ${newPrice}` produced `\->` in the output. The `-` was escaped but `>` was not, causing Telegram API to reject the message with: `Bad Request: can't parse entities: Character '>' is reserved`.
