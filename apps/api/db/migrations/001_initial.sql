-- Enable pgvector
create extension if not exists vector;

-- Users (synced from Clerk)
create table if not exists users (
  id text primary key,
  email text unique not null,
  name text,
  created_at timestamptz default now()
);

-- Finance
create table if not exists finance_entries (
  id uuid primary key default gen_random_uuid(),
  user_id text references users(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  amount numeric(12, 2) not null,
  category text not null,
  description text,
  date date not null default current_date,
  created_at timestamptz default now()
);

-- Tasks
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id text references users(id) on delete cascade,
  title text not null,
  description text,
  status text default 'pending' check (status in ('pending', 'in_progress', 'done')),
  priority text default 'medium' check (priority in ('low', 'medium', 'high')),
  due_date date,
  tags text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Health
create table if not exists health_logs (
  id uuid primary key default gen_random_uuid(),
  user_id text references users(id) on delete cascade,
  date date not null default current_date,
  type text not null check (type in ('workout', 'sleep', 'water', 'weight', 'mood', 'steps')),
  value numeric,
  unit text,
  notes text,
  created_at timestamptz default now()
);

-- Journal
create table if not exists journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id text references users(id) on delete cascade,
  date date not null default current_date,
  content text not null,
  mood text check (mood in ('great', 'good', 'neutral', 'bad', 'awful')),
  tags text[],
  embedding vector(768),
  created_at timestamptz default now()
);

-- Ideas / Dumps
create table if not exists ideas (
  id uuid primary key default gen_random_uuid(),
  user_id text references users(id) on delete cascade,
  content text not null,
  type text default 'idea' check (type in ('idea', 'worry', 'goal', 'observation', 'question')),
  status text default 'raw' check (status in ('raw', 'processed', 'archived')),
  embedding vector(768),
  created_at timestamptz default now()
);

-- Graph nodes
create table if not exists graph_nodes (
  id uuid primary key default gen_random_uuid(),
  user_id text references users(id) on delete cascade,
  label text not null,
  type text not null,
  source_id uuid,
  source_table text,
  embedding vector(768),
  neo4j_id text,
  created_at timestamptz default now()
);

-- Chat history
create table if not exists chat_history (
  id uuid primary key default gen_random_uuid(),
  user_id text references users(id) on delete cascade,
  role text check (role in ('user', 'assistant')),
  content text not null,
  intent text,
  domain text,
  created_at timestamptz default now()
);

-- Semantic search indexes
create index if not exists journal_embedding_idx on journal_entries using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index if not exists ideas_embedding_idx on ideas using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index if not exists graph_nodes_embedding_idx on graph_nodes using ivfflat (embedding vector_cosine_ops) with (lists = 100);
