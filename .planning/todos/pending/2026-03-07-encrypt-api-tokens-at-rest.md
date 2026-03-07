---
created: 2026-03-07T15:31:09.179Z
title: Encrypt API tokens at rest
area: database
files:
  - supabase/migrations/00001_initial_schema.sql:122-131
  - supabase/migrations/00002_data_pipeline.sql:59-74
  - supabase/functions/import-wishlist/index.ts:112
  - scripts/fetch-prices.ts:172
---

## Problem

CardTrader API tokens are stored as plaintext in `profiles.cardtrader_api_token`. The original implementation used `pgp_sym_encrypt`/`pgp_sym_decrypt` with `app.settings.encryption_key`, but this Postgres config parameter cannot be set on hosted Supabase (permission denied on `ALTER DATABASE`).

## Solution

Move encryption/decryption to the Edge Function and GitHub Actions layers:
- Set `ENCRYPTION_KEY` as a Supabase Edge Function secret (`supabase secrets set`)
- Use Web Crypto API (AES-GCM) in Edge Functions to encrypt before DB write and decrypt after read
- Pass the same key to GitHub Actions via repository secret
- `save_api_token` RPC receives pre-encrypted text; `get_api_token` returns encrypted text for the caller to decrypt
