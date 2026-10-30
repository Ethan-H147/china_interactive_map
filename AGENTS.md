# Atlas publishing preference

Keep all Boundary Atlas changes local until the user explicitly requests committing, pushing, or publishing. Do not commit, push to GitHub, synchronize the Sites source, or deploy either site automatically. Run the appropriate local checks and report the local result.

Existing publication destinations, for use only when explicitly authorized:

- GitHub: Ethan-H147/china_interactive_map, branch main.
- ChatGPT Site: retain the project ID in .openai/hosting.json and its current audience.

Preserve remote changes and never force-push to resolve a conflict.

# Atlas interface copy preference

Avoid redundant or unnecessary text. When a spinning icon already communicates loading, do not add a loading message. Avoid buttons that duplicate an existing navigation action without adding a useful destination.

# Hosted source transport

The full static atlas and retained source caches stay on GitHub. The current Site uses the small same-origin hosting adapter in `hosting/` because the full static package exceeds the native upload and remote build disk limits. Its source checkout is `artifacts/site-worker`; use the Sites source helper there, preserving its history, project ID and public audience. The primary GitHub checkout and hosting checkout intentionally have different source histories; never merge or force-push them together. See `hosting/README.md` for pinning, tests and publication. Keep all map/data asset bytes tied to a tested immutable GitHub commit.

# Country overview visibility

Keep country overview pages and Country tabs hidden. Maps should open and reset to Map settings. Retain national statistics and their page code, and keep subdivision statistics visible. Do not reintroduce country overview pages when adding countries or statistics.

# Center-dot review tracker

Keep `docs/center-dot-usage.md` current when changing visible center-dot separators. Remove an entry when its last visible use is removed, and preserve the IDs of remaining entries. Strings converted into CSS dividers before rendering are not visible center-dot uses.
