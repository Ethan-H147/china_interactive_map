# Football club quizzes

Added locally on 29 October 2026. The UK, France, Germany, Spain, Italy, Netherlands, Belgium and Portugal quiz menus include Miscellaneous → Football clubs, followed by a cumulative Difficulty selector. The UK pack covers the English league system, including its Welsh clubs, as requested.

| Pack | Level 1 | Levels 1–2 | Levels 1–3 |
| --- | --- | --- | --- |
| England | Premier League · 20 | + Championship · 44 | + League One · 68 |
| France | Ligue 1 · 18 | + Ligue 2 · 36 | + Ligue 3 · 54 |
| Germany | Bundesliga · 18 | + 2. Bundesliga · 36 | + 3. Liga · 56 |
| Spain | LaLiga · 20 | + Segunda División · 42 | + both Primera Federación groups · 82 |
| Italy | Serie A · 20 | + Serie B · 40 | + all three Serie C groups · 100 |
| Netherlands | Eredivisie · 18 | + Eerste Divisie · 38 | + Tweede Divisie · 56 |
| Belgium | Pro League · 18 | + Challenger Pro League · 33 | + Nationale 1 VV and FFA · 61 |
| Portugal | Primeira Liga · 18 | + Liga Portugal 2 · 36 | + both Liga 3 groups · 56 |

Membership and home grounds are a reviewed 2026–27 snapshot, current to 29 October 2026. France's third tier is called Ligue 3 for this season; National is its former name. The 533 clubs use 517 distinct stadium locations. Reserve clubs remain separate questions. Exact shared grounds appear once on the map, and a click there answers either resident club correctly. Highlighted-stadium naming also accepts either resident club, while Name every place retains separate club names and progress.

Dots mark actual home stadiums, including temporary venues, rather than a guessed town center or a club office. Cardiff, Swansea and Wrexham remain visible in the English pack; France includes Monaco; Spain includes FC Andorra, Ceuta and the Canary Islands; Portugal includes Madeira and São Miguel in the Azores. Ground moves and ambiguous geocodes were reviewed against club, league, federation or municipal sources. Examples include Everton's Hill Dickinson Stadium, Havelse's October move to Hanover, Versailles at Georges-Lefèvre, Betis at La Cartuja, Zaragoza at Ibercaja, Sanse on Z7 and Villarreal B at the Mini Estadi. The new packs also account for Helmond’s new MySteel Stadion, Jong Almere’s academy field 4, Jong Sparta at Robey Academy, Casa Pia in Rio Maior, RSCA Futures in Deinze, Jong Gent in Oostakker and Italy’s current Serie C ground moves. Adjacent pitches at De Westmaat and the separate Volendam grounds retain separate dots. Belgium’s third tier includes both language-region competitions, with their current uneven group sizes.

Click the named place shows the authentic club crest beside the question in both the sidebar and phone map prompt. Crests remain hidden in typing and highlighted-place modes. Correct-answer feedback identifies the stadium and its locality. Preview uses the ordinary map hover styling and does not create a scored result. Clicking or tapping a dot pins its club name, crest, stadium and city in the sidebar, with every included resident club shown for a shared ground. Hovering elsewhere does not replace that selection. Phones open the details in the bottom sheet. The shared dot-quiz controller renders all countries through one selection handler and clears the details and map highlight when Preview ends. Each cumulative difficulty has its own naming draft and personal best.

Miscellaneous is UI level 4, while saved records continue to use supported storage level 3 with unique season-specific scopes (`football-2026-27-tier1` through `tier3`). Existing city results retain their separate challenge scopes. No Supabase schema update is needed. The dashboard labels these rounds Miscellaneous · Football clubs. League headings in the included-club list use the individual league name and its own club count; the Difficulty selector stays cumulative.

Reviewed inputs, primary roster/venue evidence, original crests, source attribution and SHA-256 manifests are retained in scripts/football-sources/{england,france,germany,spain,italy,netherlands,belgium,portugal}/. These folders document their provider-specific verification. Runtime images are proportion-preserving WebP copies up to 192 pixels. Club crest copyrights and trademarks remain with their owners; source URLs accompany every image.

Run `node scripts/build-football-quizzes.mjs` to rebuild the eight runtime packs from the reviewed inputs. Run `node scripts/validate-football-quizzes.mjs` and `node scripts/browser/run.mjs football-quiz football-shared-grounds football-preview-selection` for data, typing, cumulative tiers, image, desktop/phone, Preview, shared-stadium, draft, category and sync checks. The new country source folders each include an offline validator for retained inputs, crest bytes and venue checks. Football is available even for countries that have no city pack; their existing first-level category stays available. Updating a season requires an explicit reviewed source update, rather than silently changing a saved pool.

The Falklands backdrop fix is independent: the South America runtime separates IGN's island-context polygons without altering their geometry, and hides only that overlap when the UK map is active. Argentina's existing source coverage is retained. Run `node scripts/validate-falkland-background.mjs` and `node scripts/browser/run.mjs falkland-background` to verify the overlap and both country views.