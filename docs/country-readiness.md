# Country return readiness

`waitForCountrySources` in `dist/app.js` waits for country source indexing and native visible tiles before completing a switch. A source event can reach its listener before the tile manager has finished updating readiness. Hidden or cached sources can then become ready without another source event.

This produced a reproducible 15-second fallback wait when returning to Moldova from Ukraine and to Comoros from Mayotte (a selected French region). During the wait, every observed source was already ready. The country data itself was not taking 15 seconds to load.

The helper now rechecks readiness on the map's post-update `render` event as well as `sourcedata`. Its completion, cancellation, error and fallback paths all remove the render listener. The existing source/tile requirements, 15-second slow-device fallback, country memory budget and rendering stages remain unchanged.

Checks:

- `node scripts/validate-country-source-ready.mjs` exercises the missed-event race using the shipped helper, genuinely pending tiles, cached sources, cancellation, source errors, the fallback and listener/timer cleanup.
- `node scripts/browser/run.mjs country-return-ready` repeats both neighbour round trips on desktop and phone, checking prompt return, ready controls, rendered subdivisions and Mayotte selection.

Local diagnostics are retained in `artifacts/return-switch-before.json` and `artifacts/return-switch-after.json`.

The targeted desktop and phone scenarios both passed, including two returns to each country. In the matched local diagnostic, Moldova return time fell from about 16.3 seconds to 1.3 seconds, and Comoros from 16.7 seconds to 1.7 seconds (including the test harness settling period).

A separate, broader country-memory stress run lost its WebGL context while opening Russia and was stopped. That context-loss failure remains unresolved; it is not counted as a passed check for this change.
