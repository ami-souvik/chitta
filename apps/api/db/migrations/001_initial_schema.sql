-- ============================================================
-- Chitta — Initial Schema
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- Enable pgvector for journal embeddings
create extension if not exists vector;

-- ── users ────────────────────────────────────────────────────
create table if not exists public.users (
  id            text primary key,           -- Clerk user_id (user_xxx)
  email         text,
  name          text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ── finance_entries ──────────────────────────────────────────
create table if not exists public.finance_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null references public.users(id) on delete cascade,
  type        text not null check (type in ('income', 'expense')),
  amount      numeric(12, 2) not null,
  category    text not null default 'other',
  description text,
  date        date not null default current_date,
  created_at  timestamptz default now()
);
create index if not exists finance_entries_user_date on public.finance_entries(user_id, date desc);

-- ── tasks ────────────────────────────────────────────────────
create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null references public.users(id) on delete cascade,
  title       text not null,
  status      text not null default 'pending' check (status in ('pending', 'in_progress', 'done')),
  priority    text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  due_date    date,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index if not exists tasks_user_status on public.tasks(user_id, status);

-- ── health_logs ──────────────────────────────────────────────
create table if not exists public.health_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null references public.users(id) on delete cascade,
  type       text not null,   -- sleep | water | mood | weight | workout | steps | ...
  value      numeric,
  unit       text,
  notes      text,
  date       date not null default current_date,
  created_at timestamptz default now()
);
create index if not exists health_logs_user_date on public.health_logs(user_id, date desc);

-- ── journal_entries ──────────────────────────────────────────
create table if not exists public.journal_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null references public.users(id) on delete cascade,
  content    text not null,
  mood       text check (mood in ('great', 'good', 'neutral', 'bad', 'awful')),
  tags       text[],
  date       date not null default current_date,
  embedding  vector(768),     -- Gemini text-embedding-004 dim
  created_at timestamptz default now()
);
create index if not exists journal_entries_user_date on public.journal_entries(user_id, date desc);

-- ── ideas ────────────────────────────────────────────────────
create table if not exists public.ideas (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null references public.users(id) on delete cascade,
  content    text not null,
  type       text not null default 'idea'
               check (type in ('idea', 'worry', 'goal', 'observation', 'question')),
  status     text not null default 'raw'
               check (status in ('raw', 'explored', 'archived')),
  embedding  vector(768),
  created_at timestamptz default now()
);
create index if not exists ideas_user_type on public.ideas(user_id, type);

-- ── chat_history ─────────────────────────────────────────────
create table if not exists public.chat_history (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null references public.users(id) on delete cascade,
  role       text not null check (role in ('user', 'assistant')),
  content    text not null,
  intent     text,
  domain     text,
  created_at timestamptz default now()
);
create index if not exists chat_history_user on public.chat_history(user_id, created_at desc);

-- ── graph_nodes ──────────────────────────────────────────────
create table if not exists public.graph_nodes (
  id           uuid primary key default gen_random_uuid(),
  user_id      text not null references public.users(id) on delete cascade,
  label        text not null,
  type         text not null,   -- idea | worry | goal | journal_theme | ...
  source_id    uuid,            -- id from the originating table
  source_table text,            -- 'ideas' | 'journal_entries' | ...
  neo4j_id     text,            -- neo4j internal node id (if synced)
  created_at   timestamptz default now()
);
create index if not exists graph_nodes_user on public.graph_nodes(user_id);

-- ── Row Level Security ───────────────────────────────────────
-- We use service role key in the API, so RLS is bypassed for all server calls.
-- Enable it anyway so direct client access is scoped per user.

alter table public.users           enable row level security;
alter table public.finance_entries enable row level security;
alter table public.tasks           enable row level security;
alter table public.health_logs     enable row level security;
alter table public.journal_entries enable row level security;
alter table public.ideas           enable row level security;
alter table public.chat_history    enable row level security;
alter table public.graph_nodes     enable row level security;

-- Policies (service role bypasses these automatically)
-- Drop first so this script is idempotent
drop policy if exists "users: own row"           on public.users;
drop policy if exists "finance_entries: own rows" on public.finance_entries;
drop policy if exists "tasks: own rows"           on public.tasks;
drop policy if exists "health_logs: own rows"     on public.health_logs;
drop policy if exists "journal_entries: own rows" on public.journal_entries;
drop policy if exists "ideas: own rows"           on public.ideas;
drop policy if exists "chat_history: own rows"    on public.chat_history;
drop policy if exists "graph_nodes: own rows"     on public.graph_nodes;

create policy "users: own row" on public.users
  for all using (id = current_setting('request.jwt.claims', true)::jsonb->>'sub');

create policy "finance_entries: own rows" on public.finance_entries
  for all using (user_id = current_setting('request.jwt.claims', true)::jsonb->>'sub');

create policy "tasks: own rows" on public.tasks
  for all using (user_id = current_setting('request.jwt.claims', true)::jsonb->>'sub');

create policy "health_logs: own rows" on public.health_logs
  for all using (user_id = current_setting('request.jwt.claims', true)::jsonb->>'sub');

create policy "journal_entries: own rows" on public.journal_entries
  for all using (user_id = current_setting('request.jwt.claims', true)::jsonb->>'sub');

create policy "ideas: own rows" on public.ideas
  for all using (user_id = current_setting('request.jwt.claims', true)::jsonb->>'sub');

create policy "chat_history: own rows" on public.chat_history
  for all using (user_id = current_setting('request.jwt.claims', true)::jsonb->>'sub');

create policy "graph_nodes: own rows" on public.graph_nodes
  for all using (user_id = current_setting('request.jwt.claims', true)::jsonb->>'sub');
