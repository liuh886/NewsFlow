drop policy if exists "Editorial members read own role or chief reads roster" on public.newsflow_editorial_members;
create policy "Pro editorial members read own role or chief reads roster"
on public.newsflow_editorial_members
for select
to authenticated
using (
  (select public.newsflow_is_authoritative_editor())
  or (
    user_id = (select auth.uid())
    and (select private.newsflow_has_editor_access())
  )
);
