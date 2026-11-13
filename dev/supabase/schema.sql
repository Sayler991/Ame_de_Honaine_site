-- L'Âme de Honaine — contenu du site, isolé dans le schéma « amehonaine ». Idempotent.
-- Propriétaire : amehonaine.admins (compte Auth existant benduy0@gmail.com).
-- Photos : bucket public « images », fichiers « up-amehonaine_… ».
create schema if not exists amehonaine;
grant usage on schema amehonaine to anon, authenticated, service_role;

create table if not exists amehonaine.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table amehonaine.admins enable row level security;
create or replace function amehonaine.is_admin() returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists(select 1 from amehonaine.admins a where a.user_id = auth.uid());
$$;
grant execute on function amehonaine.is_admin() to anon, authenticated;
drop policy if exists "admins: soi-même" on amehonaine.admins;
create policy "admins: soi-même" on amehonaine.admins
  for select to authenticated using (user_id = auth.uid() or amehonaine.is_admin());

create table if not exists amehonaine.site_content (
  id integer primary key default 1 check (id = 1),
  data jsonb not null check (jsonb_typeof(data) = 'object') check (octet_length(data::text) <= 524288),
  updated_at timestamptz not null default now(),
  updated_by uuid
);
create table if not exists amehonaine.site_content_history (
  id bigint generated always as identity primary key,
  saved_at timestamptz not null default now(),
  saved_by uuid,
  data jsonb not null
);
create or replace function amehonaine.site_content_before_update() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  if new.data is distinct from old.data then
    insert into amehonaine.site_content_history (saved_by, data) values (old.updated_by, old.data);
    delete from amehonaine.site_content_history
      where id not in (select id from amehonaine.site_content_history order by id desc limit 50);
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  new.id := old.id;
  return new;
end;
$$;
drop trigger if exists trg_before_update on amehonaine.site_content;
create trigger trg_before_update before update on amehonaine.site_content
  for each row execute function amehonaine.site_content_before_update();

alter table amehonaine.site_content enable row level security;
alter table amehonaine.site_content_history enable row level security;
drop policy if exists "contenu: lecture publique" on amehonaine.site_content;
create policy "contenu: lecture publique" on amehonaine.site_content
  for select to anon, authenticated using (true);
drop policy if exists "contenu: modif admin" on amehonaine.site_content;
create policy "contenu: modif admin" on amehonaine.site_content
  for update to authenticated using (amehonaine.is_admin()) with check (amehonaine.is_admin());
drop policy if exists "historique: lecture admin" on amehonaine.site_content_history;
create policy "historique: lecture admin" on amehonaine.site_content_history
  for select to authenticated using (amehonaine.is_admin());

grant select on amehonaine.site_content to anon, authenticated;
grant update on amehonaine.site_content to authenticated;
grant select on amehonaine.site_content_history, amehonaine.admins to authenticated;

-- Wrappers dans public (déjà exposé) : le jeton Management API n'était pas
-- utilisable pour ajouter « amehonaine » aux schémas exposés. Vues security_invoker
-- pour respecter les politiques RLS de la table sous-jacente.
create or replace view public.amehonaine_site_content
  with (security_invoker = true) as
  select id, data, updated_at, updated_by from amehonaine.site_content;
create or replace view public.amehonaine_site_content_history
  with (security_invoker = true) as
  select id, saved_at, saved_by, data from amehonaine.site_content_history;
grant select on public.amehonaine_site_content to anon, authenticated;
grant update on public.amehonaine_site_content to authenticated;
grant select on public.amehonaine_site_content_history to authenticated;

create or replace function public.amehonaine_is_admin() returns boolean
  language sql stable security definer set search_path = '' as $$
  select amehonaine.is_admin();
$$;
grant execute on function public.amehonaine_is_admin() to anon, authenticated;

drop policy if exists "images : ajout admin amehonaine" on storage.objects;
create policy "images : ajout admin amehonaine" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'images' and amehonaine.is_admin()
    and name ~ '^up-amehonaine_[a-z0-9]+-[0-9]+\.(webp|jpg|png)$');
drop policy if exists "images : maj admin amehonaine" on storage.objects;
create policy "images : maj admin amehonaine" on storage.objects
  for update to authenticated
  using (bucket_id = 'images' and amehonaine.is_admin()
    and name ~ '^up-amehonaine_[a-z0-9]+-[0-9]+\.(webp|jpg|png)$')
  with check (bucket_id = 'images' and amehonaine.is_admin()
    and name ~ '^up-amehonaine_[a-z0-9]+-[0-9]+\.(webp|jpg|png)$');

create or replace function public.amehonaine_save_content(payload jsonb)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not amehonaine.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if payload is null or jsonb_typeof(payload) <> 'object' then
    raise exception 'invalid payload';
  end if;
  if octet_length(payload::text) > 524288 then
    raise exception 'payload too large';
  end if;
  update amehonaine.site_content set data = payload where id = 1;
  if not found then
    raise exception 'missing content';
  end if;
  return (select c.updated_at from amehonaine.site_content c where c.id = 1);
end;
$$;
revoke execute on function public.amehonaine_save_content(jsonb) from public, anon;
grant execute on function public.amehonaine_save_content(jsonb) to authenticated;
