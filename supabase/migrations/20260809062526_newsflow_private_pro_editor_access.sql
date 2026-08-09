create or replace function private.newsflow_has_editor_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1
      from public.membership_admins a
      where a.user_id = (select auth.uid())
        and a.active = true
        and a.role = 'owner'
    )
    or exists (
      select 1
      from public.newsflow_editorial_members m
      join public.entitlements e
        on e.user_id = m.user_id
       and e.entitlement_code = 'newsflow.pro'
       and e.active = true
       and (e.valid_until is null or e.valid_until > now())
      where m.user_id = (select auth.uid())
        and m.active = true
        and m.role = 'editor'
    );
$$;
revoke all on function private.newsflow_has_editor_access() from public, anon, authenticated, service_role;

drop policy if exists "Pro editorial members read NewsFlow candidates" on public.newsflow_candidates;
create policy "Pro editorial members read NewsFlow candidates"
on public.newsflow_candidates for select to authenticated
using ((select private.newsflow_has_editor_access()));

drop policy if exists "Pro editorial members read NewsFlow consensus" on public.newsflow_editorial_consensus;
create policy "Pro editorial members read NewsFlow consensus"
on public.newsflow_editorial_consensus for select to authenticated
using ((select private.newsflow_has_editor_access()));

drop policy if exists "Pro editorial members read NewsFlow decision history" on public.newsflow_editorial_events;
create policy "Pro editorial members read NewsFlow decision history"
on public.newsflow_editorial_events for select to authenticated
using ((select private.newsflow_has_editor_access()));

drop policy if exists "Pro editorial members read NewsFlow withdrawals" on public.newsflow_editorial_withdrawals;
create policy "Pro editorial members read NewsFlow withdrawals"
on public.newsflow_editorial_withdrawals for select to authenticated
using ((select private.newsflow_has_editor_access()));

drop policy if exists "Pro editorial members create own reviews" on public.newsflow_editorial_reviews;
create policy "Pro editorial members create own reviews"
on public.newsflow_editorial_reviews for insert to authenticated
with check (
  reviewer_user_id = (select auth.uid())
  and (select private.newsflow_has_editor_access())
);

drop policy if exists "Pro editorial members update own reviews" on public.newsflow_editorial_reviews;
create policy "Pro editorial members update own reviews"
on public.newsflow_editorial_reviews for update to authenticated
using (
  reviewer_user_id = (select auth.uid())
  and (select private.newsflow_has_editor_access())
)
with check (
  reviewer_user_id = (select auth.uid())
  and (select private.newsflow_has_editor_access())
);

drop policy if exists "Pro editorial members delete own reviews" on public.newsflow_editorial_reviews;
create policy "Pro editorial members delete own reviews"
on public.newsflow_editorial_reviews for delete to authenticated
using (
  reviewer_user_id = (select auth.uid())
  and (select private.newsflow_has_editor_access())
);

drop policy if exists "Pro editors read own reviews and chief reads all" on public.newsflow_editorial_reviews;
create policy "Pro editors read own reviews and chief reads all"
on public.newsflow_editorial_reviews for select to authenticated
using (
  (select private.newsflow_has_editor_access())
  and (
    reviewer_user_id = (select auth.uid())
    or (select public.newsflow_is_authoritative_editor())
    or (select private.newsflow_reviewer_is_chief(reviewer_user_id))
  )
);

drop function if exists public.newsflow_has_editor_access();
