create policy notification_owner_update
on public.notifications
for update
using (
  university_id = public.current_university_id()
  and user_id = auth.uid()
)
with check (
  university_id = public.current_university_id()
  and user_id = auth.uid()
);