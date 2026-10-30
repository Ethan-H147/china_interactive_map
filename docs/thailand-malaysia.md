# Thailand–Malaysia border

The DDPM and DOSM layers previously used different exterior curves. Partial proximity-based alignment left gaps and a straight border spur near Kedah. The repair uses all 9,250 vertices of the shared non-maritime ways of OSM country relations 2067731 (Thailand) and 2108121 (Malaysia), including the exact coastal endpoints. Original source bytes, relation versions, checksums and ODbL attribution are retained in `scripts/boundary-sources/thailand-malaysia/`.

The corrected local shapes dissolve into their existing districts and provinces/states. Changes cover 33 Thai subdistricts and ten Malaysian districts plus unpartitioned Perlis. Untouched siblings retain their original geometry. Names, administrative codes, local-coverage notes, census figures, Malaysian economic figures and reported areas remain unchanged; mapped Thai areas follow the corrected land. Context and world fallback geometry retain the same border bends. One owned land-border stroke replaces the older spur-bearing path; coasts remain unoutlined. Malaysia’s normal edge-run and river-channel metadata are rebuilt with the same shared-border override, so its own outline layer stays complete.

`npm run build:thailand-malaysia` checks the staged proposal before applying it. Running `scripts/repair-thailand-malaysia.mjs` without `--apply` checks without writing map data. Malaysian and mainland Southeast Asian rebuilds apply the correction last. Global border rebuilds preserve the shared stroke.

`npm run test:thailand-malaysia` checks first-level, local, context and world edges, both coastal endpoints, opposite-side coverage, needle removal, parent/child coverage, labels, preserved statistics and untouched geometry, and desktop/mobile rendering from both countries.
