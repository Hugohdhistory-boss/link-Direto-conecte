-- LINK DIRETO CONNECT — V31 PREÇO + VISUALIZAÇÕES
-- Executar uma única vez no SQL Editor do Supabase.

alter table public.opportunities
add column if not exists price numeric;

alter table public.opportunities
add column if not exists views bigint not null default 0;

-- Incremento seguro de visualizações, sem permitir que o visitante edite o post.
create or replace function public.increment_opportunity_view(p_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare new_views bigint;
begin
  update public.opportunities
  set views = coalesce(views,0) + 1
  where id = p_id
  returning views into new_views;
  return coalesce(new_views,0);
end;
$$;

grant execute on function public.increment_opportunity_view(uuid) to anon, authenticated;
