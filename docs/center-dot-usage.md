# Remaining center-dot uses

This is the current review list for Boundary Atlas. Keep it updated in the same change that removes or changes a separator. Delete a row when its last visible use is removed; do not move completed rows to an archive. Keep the existing IDs stable so they can be referenced in reviews.

Only rendered center dots belong here. A string that is split into CSS divider nodes before display is not a remaining dot use. Repeated countries share one entry.

| ID | Remaining use | Main source files |
| --- | --- | --- |
| 11 | Sports hover details: city · stadium | `dist/city-quiz.mjs` |
| 13 | Feedback status: Answer shown · name; highlighted-answer error text; mobile Correct · location detail. Correct-answer rows in the sidebar now use a check mark without a separator. | `dist/first-level-quiz.mjs` |
| 14 | Click-quiz summary: correct · incorrect · answers shown | `dist/first-level-quiz.mjs` |
| 15 | Naming summary: number named · without hints · time; Practice · scope | `dist/name-quiz.mjs`, `dist/first-level-quiz.mjs` |
| 16 | Personal best: score · fastest perfect time | `dist/first-level-quiz.mjs`, `dist/name-quiz.mjs` |
| 17 | Included league and count: 2. Bundesliga · 18 | `dist/city-quiz.mjs` |
| 18 | Football season · coverage note | `dist/city-quiz.mjs` |
| 19 | Highest level · level name | `dist/city-quiz.mjs` |
| 20 | China historical-quiz hover: location · dynasty or period | `dist/china-misc-quiz.mjs` |
| 21 | Recent-round category · topic · mode · scope | `dist/quiz-dashboard.mjs` |
| 22 | Recent-round time · hints · answers shown | `dist/quiz-dashboard.mjs` |
| 23 | Trophy and medal mode results, earned status, tooltips | `dist/quiz-trophies.mjs`, `dist/medal-cabinet.mjs` |
| 24 | Sync status: Saved on this device · sync pending or sync will retry | `dist/settings.mjs`, `dist/quiz-dashboard.mjs` |
| 26 | Search and place-list context: kind · parent region; special map-label context | `dist/app.js`, `dist/regional-country.mjs`, `dist/korea.js`, `dist/mongolia.mjs`, `dist/archipelago.mjs`, `dist/south-america.mjs` |
| 28 | Regional-language annotation: language · romanized | `dist/regional-names.mjs` |
| 31 | Boundary availability and coverage labels: City · Municipal boundary pending; counts and coverage qualifications | `dist/south-america.mjs`, `dist/app.js`, `dist/japan.mjs`, `dist/regional-country.mjs` |
| 32 | Historical notice: year · Historical snapshot | `dist/regional-country.mjs`, `dist/countries.js` |
| 33 | Flag caption: name · scope · status · year | `dist/regional-country.mjs`, `dist/national-flags.mjs`, `dist/flag-viewer.mjs` |
| 34 | Flag credits, classification and licenses, including retained credit text | `dist/flag-viewer.mjs`, `dist/regional-country.mjs`, `dist/south-america.mjs`, flag data modules |
| 35 | Collections of source links and source/coverage notes | Country modules, `dist/index.html`, `dist/korea.html` |
| 36 | Map and satellite attribution | Map source modules, `dist/satellite.mjs`, `dist/app.js` |
| 37 | Article labels: Wikipedia · English or Search; source article qualifications | `dist/japan.mjs`, `dist/archipelago.mjs` |
| 38 | Photo author · license · source · original image | `dist/explore.mjs` |
| 39 | Photo resolution · conversion details | `dist/explore.mjs` |
| 40 | Trophy material descriptions | `dist/quiz-trophies-core.mjs` |
| 41 | Telephone listings: code · region/service · date; mapped-place counts and code search context | `dist/telephone-areas.mjs`, `dist/regional-country.mjs`, `dist/south-america.mjs` |
| 42 | Antarctic latitude · longitude | `dist/antarctica.mjs` |
| 43 | Antarctic operators, dated status labels and source notes | `dist/antarctica.mjs` |
| 44 | Separate Pinyin pronunciation examples | `dist/china-info.mjs` |
| 45 | Developer controls, collectible diagnostics and performance readouts | `dist/developer-mode.js`, `dist/dev-collectibles-core.mjs`, `dist/map-performance.mjs`, `dist/control-overview.mjs`, `dist/frame-rate.html` |
| 46 | Map-input setting descriptions: Trackpad · scroll to pan | `dist/map-interaction.mjs` |
| 47 | Automatic-zoom tooltip: Automatic zoom locked · selections keep this view | `dist/zoom-lock.mjs` |
| 48 | Multiple place names in a ZIP-code card | `dist/us-place-cards.mjs` |

IDs omitted from this list have already been removed or now use CSS dividers or primary/secondary name styling. Update the source-file pointers if a renderer moves.
