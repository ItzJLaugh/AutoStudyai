-- Extend the existing feedback table for the Classroom beta feedback loop.
-- The FastAPI service is the only data owner; browser clients receive no table grants.

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  category text not null default 'other',
  created_at timestamptz not null default now()
);

alter table public.feedback
  add column if not exists status text not null default 'new',
  add column if not exists page_path text,
  add column if not exists app_version text,
  add column if not exists guide_id text,
  add column if not exists question_id text,
  add column if not exists client_request_id uuid,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null;

-- Normalize the three legacy beta categories before closing the new category set.
update public.feedback set category = 'suggestion' where category = 'feature';
update public.feedback set category = 'other' where category = 'general';

alter table public.feedback
  drop constraint if exists feedback_category_check;
alter table public.feedback
  add constraint feedback_category_check
  check (category in ('bug', 'suggestion', 'incorrect_content', 'account_payment', 'other'));

alter table public.feedback
  drop constraint if exists feedback_status_check;
alter table public.feedback
  add constraint feedback_status_check
  check (status in ('new', 'reviewing', 'planned', 'resolved'));

alter table public.feedback
  drop constraint if exists feedback_page_path_length_check;
alter table public.feedback
  add constraint feedback_page_path_length_check
  check (page_path is null or char_length(page_path) <= 500);

alter table public.feedback
  drop constraint if exists feedback_app_version_length_check;
alter table public.feedback
  add constraint feedback_app_version_length_check
  check (app_version is null or char_length(app_version) <= 100);

alter table public.feedback
  drop constraint if exists feedback_guide_id_length_check;
alter table public.feedback
  add constraint feedback_guide_id_length_check
  check (guide_id is null or char_length(guide_id) <= 100);

alter table public.feedback
  drop constraint if exists feedback_question_id_length_check;
alter table public.feedback
  add constraint feedback_question_id_length_check
  check (question_id is null or char_length(question_id) <= 100);

create unique index if not exists feedback_user_request_once
  on public.feedback (user_id, client_request_id);

create index if not exists feedback_review_queue
  on public.feedback (status, category, created_at desc);

alter table public.feedback enable row level security;
revoke all on table public.feedback from public, anon, authenticated;
grant select, insert, update on table public.feedback to service_role;
