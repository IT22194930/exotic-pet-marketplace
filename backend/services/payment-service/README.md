# payment-service

This service records payment status in Supabase (`pending` / `complete`) and sends a **payment successful** email for online payments.

## Environment variables

Set these (prefer Docker / runtime env vars; do **not** commit secrets):

- `SUPABASE_URL` (your Supabase project URL)
- `SUPABASE_SERVICE_ROLE_KEY` (service role key; required)
- `ORDER_URL` (default: `http://order-service:8003`)
- `IDENTITY_URL` (default: `http://identity-service:8001`) — used to fetch buyer email

Email (required to actually send mail):

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

## Create the `payments` table (one-time)

Supabase tables **cannot** be created using `@supabase/supabase-js` with only `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.
You must create the table once using the Supabase Dashboard:

Supabase Dashboard → **SQL Editor** → run:

```sql
create extension if not exists "pgcrypto";

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  buyer_id uuid not null,
  amount numeric(12,2) not null,
  currency text not null default 'LKR',
  method text not null check (method in ('online','cod')),
  status text not null check (status in ('pending','complete')) default 'pending',
  payment_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists payments_order_id_key on public.payments(order_id);
create index if not exists payments_buyer_id_idx on public.payments(buyer_id);
```

### If you already created the table but get `buyer_id` schema errors

If the service logs show something like:

`Could not find the 'buyer_id' column of 'payments' in the schema cache`

then your existing `payments` table is missing the `buyer_id` column (or it was created with different column names).

You can fix it (recommended) by adding the column:

```sql
alter table public.payments
add column if not exists buyer_id uuid;

create index if not exists payments_buyer_id_idx on public.payments(buyer_id);
```

## API

- `POST /payments/process` — processes a payment and records status
- `POST /payments/status/bulk` — returns `{ statuses: { [orderId]: 'pending'|'complete' } }` for the logged-in buyer
