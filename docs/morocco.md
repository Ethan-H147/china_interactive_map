# Morocco

Morocco uses the shared regional renderer, search index, level lock, saved-view format and first-level map/naming quiz controller. No country-specific selection logic was added.

The pinned source is zkousama/morocco-communes revision a3e0849d111ae4c7387327d5befbcca67443dc98 (dataset 1.10.0). HCP identities and French/Arabic names provide 12 regions, 75 provinces/prefectures and 1,503 communes. OSM geometry exists for 1,502 communes. The missing Sidi Mohamed Benmansour boundary (04.281.05.11) and documented source gap near Ifrane/Boulemane remain unfilled. Eight Casablanca prefectures of arrondissements are excluded from the province tier. Numeric-looking codes stay strings, including zero-padded geometry join keys.

The source follows the Moroccan administrative hierarchy, including Western Sahara. Source coverage is not a determination of sovereignty. Ceuta/Melilla and foreign/offshore sentinel points are outside the Moroccan land fills.

Population is the published 2024 census, including 36,828,330 across the regions. Parent populations use their published figures rather than assumed sums of children. Mapped area uses the retained 2026 geometry and does not imply a 2024 coastline. Parent boundaries are polygon unions of commune land shapes, with holes retained. Local geometry loads per parent, keeping deep country-wide geometry out of startup.

HCP attributes are CC BY 4.0. OSM geometry and derived spatial fields are ODbL 1.0. Original compressed source snapshots, hashes, URLs, revision and licenses are retained under scripts/boundary-sources/morocco; generated geometry and source notes are under dist/data/europe/morocco. Redistribution of the adapted spatial database follows ODbL. Code licensing does not replace these data licenses.

Rebuild: npm run build:morocco. Verify: npm run test:morocco and npm run test:morocco-browser. Source requests are pinned to a commit; cached inputs are hash-checked before reuse. Changing the source revision requires reviewing identities, coverage, vintage and license notes together.

Ceuta and Melilla retain Spain’s existing canonical boundaries and frontier strokes. Only Morocco’s adjacent exterior edges are reconciled to them (recorded maximum displacements below 500 m); municipal interiors and other coasts stay in their source topology. Algeria and Mauritania frontier arcs follow Morocco’s retained land outline, selected with the pinned Natural Earth 1:10m reference. The source Moroccan hierarchy has no separate Morocco/Western Sahara administrative seam.
