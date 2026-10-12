-- Apply as a database migration before enabling hosted dashboard saving.
-- Application writes require the existing admin session guard; anonymous DB access is denied.
create table if not exists public.widget_dashboards (
 id uuid primary key,
 configuration jsonb not null,
 created_at timestamptz not null default now(),
 constraint widget_dashboard_size check (octet_length(configuration::text) <= 30000)
);
alter table public.widget_dashboards enable row level security;
revoke all on public.widget_dashboards from anon, authenticated;
