alter table public.review_sessions
  add column if not exists hand_block_2_enabled boolean not null default false,
  add column if not exists hand_block_2_x numeric(5,2) not null default 0,
  add column if not exists hand_block_2_y numeric(5,2) not null default 0,
  add column if not exists hand_block_2_width numeric(5,2) not null default 0,
  add column if not exists hand_block_2_height numeric(5,2) not null default 0;
