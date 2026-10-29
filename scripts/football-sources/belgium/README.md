# Belgium football source pack

Reviewed 29 October 2026 for the 2026–27 season. The quiz contains 61 clubs: 18 Jupiler Pro League, 15 Challenger Pro League and all 28 third-tier clubs (16 Division 1 VV and 12 Division 1 FFA). The three cumulative choices contain 18, 33 and 61 clubs. FFA is the current name of the former ACFF regional association.

## Sources and refresh

The Pro League's official JPL and CPL club directories establish the professional rosters. Its June 2026 format announcement confirms the revised 15-club CPL. The official Lyra-Lierse 2026–27 first-team calendar corroborates every VV opponent and current match grounds; the official RAEC Mons D1 FFA table corroborates the entire FFA roster. The association overview and Wikipedia season tables are retained as additional references.

`clubs.json` is the reviewed normalized input for the atlas football generator. Review this file against the league directories and both third-tier regions before advancing the season. `source.mjs` retains a URL as a compressed source snapshot or an original crest. `manifest.json` records each actual relative filename, source URL, uncompressed SHA-256 hash and byte length, and whether the stored file is gzip compressed. The raw snapshots make the review reproducible without depending on mutable upstream pages. Derived exploratory downloads/scripts live under ignored `artifacts/football-belgium/`.

Run `node scripts/football-sources/belgium/validate.mjs` from the checkout to check roster counts, IDs, geography, all source hashes, original crest decoding and reviewed relocations. All 61 crest assets were also inspected on a contact sheet. Club crests remain the property of their respective owners; each original download URL is retained. OpenStreetMap geometry is © OpenStreetMap contributors, ODbL; Wikidata structured coordinates are CC0. Wikimedia files retain their individual source-page licensing.

## Ground review

Markers represent actual match grounds rather than club-office or town-center coordinates. Wikidata/Wikipedia venue coordinates are used where they match the reviewed current ground. Less documented third-tier venues use retained OpenStreetMap pitch geometry, cross-checked with club calendars, municipal venue descriptions or club addresses. Coordinates derived from a closed OSM pitch ring average the unique ring nodes and are rounded to seven decimals. SL16's coordinate identifies its named football campus; it is not the senior team's Sclessin stadium.

- Jong KAA Gent moved back from Planet Group Arena to the refurbished Backline Arena in Oostakker in August 2026. Retained KAA Gent and RFC Seraing match notices establish this change.
- RSCA Futures plays at Dakota Arena in Deinze, as confirmed by Anderlecht's official FAQ. Historical King Baudouin/Lotto Park entries are obsolete.
- Flénu temporarily shares Mons's Stade Charles Tondreau in 2026–27; the September 2026 local match report is retained.
- Lyra-Lierse uses L’Avenirstadion at the new Sportpark Lier; the former Berlaar location is obsolete.
- Zelzate uses the new Sportcomplex Armand Seghers, opened in 2024, rather than the old A-complex. The current club address and actual new pitch geometry take precedence over an older opponent site's stale map.
- RAAL's Easi Arena geometry is retained from OSM and checked against the club's infrastructure page. The English stadium article coordinate points at the former Tivoli site and was not used.
- Union SG B's regular home is Neerstalle in Uccle, confirmed by the club's August 2026 season announcement. Its October derby at Joseph Marien is an occasional alternate venue.
- Shared-ground groups retain identical coordinates with no artificial displacement: Club Brugge/Cercle Brugge, Genk/Jong Genk, Club NXT/Roeselare, Tienen/OH Leuven U23, Olympic Charleroi/Zébra Élites and Mons/Flénu.

No runtime image downloads are required: every crest is included locally.
