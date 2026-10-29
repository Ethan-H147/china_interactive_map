# French football sources

Season: **2026–27**, checked 29 October 2026. Three tiers contain 18 clubs each: Ligue 1, Ligue 2, Ligue 3. Ligue 3 is the new professional name for the former Championnat National. Ligue 1 and Ligue 2 rosters are verified against LFP publications; the FFF calendar lists all Ligue 3 entrants.

`clubs.json` is the normalized handoff. Clubs have actual stadium dots, common display names, full-name aliases, stadium locality, authentic local crest filename and individual source URLs. `manifest.json` retains SHA-256 hashes of all downloaded source bytes. HTML/PDF/JSON snapshots are gzip-compressed; crest assets are original low-resolution PNGs or SVG.

Crests are club marks used for identification; this dataset makes no blanket free-license claim. Source articles retain their original Wikimedia file URLs. FC Annecy uses its official club SVG because the English Wikipedia crest URL served a Nancy badge during visual verification. A contact sheet of all other marks was visually reviewed.

Reviewed exceptions:

- Quevilly-Rouen Métropole and FC Rouen share Stade Robert Diochon; their exact stadium coordinates intentionally match.
- FC Versailles plays at Stade Georges-Lefèvre in Saint-Germain-en-Laye. The outdated English league table's Montbauron entry is superseded by the club's current ticketing page and municipal evidence.
- US Thionville Lusitanos plays at Stade de Guentrange, supported by its municipality's May 2026 publication and current French article. The English league table's Stade de la Plaine entry is outdated.
- Paris 13 Atletico plays at Charléty, confirmed by the Paris FFF district's October 2026 invitation.
- Data ES from the French Ministry of Sports provides retained, named football-pitch coordinates for Aubagne, Fleury, Le Puy, Concarneau and Thionville. Stadium-article coordinates cover the other venues. Bastia's stadium is physically in Furiani; Lille's is in Villeneuve-d'Ascq; Lyon's is in Décines-Charpieu.

Run `node scripts/football-sources/france/prepare.mjs` from the repo root to recreate normalized files from the retained snapshots, fetching missing files only. It refuses changed bytes for existing hash pins. Run `node scripts/football-sources/france/validate.mjs` to verify source hashes, counts, real image assets and the reviewed edge cases. Refreshing the season requires a new explicitly reviewed roster and source update.