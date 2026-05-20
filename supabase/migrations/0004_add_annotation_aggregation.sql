alter table public.annotations
add column aggregation_cluster_id text,
add column aggregated_action_label text,
add column aggregation_version text,
add column aggregated_at timestamptz;
