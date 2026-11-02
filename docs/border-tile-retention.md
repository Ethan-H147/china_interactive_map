# International border tile retention

The world land overview retains its existing hysteresis: detailed context returns at zoom 5.25, and the overview returns below 4.75.

International borders have independent thresholds. Their sources start preparing at zoom 3.5 and remain prepared down to zoom 3. Detail replaces the resident overview at zoom 4 once visible tiles are ready. Once committed, detail remains selected down to zoom 3.75. The frame handoff retains its existing readiness checks, native parent-tile fallback during close navigation, and single-stroke rendering.

The canonical `country-border-previews` layer declares which adapter borders it already contains. While the supported overview handoff is available, the map scene keeps those adapter copies natively hidden. Previously, the handoff skipped them only during drawing: their workers still prepared tiles and their GPU buffers still uploaded. Small reversals across the preparation threshold also changed their layout visibility and invalidated their tile caches. This was particularly costly when a continent view intersected many countries.

Ownership preserves each adapter's intended visibility. Removing or intentionally hiding the canonical provider restores fallback copies; snapshot views retain their own border rules. Unsupported renderer versions retain the previous fallback. Geometry, claims, country fills, subdivision rendering and land overview thresholds are unchanged. Normal native caches remain bounded; no permanent cache-size increase is introduced.

Run `node scripts/validate-border-retention.mjs`, `node scripts/validate-border-handoff.mjs`, `node scripts/validate-globe-overview.mjs`, and `node scripts/browser/run.mjs africa-border-zoom globe-border-handoff globe-overview` for policy, ownership and desktop/phone checks. Browser load counts verify reduced preparation work; they do not establish presented frame rates in a foreground Windows browser.
