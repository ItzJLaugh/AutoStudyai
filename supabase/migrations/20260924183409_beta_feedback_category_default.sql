-- Preserve the closed category contract when upgrading the legacy feedback table.
alter table public.feedback alter column category set default 'other';
