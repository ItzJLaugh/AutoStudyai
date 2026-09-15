alter table public.study_guides
add column if not exists source_type text,
add column if not exists source_title text,
add column if not exists source_id text;
