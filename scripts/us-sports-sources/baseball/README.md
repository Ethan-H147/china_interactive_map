# MLB stadium quiz source pack

Reviewed 29 October 2026 for the 2026 MLB season. Contains all 30 Major League Baseball teams in one pool, including the Toronto Blue Jays. No difficulty tiers are needed.

The official MLB StatsAPI `teams` response is pinned to sport 1 and season 2026 and hydrated with venue location and field information. It supplies every team, current stadium name and exact stadium coordinate. ESPN's MLB team directory supplies the authentic original team badges. All 30 downloaded PNG badges were decoded and inspected on a contact sheet. No remote image requests are needed in the runtime quiz.

The reviewed venue exceptions are retained in `venue-review.json`:

- Athletics: Sutter Health Park, physically in West Sacramento. The MLB API's Sacramento postal locality is corrected against the official club ballpark address. This is the temporary 2025–27 home.
- Tampa Bay Rays: Tropicana Field in St. Petersburg for 2026. The club's official April 2026 home-opening announcement confirms the return after the 2025 season in Tampa.
- Atlanta Braves: Truist Park in the Cumberland area of Cobb County. The club's official transportation page distinguishes the actual Cumberland location from its Atlanta postal address.
- Los Angeles Angels: Angel Stadium in Anaheim, as recorded by the official venue response.
- New York clubs: Yankee Stadium is labeled New York City (Bronx), Citi Field New York City (Queens), rather than treating their postal borough/neighborhood names as separate cities.
- Los Angeles Dodgers: the current official name, UNIQLO Field at Dodger Stadium, is retained. The March 2026 club announcement confirms the new field sponsorship name.

Dots represent physical home grounds rather than city centers. All 30 points are distinct. A team’s display name remains its full franchise name. Short team names and common abbreviations are accepted. Ambiguous aliases shared by multiple teams, such as Chicago or Los Angeles, are excluded automatically.

`manifest.json` records the original source URLs, uncompressed SHA-256 hashes and byte lengths. Raw replies and original artwork are compressed individually as `.gz` snapshots; directly usable original PNGs are under `crests/`. `reviewedFiles` separately pins normalized inputs, city review and all original usable images. Club logo copyrights and trademarks remain with their respective owners. MLB venue coordinates are attributed to the official StatsAPI response.

Run from the repository root:

- `node scripts/us-sports-sources/baseball/build.mjs` recreates `clubs.json` offline from retained inputs.
- `node scripts/us-sports-sources/baseball/validate.mjs` verifies every original and normalized checksum, official venue coordinates, all 30 image decodes, unique aliases and the reviewed locations.

`source.mjs` can retain a newly reviewed response. Existing snapshots are always checksum-verified and are not silently replaced. Updating the season requires explicit roster and venue review.