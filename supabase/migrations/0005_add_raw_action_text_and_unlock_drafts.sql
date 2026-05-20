alter table public.annotations
add column raw_action_text text;

update public.annotations
set raw_action_text = action_text
where raw_action_text is null;

alter table public.annotations
alter column raw_action_text set not null;

alter table public.annotations
alter column locked_at drop not null,
alter column locked_at drop default;

create or replace function public.prevent_locked_annotation_edits()
returns trigger
language plpgsql
as $$
begin
  if old.locked_at is not null and (
    old.original_timestamp_seconds <> new.original_timestamp_seconds or
    old.raw_action_text <> new.raw_action_text or
    old.action_type <> new.action_type or
    old.action_text <> new.action_text or
    old.arguments_text <> new.arguments_text
  ) then
    raise exception 'Locked annotations cannot be edited.';
  end if;

  return new;
end;
$$;
