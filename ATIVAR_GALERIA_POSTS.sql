-- LINK DIRETO CONNECT — V30 GALERIA DE POSTS
-- Executar uma única vez no SQL Editor do Supabase.

alter table public.opportunities
add column if not exists image_urls jsonb not null default '[]'::jsonb;

-- Copia a foto antiga para a nova galeria nos posts já existentes.
update public.opportunities
set image_urls = jsonb_build_array(image_url)
where image_url is not null
  and (image_urls is null or image_urls = '[]'::jsonb);
