-- Liste d'attente du site vitrine : n'importe qui peut s'inscrire, personne ne peut lire la liste côté client.
create table if not exists public.waitlist (
  id bigint generated always as identity primary key,
  email text not null unique check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;

create policy "Inscription publique à la liste d'attente"
  on public.waitlist for insert
  to anon, authenticated
  with check (true);
