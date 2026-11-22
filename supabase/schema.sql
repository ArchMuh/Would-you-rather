-- Would You Rather — Supabase backend schema
-- Run this ONCE in the Supabase SQL editor (Dashboard → SQL → New query → paste → Run).
-- Safe to re-run: all objects use IF NOT EXISTS / CREATE OR REPLACE.

-- ─── Tables ────────────────────────────────────────────────────────────────

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_token uuid not null,           -- secret known only to the host device
  status text not null default 'lobby' check (status in ('lobby','playing','closed')),
  mode text not null default 'classic',
  current_round int not null default 0,
  total_rounds int not null default 10,
  question_ids jsonb not null default '[]'::jsonb,
  voting_open boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '6 hours'
);

create table if not exists public.room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  player_token uuid not null,          -- device-persisted, enables reconnection
  name text not null check (char_length(name) between 1 and 24),
  avatar text not null default 'fox',
  is_host boolean not null default false,
  connected boolean not null default true,
  joined_at timestamptz not null default now(),
  unique (room_id, player_token)
);

create table if not exists public.votes (
  room_id uuid not null references public.rooms(id) on delete cascade,
  round int not null,
  player_id uuid not null references public.room_players(id) on delete cascade,
  choice text not null check (choice in ('A','B')),
  answered_at timestamptz not null default now(),
  primary key (room_id, round, player_id)  -- duplicate votes impossible
);

create index if not exists room_players_room_idx on public.room_players(room_id);
create index if not exists votes_room_idx on public.votes(room_id);
create index if not exists rooms_expires_idx on public.rooms(expires_at);

-- Community questions submitted by players (optional, reviewed before publishing).
create table if not exists public.question_submissions (
  id uuid primary key default gen_random_uuid(),
  option_a text not null,
  option_b text not null,
  category text not null default 'classic',
  language text not null default 'en',
  created_at timestamptz not null default now()
);

-- Reports against bundled questions.
create table if not exists public.question_reports (
  id uuid primary key default gen_random_uuid(),
  question_id text not null,
  reason text,
  created_at timestamptz not null default now()
);

-- ─── Privileges (RLS policies then decide row access) ─────────────────────

grant select on public.rooms to anon;
grant select on public.room_players to anon;
grant select on public.votes to anon;
grant insert on public.question_submissions to anon;
grant insert on public.question_reports to anon;
grant execute on function public.create_room(text, text, uuid, text, jsonb, int, text) to anon;
grant execute on function public.join_room(text, text, text, uuid) to anon;
grant execute on function public.submit_vote(uuid, uuid, uuid, int, text) to anon;
grant execute on function public.host_action(uuid, uuid, text) to anon;
grant execute on function public.leave_room(uuid, uuid, uuid) to anon;

-- ─── Row level security ────────────────────────────────────────────────────
-- Anonymous clients can read room state and submit through RPCs only.
-- Direct writes are denied; all mutations go through security-definer
-- functions that verify per-player and host tokens.

alter table public.rooms enable row level security;
alter table public.room_players enable row level security;
alter table public.votes enable row level security;
alter table public.question_submissions enable row level security;
alter table public.question_reports enable row level security;

drop policy if exists rooms_read on public.rooms;
create policy rooms_read on public.rooms for select to anon using (true);
drop policy if exists players_read on public.room_players;
create policy players_read on public.room_players for select to anon using (true);
drop policy if exists votes_read on public.votes;
create policy votes_read on public.votes for select to anon using (true);
drop policy if exists submissions_insert on public.question_submissions;
create policy submissions_insert on public.question_submissions for insert to anon with check (true);
drop policy if exists reports_insert on public.question_reports;
create policy reports_insert on public.question_reports for insert to anon with check (true);

-- ─── RPC functions ─────────────────────────────────────────────────────────

create or replace function public.create_room(
  p_name text, p_avatar text, p_token uuid, p_mode text,
  p_question_ids jsonb, p_total_rounds int, p_code text
) returns table (room_id uuid, code text, player_id uuid, host_token uuid)
language plpgsql security definer set search_path = public as $$
declare
  v_room_id uuid; v_host_token uuid := gen_random_uuid(); v_player_id uuid;
begin
  insert into rooms (code, host_token, mode, question_ids, total_rounds)
  values (upper(p_code), v_host_token, p_mode, p_question_ids, greatest(1, least(p_total_rounds, 50)))
  returning id into v_room_id;

  insert into room_players (room_id, player_token, name, avatar, is_host)
  values (v_room_id, p_token, left(p_name, 24), p_avatar, true)
  returning id into v_player_id;

  return query select v_room_id, upper(p_code), v_player_id, v_host_token;
end $$;

create or replace function public.join_room(
  p_code text, p_name text, p_avatar text, p_token uuid
) returns table (room_id uuid, player_id uuid, reconnected boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_room rooms%rowtype; v_player_id uuid; v_count int; v_existing uuid;
begin
  select * into v_room from rooms where code = upper(p_code) and status <> 'closed' and expires_at > now();
  if not found then raise exception 'room_not_found'; end if;

  -- Reconnection: same device token rejoins as the same player.
  select rp.id into v_existing from room_players rp where rp.room_id = v_room.id and rp.player_token = p_token;
  if v_existing is not null then
    update room_players rp set connected = true, name = left(p_name, 24), avatar = p_avatar where rp.id = v_existing;
    return query select v_room.id, v_existing, true;
    return;
  end if;

  if v_room.status <> 'lobby' then raise exception 'room_closed'; end if;

  select count(*) into v_count from room_players rp where rp.room_id = v_room.id;
  if v_count >= 12 then raise exception 'room_full'; end if;

  insert into room_players (room_id, player_token, name, avatar)
  values (v_room.id, p_token, left(p_name, 24), p_avatar)
  returning id into v_player_id;

  return query select v_room.id, v_player_id, false;
end $$;

create or replace function public.submit_vote(
  p_room_id uuid, p_player_id uuid, p_token uuid, p_round int, p_choice text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_room rooms%rowtype;
begin
  select * into v_room from rooms where id = p_room_id;
  if not found or v_room.status <> 'playing' or not v_room.voting_open then
    raise exception 'room_closed';
  end if;
  if v_room.current_round <> p_round then
    raise exception 'wrong_round';
  end if;
  -- Ownership check: the token must match the player's device token.
  if not exists (select 1 from room_players where id = p_player_id and room_id = p_room_id and player_token = p_token) then
    raise exception 'not_your_vote';
  end if;
  insert into votes (room_id, round, player_id, choice)
  values (p_room_id, p_round, p_player_id, p_choice)
  on conflict (room_id, round, player_id) do nothing; -- duplicate protection
end $$;

create or replace function public.host_action(
  p_room_id uuid, p_host_token uuid, p_action text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_room rooms%rowtype;
begin
  select * into v_room from rooms where id = p_room_id;
  if not found or v_room.host_token <> p_host_token then
    raise exception 'not_host';
  end if;

  case p_action
    when 'start' then
      if v_room.status = 'lobby' then
        update rooms set status = 'playing', current_round = 0, voting_open = true where id = p_room_id;
      end if;
    when 'end_voting' then
      update rooms set voting_open = false where id = p_room_id;
    when 'next_round' then
      update rooms
      set current_round = current_round + 1,
          voting_open = current_round + 1 < total_rounds,
          status = case when current_round + 1 >= total_rounds then 'closed' else status end
      where id = p_room_id;
    when 'close' then
      update rooms set status = 'closed', voting_open = false where id = p_room_id;
    else
      raise exception 'unknown_action';
  end case;
end $$;

create or replace function public.leave_room(
  p_room_id uuid, p_player_id uuid, p_token uuid
) returns void
language plpgsql security definer set search_path = public as $$
begin
  update room_players set connected = false
  where id = p_player_id and room_id = p_room_id and player_token = p_token;
  -- Close empty rooms immediately.
  if not exists (select 1 from room_players where room_id = p_room_id and connected) then
    update rooms set status = 'closed', voting_open = false where id = p_room_id;
  end if;
end $$;

-- ─── Realtime ──────────────────────────────────────────────────────────────

alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.room_players;
alter publication supabase_realtime add table public.votes;

-- ─── Expired room cleanup (optional but recommended) ───────────────────────
-- Dashboard → Database → Extensions → enable pg_cron, then:
-- select cron.schedule('close-expired-rooms', '*/15 * * * *',
--   $$update public.rooms set status = 'closed' where expires_at < now() and status <> 'closed'$$);
