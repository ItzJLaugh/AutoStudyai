alter table public.study_guides
add column if not exists external_source_id text;

create unique index if not exists study_guides_user_external_source_idx
on public.study_guides (user_id, external_source_id);
