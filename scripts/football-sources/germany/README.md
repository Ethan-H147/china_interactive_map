# German football clubs

Pinned on 29 October 2026 for the 2026–27 season. Cumulative difficulty counts: Bundesliga 18, Bundesliga plus 2. Bundesliga 36, all three divisions 56.

The official Bundesliga club directories supply first- and second-tier membership, official club crests and linked stadium locations. The DFB participant announcement dated 11 June 2026 and its season team directory supply the 20 third-tier clubs and official third-tier crests. Stadium coordinates not directly parseable from the DFL directory use retained Wikipedia/Wikidata stadium summaries. Every source file and crest is hash-pinned in manifest.json. Crest artwork and club marks remain the rights of their respective owners and are included for identification; no claim of an open artwork license is made.

These are stadium locations, not club office addresses. Hoffenheim plays in Sinsheim rather than the office location Zuzenhausen; Elversberg's stadium is in Spiesen-Elversberg rather than its St. Ingbert office address. Their official visiting directions are retained.

VfB Stuttgart II plays at WIRmachenDRUCK Arena in Aspach, shared with SG Sonnenhof Großaspach. Their identical coordinate and sharedGround identifier are deliberate; never jitter them or require a player to distinguish coincident dots. VfB's official venue page confirms the arrangement. TSV Havelse is a Garbsen club using Eilenriedestadion in Hanover. DFB approved that ground on 12 October 2026; earlier matches in the same season used Heinz von Heiden Arena. This date-specific exception is retained in the club note and official source snapshot.

Run node scripts/football-sources/germany/build.mjs to rebuild from pinned retained sources; it only downloads absent files and verifies existing hashes. Run node scripts/football-sources/germany/validate.mjs to verify rosters, unique IDs, all source hashes, decodable authentic crests and stadium data.