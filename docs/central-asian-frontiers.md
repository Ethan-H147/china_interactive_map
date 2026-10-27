# Central Asian shared boundaries

The local repair of 26 October 2026 reconciles Kazakhstan, Kyrgyzstan, Uzbekistan, Tajikistan and Turkmenistan as one partition. It replaces the earlier alignment based on coarse Natural Earth border guides, which missed small enclave loops and left some country fills apart from their border strokes.

All seven adjoining country pairs use the same boundary on both sides. Four Uzbek exclaves and three Tajik exclaves are retained. International strokes come from the joint ownership mesh and are stored once. Inactive-country contexts retain the complete common outline, so their gray fills follow the same border as the active country's detailed map.

## Sources and scope

The country reference uses complete OpenStreetMap relations downloaded on 26 October 2026:

- [Kazakhstan, relation 214665](https://www.openstreetmap.org/relation/214665).
- [Kyrgyzstan, relation 178009](https://www.openstreetmap.org/relation/178009).
- [Uzbekistan, relation 196240](https://www.openstreetmap.org/relation/196240).
- [Tajikistan, relation 214626](https://www.openstreetmap.org/relation/214626).
- [Turkmenistan, relation 223026](https://www.openstreetmap.org/relation/223026).

Original relation files and Wikidata relation identifiers are retained with SHA-256 hashes in `scripts/boundary-sources/central-asian-frontiers/sources.json`. OpenStreetMap data is licensed under ODbL 1.0. These are dated community-mapped boundaries. Recent treaty context is documented by the [Tajik foreign ministry's account of the March 2025 border treaty](https://www.mid.tj/en/main/view/16742/signing-of-new-cooperation-documents-between-the-republic-of-tajikistan-and-the-kyrgyz-republic) and the [Uzbek foreign ministry's November 2025 border-junction protocol](https://gov.uz/en/mfa/news/view/102347). The retained map geometry does not reproduce cadastral treaty coordinates independently.

The established external land frontiers with Russia, China, Afghanistan and Iran remain fixed. Existing lake masks, including the retained detailed Kyrgyz lake shorelines, are reapplied. The shared Natural Earth Caspian water mask removes territorial sea from coastal land fills.

## Subdivision coverage

Each country is divided into non-overlapping topological faces within the common national mask. Subdivision faces retain the existing administrative owner where the sources agree. Uncovered border strips join the adjoining unit with the longest shared edge, or the nearest unit when isolated. The same process fits detailed districts to their displayed parent. Degenerate overlay faces smaller than one square metre with no interior point are omitted.

Uzbekistan retains 199 district/city references from the dated OCHA source: 198 administrative polygons and Shirin as a settlement point. The source's Shirin polygon covers only 0.12 km² and lies across the retained national border. Its polygon and misleading mapped area are removed. Shirin remains searchable at its [OpenStreetMap settlement location](https://www.openstreetmap.org/way/140375240), with the same place ID for saved links. A replacement municipal boundary is not inferred from the town footprint.

Population, GDP, GDP per capita and reported administrative areas retain their source values and dates. Mapped geometry areas, label anchors, bounds and detailed chunk sizes are recalculated. Country overview pages remain hidden. Unrelated interactive world silhouettes are preserved and hash-checked.

## Reproduction and checks

Run `npm run fetch:central-asian-frontiers`, `npm run build:central-asian-frontiers` and `npm run test:central-asian-frontiers`. The original local atlas inputs are retained under `scripts/boundary-sources/central-asian-frontiers/atlas-reference/` for a reproducible repair.

Validation checks source hashes, statistical preservation, country coverage, parent coverage, all seven exclaves and both sides of every shared border. Boundary samples must stay within 30 cm of the displayed fill edge. Overlay-area comparisons use a centimetre lattice and a local planar calculation so subdividing a long segment does not create false spherical sliver area. Desktop and mobile scenarios check every enclave's fill and border, the Fergana Valley from all three neighboring maps, Shirin's point and saved links.

The global frontier builder reapplies the retained ownership mesh. The country build workflows run the regional repair before refreshing their display assets.
