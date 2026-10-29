# US miscellaneous quizzes

Implemented locally on 29 October 2026. The US Quiz picker now uses Category, with States, Counties & equivalents, Cities and Miscellaneous. Miscellaneous offers six independent quizzes:

| Quiz | Locations | Map representation |
| --- | ---: | --- |
| College towns | 40 | Town dots, prompted by university name |
| Civil War battlefields | 30 | Representative battlefield dots |
| National parks | 63 | Official NPS legislative polygons; marker handles for very small parks |
| Sports towns | 39 | Home-city dots, prompted by a major NFL/NBA/MLB/NHL team |
| Revolutionary battlefields | 22 | Representative battlefield dots |
| Presidential birthplaces | 44 | Birthplace dots covering 45 individual presidents |

There is one college-town set, rather than separate public/private packs. The 41 institutions are curated, not ranked. Prompts use brief college names; full institution names and common abbreviations remain accepted aliases. Correct answers show the associated town and state in every mode, as do revealed and incorrect answers. All miscellaneous topics include their location details in correct-answer feedback. Harvard and MIT share Cambridge. Columbia and UChicago are excluded; the set avoids obvious major-city campuses. Institutions and campus locations are checked against the NCES IPEDS 2024 directory; town dots use the existing US Census place reference. Penn State is associated with State College and Notre Dame with South Bend despite their separate campus postal localities. The complete chosen list and source details are visible under the quiz's included-places disclosure.

Battlefield representative points are calculated within the National Park Service American Battlefield Protection Program's published study areas. They represent the battle's geography, not a reconstructed exact fighting position. Overlapping first/second Manassas and the Saratoga engagements are grouped. The history quizzes are curated selections, not exhaustive battlefield inventories.

All 63 national parks have polygons from the authoritative NPS Land Resources Division boundary service. Source multipart overlaps are merged before area calculations, avoiding double counting. Display geometry retains holes and detached parts, with an approximately three-meter angular simplification tolerance. These are legislative boundaries, rather than federal-ownership parcel outlines; they can include water and inholdings. The source treats New River Gorge National Park and Preserve as one legislative unit; that combined extent is disclosed. Mainland, Alaska, Hawaii, American Samoa and Virgin Islands map-view controls make remote parks reachable without shrinking the mainland into a global overview. Very small parks retain their polygons and also receive a clickable marker.

Sports dots identify the city associated with a team, not the exact stadium municipality. Birthplace identities and coordinates come from the retained Wikidata claims, with biographies linked to the University of Virginia Miller Center. Both Adams presidents use a single modern Quincy dot (historically Braintree); repeated terms for Cleveland and Trump do not duplicate individuals. The uncertain precise location of Andrew Jackson's birth is disclosed as a regional Waxhaws reference.

All six quizzes support Preview, find-on-map, naming, highlighted naming, satellite imagery, answer colors and standard feedback. Preview saves no round. Naming drafts, personal bests and finished rounds are isolated by topic. Miscellaneous is category 4 in the interface, but its attempts use existing record level 3 plus unique misc-prefixed scopes. This preserves compatibility with the current Supabase schema without changing existing state/county/city records or requiring a migration. The account dashboard can launch each topic and labels its results as Miscellaneous.

Sources, retrieval date and SHA-256 checksums are retained in scripts/boundary-sources/us-misc/manifest.json. Public entry points: [NPS GIS data](https://www.nps.gov/subjects/gisandmapping/tools-and-data.htm), [NPS battlefield data](https://www.nps.gov/orgs/2287/battlefield-boundaries-map.htm), [NCES IPEDS](https://nces.ed.gov/ipeds/datacenter/), [Miller Center biographies](https://millercenter.org/president), and the official league team directories linked in each quiz.

Run npm run build:us-misc-quiz to reuse pinned downloads and rebuild the two local data assets. Run npm run test:us-misc-quiz for source, geometry, record-schema, menu, Preview, answer, draft, account transport and phone checks. No country geometry is modified. Committing, pushing and deployment remain separate user-authorized actions.
