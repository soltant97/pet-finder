<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Pet data is read/written from the browser Supabase client; RLS on pets, lost_reports, pet_photos scopes every row to owner_id = auth.uid(). Why: owner-only CRUD is enforced in the database, not the UI.
- The public lost listing goes only through the SECURITY DEFINER RPC `get_lost_pets()` (status = 'borttappad', safe columns only). Why: anon must never query pets/lost_reports tables directly, so private fields (microchip, owner) cannot leak.
- Pet photos live in the private `pet-photos` bucket under `<userId>/<petId>/…`; anon may read a photo only while `is_lost_pet_photo()` is true. Why: photos become public only while the pet is lost.
- A pet may only have status 'borttappad' when a lost_reports row exists (DB trigger); leaving lost status deletes the report. Why: listings always have location/date.
- Public usernames are generated server-side on signup (word + 4 digits) and live in `profiles`; email stays in auth only. Why: usernames never derive from personal data.
- All user-facing text is Swedish.
