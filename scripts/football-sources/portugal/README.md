# Portugal football quiz source bundle

Snapshot: 29 October 2026; season 2026–27. Tier membership is 18 Primeira Liga, 18 Liga Portugal 2, and all 20 Liga 3 clubs (both ten-club series). Cumulative quiz sizes: **18 / 36 / 56**.

`clubs.json` is the reviewed integration input. Crests are genuine club badges, stored as bounded PNGs in `crests/`; the original image bytes remain in `original-crests/*.gz`. Club trademarks remain their owners’ property. Wikimedia/official club pages supply badges; no generated substitutes.

## Sources

- First tier: Benfica’s [official 2026–27 league calendar](https://www.slbenfica.pt/pt-pt/agora/noticias/2026/07/02/futebol-benfica-calendario-liga-betclic-2026-27) lists all 17 opponents; cross-checked against ESPN and the season roster table.
- Second tier: Liga Portugal’s [official opening fixture announcement](https://www.ligaportugal.pt/news/28237/schedules-for-the-first-two-rounds-of-liga-meu-super), current official Liga site, and the season roster table.
- Third tier: [FPF official results, season 106 (2026–2027)](https://resultados.fpf.pt/Competition/Details?competitionId=23775&seasonId=106). Both groups are included, including reserve teams.
- Stadium coordinates come from retained Wikipedia coordinate API responses, Wikidata stadium entities, actual named OpenStreetMap venue/pitch geometry, and municipal/parish venue maps. Every club has its coordinate and image source URL.
- `manifest.json` records URL, byte length and SHA-256 of every retained source (hashes cover decompressed bytes) and derived PNG. Compressed raw pages/API results remain alongside it for offline auditing. Failed network requests are not retained as evidence.

## Reviewed ground details

Casa Pia is placed at its home ground in **Rio Maior**, rather than Lisbon. Porto B is in **Olival**, Sporting B in **Alcochete**, and Vitória SC B on **Campo 5** of the Guimarães academy, rather than their first teams’ stadiums. The two Madeira clubs and Santa Clara in the Azores retain their real positions. Louletano plays at Estádio Algarve near São João da Venda. Mafra uses the municipal map’s stadium location, not the adjacent southern training pitch. Caldas uses the Caldas da Rainha Campo da Mata, avoiding a similarly named ground elsewhere. No grounds are deliberately displaced or jittered; this roster has no exact shared venues.

## Rebuild and validation

Run from the checkout root:

```
node scripts/football-sources/portugal/build.mjs
node scripts/football-sources/portugal/validate.mjs
```

The build merges reviewed seed names/venues in `preliminary.json` with pinned coordinate records and explicit reviewed venue corrections. It performs no network requests. `fetch.mjs` retains new source bytes with hashes, refusing a changed pin; `crests.mjs` rebuilds the bounded PNGs from retained original images. `contact.mjs` creates the ignored crest review sheet at `artifacts/football-portugal/crests-contact.png`.

Validation checks every retained hash, roster counts and cumulative levels, unique stable IDs, all 56 local PNG assets, geographic ranges including islands, HTTPS source fields, and the reviewed relocated/reserve grounds. The contact sheet was visually inspected for all 56 badges.