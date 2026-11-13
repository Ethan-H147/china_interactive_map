# Unused asset cleanup

Deleted 63 unused files (17.71 MiB). The next generated hosted package has 7 fewer assets and 14.22 MiB less data. The other 56 obsolete chunks were already excluded from hosting.

No active map data, pronunciation, reward or flag was removed. All 9513 current catalogue file references and 1576 pronunciation files remain present.

Deleted groups: Algeria: 48 superseded chunks; Equatorial Guinea: 7 superseded chunks; Canada: old CA-QC chunk replaced by current CA-QB; Brazil: former model and preview; United States: two former Liberty models and previews; Bruges: former SVG replaced by PNG.

Kept: original trophy pairs used by integrity checks; source/rebuild data; all active media and developer-only collectibles.

Optional tradeoff, not applied: remove the 20 full-resolution landmark photos (40.88 MiB) and make the photo viewer use existing 1200-pixel display copies. Sidebar photos stay identical, but zoomed/full-screen photos lose detail. Raw rebuild inputs are often already excluded from hosting; removing them mainly saves checkout space and makes rebuilding harder.

Validation: catalogue and pronunciation references, trophy integrity and Cloudflare asset packaging pass. Broader world-completion validation reports an existing missing population-density metric for Israel records IL-JM and ISR-2-584046B86518607604876. Neither statistics nor colour-data files changed in this cleanup.

## Deleted files

- `dist/data/europe/equatorial-guinea/second/GQ198.bin` — 2927 bytes
- `dist/data/europe/equatorial-guinea/second/GQ199.bin` — 11089 bytes
- `dist/data/europe/equatorial-guinea/second/GQ200.bin` — 12744 bytes
- `dist/data/europe/equatorial-guinea/second/GQ201.bin` — 27218 bytes
- `dist/data/europe/equatorial-guinea/second/GQ202.bin` — 5222 bytes
- `dist/data/europe/equatorial-guinea/second/GQ203.bin` — 40027 bytes
- `dist/data/europe/equatorial-guinea/second/GQ204.bin` — 16591 bytes
- `dist/data/europe/algeria/second/DZ001.bin` — 12963 bytes
- `dist/data/europe/algeria/second/DZ002.bin` — 52903 bytes
- `dist/data/europe/algeria/second/DZ003.bin` — 34314 bytes
- `dist/data/europe/algeria/second/DZ004.bin` — 31525 bytes
- `dist/data/europe/algeria/second/DZ005.bin` — 14259 bytes
- `dist/data/europe/algeria/second/DZ006.bin` — 76430 bytes
- `dist/data/europe/algeria/second/DZ007.bin` — 28450 bytes
- `dist/data/europe/algeria/second/DZ008.bin` — 43629 bytes
- `dist/data/europe/algeria/second/DZ009.bin` — 33535 bytes
- `dist/data/europe/algeria/second/DZ010.bin` — 23456 bytes
- `dist/data/europe/algeria/second/DZ011.bin` — 32014 bytes
- `dist/data/europe/algeria/second/DZ012.bin` — 47039 bytes
- `dist/data/europe/algeria/second/DZ013.bin` — 24689 bytes
- `dist/data/europe/algeria/second/DZ014.bin` — 51331 bytes
- `dist/data/europe/algeria/second/DZ015.bin` — 11117 bytes
- `dist/data/europe/algeria/second/DZ016.bin` — 29007 bytes
- `dist/data/europe/algeria/second/DZ017.bin` — 25890 bytes
- `dist/data/europe/algeria/second/DZ018.bin` — 6770 bytes
- `dist/data/europe/algeria/second/DZ019.bin` — 23922 bytes
- `dist/data/europe/algeria/second/DZ020.bin` — 7489 bytes
- `dist/data/europe/algeria/second/DZ021.bin` — 29646 bytes
- `dist/data/europe/algeria/second/DZ022.bin` — 12799 bytes
- `dist/data/europe/algeria/second/DZ023.bin` — 27007 bytes
- `dist/data/europe/algeria/second/DZ024.bin` — 31802 bytes
- `dist/data/europe/algeria/second/DZ025.bin` — 22872 bytes
- `dist/data/europe/algeria/second/DZ026.bin` — 42526 bytes
- `dist/data/europe/algeria/second/DZ027.bin` — 84503 bytes
- `dist/data/europe/algeria/second/DZ028.bin` — 25712 bytes
- `dist/data/europe/algeria/second/DZ029.bin` — 29705 bytes
- `dist/data/europe/algeria/second/DZ030.bin` — 49646 bytes
- `dist/data/europe/algeria/second/DZ031.bin` — 11051 bytes
- `dist/data/europe/algeria/second/DZ032.bin` — 29305 bytes
- `dist/data/europe/algeria/second/DZ033.bin` — 7111 bytes
- `dist/data/europe/algeria/second/DZ034.bin` — 28349 bytes
- `dist/data/europe/algeria/second/DZ035.bin` — 47599 bytes
- `dist/data/europe/algeria/second/DZ036.bin` — 19857 bytes
- `dist/data/europe/algeria/second/DZ037.bin` — 56765 bytes
- `dist/data/europe/algeria/second/DZ038.bin` — 49601 bytes
- `dist/data/europe/algeria/second/DZ039.bin` — 50944 bytes
- `dist/data/europe/algeria/second/DZ040.bin` — 26213 bytes
- `dist/data/europe/algeria/second/DZ041.bin` — 42069 bytes
- `dist/data/europe/algeria/second/DZ042.bin` — 38700 bytes
- `dist/data/europe/algeria/second/DZ043.bin` — 55297 bytes
- `dist/data/europe/algeria/second/DZ044.bin` — 6782 bytes
- `dist/data/europe/algeria/second/DZ045.bin` — 38089 bytes
- `dist/data/europe/algeria/second/DZ046.bin` — 22416 bytes
- `dist/data/europe/algeria/second/DZ047.bin` — 57226 bytes
- `dist/data/europe/algeria/second/DZ048.bin` — 65179 bytes
- `dist/data/europe/canada/second/CA-QC.bin` — 1919650 bytes
- `dist/data/trophies/brazil.glb` — 3937060 bytes
- `dist/data/trophies/brazil.webp` — 13364 bytes
- `dist/data/trophies/us-statue-of-liberty.glb` — 4213328 bytes
- `dist/data/trophies/us-statue-of-liberty.webp` — 17156 bytes
- `dist/data/trophies/us-statue-of-liberty-v2.glb` — 6671116 bytes
- `dist/data/trophies/us-statue-of-liberty-v2.webp` — 18534 bytes
- `dist/vendor/europe-expansion-flags/BE_31005.svg` — 43293 bytes
