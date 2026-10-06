// Schema and state machine of the server video export, in ONE place.
//
// WHY THE LOGIC LIVES IN SQL: every limit ("three mails per address a day",
// "one render at a time", "40 renders a day") is a read-then-write. Done in
// application code, two parallel requests both read "2 of 3" and both write.
// Each function below starts with the same transaction-scoped advisory lock,
// so all mutations of this feature run one after another. The feature handles
// a few requests a minute at most; serialising them costs nothing.
//
// Every function takes one jsonb argument and returns jsonb. That keeps the
// transport trivial: Supabase `rpc(name, { p })` in production, a plain
// `select name($1)` against the local pilot database.
//
// NO PERSONAL DATA IN KEYS OR PATHS: addresses are stored only in
// `video_requests.email` (cleared when the request ends) and otherwise as a
// keyed hash. Tokens are stored as SHA-256 hashes only.
//
// Applied via GET /api/video-export/setup (production — NOT run yet) and
// `npm run video:db` (local pilot database).

export const VIDEO_EXPORT_SQL = String.raw`
create table if not exists video_render_jobs (
  id uuid primary key default gen_random_uuid(),
  cache_key text not null unique,
  widget text not null,
  ags text not null,
  period text not null,
  data_version text not null,
  design_version text not null,
  source text not null check (source in ('public','operator')),
  status text not null check (status in ('queued','rendering','done','failed','expired')),
  attempts int not null default 0,
  lease_until timestamptz,
  worker text,
  object_path text,
  bytes bigint,
  render_ms int,
  error text,
  created_at timestamptz not null default now(),
  queued_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  expires_at timestamptz
);
alter table video_render_jobs add column if not exists progress int not null default 0;
create index if not exists video_render_jobs_status on video_render_jobs (status, queued_at);

create table if not exists video_requests (
  id uuid primary key default gen_random_uuid(),
  email text,
  email_hash text not null,
  ip_hash text,
  widget text not null,
  ags text not null,
  period text not null,
  cache_key text not null,
  data_version text not null,
  token_hash text not null unique,
  token_expires_at timestamptz not null,
  download_hash text unique,
  status text not null check (status in ('pending','confirmed','delivered','failed','refused','expired')),
  job_id uuid references video_render_jobs(id) on delete set null,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  ended_at timestamptz
);
-- Optional subscription (separate consent, handed to the subscription signup after confirmation).
alter table video_requests add column if not exists subscribe boolean not null default false;
alter table video_requests add column if not exists consent_version text;
alter table video_requests add column if not exists notification_lease_until timestamptz;
create index if not exists video_requests_email on video_requests (email_hash, created_at);
create index if not exists video_requests_ip on video_requests (ip_hash, created_at);
create index if not exists video_requests_job on video_requests (job_id, status);

alter table video_render_jobs enable row level security;
alter table video_requests enable row level security;
revoke all on video_render_jobs, video_requests from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on video_render_jobs, video_requests from anon, authenticated';
  end if;
end $$;

-- Create a pending request (before the confirmation mail goes out).
create or replace function video_request_create(p jsonb) returns jsonb
language plpgsql as $$
declare
  n_email int; n_ip int; n_mails int; dup uuid; new_id uuid;
begin
  perform pg_advisory_xact_lock(7342100);
  select count(*) into n_mails from video_requests where created_at > now() - interval '1 hour';
  if n_mails >= (p->>'mails_per_hour')::int then
    return jsonb_build_object('result','limit_global');
  end if;
  if p->>'ip_hash' is not null then
    select count(*) into n_ip from video_requests
      where ip_hash = p->>'ip_hash' and created_at > now() - interval '1 hour';
    if n_ip >= (p->>'per_ip_hour')::int then
      return jsonb_build_object('result','limit_ip');
    end if;
  end if;
  select id into dup from video_requests
    where email_hash = p->>'email_hash' and widget = p->>'widget' and ags = p->>'ags'
      and period = p->>'period' and status = 'pending'
      and created_at > now() - make_interval(mins => (p->>'resend_after_minutes')::int)
    limit 1;
  if dup is not null then
    return jsonb_build_object('result','duplicate');
  end if;
  select count(*) into n_email from video_requests
    where email_hash = p->>'email_hash' and created_at > now() - interval '24 hours';
  if n_email >= (p->>'per_email_day')::int then
    return jsonb_build_object('result','limit_email');
  end if;
  insert into video_requests (email, email_hash, ip_hash, widget, ags, period, cache_key, data_version,
                              token_hash, token_expires_at, status, subscribe, consent_version)
    values (p->>'email', p->>'email_hash', p->>'ip_hash', p->>'widget', p->>'ags', p->>'period',
            p->>'cache_key', p->>'data_version', p->>'token_hash', now() + make_interval(mins => (p->>'confirm_minutes')::int), 'pending',
            coalesce((p->>'subscribe')::boolean, false), p->>'consent_version')
    returning id into new_id;
  return jsonb_build_object('result','created','id',new_id);
end $$;

-- The mail could not be sent: drop the request so it does not count as sent.
create or replace function video_request_discard(p jsonb) returns jsonb
language plpgsql as $$
begin
  perform pg_advisory_xact_lock(7342100);
  delete from video_requests where id = (p->>'id')::uuid and status = 'pending';
  return jsonb_build_object('result','ok');
end $$;

-- Find or create the render job for a cache key, respecting capacity.
-- Internal helper; caller holds the lock.
create or replace function video_job_attach(p jsonb) returns jsonb
language plpgsql as $$
declare j video_render_jobs; n_today int; n_queue int; had boolean;
begin
  select * into j from video_render_jobs where cache_key = p->>'cache_key' for update;
  -- FOUND is overwritten by every later SELECT INTO; keep it.
  had := found;
  if had and j.status = 'done' and j.expires_at > now() then
    return jsonb_build_object('result','ready','job_id',j.id);
  end if;
  if had and j.status in ('queued','rendering') then
    return jsonb_build_object('result','queued','job_id',j.id);
  end if;
  select count(*) into n_queue from video_render_jobs where status in ('queued','rendering');
  if n_queue >= (p->>'max_queue')::int then
    return jsonb_build_object('result','capacity_queue');
  end if;
  if p->>'source' = 'public' then
    select count(*) into n_today from video_render_jobs
      where source = 'public' and queued_at >= date_trunc('day', now());
    if n_today >= (p->>'renders_per_day')::int then
      return jsonb_build_object('result','capacity_day');
    end if;
  end if;
  if had then
    update video_render_jobs set status = 'queued', attempts = 0, error = null, lease_until = null,
      worker = null, object_path = null, bytes = null, render_ms = null, started_at = null,
      finished_at = null, expires_at = null, queued_at = now(), source = p->>'source'
      where id = j.id;
    return jsonb_build_object('result','queued','job_id',j.id,'new',true);
  end if;
  insert into video_render_jobs (cache_key, widget, ags, period, data_version, design_version, source, status)
    values (p->>'cache_key', p->>'widget', p->>'ags', p->>'period', p->>'data_version',
            p->>'design_version', p->>'source', 'queued')
    returning * into j;
  return jsonb_build_object('result','queued','job_id',j.id,'new',true);
end $$;

-- Redeem a confirmation token. Single use: a second click (or a mail scanner
-- re-opening the link) never creates a second job.
create or replace function video_request_confirm(p jsonb) returns jsonb
language plpgsql as $$
declare r video_requests; a jsonb; sub jsonb;
begin
  perform pg_advisory_xact_lock(7342100);
  select * into r from video_requests where token_hash = p->>'token_hash' for update;
  if not found then return jsonb_build_object('result','invalid'); end if;
  if r.status <> 'pending' then
    return jsonb_build_object('result','already','status',r.status);
  end if;
  if r.token_expires_at < now() then
    update video_requests set status = 'expired', ended_at = now(), email = null where id = r.id;
    return jsonb_build_object('result','expired');
  end if;
  -- The subscription is handed on only after this confirmation, once, and
  -- independently of whether the video can be rendered.
  sub := case when r.subscribe then jsonb_build_object('subscribe', jsonb_build_object('email', r.email,
    'ags', r.ags, 'consent_version', r.consent_version)) else '{}'::jsonb end;
  a := video_job_attach(p || jsonb_build_object('source','public','widget',r.widget,'ags',r.ags,
    'period',r.period,'cache_key',r.cache_key,'data_version',r.data_version));
  if a->>'result' like 'capacity%' then
    update video_requests set status = 'refused', confirmed_at = now(), ended_at = now(), email = null where id = r.id;
    return a || sub;
  end if;
  update video_requests set status = 'confirmed', confirmed_at = now(), job_id = (a->>'job_id')::uuid where id = r.id;
  return a || jsonb_build_object('request_id', r.id) || sub;
end $$;

-- Operator: verified account, automatic mail, no second confirmation; queue cap still applies.
create or replace function video_operator_create(p jsonb) returns jsonb
language plpgsql as $$
declare a jsonb;
begin
  perform pg_advisory_xact_lock(7342100);
  a := video_job_attach(p || jsonb_build_object('source','operator'));
  if a->>'job_id' is not null and nullif(p->>'email','') is not null then
    -- Repeated clicks reuse both render and delivery, including a recently delivered file.
    if not exists (select 1 from video_requests where job_id = (a->>'job_id')::uuid
      and email_hash = p->>'email_hash'
      and (status = 'confirmed' or (status = 'delivered'
        and created_at >= (select queued_at from video_render_jobs where id = (a->>'job_id')::uuid)))) then
      insert into video_requests (email,email_hash,widget,ags,period,cache_key,data_version,
        token_hash,token_expires_at,status,job_id,confirmed_at)
      values (p->>'email',p->>'email_hash',p->>'widget',p->>'ags',p->>'period',p->>'cache_key',p->>'data_version',
        p->>'token_hash',now(),'confirmed',(a->>'job_id')::uuid,now());
    end if;
  end if;
  return a;
end $$;

-- One dispatch per minute across all server instances; scheduled runs remain a safety net.
create table if not exists video_worker_dispatch (
  singleton boolean primary key default true check (singleton),
  next_at timestamptz not null default now()
);
alter table video_worker_dispatch enable row level security;
revoke all on video_worker_dispatch from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on video_worker_dispatch from anon, authenticated';
  end if;
end $$;
create or replace function video_worker_wakeup(p jsonb) returns jsonb
language plpgsql as $$
begin
  perform pg_advisory_xact_lock(7342100);
  if not exists (select 1 from video_render_jobs where status = 'queued') then
    return jsonb_build_object('dispatch',false);
  end if;
  insert into video_worker_dispatch(singleton,next_at) values(true,now()) on conflict do nothing;
  update video_worker_dispatch set next_at = now() + interval '60 seconds' where singleton and next_at <= now();
  return jsonb_build_object('dispatch',found);
end $$;

create or replace function video_job_status(p jsonb) returns jsonb
language sql as $$
  select coalesce((select jsonb_build_object('id',id,'status',status,'error',error,'attempts',attempts,
    'progress',case when status = 'done' then 100 else progress end,'expires_at',expires_at,'bytes',bytes,'render_ms',render_ms,'widget',widget,'ags',ags,'period',period)
    from video_render_jobs where id = (p->>'id')::uuid), jsonb_build_object('status','unknown'));
$$;

-- Progress updates belong only to the worker currently holding the live lease.
create or replace function video_job_progress(p jsonb) returns jsonb
language plpgsql as $$
begin
  update video_render_jobs set progress = greatest(progress, least(99, greatest(0, (p->>'progress')::int)))
    where id = (p->>'id')::uuid and worker = p->>'worker'
      and status = 'rendering' and lease_until > now();
  return jsonb_build_object('updated', found);
end $$;

-- Worker: take the oldest queued job if a slot is free. Stale leases first go
-- back to the queue (or fail once attempts are used up).
create or replace function video_job_claim(p jsonb) returns jsonb
language plpgsql as $$
declare j video_render_jobs; running int;
begin
  perform pg_advisory_xact_lock(7342100);
  update video_render_jobs
    set status = case when attempts >= (p->>'max_attempts')::int then 'failed' else 'queued' end,
        error = 'lease_expired', lease_until = null, worker = null,
        finished_at = case when attempts >= (p->>'max_attempts')::int then now() else null end
    where status = 'rendering' and lease_until < now();
  select count(*) into running from video_render_jobs where status = 'rendering';
  if running >= (p->>'max_concurrent')::int then
    return jsonb_build_object('result','busy');
  end if;
  select * into j from video_render_jobs where status = 'queued' order by queued_at limit 1 for update skip locked;
  if not found then return jsonb_build_object('result','empty'); end if;
  update video_render_jobs set status = 'rendering', progress = 0, attempts = attempts + 1, worker = p->>'worker',
    lease_until = now() + make_interval(secs => (p->>'lease_seconds')::int), started_at = now(), error = null
    where id = j.id returning * into j;
  return jsonb_build_object('result','claimed','job', to_jsonb(j));
end $$;

-- Worker: report the outcome. Only the worker holding the lease may finish.
create or replace function video_job_finish(p jsonb) returns jsonb
language plpgsql as $$
declare j video_render_jobs;
begin
  perform pg_advisory_xact_lock(7342100);
  select * into j from video_render_jobs where id = (p->>'id')::uuid for update;
  if not found or j.status <> 'rendering' or j.worker is distinct from p->>'worker' then
    return jsonb_build_object('result','not_owner');
  end if;
  if (p->>'ok')::boolean then
    update video_render_jobs set status = 'done', object_path = p->>'object_path', bytes = (p->>'bytes')::bigint,
      render_ms = (p->>'render_ms')::int, finished_at = now(), lease_until = null,
      expires_at = now() + make_interval(days => (p->>'file_days')::int)
      where id = j.id;
    return jsonb_build_object('result','done');
  end if;
  if j.attempts < (p->>'max_attempts')::int then
    update video_render_jobs set status = 'queued', error = p->>'error', lease_until = null, worker = null,
      queued_at = now() where id = j.id;
    return jsonb_build_object('result','retry');
  end if;
  update video_render_jobs set status = 'failed', error = p->>'error', lease_until = null, finished_at = now()
    where id = j.id;
  return jsonb_build_object('result','failed');
end $$;

-- Claim delivery before sending so a cached request and worker cannot mail it twice.
create or replace function video_pending_notifications(p jsonb) returns jsonb
language sql as $$
  with eligible as (
    select r.id from video_requests r join video_render_jobs j on j.id = r.job_id
    where r.status = 'confirmed' and r.email is not null
      and (r.notification_lease_until is null or r.notification_lease_until < now())
      and ((j.status = 'done' and j.expires_at > now()) or j.status = 'failed')
    for update of r skip locked
  ), claimed as (
    update video_requests r set notification_lease_until = now() + interval '5 minutes'
    from eligible e where r.id = e.id returning r.*
  )
  select coalesce(jsonb_agg(jsonb_build_object('request_id', r.id, 'email', r.email, 'job_status', j.status,
    'widget', r.widget, 'ags', r.ags, 'period', r.period, 'expires_at', j.expires_at)), '[]'::jsonb)
  from claimed r join video_render_jobs j on j.id = r.job_id;
$$;

-- The mail went out: store the download hash, drop the address.
create or replace function video_request_notified(p jsonb) returns jsonb
language plpgsql as $$
begin
  perform pg_advisory_xact_lock(7342100);
  update video_requests set status = case when p->>'download_hash' is null then 'failed' else 'delivered' end,
    download_hash = p->>'download_hash', ended_at = now(), email = null
    where id = (p->>'request_id')::uuid and status = 'confirmed';
  return jsonb_build_object('result','ok');
end $$;

-- Resolve a download link to a file that still exists.
create or replace function video_download(p jsonb) returns jsonb
language sql as $$
  select coalesce((select jsonb_build_object('object_path', j.object_path, 'widget', j.widget, 'ags', j.ags,
      'period', j.period)
    from video_requests r join video_render_jobs j on j.id = r.job_id
    where r.download_hash = p->>'download_hash' and j.status = 'done' and j.expires_at > now()),
    jsonb_build_object('result','gone'));
$$;

create or replace function video_job_file(p jsonb) returns jsonb
language sql as $$
  select coalesce((select jsonb_build_object('object_path', object_path, 'widget', widget, 'ags', ags, 'period', period)
    from video_render_jobs where id = (p->>'id')::uuid and status = 'done' and expires_at > now()),
    jsonb_build_object('result','gone'));
$$;

-- Expire files and links, forget addresses and old rows. Returns the files to delete.
create or replace function video_cleanup(p jsonb) returns jsonb
language plpgsql as $$
declare paths jsonb;
begin
  perform pg_advisory_xact_lock(7342100);
  with gone as (
    update video_render_jobs set status = 'expired'
      where status = 'done' and expires_at <= now() returning object_path
  ) select coalesce(jsonb_agg(object_path), '[]'::jsonb) into paths from gone;
  update video_requests set status = 'expired', ended_at = now(), email = null
    where status = 'pending' and token_expires_at < now();
  update video_requests set email = null
    where email is not null and ended_at is not null
      and ended_at < now() - make_interval(hours => (p->>'email_retention_hours')::int);
  delete from video_requests where created_at < now() - make_interval(days => (p->>'request_retention_days')::int);
  delete from video_render_jobs where status in ('expired','failed')
    and coalesce(finished_at, created_at) < now() - make_interval(days => (p->>'request_retention_days')::int)
    and not exists (select 1 from video_requests r where r.job_id = video_render_jobs.id);
  return jsonb_build_object('result','ok','delete_paths', paths);
end $$;

do $$
declare f text;
begin
  foreach f in array array['video_request_create','video_request_discard','video_job_attach','video_request_confirm',
    'video_operator_create','video_job_progress','video_job_status','video_job_claim','video_job_finish','video_pending_notifications',
    'video_request_notified','video_download','video_job_file','video_cleanup','video_worker_wakeup'] loop
    execute format('revoke all on function %I(jsonb) from public', f);
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke all on function %I(jsonb) from anon, authenticated', f);
      execute format('grant execute on function %I(jsonb) to service_role', f);
    end if;
  end loop;
end $$;
`;
