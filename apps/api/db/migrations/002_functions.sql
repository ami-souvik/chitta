-- Match journal entries by semantic similarity
create or replace function match_journal_entries(
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  p_user_id text
)
returns table (
  id uuid,
  user_id text,
  date date,
  content text,
  mood text,
  tags text[],
  created_at timestamptz,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    j.id, j.user_id, j.date, j.content, j.mood, j.tags, j.created_at,
    1 - (j.embedding <=> query_embedding) as similarity
  from journal_entries j
  where j.user_id = p_user_id
    and 1 - (j.embedding <=> query_embedding) > match_threshold
  order by j.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Match graph nodes by semantic similarity (for auto-linker)
create or replace function match_nodes(
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  p_user_id text
)
returns table (
  id uuid,
  label text,
  type text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    n.id, n.label, n.type,
    1 - (n.embedding <=> query_embedding) as similarity
  from graph_nodes n
  where n.user_id = p_user_id
    and n.embedding is not null
    and 1 - (n.embedding <=> query_embedding) > match_threshold
  order by n.embedding <=> query_embedding
  limit match_count;
end;
$$;
