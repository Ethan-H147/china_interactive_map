# US college football source pack

Reviewed 29 October 2026 for the 2026 football season. The pack covers all 138 Football Bowl Subdivision programs: 67 in the ACC, Big Ten, Big 12 and SEC, followed by the other 71 FBS programs. The cumulative quizzes therefore contain 67 and 138 teams. Notre Dame and UConn are independents and enter with the all-FBS level. The levels describe conference membership, not a current performance ranking.

## Sources and reproducibility

The retained NCAA FBS standings page and ESPN's structured 2026 conference standings establish the roster and current affiliations. North Dakota State's Mountain West move and Sacramento State's MAC move are independently verified by retained primary university announcements. The complete roster includes both 2026 FBS transition programs. The Pac-12's eight football members, Northern Illinois in the Mountain West, and Louisiana Tech in the Sun Belt follow the 2026 standings rather than an older alignment.

`source.mjs` retains raw downloaded replies as gzip snapshots with the original uncompressed SHA-256 checksum and URL in `manifest.json`. Provider snapshots include the 2026 standings, individual team/college replies, the current Wikipedia program/stadium tables, batched named stadium coordinates and primary venue announcements. `venue-review.json` records each reviewed ground, physical locality, coordinates, formal university alias and exceptions. The source table is retained for audit; the normalized review is deliberately explicit because some provider venue fields are obsolete.

`node scripts/us-sports-sources/college-football/build.mjs` rebuilds `clubs.json` offline from the retained roster and venue review. `node scripts/us-sports-sources/college-football/validate.mjs` verifies all raw/reviewed hashes, 138 unique team/ground identities, tier counts, geography, every original PNG and the reviewed moves. No unretained files under `artifacts/` are required to rebuild. Updating the season requires a deliberate new source review; existing snapshots are checksum-checked instead of silently overwritten.

## Stadium review

Dots mark a named current home ground, rather than a university or city centre. Coordinates are the named stadium articles' geotagged points, retained through the Wikipedia API and tied to an exact stadium title. Physical localities come from the reviewed ground table, with Buffalo corrected to Amherst and FIU to University Park (Miami). States are retained separately so repeated city names can be distinguished by the runtime builder. Illinois explicitly overrides the obsolete provider ground’s Virginia state with IL; the reviewed Champaign ground and coordinates take precedence. Validation checks all 138 state labels against the atlas state polygons, so a corrected venue cannot silently retain another ground’s state.

Important reviewed exceptions:

- Northwestern's new Ryan Field opened on 2 October 2026. Its first two 2026 home games used Martin Stadium, but the current October home is the rebuilt Ryan Field at the original stadium site.
- Hawai‘i plays at Clarence T. C. Ching Athletics Complex, not Aloha Stadium.
- UAB uses Protective Stadium, not Legion Field; Baylor uses McLane, not Floyd Casey; UNLV uses Allegiant in Paradise, not Sam Boyd; San Diego State uses Snapdragon, not SDCCU; Colorado State uses Canvas, not Hughes.
- Illinois plays at Gies Memorial Stadium in Champaign; the provider's Foster Stadium entry is unrelated.
- Texas Tech uses Galaxy Stadium from the 2026 season. Houston's university and Big 12 sources currently retain TDECU Stadium branding, taking precedence over a premature sponsor change in a secondary table.
- Buffalo's ground is Broadview Stadium in Amherst. Louisiana's renovated ground is Our Lady of Lourdes Stadium. ULM's ground became FMOL Health | St. Francis Stadium for the 2026 season; older Malone Stadium schedule references predate the naming announcement.

## Logos and names

All 138 authentic ESPN-hosted university athletic badges are retained locally in `crests/`, with original URLs and hashes. Both 70/68-club contact sheets were visually reviewed; images are team logos rather than kit photos, stadium pictures or university seals. Copyright and trademarks remain with the institutions and their owners. Wikimedia structured coordinates and metadata retain their source-page terms; no artwork is generated.

Question names stay brief (Michigan State, Notre Dame, USC, UCLA, etc.). Formal university names, provider team names, common abbreviations and relevant aliases are accepted. Miami (FL) and Miami (OH) remain distinct questions. There are no genuine shared grounds within this FBS pool and no artificial marker displacement.