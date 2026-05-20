create extension if not exists pgcrypto;

create table public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text,
  discord_id text unique,
  supabase_auth_user_id uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.review_sessions (
  id uuid primary key default gen_random_uuid(),
  presenter_user_id uuid not null references public.users(id),
  share_slug text not null unique,
  presenter_slug text not null unique,
  youtube_url text not null,
  youtube_video_id text not null,
  decklist_text text not null,
  hand_block_enabled boolean not null default false,
  hand_block_x numeric(5,2) not null default 0,
  hand_block_y numeric(5,2) not null default 0,
  hand_block_width numeric(5,2) not null default 0,
  hand_block_height numeric(5,2) not null default 0,
  hand_block_2_enabled boolean not null default false,
  hand_block_2_x numeric(5,2) not null default 0,
  hand_block_2_y numeric(5,2) not null default 0,
  hand_block_2_width numeric(5,2) not null default 0,
  hand_block_2_height numeric(5,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.session_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.review_sessions(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('presenter', 'reviewer')),
  created_at timestamptz not null default now(),
  unique (session_id, user_id, role)
);

create table public.decision_points (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.review_sessions(id) on delete cascade,
  timestamp_seconds numeric(10,2) not null,
  source text not null check (source in ('manual_annotation', 'merged', 'presenter')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index decision_points_session_timestamp_idx
  on public.decision_points(session_id, timestamp_seconds);

create table public.annotations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.review_sessions(id) on delete cascade,
  decision_point_id uuid not null references public.decision_points(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  original_timestamp_seconds numeric(10,2) not null,
  action_type text not null check (action_type in ('play_land', 'cast_spell', 'attack', 'block', 'activate_ability', 'pass', 'other')),
  action_text text not null,
  arguments_text text not null,
  locked_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index annotations_decision_point_idx
  on public.annotations(decision_point_id);

create table public.annotation_verdicts (
  id uuid primary key default gen_random_uuid(),
  annotation_id uuid not null unique references public.annotations(id) on delete cascade,
  verdict text not null check (verdict in ('same_play', 'different_play', 'unclear')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.decision_point_merges (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.review_sessions(id) on delete cascade,
  from_decision_point_id uuid not null references public.decision_points(id) on delete cascade,
  to_decision_point_id uuid not null references public.decision_points(id) on delete cascade,
  merged_by_user_id uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  check (from_decision_point_id <> to_decision_point_id)
);

create or replace function public.prevent_locked_annotation_edits()
returns trigger
language plpgsql
as $$
begin
  if old.locked_at is not null and (
    old.original_timestamp_seconds <> new.original_timestamp_seconds or
    old.action_type <> new.action_type or
    old.action_text <> new.action_text or
    old.arguments_text <> new.arguments_text
  ) then
    raise exception 'Locked annotations cannot be edited.';
  end if;

  return new;
end;
$$;

create trigger prevent_locked_annotation_edits
before update on public.annotations
for each row execute function public.prevent_locked_annotation_edits();
