# Local accounts

The header's account icon connects directly to Supabase Auth. The publishable
project URL/key in dist/account-config.mjs are public browser configuration, not
administrative credentials. No database password or secret/service-role key is
required. Passwords are sent to Supabase and never written to atlas storage.
Supabase's SDK stores session tokens, refreshes sessions, and broadcasts auth
changes between tabs. Sign out revokes this session on this device.

Supported: email/password sign-up, confirmation resend, sign-in, sign-out,
password-reset email, choosing a replacement password, and editing an account
name. Names are saved as Supabase user metadata (display_name), shown beside the
account icon on desktop, and hidden in the mobile header. They are display names,
not unique login identifiers; sign-in still uses email.

Settings sync automatically through the authenticated user's Supabase metadata.
Each preference uses its own atlas_setting_ key, so saving a preference does not
replace the account name or unrelated preferences from another device. No extra
table, SQL migration, or dashboard permission is required. Only the user's own
access token is used; a request captures that token before sending, so a delayed
save cannot write to a different signed-in account.

Existing account preferences load on sign-in, reload and return to the app. A
first sign-in without saved preferences adopts this device's guest settings.
Changes save after a short delay; the Settings footer reports whether they are
synced or waiting for a connection. Per-account local queues retain offline edits
and retry when the connection returns or the app regains focus. Signing out
restores the guest's settings. Reset settings also syncs to the account. Synced
preferences include place/country labels, country-label language, label size,
heading size, legacy styling, motion and flat/globe projection. Quiz progress is
still browser-local. User metadata is never used for authorization decisions.

Dashboard setup:

1. Authentication > Sign In / Providers: enable Email, new-user sign-up and
   Confirm Email. Public settings were verified enabled on 19 October 2026.
2. Authentication > URL Configuration: set Site URL and an allowed Redirect URL
   to http://127.0.0.1:4174/ for the current local preview. Use the trailing slash.
3. Keep the default confirmation and recovery templates using ConfirmationURL.
   The client uses PKCE and the root query-code callback, preserving atlas hash
   routes. Open email links in the same browser that requested them. Expired or
   cross-browser links show an error and allow a new request.
4. Default Supabase email delivery is restricted to project team addresses and
   rate-limited. Configure custom SMTP before allowing general public sign-ups.
5. Before publishing, set the production Site URL and allow its exact root URL;
   retain the local root under additional Redirect URLs for development.

Supabase creates and manages auth.users. Do not create a public passwords table.
Future profile/progress tables must have row-level security so each signed-in
user can access only their own records. No public tables were added for this
feature.

Rebuild the pinned, same-origin SDK with npm run build:account-vendor.
Run node scripts/validate-settings-sync.mjs for sync state/queue checks.
Run node scripts/browser/run.mjs settings-sync settings account for the browser
checks. Run npm run test:account for desktop/phone tests against deterministic Auth
responses using the real SDK. Tests do not create live users or send emails.
The public settings endpoint is checked separately; confirmation email delivery
and a real user's first sign-in require manual testing with their own inbox.

References:
- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/docs/guides/auth/redirect-urls
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/getting-started/api-keys
