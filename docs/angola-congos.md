# Angola and the two Congos

The local atlas has an Angola page and a shared Congo page. Congo-Brazzaville and Congo-Kinshasa remain two independent sovereign countries. They share navigation, not an administrative hierarchy with one another. Both are roots in the catalogue, with separate flags, names, populations and national economic cards. Their subdivisions sit under the correct country.

## Coverage

- Angola: 21 current provinces and all 326 municipalities from the public `Nova_DPA_2024_Ajustada_INE` ArcGIS service, attributed by its publisher to INE census cartography. Provincial boundaries are dissolved from the municipalities so parent and child edges agree. Cabinda is retained. The census-specific third layer is omitted because it is adjusted to census work rather than the statutory commune count.
- Congo-Kinshasa: 26 provinces, including the city-province of Kinshasa, from OCHA COD-AB 2019. The deeper humanitarian download mixes health zones and synthetic city units; those are not presented as administrative subdivisions.
- Congo-Brazzaville: 15 departments. The three 2024 departments are reconstructed by grouping the retained 2017 OCHA district polygons according to Laws 25–27/2024. Brazzaville’s Kintélé / Île Mbamou expansion is unresolved by the source, so Brazzaville and the adjoining Djoué-Léfini geometry are explicitly approximate. The older Mossaka polygon includes the area now described as Bokoma; the missing standalone district is not invented. Post-reform district geometry is omitted. The reform audit is available in the country data folder.

Shared border arcs follow one adjoining survey, rather than alternating between outlines. Angola meets the existing Namibia boundary and the two new Congo silhouettes. The two Congos share one continuous country frontier. Major inland lakes, including Tanganyika, are excluded from land fills. Background world geometry is regenerated against the new silhouettes.

## Statistics and sources

Angola’s provincial populations use the final official RGPH 2024 report, for 19 September 2024, and sum to 36,604,681. The INE dashboard differs from the report in Uíge and in the Luanda/Icolo e Bengo distribution; the atlas consistently uses the retained published report table. No municipal populations are inferred.

DRC provincial populations sum the 519 health-zone rows in OCHA’s 2024 HPC planning projections. These are humanitarian projections, not census counts. National World Bank population estimates have a different method and need not match that total. Congo-Brazzaville department populations are omitted because the available population tables do not match the reformed departments. National current-price GDP and GDP per person come from World Bank WDI; national values are not distributed to subdivisions.

Every source is retained with its URL, attribution, date and SHA-256 in `scripts/boundary-sources/angola-congos/manifest.json`. The Angola GIS publisher does not state an explicit open-data license; the atlas records that limitation and attribution rather than claiming a Creative Commons license. OCHA source metadata and its license are retained. National flags use public-domain Wikimedia Commons artwork.

Run `npm run fetch:angola-congos`, `npm run build:angola-congos` and `npm run test:angola-congos`. Normal preview: `npm start`, at http://127.0.0.1:4174/.

## Internal seam correction

The retained municipality survey has enclosed slivers between neighboring polygons. The build closes 2,262 such seams, affecting 44 province-border combinations, by assigning each sliver to its longest adjoining municipality edge. Province fills and shared strokes are then dissolved from the same repaired municipality topology. The six single-owner holes and the separate source lake mask remain intact. The build verifies exterior displacement below 0.1 m, preserving coastlines and international frontiers. Area and density calculations use the repaired geometry; population figures are unchanged.

`npm run test:angola-seams` checks every recorded provincial seam, gap closure, water-hole retention and the fixed exterior, then exercises rendered fills, strokes, zoom, selection and pan on desktop and phone. `seam-repair.json` retains the before-gap probes and repair audit.
