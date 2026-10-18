# Australia, New Zealand and the Realm

Added locally on 17 October 2026. Both countries use the existing country registry, shared regional renderer, country collection, statistics cards, color controls, flags, original flag viewer, saved views and three-country cache. Nothing is published by this update.

## Australia

The map includes six states, the Northern Territory, Australian Capital Territory and separate Jervis Bay Territory. It also includes all seven external territories: Christmas Island, Cocos (Keeling) Islands, Norfolk Island, Ashmore and Cartier Islands, Coral Sea Islands, Heard Island and McDonald Islands, and the Australian Antarctic claim. Macquarie Island is an island page under Tasmania, not a new external territory.

ABS 2025 supplies 545 spatial local-government/unincorporated areas after the separately mapped territories are removed. Macquarie Island adds one geographic island page at the local level. The ABS source is an approximation of gazetted LGA boundaries from meshblocks, not a cadastral authority. Non-spatial no-usual-address and migratory/shipping codes are excluded from the map. They remain in the source’s state population sums, so omitting their nonexistent geometry does not drop people from state totals.

Parents dissolve from the same cleaned LGA topology. Shared interior borders are stored once; unselected coastlines have no stroke. Full source resolution is retained, rounded only to six decimal places. There is no blanket simplification of the close-up source. The shared builder declares a 0.25-pixel fill tolerance, so the renderer does not send every source vertex to the GPU at overview zoom. This is a subpixel rendering allowance at each zoom, not a reduced-detail replacement file; selected coast geometry and original source snapshots remain intact. Background previews use a separate small geometry, and local data loads per selected state. States with no local-government council are represented by the source’s unincorporated area rather than an invented council.

Population uses ABS estimated resident population at 30 June 2025. Norfolk and Jervis Bay retain separately reported 2021 Census populations because the LGA estimate combines them. GDP and published GDP per capita use ABS State Accounts 2024–25, current prices. AUD values are preserved; indicative USD equivalents use calendar-2025 annual average exchange rates. No local-government or uninhabited-island GDP is invented.

The six state flags, NT and ACT flags, and Norfolk Island flag use sourced originals and lossless thumbnails. Christmas Island and Cocos community flags are available through the existing optional-flag control under **Sources & coverage**. Commonwealth flag and symbols publications describe their formal status differently, so they are not silently presented as unambiguously official. There is no invented flag for Jervis Bay or an Antarctic claim.

## New Zealand

There are 16 regional council areas, a separate Chatham Islands page, and all 66 other territorial authorities. The Chatham page accounts for the 67th territorial authority. The source’s **Area Outside Region** also contains Three Kings, so that land is explicitly separated; Chatham does not inherit the Three Kings geometry, a broad camera extent or its aggregated population. Chatham uses its own 2023 Census count of 612.

The seven separately mapped offshore groups are Three Kings (Manawatāwhi), Kermadec, Auckland Islands, Campbell Islands, Antipodes Islands, Bounty Islands and Snares. These are geographic island groups outside regional government areas, not fabricated regional councils. The map also includes Cook Islands and Niue as self-governing states in free association, Tokelau as a non-self-governing territory, and the labelled Ross Antarctic claim. The associated states are not described as dependencies.

All 15 named Cook Islands and all three Tokelau atolls have land-only local pages. Their coast polygons are grouped by source-attested island identities and coordinates, with a distance check for every component. The island pages do not invent maritime areas or village/council borders. Clicking Rarotonga or Atafu from another country opens New Zealand at that island; it does not frame the entire island chain or mainland New Zealand. Niue, Chatham and other remote entries similarly retain their own bounds. The ordinary home button frames mainland New Zealand.

Regional boundaries use Stats NZ’s 2025 classification; territorial authorities use its 2026 edition. Published Stats NZ land areas are used for the regions and territorial authorities. Island areas without a reported figure use an explicit geographic calculation that is invariant under a 360-degree longitude shift; square degrees cannot silently become square kilometres. Both boundary levels are clipped to detailed LINZ land, so the administrative 12-mile sea buffers are not painted as land. The authoritative 2026 meshblock higher-geography table supplies every territorial authority’s regional memberships. Cross-region districts retain one identity and their full geometry; each appears under every region it occupies. The largest land overlap supplies the primary navigation parent, not a split or a guessed centroid-only assignment.

Regional and local population retains its 2023 Census usual-residence basis. Auckland’s territorial total sums its published local-board components. Later boundary changes are not retrospectively assigned estimated census totals. Cook Islands uses its published 2021 resident count; Niue uses the 2022 usual-resident count rather than adding visitors; Tokelau uses the 2022 count cited by MFAT. No separate population is extrapolated to the 18 geographic island/atoll pages.

Fourteen regional GDP and per-capita pairs use Stats NZ’s year-ended-March-2025 figures, reproduced in the Parliamentary Library’s May 2026 review. Tasman and Nelson have a combined published series; it is not divided or duplicated onto the two separate map regions. Canterbury’s published GDP includes Chatham Islands, which is noted in its source details; a second Chatham GDP is not fabricated. NZD values retain their official period and denominator. USD equivalents use calendar-2025 annual averages.

New Zealand, Cook Islands, Niue and Tokelau flag originals are available in the shared viewer. No proposed Ross flag or unverified regional banner is shown as an official flag.

## Antarctic scope

Australian and Ross sectors are labelled **Antarctic claim**, with a note about the Antarctic Treaty System. They depict retained Natural Earth land within the claimed sectors, not sovereign ownership accepted by every country and not a land-colored ocean sector. The Australian geometry excludes Adélie Land. They carry no invented permanent population or GDP. Their geometry ends at the map’s polar latitude range, so mapped land area is not a claim to the full official territory area or a current cadastral survey.

## Sources and builds

`scripts/boundary-sources/oceania/sources.json` records source URLs, providers, licences and SHA-256 hashes. Compressed snapshots retain the official full-resolution geometries, official statistics extracts, LINZ land, OSM coastlines and exact island/flag identities. A changed upstream file fails the pin check; it must be reviewed before replacing the snapshot. The reviewed New Zealand GDP transcription retains its source table and units. The official page blocks direct terminal requests, so the builder uses the retained, reviewed table rather than parsing the block page as data.

`scripts/build-regional-dataset.mjs` writes the shared country data schema for both countries, including one ownership mesh, per-parent chunks and bounded preview geometry. `country-context.mjs` remains the common territory-entry schema. Child islands can provide focused entry without pretending to be first-level territories. The runtime is the existing `regional-country.mjs`; no independent country renderer, hover handler or memory cache was added. Its shared loading check now waits for GeoJSON worker readiness rather than visible tiles. This prevents an off-screen island search from waiting for tiles that cannot appear until the camera moves. Empty internal-border layers do not block a selection. Regression checks verify actual rendered selection coasts, not just sidebar text.

- `npm run build:oceania` rebuilds geometry from retained sources, island groups, statistics, flags, background land, compact previews and color data.
- `npm run fetch:oceania` fetches or validates the main official boundary/population snapshots. The retained auxiliary sources are required for a complete rebuild; do not delete pinned snapshots as routine cache cleanup.
- `npm run test:oceania` checks source identities and hashes, administrative counts, cross-region membership, land label points, border ownership, island bounds, population, economy and flags.
- `npm run test:oceania-browser` checks public entry, lazy local data, search, flags, satellite paint order, saved views, remote clicks on both sides of the date line, phone layout and the three-country cap.

Local previews:

- http://127.0.0.1:4174/?preview=oceania#australia
- http://127.0.0.1:4174/?preview=oceania#new-zealand

Refresh with Ctrl+Shift+R if a previously open tab retains old scripts.

Primary reference pages:

- [ABS digital boundary files](https://www.abs.gov.au/statistics/standards/australian-statistical-geography-standard-asgs/edition-3-july-2021-june-2026/access-and-downloads/digital-boundary-files)
- [Australian territories](https://www.infrastructure.gov.au/territories-regions/australian-territories)
- [State and territory flag guidance](https://www.pmc.gov.au/resources/australian-flags-booklet/part-3-other-official-flags-australia/state-and-territory-flags)
- [Stats NZ territorial authorities, 2026](https://services2.arcgis.com/vKb0s8tBIA3bdocZ/arcgis/rest/services/Territorial_Authority_2026/FeatureServer)
- [Governor-General: the Realm](https://gg.govt.nz/office-governor-general/death-her-majesty-queen/queen-new-zealand/queens-relationship-realm-new)
- [MFAT: Antarctica and the Southern Ocean](https://www.mfat.govt.nz/en/environment/antarctica-and-the-southern-ocean)
- [Official New Zealand regional GDP table](https://www3.parliament.nz/en/pb/library-research-papers/monthly-economic-review/monthly-economic-review-may-2026/)
