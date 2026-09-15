alter table public.folders
add column if not exists external_source_id text;

create unique index if not exists folders_user_external_source_idx
on public.folders (user_id, external_source_id);

alter table public.study_guides
add column if not exists source_guide_id uuid references public.study_guides(id) on delete set null;
