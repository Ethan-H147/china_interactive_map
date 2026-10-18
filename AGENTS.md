# Atlas publishing preference

For completed changes to Boundary Atlas (this folder), the user has authorized publishing to both destinations every time:

- GitHub: `Ethan-H147/china_interactive_map`, branch `main`.
- ChatGPT Site: use the existing project ID in `.openai/hosting.json` and preserve its current audience.

Run the checks appropriate to the change, push to GitHub, publish the Site using the Sites hosting workflow, and verify both results before reporting completion. Do not ask for deployment approval again. Preserve remote changes and never force-push to resolve a conflict.

# Atlas interface copy preference

Avoid redundant or unnecessary text. When a spinning icon already communicates loading, do not add a loading message. Avoid buttons that duplicate an existing navigation action without adding a useful destination.

# Hosted source transport

The full static atlas and retained source caches stay on GitHub. The current Site uses the small same-origin hosting adapter in `hosting/` because the full static package exceeds the native upload and remote build disk limits. Its source checkout is `artifacts/site-worker`; use the Sites source helper there, preserving its history, project ID and public audience. The primary GitHub checkout and hosting checkout intentionally have different source histories; never merge or force-push them together. See `hosting/README.md` for pinning, tests and publication. Keep all map/data asset bytes tied to a tested immutable GitHub commit.
