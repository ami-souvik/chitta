-- Add session_id to chat_history
alter table public.chat_history
  add column if not exists session_id text;

create index if not exists chat_history_session
  on public.chat_history(user_id, session_id, created_at desc);
