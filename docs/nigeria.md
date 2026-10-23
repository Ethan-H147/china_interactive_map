# Nigeria

The Nigeria page covers all 36 states and the Federal Capital Territory, with 768 local government areas and the FCT's six area councils. Local boundaries load for the selected state. Search includes state names, LGA names, P-codes and Abuja/FCT aliases. The shared renderer provides state quizzes, selected outlines, saved views, mobile navigation and the original national flag preview.

Boundaries are OCHA Nigeria's COD-AB version 01, from the Office of the Surveyor General of the Federation, eHealth and UNCS: [source dataset](https://data.humdata.org/dataset/cod-ab-nga). The source is valid from 17 April 2019 and was reviewed on 30 October 2025; retrieval was 22 October 2026. The retained download and metadata are checksum pinned under `scripts/boundary-sources/nigeria/`, licensed CC BY 3.0 IGO. Rebuild with `npm run build:nigeria`.

States are dissolved from the same LGA geometry so their outlines agree exactly. Shared internal edges are stored once. Inland lakes are excluded without drawing shorelines. International strokes follow Nigeria's mapped outline and neighboring background land is reconciled by the existing world topology builder.

Area cards describe mapped land area, not an official statistical land-area figure. No population or economic numbers are inferred. The source's 714 wards provide only partial coverage and are excluded from the public hierarchy. National flag artwork is retained from Wikimedia Commons in its original 1:2 proportions and public-domain form.

`npm run test:nigeria` checks coverage counts, FCT classifications, parent unions, areas, search, sources, borders and globe integration. Browser scenarios cover desktop and mobile search, local selection, saved links, flag preview and a real quiz answer.
