# Korean elections

Elections is a Korea map view in the map-view dropdown. It covers South Korea's direct presidential elections and North Korea's officially reported election returns. A switch on the map dock chooses South Korea or North Korea. Each side has its own timeline, results and fills, and keeps its own selected year. Switching also sets the map scope to that country. Choosing a province of the other country switches the electorate too.

The view uses the shared election module, `dist/elections.mjs` and `dist/elections.css`, which also runs the US view (see `docs/us-elections.md`). Korea's settings are in `dist/korea-elections.mjs`. The view is attached to the Korea adapter in `dist/korea.js`: the adapter shows the map-view dropdown, sends selections to the module and keeps the selection level at provinces while the view is open.

## South Korea

The nine direct presidential elections since the 1987 constitution are included: 1987, 1992, 1997, 2002, 2007, 2012, 2017, 2022 and 2025. Each is a single nationwide round, decided by plurality with no electoral college. The dock shows each candidate's share of valid votes and national turnout.

- Provinces and metropolitan cities are shaded by the candidate with most votes. Shade strength follows the winner's margin over the runner-up: under 5, 5–10, 10–20 and over 20 points.
- Map settings shows the national result: candidates, parties, provinces won, votes and shares, registered voters and turnout.
- Selecting a province shows its winner, margin, valid votes, turnout and every candidate's share. Selecting a district shows its province.

### Boundary changes

Present-day shapes are drawn for every year.

- Gwangju and South Jeolla voted separately in every election here, so they are shaded separately. The July 2026 boundaries draw them as the merged Jeonnam–Gwangju; Gwangju (KR-29, its code before the merger) is filled and outlined from its five districts, and only in the Elections view. Clicking Gwangju opens Gwangju's own card and outline; clicking the rest of Jeonnam–Gwangju opens South Jeolla's. Both select Jeonnam–Gwangju in the sidebar.
- Daejeon was part of South Chungcheong until 1989, and Ulsan was part of South Gyeongsang until 1997. In earlier elections, these cities show the result of the province they voted in, and their cards say so.
- Sejong was formed in 2012, mostly from South Chungcheong and partly from North Chungcheong. Before 2012 it shows South Chungcheong's result.
- Gangwon and Jeonbuk became special self-governing provinces in 2023 and 2024. Only their names changed.

### Party colours

The People Power Party is red and the Democratic Party of Korea is blue, the colours Korean broadcasters and newspapers use for them. Their predecessors keep the same colours, so that the timeline reads consistently. This applies to the Democratic Justice, Democratic Liberal, Grand National, Saenuri and Liberty Korea parties, and to the Peace Democratic, Democratic (1992), National Congress for New Politics, Millennium Democratic, United New Democratic and Democratic United parties. Until 2012 the conservative party itself used blue. The People's Party is green, the Bareun Party is cyan, the Justice Party and the 2025 Democratic Labor Party are yellow, and the Reform Party is orange. Other candidates take the shared default palette. Party names without a standard English form are kept in Korean.

### Source

Results come from the National Election Commission's Election Statistics System, [info.nec.go.kr](http://info.nec.go.kr), under 투·개표 › 개표현황 › 대통령선거, by province (시도별). Each election links to its NEC table. The province rows were retrieved on 4 November 2026 and are retained in `scripts/boundary-sources/korea/elections/nec-presidential.json`. They give registered voters, ballots, each candidate's votes, valid and invalid votes and abstentions. National shares are truncated to two decimals, as the NEC publishes them. The same results are available as open data through the NEC API on [data.go.kr](https://www.data.go.kr).

## North Korea

North Korea has no popular presidential vote. The view shows its Supreme People's Assembly elections of 2009, 2014 and 2019, and the local people's assembly elections of 26 November 2023. These are official reported results under a single-list system. Each constituency has one approved candidate, nominated by the Democratic Front for the Reunification of Korea (DFRK). In 2023 some local constituencies had two. Voters approve the candidate or vote against.

| Election | Turnout | For | Against | Source |
|---|---|---|---|---|
| 2009 Supreme People's Assembly | 99.98% | 100% | – | [KCNA, 9 March 2009](https://www.globalsecurity.org/wmd/library/news/dprk/2009/dprk-090309-kcna02.htm) |
| 2014 Supreme People's Assembly | 99.97% | 100% | – | [KCNA, 11 March 2014](https://www.globalsecurity.org/wmd/library/news/dprk/2014/dprk-140311-kcna03.htm) |
| 2019 Supreme People's Assembly | 99.99% | 100% | – | [KCNA via Al Jazeera](https://www.aljazeera.com/news/2019/3/12/north-korea-election-turnout-99-99-percent-state-media) |
| 2023 local, provincial assemblies | 99.63% | 99.91% | 0.09% | [KCNA via Yonhap](https://en.yna.co.kr/view/AEN20231128001551315) |

In 2023, city and county assemblies were reported at 99.87% for and 0.13% against. These were the first votes against reported in decades. The map uses the provincial figures.

No per-province figures are published for these elections. Every province therefore shows the national figure, and its card says so. The legend shows a single swatch with no margin scale. The figures and links are retained in `scripts/boundary-sources/korea/elections/north-korea-official.json`.

## Build and check locally

- `npm run build:korea-elections` rebuilds `dist/data/korea/elections/south.bin`, `north.bin` and `sources.json` from the retained sources.
- `npm run test:korea-elections` checks that province counts add up to the NEC national totals and that every map unit has a result. It then runs the browser scenarios in `scripts/browser/korea-elections.test.mjs`.

To add a South Korean election, add its NEC province table to `nec-presidential.json` in the same row format. Add any new candidate to `NAMES` and any new party to `PARTIES` in `scripts/build-korea-elections.mjs`, then rebuild.
