-- LINK DIRETO CONNECT V13 — CORREÇÃO DO UPLOAD DE VÍDEOS
-- Pode executar novamente sem apagar publicações existentes.

alter table public.opportunities
add column if not exists video_url text;

update storage.buckets
set public = true
where id = 'opportunity-images';

drop policy if exists v13_media_read on storage.objects;
drop policy if exists v13_media_insert on storage.objects;
drop policy if exists v13_media_update on storage.objects;
drop policy if exists v13_media_delete on storage.objects;

create policy v13_media_read
on storage.objects for select
to anon, authenticated
using (bucket_id = 'opportunity-images');

create policy v13_media_insert
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'opportunity-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy v13_media_update
on storage.objects for update
to authenticated
using (
  bucket_id = 'opportunity-images'
  and owner_id = auth.uid()::text
);

create policy v13_media_delete
on storage.objects for delete
to authenticated
using (
  bucket_id = 'opportunity-images'
  and owner_id = auth.uid()::text
);

