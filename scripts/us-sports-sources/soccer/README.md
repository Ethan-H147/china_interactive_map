# US soccer source pack

Reviewed 29 October 2026 for the 2026 season. The pack contains all 30 MLS clubs, all 25 USL Championship clubs and all 17 USL League One clubs: cumulative quiz sizes 30 / 55 / 72. Canadian MLS clubs remain included. The pools are cumulative league selections, not a promotion/relegation claim and not MLS NEXT Pro or USL League Two.

## Reproduction and evidence

`clubs.json` is the normalized input for the shared atlas sports quiz builder. `build.mjs` recreates it offline from the retained ESPN league/team/venue responses and explicit `venue-review.json` decisions. Stable question identities use the provider's persistent team ID (`us-soccer-<id>`) so renamed clubs keep the same identity. Official MLS competition guidelines and both USL 2026 competition-format announcements independently establish the exact 30 / 25 / 17 rosters. The source validator checks each club against those retained primary lists.

`source.mjs` retains raw provider and official pages as gzip snapshots in `raw/`. `manifest.json` pins the uncompressed SHA-256 checksum and length of every snapshot, plus the exact normalized inputs and all original crest files. Existing files are verified and never silently downloaded again. A season refresh requires explicit roster and ground review. Run `node scripts/us-sports-sources/soccer/build.mjs` and `node scripts/us-sports-sources/soccer/validate.mjs` from the checkout.

Every club crest is an authentic, locally retained ESPN image. All 72 images were decoded and inspected together on a contact sheet. Copyrights and trademarks remain with their respective owners; each source URL accompanies its original bytes. Wikipedia named-venue coordinates and retained OpenStreetMap ground geometry locate actual match grounds. OpenStreetMap data is © OpenStreetMap contributors, ODbL. Source content retains its original licensing.

## Current-ground review

- The quiz uses a club's primary seasonal home when a club divides its schedule. Chicago Fire's main home is Soldier Field; some matches are relocated to SeatGeek Stadium for NFL scheduling. New York City FC's primary ground is Yankee Stadium, with several 2026 matches at Citi Field. Charlotte Independence's 2026 games are split between American Legion Memorial Stadium and Matthews; the primary Memorial ground is mapped. These alternates are recorded in notes rather than creating duplicate questions for one club.
- Birmingham Legion's provider record points at a single-match alternate, Dunnavant Valley Fields. Retained club notices identify those as individual fixture moves; the quiz marks the primary Protective Stadium.
- Inter Miami uses Nu Stadium at Miami Freedom Park, opened April 2026, not its previous Fort Lauderdale home.
- Union Omaha uses Morrison Stadium in Omaha for 2026–27, not Werner Park in Papillion. The provider's Papillion locality was stale and was corrected.
- Orlando's current name is Inter.co Stadium. Columbus uses ScottsMiracle-Gro Field. Sporting Kansas City uses Sporting Park. Pittsburgh uses F.N.B. Stadium in Pittsburgh; bare “Highmark Stadium” and “FNB Stadium” lookup results incorrectly identify Buffalo and Johannesburg respectively and were rejected.
- New League One grounds include Stadium at Expo Idaho in Garden City for AC Boise, Ruoff Mortgage Stadium for Fort Wayne, and GE Vernova Park in Mauldin for Greenville.
- Corpus Christi uses the Cabaniss complex's 8,000-seat stadium temporarily in 2026. The club's retained embedded map matches OSM football pitch way 262246098. The nearby Cabaniss Baseball Field and the new unfinished Corpus Christi facility were rejected.
- Sarasota's main stadium pitch is OSM way 678286744 at Premier Sports Campus, Lakewood Ranch. Its retained tournament ground map labels that exact pitch “Stadium”; the adjacent field 5 and broad 23-field facility midpoint were rejected.
- Westchester SC uses Memorial Field in Mount Vernon. Nearby similarly named grounds elsewhere were rejected. FC Dallas plays in Frisco; the provider's erroneous city value “Toyota Stadium” was corrected.

The original Wikipedia/API results, including rejected alternatives, remain as audit evidence; only explicit reviewed venue choices flow into the quiz.