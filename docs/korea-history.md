# Korea historical snapshot

**Historical snapshot** beside the Korea header switches the map to one of two periods: the Samhan period (c. 100 CE) and Joseon (1890). **Present day** returns. It runs on the shared historic view and engine (`dist/historic-view.mjs`, `dist/historic-borders.mjs`), configured by `dist/korea-history.mjs` and attached in `dist/korea.js`, like the Elections view.

Every historical unit is a set of whole present-day districts, so both periods use the present-day coast and islands. A click selects the historical unit, which gets its own card; Joseon provinces show Joseon's 1883 national flag (Wikimedia Commons, CC0), and the Samhan polities, which had none, show no flag.

## Samhan, c. 100 CE

Eight polities: Mahan, Jinhan and Byeonhan (confederacies), Goguryeo (kingdom), Okjeo, Dongye and Juho (chiefdoms), and the Han commandery of Lelang. Each district takes the polity covering most of it in [Cliopatria](https://github.com/Seshat-Global-History-Databank/cliopatria) (Seshat Global History Databank, CC BY 4.0). Islands outside every Cliopatria polygon take the nearest district's polity. Jeju is Juho, from the *Sanguozhi*. Ulleung has no recorded polity and is left gray. Goguryeo and Lelang also extended into present-day China, which this map does not show.

## Joseon, 1890

The eight provinces, with each present-day district assigned to its Joseon province (`scripts/boundary-sources/korea-history/joseon-1890.json`). Most follow their present-day province. Exceptions include Kaesong (Gyeonggi), Wonsan, Munchon and Anbyon (Hamgyeong), Chunghwa and Sangwon (Pyeongan), Uljin and Ulleung (Gangwon), Geumsan (Jeolla) and the northern Ongjin islands (Hwanghae). Most come from the 1946 and 1952 North Korean reorganizations. Hanseong is part of Gyeonggi.

## Check locally

- `npm run build:korea-history` rebuilds `dist/data/korea/history/borders.bin` from the retained sources; nothing is downloaded.
- `npm run test:korea-history` runs the data check (`scripts/validate-korea-history.mjs`: full land coverage and spot checks for both periods) and the browser scenarios in `scripts/browser/korea-history.test.mjs`.
