-- 바닷가 화장실 — 제보 공유 백엔드 스키마.
-- Supabase 콘솔 → SQL Editor에 그대로 붙여넣고 실행할 것 (1회).
--
-- 설계 메모:
--   - 로그인이 없는 앱이라 anon 키로 insert/select 둘 다 허용한다.
--   - "1인 1시설 1일 1회", "일일 보상 10회" 같은 어뷰징 방어는 기기 로컬(localStorage/
--     공식 Storage) 판단에 의존한다 — 로그인이 생기기 전까지는 서버에서 강제할 수 없는
--     한계로 알려진 채 남겨둔다 (CLAUDE.md §3-3 참고).
--   - device_id는 PII가 아닌 클라이언트 생성 랜덤 UUID (향후 서버 측 어뷰징 방어용 여지).
--     RLS로 컬럼 단위 숨김은 안 되므로, 클라이언트는 select 시 이 컬럼을 아예 요청하지 않는다.

create extension if not exists pgcrypto;

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  facility_id text not null,
  stars smallint not null check (stars between 1 and 5),
  clean text not null check (clean in ('clean', 'normal', 'dirty')),
  fee text not null check (fee in ('free', 'paid')),
  hot_water boolean,
  device_id text not null,
  created_at timestamptz not null default now()
);

create index if not exists reports_facility_id_idx on public.reports (facility_id);
create index if not exists reports_created_at_idx on public.reports (created_at desc);

alter table public.reports enable row level security;

drop policy if exists reports_insert_anyone on public.reports;
create policy reports_insert_anyone
  on public.reports
  for insert
  to anon
  with check (true);

drop policy if exists reports_select_anyone on public.reports;
create policy reports_select_anyone
  on public.reports
  for select
  to anon
  using (true);

-- update/delete 정책을 만들지 않았다 = anon은 수정·삭제 불가 (기본값이 이미 거부).
