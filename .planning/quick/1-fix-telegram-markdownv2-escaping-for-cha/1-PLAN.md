---
task: "Fix Telegram MarkdownV2 escaping for > character"
type: quick
tasks: 1
---

# Quick Task 1: Fix Telegram MarkdownV2 > Escaping

## Problem

`formatAlertMessage()` in `src/lib/telegram-utils.ts:144` uses `\\->` in the template literal, which produces the string `\->`. The `-` is escaped but `>` is not. Telegram MarkdownV2 requires `>` to be escaped as `\>`.

## Task 1: Escape > in arrow separator

**Files:** `src/lib/telegram-utils.ts`
**Action:** Change `\\->` to `\\-\\>` on line 144
**Verify:** `npm test` passes, specifically notification-message tests
**Done:** Arrow separator properly escaped as `\-\>` in output
