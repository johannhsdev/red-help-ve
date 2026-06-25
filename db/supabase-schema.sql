-- Red de Ayuda VE - hardening for existing Supabase tables.
-- This matches the current tables:
-- persons, supply_centers, contacts, found_reports.

-- Run these renames once if your supply_centers table still has the original typos.
alter table public.supply_centers
  rename column if exists photho_url to photo_url;

alter table public.supply_centers
  rename column if exists shcedules to schedule;

-- Basic data constraints.
alter table public.persons
  alter column name set not null,
  alter column photo_url set not null,
  alter column national_id set not null,
  alter column age set not null,
  alter column last_seen_location set not null,
  alter column reporter_name set not null,
  alter column status set not null,
  alter column home_address set not null;

alter table public.persons
  drop constraint if exists persons_status_check,
  drop constraint if exists persons_age_check,
  drop constraint if exists persons_name_length_check,
  drop constraint if exists persons_national_id_check,
  drop constraint if exists persons_reporter_name_length_check;

alter table public.persons
  add constraint persons_status_check check (status in ('missing', 'found')),
  add constraint persons_age_check check (age between 0 and 120),
  add constraint persons_name_length_check check (char_length(name) between 2 and 120),
  add constraint persons_national_id_check check (national_id ~ '^[VEJPGvejpg]?-?[0-9.]{5,14}$'),
  add constraint persons_reporter_name_length_check check (char_length(reporter_name) between 2 and 120);

alter table public.supply_centers
  alter column name set not null,
  alter column photo_url set not null,
  alter column location set not null,
  alter column needs set not null;

alter table public.supply_centers
  drop constraint if exists supply_centers_name_length_check,
  drop constraint if exists supply_centers_needs_length_check;

alter table public.supply_centers
  add constraint supply_centers_name_length_check check (char_length(name) between 2 and 120),
  add constraint supply_centers_needs_length_check check (char_length(needs) between 2 and 500);

alter table public.contacts
  alter column phone set not null,
  alter column position set not null;

alter table public.contacts
  add column if not exists person_id bigint,
  add column if not exists center_id bigint;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'contacts'
      and column_name = 'owner_type'
  )
  and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'contacts'
      and column_name = 'owner_id'
  ) then
    update public.contacts
    set
      person_id = case when owner_type = 'persons' then owner_id else person_id end,
      center_id = case when owner_type = 'centers' then owner_id else center_id end
    where (person_id is null and center_id is null)
      and owner_type in ('persons', 'centers')
      and owner_id is not null;
  end if;
end;
$$;

drop policy if exists "Public can read contacts" on public.contacts;
drop policy if exists "Public can insert contacts" on public.contacts;
drop trigger if exists contacts_validate_owner on public.contacts;
drop function if exists public.validate_contact_owner();
drop index if exists public.contacts_owner_idx;

alter table public.contacts
  drop constraint if exists contacts_owner_type_check,
  drop constraint if exists contacts_owner_target_check,
  drop constraint if exists contacts_phone_check,
  drop constraint if exists contacts_position_check,
  drop constraint if exists contacts_person_id_fkey,
  drop constraint if exists contacts_center_id_fkey;

alter table public.contacts
  add constraint contacts_owner_target_check check (
    (person_id is not null and center_id is null)
    or
    (person_id is null and center_id is not null)
  ),
  add constraint contacts_phone_check check (phone ~ '^\+?[0-9\s().-]{7,24}$'),
  add constraint contacts_position_check check (position between 0 and 4),
  add constraint contacts_person_id_fkey
    foreign key (person_id)
    references public.persons (id)
    on delete cascade,
  add constraint contacts_center_id_fkey
    foreign key (center_id)
    references public.supply_centers (id)
    on delete cascade;

alter table public.contacts
  drop column if exists owner_type,
  drop column if exists owner_id;

alter table public.found_reports
  alter column person_id set not null,
  alter column location_type set not null;

update public.found_reports
set location_type = case location_type
  when 'familia' then 'family'
  when 'centro-registrado' then 'registered_center'
  when 'centro-externo' then 'external_center'
  else location_type
end
where location_type in ('familia', 'centro-registrado', 'centro-externo');

alter table public.found_reports
  drop constraint if exists found_reports_location_type_check;

alter table public.found_reports
  add constraint found_reports_location_type_check
  check (location_type in ('family', 'registered_center', 'external_center'));

create index if not exists persons_created_at_idx on public.persons (created_at desc);
create index if not exists persons_status_idx on public.persons (status);
create index if not exists supply_centers_created_at_idx on public.supply_centers (created_at desc);
create index if not exists contacts_person_idx on public.contacts (person_id, position);
create index if not exists contacts_center_idx on public.contacts (center_id, position);
create index if not exists found_reports_person_idx on public.found_reports (person_id, created_at desc);

delete from public.found_reports fr
using (
  select id
  from (
    select
      id,
      row_number() over (partition by person_id order by created_at desc, id desc) as rn
    from public.found_reports
  ) ranked
  where rn > 1
) duplicates
where fr.id = duplicates.id;

create unique index if not exists found_reports_one_per_person_idx
on public.found_reports (person_id);

-- Relationships.
alter table public.found_reports
  drop constraint if exists found_reports_person_id_fkey,
  drop constraint if exists found_reports_center_id_fkey;

alter table public.found_reports
  add constraint found_reports_person_id_fkey
  foreign key (person_id)
  references public.persons (id)
  on delete cascade,
  add constraint found_reports_center_id_fkey
  foreign key (center_id)
  references public.supply_centers (id)
  on delete set null;

-- Public RPCs keep status and found_reports synchronized.
create or replace function public.report_person_found(
  p_person_id bigint,
  p_location_type text,
  p_center_id bigint default null,
  p_external_center_name text default null,
  p_external_center_location text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_location_type not in ('family', 'registered_center', 'external_center') then
    raise exception 'Invalid location_type %', p_location_type;
  end if;

  if not exists (select 1 from public.persons where id = p_person_id) then
    raise exception 'Person % does not exist', p_person_id;
  end if;

  if p_location_type = 'registered_center' then
    if p_center_id is null or not exists (select 1 from public.supply_centers where id = p_center_id) then
      raise exception 'Registered center is required';
    end if;
  end if;

  if p_location_type = 'external_center' and coalesce(trim(p_external_center_name), '') = '' then
    raise exception 'External center name is required';
  end if;

  update public.persons
  set status = 'found'
  where id = p_person_id;

  insert into public.found_reports (
    person_id,
    location_type,
    center_id,
    external_center_name,
    external_center_location
  )
  values (
    p_person_id,
    p_location_type,
    case when p_location_type = 'registered_center' then p_center_id else null end,
    case when p_location_type in ('registered_center', 'external_center') then p_external_center_name else null end,
    case when p_location_type = 'external_center' then p_external_center_location else null end
  )
  on conflict (person_id) do update
  set
    location_type = excluded.location_type,
    center_id = excluded.center_id,
    external_center_name = excluded.external_center_name,
    external_center_location = excluded.external_center_location,
    created_at = now();
end;
$$;

create or replace function public.reopen_person(p_person_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.persons
  set status = 'missing'
  where id = p_person_id;

  delete from public.found_reports
  where person_id = p_person_id;
end;
$$;

grant execute on function public.report_person_found(bigint, text, bigint, text, text) to anon;
grant execute on function public.reopen_person(bigint) to anon;

-- Row Level Security.
alter table public.persons enable row level security;
alter table public.supply_centers enable row level security;
alter table public.contacts enable row level security;
alter table public.found_reports enable row level security;

revoke all on public.persons from anon;
revoke all on public.supply_centers from anon;
revoke all on public.contacts from anon;
revoke all on public.found_reports from anon;

grant select, insert on public.persons to anon;
grant update (status) on public.persons to anon;
grant select, insert on public.supply_centers to anon;
grant select, insert on public.contacts to anon;
grant select, insert on public.found_reports to anon;
grant usage, select on all sequences in schema public to anon;

drop policy if exists "Public can read persons" on public.persons;
create policy "Public can read persons"
on public.persons for select to anon
using (true);

drop policy if exists "Public can insert persons" on public.persons;
create policy "Public can insert persons"
on public.persons for insert to anon
with check (status = 'missing');

drop policy if exists "Public can update person status" on public.persons;
create policy "Public can update person status"
on public.persons for update to anon
using (true)
with check (status in ('missing', 'found'));

drop policy if exists "Public can read supply centers" on public.supply_centers;
create policy "Public can read supply centers"
on public.supply_centers for select to anon
using (true);

drop policy if exists "Public can insert supply centers" on public.supply_centers;
create policy "Public can insert supply centers"
on public.supply_centers for insert to anon
with check (true);

drop policy if exists "Public can read contacts" on public.contacts;
create policy "Public can read contacts"
on public.contacts for select to anon
using (true);

drop policy if exists "Public can insert contacts" on public.contacts;
create policy "Public can insert contacts"
on public.contacts for insert to anon
with check (
  (person_id is not null and center_id is null)
  or
  (person_id is null and center_id is not null)
);

drop policy if exists "Public can read found reports" on public.found_reports;
create policy "Public can read found reports"
on public.found_reports for select to anon
using (true);

drop policy if exists "Public can insert found reports" on public.found_reports;
create policy "Public can insert found reports"
on public.found_reports for insert to anon
with check (location_type in ('family', 'registered_center', 'external_center'));

-- Storage policies for public buckets "persons" and "centers".
-- Create both buckets in Supabase Storage with Public enabled.
drop policy if exists "Public can read files" on storage.objects;
create policy "Public can read files"
on storage.objects for select to anon
using (bucket_id in ('persons', 'centers'));

drop policy if exists "Public can upload registry files" on storage.objects;
create policy "Public can upload registry files"
on storage.objects for insert to anon
with check (
  bucket_id in ('persons', 'centers')
  and owner is null
);

grant select, insert on storage.objects to anon;
