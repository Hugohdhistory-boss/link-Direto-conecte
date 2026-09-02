-- LINK DIRETO CONNECT — ADMINISTRADOR DO SELO VERIFICADO
-- Executar uma vez no Supabase > SQL Editor.

-- 1) Campo do selo nas contas
alter table public.profiles
add column if not exists verified boolean not null default false;

-- 2) Lista privada de administradores
create table if not exists public.link_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.link_admins enable row level security;

revoke all on table public.link_admins from anon;
revoke all on table public.link_admins from authenticated;
grant select on table public.link_admins to authenticated;

drop policy if exists "admin pode ver o proprio registo" on public.link_admins;
create policy "admin pode ver o proprio registo"
on public.link_admins
for select
to authenticated
using (auth.uid() = user_id);

-- 3) Função segura: apenas quem estiver em link_admins pode dar/retirar selo
create or replace function public.set_profile_verified(
  target_profile_id uuid,
  new_verified boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.link_admins a
    where a.user_id = auth.uid()
  ) then
    raise exception 'not_authorized';
  end if;

  update public.profiles
     set verified = new_verified,
         updated_at = now()
   where id = target_profile_id;

  if not found then
    raise exception 'profile_not_found';
  end if;

  return true;
end;
$$;

revoke all on function public.set_profile_verified(uuid, boolean) from public;
grant execute on function public.set_profile_verified(uuid, boolean) to authenticated;

-- 4) VE O TEU ID DE UTILIZADOR AQUI:
select id, email, created_at
from auth.users
order by created_at asc;

-- 5) DEPOIS copia o teu ID e executa esta linha, trocando O-TEU-UUID:
-- insert into public.link_admins (user_id) values ('O-TEU-UUID') on conflict (user_id) do nothing;
