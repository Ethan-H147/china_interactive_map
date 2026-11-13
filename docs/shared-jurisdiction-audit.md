# Shared jurisdiction review — 12 November 2026

Zagreb now has one canonical card (HR050), accessible through its existing county-level geometry and municipal geometry (HR_01333). The surrounding Zagreb County (HR065) is a separate government and remains separate. Names, search aliases and statistics share a page; geometry IDs and quiz membership retain their original levels. No geometry was rebuilt and no changes were published. The card uses “City and county” without a long explanatory description.

The existing shared-place-pages module accepts adjacent levels 1/2, its original U.S./Canada 2/3 pairs, and explicitly defined three-level chains. Definitions are explicit, reviewed decisions; geometric similarity never merges a place automatically.

## Screening scope

187 regional catalogues were screened for parent/child pairs with bounding coordinates within 0.00001 degrees and mapped area within 0.001%. This produced 588 candidate pairs across 62 country catalogues. It is a quick geometric screen, not 588 proven governmental duplicates. It misses sibling records, footprints that differ, and adapters without these catalogues. Approximate source data can also create false matches. Full machine-readable results are in artifacts/shared-jurisdiction-audit/candidates.json.

## Reviewed shortlist

| Place or group | Finding | Source |
| --- | --- | --- |
| Zagreb | Implemented: one city government performs city and county functions. Surrounding Zagreb County excluded. | [Zagreb statute](https://skupstina.zagreb.hr/UserDocsImages/engleski%20web/statistika/00%20INTERNO%20Statut%20Grada%20Zagreba_engleski%20prijevod.pdf) |
| Vienna and Austrian statutory cities | Strong candidates. Vienna's city bodies also perform provincial functions; statutory-city municipal bodies perform district administration. 16 matching pairs found in Austria. | [Vienna dual roles](https://www.oesterreich.gv.at/en/themen/transparenz_und_partizipation_in_der_demokratie/demokratie-und-wahlen/wahlen/5/Seite.320622), [statutory cities](https://www.wien.gv.at/spezial/organisation-verwaltung-en/vienna-a-part-of-the-republic-of-austria/organisation-of-municipal-administration/) |
| Polish cities with county rights | Strong candidates: 66 city/county pairs. County functions are performed by the city council and city president (Article 92). The surrounding rural counties remain separate. | [Polish county self-government law](https://eli.gov.pl/api/acts/DU/2024/107/text.html) |
| Berlin and Hamburg | Strong candidates: combined city/state institutions. Subordinate boroughs are separate entries and should remain available. | [Berlin constitution](https://www.berlin.de/rbmskzl/en/the-governing-mayor/the-constitution-of-berlin/artikel.16534.en.php), [Hamburg parliament](https://www.hamburgische-buergerschaft.de/unsere-arbeit/die-aufgaben) |
| Prague | Strong candidate: the capital has municipal and regional status. Three mapped representations form two parent/child matches. Brno's district match needs its own assessment. | [Act on Prague](https://e-sbirka.gov.cz/sb/2000/131?odkazId=214753887) |
| Oslo | Strong candidate: the City of Oslo performs municipal and county functions through its city government. | [City governance](https://www.oslo.kommune.no/english/politics/city-governance/) |
| Auckland, Nelson, Marlborough | Strong candidates: these are unitary authorities. Gisborne and Tasman are also unitary authorities, but were not equal-footprint matches in this fast scan; inspect their actual geometry before sharing cards. | [NZ Local Government Commission](https://www.lgc.govt.nz/our-work/local-government-reorganisation/about-local-government-reorganisation/) |
| Martinique and French Guiana | Strong candidates: a single territorial authority performs regional and departmental functions. State representative/prefecture functions remain distinct. | [French government explanation](https://www.vie-publique.fr/fiches/20148-quel-est-le-statut-de-la-guyane-et-de-la-martinique) |
| Bogotá D.C. | Good next-review candidate: duplicate capital-district and municipal-area records represent the special capital district. Do not merge with Cundinamarca. | [District government legal framework](https://www.alcaldiabogota.gov.co/sisjur/normas/Norma1.jsp?i=153250) |
| Guadeloupe and Réunion | Keep separate regional and departmental government roles: matching boundaries do not create one authority. | [French regional-government law](https://www.legifrance.gouv.fr/codes/id/LEGISCTA000006149299), [Court of Accounts institutional comparison](https://www.ccomptes.fr/system/files/2021-12/CRTC%20Antilles%20Guyane-Rapport%20d%27activit%C3%A9%202020-2021_2.pdf) |
| Sofia | Keep regional state administration distinct from elected municipal government. Official guidance explicitly distinguishes the mayor and regional governor. | [Bulgarian Constitution](https://parliament.bg/en/const), [Sofia municipal status](https://www.sofia.bg/en/web/sofia-municipality/administrative-territorial-structure) |

Implemented locally after approval: Zagreb; Oslo; Berlin and Hamburg (one card across state, district and municipality levels); Martinique, French Guiana and Mayotte (one card across region and department levels, retaining real communes). Duplicate flag assets are hidden on shared cards. Remaining candidates require explicit jurisdiction definitions, geometry/statistics comparisons and tests before implementation. Austria, Poland and New Zealand are explicitly deferred pending user research. Identical census/reference areas need clear naming; they do not necessarily describe another government. Towns, urban areas, parishes and central-government districts must not be merged solely because a dataset gives them the same polygon.

## Candidate counts by country

These are screening matches, including already shared Canadian pages and U.S. statistical entries. They are not a count of approved new merges.

| Country | Parent/child matches |
| --- | ---: |
| austria | 16 |
| belgium | 1 |
| benin | 1 |
| botswana | 10 |
| bulgaria | 1 |
| burkina-faso | 1 |
| cabo-verde | 14 |
| canada | 12 |
| chad | 1 |
| chile | 2 |
| colombia | 1 |
| costa-rica | 3 |
| croatia | 1 |
| cuba | 1 |
| czechia | 3 |
| dominican-republic | 53 |
| ecuador | 41 |
| el-salvador | 2 |
| estonia | 1 |
| ethiopia | 10 |
| france | 6 |
| germany | 2 |
| greece | 7 |
| guinea | 1 |
| guinea-bissau | 1 |
| haiti | 10 |
| hungary | 2 |
| iran | 1 |
| iraq | 12 |
| israel | 2 |
| italy | 1 |
| ivory-coast | 1 |
| jordan | 1 |
| lebanon | 2 |
| madagascar | 8 |
| maldives | 1 |
| mali | 1 |
| mozambique | 11 |
| new-zealand | 3 |
| niger | 13 |
| norway | 1 |
| papua-new-guinea | 3 |
| paraguay | 1 |
| peru | 2 |
| poland | 66 |
| portugal | 6 |
| qatar | 44 |
| romania | 1 |
| slovakia | 1 |
| slovenia | 4 |
| solomon-islands | 2 |
| south-sudan | 1 |
| spain | 12 |
| sudan | 1 |
| sweden | 1 |
| syria | 3 |
| thailand | 9 |
| turkey | 1 |
| uganda | 88 |
| united-states | 3 |
| venezuela | 76 |
| zimbabwe | 1 |

Merged cards with genuine descendants automatically open the next non-duplicate subdivision level. For Martinique and French Guiana, this means selecting the shared region/department opens the commune layer. Real map clicks, list clicks, parent navigation and saved commune links are covered by scripts/browser/merged-overseas-communes.test.mjs (desktop and phone). Existing layer-lock behavior is preserved.

Mayotte is a single Département-Région exercising regional and departmental powers under CGCT Article L7311-1 (effective 1 January 2026): https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000052092591/2026-02-20. Réunion retains separate regional and departmental councils: https://www.outre-mer.gouv.fr/acteurs-des-outre-mer/presidences-des-gouvernements-executifs-et-assemblees-territoriales. The label filter now uses the same effective department scope as the commune geometry loader. Regression checks require visible commune name tags and absence of both duplicate parent tags after drill-down, as well as real commune selection.
