create table if not exists public.user_subscriptions (
    user_id uuid primary key references auth.users(id) on delete cascade,
    stripe_customer_id text,
    stripe_subscription_id text,
    plan text not null default 'free',
    status text not null default 'inactive',
    current_period_end timestamptz,
    billing_interval text,
    cancel_at_period_end boolean not null default false
);

create table if not exists public.monthly_usage (
    user_id uuid not null references auth.users(id) on delete cascade,
    month text not null,
    guides_generated integer not null default 0,
    lightweight_actions integer not null default 0,
    primary key (user_id, month)
);

alter table public.user_subscriptions
    add column if not exists billing_interval text,
    add column if not exists cancel_at_period_end boolean not null default false;
alter table public.monthly_usage
    add column if not exists lightweight_actions integer not null default 0;

create unique index if not exists user_subscriptions_stripe_customer_id_key
    on public.user_subscriptions (stripe_customer_id) where stripe_customer_id is not null;
create unique index if not exists user_subscriptions_stripe_subscription_id_key
    on public.user_subscriptions (stripe_subscription_id) where stripe_subscription_id is not null;

alter table public.user_subscriptions enable row level security;
alter table public.monthly_usage enable row level security;
revoke all on public.user_subscriptions, public.monthly_usage from anon, authenticated;
grant select, insert, update, delete on public.user_subscriptions, public.monthly_usage to service_role;
