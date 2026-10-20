# Turkish names

Turkey preserves Turkish dotted İ/i and dotless I/ı in displayed names, including İstanbul, İzmir, Isparta, Iğdır and Kadıköy. English, Turkish and bilingual map labels use the existing language control. Identical English and Turkish spellings appear once. ASCII spellings remain searchable.

The 12 statistical regions, 81 provinces, 973 districts and 82 city dots carry Turkish names and administrative terms. Province and district polygons retain their existing administrative meaning: İl, İlçe and Merkez ilçe. A municipality is a related government, not a replacement polygon type.

The [Türkiye Belediyeler Birliği directory](https://www.tbb.gov.tr/tr/buyuksehir-ve-il-belediyeleri), retrieved 19 October 2026, supplies municipal government names such as İstanbul Büyükşehir Belediyesi and Kadıköy Belediyesi. Each match uses the province code and locality name within that province. Nonmetropolitan province records identify the provincial capital municipality explicitly. Municipal names are searchable and appear in the place details. They do not imply new municipal boundary geometry.

Retained source HTML and its SHA-256 manifest are in `scripts/name-sources/turkey/`. Existing retained OpenStreetMap Turkish names supply the geographic spellings; HGM/OCHA administrative geometry and statistical values are unchanged. `dist/data/europe/turkey/regional-names.json` records provenance and coverage.

Run `npm run build:turkey-names` to refresh the metadata from the retained sources. The main Europe and settlement builders also run this step. Run `npm run test:turkey-names` to validate casing, search aliases, source checksums, province/district types, label languages, saved views and desktop/mobile detail panels.
