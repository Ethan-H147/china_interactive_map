# Italy football source snapshot

The 2026–27 dataset has 20 Serie A clubs, 20 Serie B clubs, and all 60 Serie C clubs (20 in each of Groups A, B and C). The cumulative quiz levels contain 20, 40 and 100 clubs. Reserve teams remain included.

## Sources and reconstruction

- The retained Lega Serie A September 2026 fixture PDF covers the 20 current Serie A clubs. The FIGC licensing page is supplementary venue evidence, not a season roster.
- Lega B's current club directory verifies the Serie B roster. Lega Pro's current standings verify all 60 Serie C clubs; the three group URL snapshots resolve to the same current league page. The three current Wikipedia season pages supply table structure, group membership, short names and stadium associations.
- Club and named stadium article HTML are retained, along with a batch Wikidata stadium coordinate query. Where article points were missing or too coarse, the retained Europlan Italy ground catalogue supplies the coordinates of the specifically named ground. Guidonia and Ostiamare use retained Wikidata points. No city-center geocoding or marker jitter is used.
- Each club's authentic crest comes from its retained club infobox image URL. Original image bytes remain in `original-crests/`; `crests/` contains proportion-preserving PNG derivatives, capped at 256 pixels. Club trademarks and crest copyright remain with their respective owners.
- `manifest.json` stores source URLs, byte counts and SHA256 hashes of uncompressed source bytes. For PNG derivatives, hashes cover the PNG bytes directly. Gzip files are historical source snapshots rather than runtime assets.

Run from the repository root:

```sh
node scripts/football-sources/italy/validate.mjs
```

The validator checks all 100 clubs, all three Serie C groups, official B/C roster membership, source hashes, full PNG decoding, geographic bounds, and exact shared-ground coordinates. `parse.mjs`, `crests.mjs` and `finalize.mjs` rebuild the normalized dataset from the retained snapshot in that order. Cached sources are reused; deleting a snapshot deliberately refreshes it and requires reviewing the manifest pin.

## Venue review

- Milan/Inter share San Siro; Roma/Lazio share Olimpico; Genoa/Sampdoria share Luigi Ferraris; Sassuolo/Reggiana share Mapei Stadium.
- Alcione/Inter U23 share Ernesto Breda in Sesto San Giovanni. Desenzano/Ospitaletto share Gino Corioni in Ospitaletto. Folgore Caratese/Renate share XXV Aprile (Sportitalia Arena) in Carate Brianza. Shared pitches have exactly identical coordinates.
- AlbinoLeffe uses its new main stadium at the Zanica campus, not the older municipal ground. Atalanta U23 uses the current Comunale in Caravaggio. Both points replace coarse article coordinates.
- Ostiamare's official club page confirms the 2026–27 move to Pasquale Giannattasio/Stella Polare. Vado plays at Giuseppe Sivori in Sestri Levante during the Chittolina closure. Desenzano's opponent Lecco confirms current home matches at Corioni. The retained Atalanta match report confirms Caravaggio.
- Juventus Next Gen uses Moccagatta in Alessandria, not its old Biella venue. Sorrento's current season table lists Stadio Italia rather than its former temporary Potenza ground. Pianese uses Comunale di Piancastagnaio.
- Precise named-ground points also replace coarse coordinates for Dolomiti Bellunesi, Renate, Sambenedettese and Vado. All stadium locations were compared with the retained national ground catalogue; no detached club office or town-center substitute is accepted.

Snapshot reviewed 29 October 2026. Promotions, relocations and sponsor names may change after this date; they should be updated as one reviewed season snapshot.