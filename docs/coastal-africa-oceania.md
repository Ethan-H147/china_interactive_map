# Coastal Africa and the remaining independent Pacific countries

These local additions use the shared regional renderer, search, selection, custom country palettes, source cards and three first-level quiz modes. Country overview pages stay hidden.

Scope: 26 previously unmapped coastal African countries, including island countries, and nine remaining independent Oceanian countries. Cook Islands and Niue remain in the existing New Zealand map. Dependent territories retain their parent-country entries. Both Congos were already mapped.

Source dates describe retained reference geography, not current administrative control. The source manifest records URL, license, byte count and SHA-256 digest for every retained source. Providers include OCHA COD-AB national releases, geoBoundaries, OpenStreetMap, national legislative references, FlagCDN and World Bank WDI. National population/GDP retain their observation years and are not invented for subdivisions.

Algeria uses 58 parent provinces during the 2026 transition to 69 provinces; current OSM province boundaries are merged back to transition parents. The official reform is retained from the gazette. Commune geometry is older and joined spatially. Equatorial Guinea includes Djibloho among eight provinces; its district geometry is older. Sudan's Abyei piece is labeled as a disputed reference area and excluded from ordinary state quizzes. Seychelles uses a dated district reference including Outer Islands and predating Île Persévérance. Mauritius and Seychelles outer islands retain separate entry bounds.

Pacific coordinates are unwrapped across the date line. Fiji, Palau and Marshall Islands use coastline land masks so lagoon and administrative sea areas are not selectable land. Fiji uses current division relations and a country mask to exclude nearby French islands. Rotuma is a separate dependency. Offshore land outside the administrative source coverage remains searchable as an explicit reference area without an invented affiliation; such references are excluded from ordinary subdivision quizzes.

National masks are conformed to displayed neighbors. Child areas are reconciled within displayed parents. Shared strokes are owned once, exclude lake water and follow land rather than coasts or sea boundaries. Existing neighboring subdivision geometry is preserved; background contexts are refined to match their actual fills. Numerical return spikes and narrow artefact components are removed consistently.

Local commands: npm run fetch:coastal-oceania, npm run build:coastal-oceania, npm run test:coastal-oceania, and npm run test:deployment. The retained source cache supports offline generation. The build does not commit, push, synchronize or deploy.


## Reference coverage

| Country | Source year | Searchable levels |
| --- | --- | --- |
| Egypt | 2017 | 27 governorates; 365 district reference areas |
| Eritrea | 2020 | 6 regions; 58 subregions |
| Djibouti | 2021 | 6 regions |
| Sudan | 2020 | 19 states & disputed reference area; 189 localities |
| Libya | 2018 | 22 district reference areas |
| Tunisia | 2022 | 24 governorates; 264 delegations |
| Algeria | 2026 | 58 provinces (transition reference); 1541 communes |
| Mauritania | 2024 | 15 regions; 63 departments |
| Senegal | 2024 | 14 regions; 46 departments |
| The Gambia | 2022 | 8 local government areas; 49 districts |
| Guinea-Bissau | 2021 | 9 regions & bissau; 39 sectors |
| Guinea | 2016 | 8 regions; 34 prefectures & conakry |
| Sierra Leone | 2023 | 5 regions; 16 districts |
| Liberia | 2019 | 15 counties; 136 districts |
| Ivory Coast | 2018 | 33 regions & autonomous districts; 108 departments |
| Ghana | 2021 | 16 regions; 260 district reference areas |
| Togo | 2021 | 5 regions; 40 prefectures |
| Benin | 2019 | 12 departments; 77 communes |
| Cameroon | 2019 | 10 regions; 58 departments |
| Equatorial Guinea | 2026 | 8 provinces; 32 district reference areas |
| Gabon | 2026 | 9 provinces; 48 departments |
| Cabo Verde | 2024 | 22 municipalities; 32 parishes |
| São Tomé and Príncipe | 2026 | 7 districts & príncipe |
| Comoros | 2019 | 3 islands; 17 prefectures |
| Mauritius | 2017 | 12 districts & outer islands |
| Seychelles | 2018 | 26 district reference areas & outer islands |
| Fiji | 2026 | 5 divisions |
| Samoa | 2018 | 11 political districts |
| Tonga | 2017 | 5 divisions |
| Tuvalu | 2017 | 8 island councils |
| Kiribati | 2017 | 3 island groups |
| Nauru | 2005 | 14 districts |
| Palau | 2017 | 17 states |
| Marshall Islands | 2017 | 25 municipality reference areas |
| Federated States of Micronesia | 2019 | 4 states |

Egypt and Sudan follow the displayed Egyptian reference around Lake Nasser and the eastern border; the neutral Natural Earth Bir Tawil reference is retained with its northern edge aligned to the same land boundary. This resolves source seams without an artificial narrow Sudanese strip above that reference. These dated boundaries do not indicate current administrative control.


## Local verification

All 35 source/hierarchy/land-label datasets passed. The frontier audit passed 272,525 probes at ten metres on both sides of border segments, including samples near internal vertices. Coverage checks found no omitted large stretches across 56 reference country pairs.

The 43 browser scenarios passed across the main suite and focused reruns: all new routes, subdivision searches and quizzes; four phone layouts; and close-zoom island rendering/clicks east of the date line for Fiji, Kiribati, Samoa and Tonga. Existing app, account-sync, cache, compact-copy, trophy and scoped-country tests passed. The earlier six-country source/hierarchy and border checks also passed. The running local preview serves the new registry. Nothing was committed or published.
