-- Classroom writes go through FastAPI, which validates ownership before using
-- the service role. Remove the duplicate direct-write surface from the Data API.
drop policy if exists "Allow insert for authenticated users" on public.user_profiles;

drop policy if exists "Users can insert own folders" on public.folders;
drop policy if exists "Users can update own folders" on public.folders;
drop policy if exists "Users can delete own folders" on public.folders;

drop policy if exists "Users can insert own guides" on public.study_guides;
drop policy if exists "Users can update own guides" on public.study_guides;
drop policy if exists "Users can delete own guides" on public.study_guides;

drop policy if exists "Users can insert own attempts" on public.quiz_attempts;
drop policy if exists "Users can update own attempts" on public.quiz_attempts;
drop policy if exists "Users can delete own attempts" on public.quiz_attempts;

drop policy if exists "Users can insert own sessions" on public.study_sessions;
drop policy if exists "Users can update own sessions" on public.study_sessions;
drop policy if exists "Users can delete own sessions" on public.study_sessions;

drop policy if exists "Users can insert own streaks" on public.user_streaks;
drop policy if exists "Users can update own streaks" on public.user_streaks;

drop policy if exists "Users can insert own usage" on public.monthly_usage;
drop policy if exists "Users can update own usage" on public.monthly_usage;
