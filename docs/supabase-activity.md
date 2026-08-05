# Supabase activity heartbeat

NewsFlow shares the Supabase project `blgwlycfcwvsupmqyqwn` with the portfolio membership and billing system.

Supabase Free Plan projects can be considered inactive when they receive too little user database activity over a seven-day window. A single request made close to the end of that window is not treated here as a reliable operational margin. NewsFlow therefore performs a small read-only health check every day.

## Schedule

`.github/workflows/supabase-activity.yml` runs daily at 03:17 UTC, which is 11:17 in Asia/Shanghai, and also supports manual dispatch.

Each run sends three minimal PostgREST `SELECT` requests for the active `newsflow` product:

- `billing_products`;
- `billing_prices`;
- `billing_product_entitlements`.

These tables already grant anonymous read access only to the intended public metadata and enforce Row Level Security. The job does not insert artificial rows, mutate customer data, sign in a fake user or invoke billing operations.

## Credential boundary

The workflow uses only the project's `sb_publishable_...` key. Publishable keys are designed for public clients, GitHub Actions and source code. Their database access remains restricted by Postgres grants and RLS.

The workflow must never use or contain:

- an `sb_secret_...` key;
- the legacy `service_role` key;
- a database password;
- Stripe secrets;
- a user session token.

## Verification and records

A run succeeds only when all three API requests return HTTP success and JSON arrays. Each run writes a summary containing:

- project reference;
- successful request count;
- completion time;
- credential class.

The GitHub Actions run history is the operational record. A failed request fails the workflow rather than reporting a false heartbeat. The workflow can be run manually from GitHub Actions after configuration or network changes.

## Availability boundary

This heartbeat creates legitimate database query activity and provides a wide margin inside the seven-day inactivity window. It is not a paid availability guarantee. Supabase Pro remains the only documented way to guarantee that a project will not be automatically paused for inactivity.
