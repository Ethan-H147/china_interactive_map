# Enable Google sign-in

The app integration is ready locally. Google was disabled in this Supabase project when its public settings were checked on 29 October 2026. Complete the provider setup before expecting a real Google login to work.

## 1. Create a Google OAuth web client

Open [Google Auth Platform](https://console.cloud.google.com/auth/overview) and select or create a project. If prompted, create the app configuration with the name Boundary Atlas, your support/contact email, and External audience. While the app is in Testing, add your Google email under Audience → Test users. Move to the production audience when ready to allow other users.

Open Clients → Create client and select **Web application**. Use a name such as Boundary Atlas Web.

Add these **Authorized JavaScript origins**, with no path or trailing slash:

- `https://china-interactive-map.huyusheng777.workers.dev` for the configured Cloudflare site.
- `http://127.0.0.1:4174` for the current local preview.
- `http://localhost:4174` if you also open the preview under localhost.

If your actual Cloudflare/custom domain differs, use its actual origin. Optional additional atlas hosts are `https://ethan-h147.github.io` and `https://china-boundary-atlas.hys0423.chatgpt.site`.

Add this exact **Authorized redirect URI**:

```text
https://odenagmobrswlzkljayf.supabase.co/auth/v1/callback
```

This is Supabase’s callback, not the atlas page URL. Create the client and keep its Client ID and Client Secret in the Google/Supabase consoles.

## 2. Enable the provider in Supabase

Open [this project’s Authentication → Sign In / Providers](https://supabase.com/dashboard/project/odenagmobrswlzkljayf/auth/providers), choose Google, and enable it. Paste the web Client ID and Client Secret from Google Cloud and save. Leave other provider options at their defaults. Do not put the client secret in browser code, GitHub, or chat.

## 3. Allow return URLs

In [Authentication → URL Configuration](https://supabase.com/dashboard/project/odenagmobrswlzkljayf/auth/url-configuration), keep the existing production Site URL, or set it to the actual deployed atlas URL if it is currently local-only. Preserve existing redirect entries and add these exact root URLs with their trailing slash:

```text
https://china-interactive-map.huyusheng777.workers.dev/
http://127.0.0.1:4174/
http://localhost:4174/
```

Use the actual production URL if it differs. If using GitHub Pages, its return URL is `https://ethan-h147.github.io/china_interactive_map/`, including the repository path. If using the retained ChatGPT Site, add `https://china-boundary-atlas.hys0423.chatgpt.site/`. The atlas sends its current origin and app root as the return URL; country/view fragments are restored locally after the callback.

## 4. Test

Refresh the local preview, open the account dialog and click Continue with Google. Complete Google’s account chooser and confirm that the atlas returns signed in. The app checks the provider settings again on each attempt, so enabling the provider does not require new frontend credentials or SQL.

Use the Google account with the same email as your existing confirmed atlas account to retain that account’s quiz records. Supabase automatically links compatible identities with the same verified email. A different email is a different account; the app does not merge account-owned data.

Google credentials stay on Supabase; only authentication is requested. The app does not request Google Drive, Gmail or Calendar access. A real Google consent test must be completed by the account owner after backend setup. Local browser fixtures verify the app’s SDK redirects, callback exchange, existing-account records, provider cancellation and password sign-in compatibility without creating real users or sending email.

Sources: [Supabase Google setup](https://supabase.com/docs/guides/auth/social-login/auth-google), [redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), and [identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking).