alter table public.review_sessions
add column opponent_decklist_text text not null default '';
