# US presidential elections

Elections is a United States map view in the dropdown beside Area codes and ZIP codes. It covers all 60 presidential elections, from 1788–89 to 2024. A timeline on the map selects the year; the arrows, Home, End and arrow keys also step through it.

## What is shown

- States are shaded by the candidate who received most of their electors. Shade strength follows the winner's popular-vote margin: under 5, 5–10, 10–20 and over 20 points. States without a recorded popular vote use a single middle shade.
- States that existed but did not vote, such as the Confederacy in 1864, are grey. States not yet admitted, and territories, are pale.
- Map labels add each state's electoral votes.
- Map settings shows the national result: candidates, parties, running mates, electoral votes, states carried, popular vote, election dates, electors needed, turnout and context notes.
- Selecting a state shows its winner, electoral votes, margin, total votes, every candidate's vote share and electors, district results where electors were split, and notes such as faithless electors.

## Borders

A switch on the dock chooses **Current borders** (the default: present-day states for every year) or **Historic borders**, the state and territory boundaries in force on each election day. The choice is remembered. The current-borders map is unchanged by the switch.

With historic borders:

- Each state is drawn as it was. In 1789 Massachusetts includes Maine, Virginia includes Kentucky and West Virginia, North Carolina includes Tennessee and Georgia reaches the Mississippi. Texas in 1848 includes its claim up the Rio Grande and north to the 42nd parallel, across present-day New Mexico and Colorado.
- Clicking a place opens the state that held it on election day: Maine in 1789 opens Massachusetts, with Massachusetts's result and outline. Stepping to another year keeps the clicked place, so the selection moves to Maine in 1820.
- Territories, unorganized territory and the District of Columbia are pale sand and say they had no electoral votes. Areas claimed by two jurisdictions at once are a darker sand, labelled Disputed: the Connecticut Western Reserve, the Toledo Strip, the Honey War strip, Miller County, Greer County, the 1820 Alabama–Mississippi line and the Michigan–Wisconsin boundary, settled in 1926 and 1936. Oregon Country (claimed with Britain) and the unsettled northern boundary before 1818 are shown the same way.
- Land of the present-day country not yet acquired is shown as part of the country that held it, coloured like the neighbouring countries' land and labelled: Spanish Louisiana (French Louisiana from the Treaty of San Ildefonso, 1 October 1800, to the purchase in 1803), Spanish East and West Florida, New Spain and, from Mexican independence on 28 September 1821, Mexico, Rupert's Land (Britain), Oregon Country before the United States claimed it, Russian America, and the Hawaiian Islands, Kingdom, provisional government and Republic of Hawaii. The Republic of Texas and the Vermont Republic are drawn the same way. Clicking such land shows its holder and when it passed to the United States.
- Frontiers between countries are drawn heavier than state lines. Today's border with Mexico or Canada is drawn only where the two sides had different holders, so California before 1848 runs into Mexico without a line.
- Missouri (1820) and Michigan (1836) voted before their admission. They are drawn with the boundary they were admitted with, cut out of the territory that held the rest.
- Map labels name the historic units and their electoral votes.
- The source ends on 31 December 2000; later elections use its final configuration, the present-day states.

[docs/us-election-borders.md](us-election-borders.md) lists, election by election, the territories and other areas shown and which present-day states lay inside another unit.

## Shared election module

The view runs on the shared election module, dist/elections.mjs and dist/elections.css, which Korea also uses (docs/korea-elections.md). The module draws the dock, timeline, legend, fills and result cards from a country config and that country's data. The US config is dist/us-elections.mjs: party and candidate colours, and the notes for states without a result. dist/regional-country.mjs attaches it to countries whose entry in dist/countries.js has elections set. The tally follows the data. An election with electors shows electoral votes and the number needed to win. An election without electors shows vote shares and turnout. A dataset can also carry units that voted on their own but are not on the present-day map (Korea's Gwangju); the module draws them above the first-level fill while the view is open and picks them on click, and the host selects the present-day unit that contains them. A config with `historic` (the US) adds the borders switch. The historic borders are drawn by dist/historic-borders.mjs, which the US historical snapshot (docs/us-history.md) shares.

## Sources

Results are read from the Results tables of each Wikipedia election article (CC BY-SA 4.0). Every article is pinned to its revision and SHA-256 in scripts/us-election-sources.json, and the rendered HTML is retained in scripts/boundary-sources/united-states/elections/. Build output and the source list are in dist/data/europe/united-states/elections/.

Historic borders come from the Newberry Library's [Atlas of Historical County Boundaries](https://publications.newberry.org/ahcb/), U.S. Historical States and Territories, 3 September 1783 – 31 December 2000, full-resolution shapefile, released under CC0 1.0. The archive is pinned by SHA-256 in scripts/boundary-sources/united-states/historic-states/manifest.json. It is over GitHub's file limit and ignored by Git; the Newberry server refuses scripted downloads, so restore it from the download page in a browser. scripts/build-us-historic-borders.mjs builds dist/data/europe/united-states/history/borders.bin, shared with the historical snapshot; docs/us-history.md describes the method. Each election takes the polygons in force on its last voting day.

Faithless and substitute electors, and votes Congress did not count, are corrected in scripts/build-us-elections.mjs so that state electors add up to each national tally. Before 1804 each elector cast two votes.

## Build and check locally

- npm run build:us-elections — verify the pinned articles and rebuild presidential.bin.
- npm run build:us-historic-borders — rebuild history/borders.bin from the retained Newberry archive.
- npm run test:us-elections — data reconciliation, the historic borders checks and the browser scenarios.
- node scripts/validate-us-historic-borders.mjs --report — check the historic borders and rewrite docs/us-election-borders.md.
- node scripts/fetch-us-elections.mjs --refresh — repin to the current article revisions.
