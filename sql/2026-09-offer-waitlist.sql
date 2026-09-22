-- Apply with the release, not against production from a design preview.
create table if not exists public.offer_waitlist (
 id uuid primary key default gen_random_uuid(),
 email text not null unique,
 consent text not null,
 requested_at timestamptz not null default now(),
 confirmed_at timestamptz,
 token_hash text not null,
 cancel_hash text not null,
 expires_at timestamptz not null,
 mail_receipt text
);
alter table public.offer_waitlist enable row level security;
revoke all on public.offer_waitlist from anon, authenticated;
grant all on public.offer_waitlist to service_role;

-- Serialize reservations: neither concurrent instances nor retries can send twice.
create or replace function public.reserve_offer_waitlist(p_email text, p_token_hash text, p_cancel_hash text, p_consent text)
returns uuid language plpgsql security definer set search_path = public as $$
declare result uuid;
begin
 perform pg_advisory_xact_lock(76412091);
 delete from offer_waitlist where confirmed_at is null and expires_at < now() - interval '7 days';
 if exists(select 1 from offer_waitlist where email=p_email and
   (confirmed_at is not null or requested_at > now() - interval '24 hours')) then return null; end if;
 -- A persistent daily budget bounds abuse across all instances and addresses.
 if (select count(*) from offer_waitlist where requested_at > now() - interval '24 hours') >= 100 then return null; end if;
 insert into offer_waitlist(email,consent,token_hash,cancel_hash,expires_at)
 values(p_email,p_consent,p_token_hash,p_cancel_hash,now()+interval '48 hours')
 on conflict(email) do update set requested_at=now(),consent=p_consent,
 token_hash=p_token_hash,cancel_hash=p_cancel_hash,expires_at=now()+interval '48 hours',mail_receipt=null
 returning id into result;
 return result;
end $$;
revoke all on function public.reserve_offer_waitlist(text,text,text,text) from public,anon,authenticated;
grant execute on function public.reserve_offer_waitlist(text,text,text,text) to service_role;
