# Regional flag coverage

The shared details panel and flag viewer use the reviewed entries in
`scripts/boundary-sources/regional-flags/reviewed.json`. Run
`npm run fetch:regional-flags` to retain source artwork and rebuild lossless thumbnails.
The generated source manifest records adoption evidence, credits, licenses and
checksums. Existing SVG/PNG originals are retained unchanged. Other artwork uses
Commons’ dedicated image service: 1280px renditions, or 500px for smaller raster
sources. Original-source URLs and checksums remain recorded separately. `npm run test:regional-flag-expansion` checks identities, source bytes,
proportions, details and original-image viewing on desktop and phone.

Coverage:

- Palau: all 16 state flags. Offshore reference geometry has no assigned flag.
- Micronesia: all four state flags; historical variants are excluded.
- Papua New Guinea: 22 provincial-level flags, including Bougainville and NCD.
- Solomon Islands: nine provinces and Honiara.
- Romania: Ilfov County, Satu Mare municipality and Brașov municipality. The first
  two use government-approved designs; Brașov follows Council Decision 410/2001
  with the government-approved 2024 coat of arms.
- Bulgaria: Sofia, Burgas, Plovdiv, Veliko Tarnovo, Dobrich, Sliven, Pleven,
  Gabrovo, Stara Zagora, Shumen, Yambol and Pernik. These are municipal flags,
  documented in Stoyan Antonov's ICV27 adoption survey. Sofia's city flag also
  covers the coterminous capital province, but never Sofia Province.

Romanian gallery membership alone is insufficient evidence of official adoption.
Unverified designs and proposals are omitted. City flags must not be assigned to
same-named counties. In particular, Constanța city artwork is not a county flag,
and Maramureș artwork is not a Mureș flag. Additional flags can be added when both
an adoption record and matching licensed artwork have been verified.

Liberia's separate source manifest covers all 15 counties. Its flags also use the
shared renderer and viewer.

Small SVG viewBoxes need a rasterization canvas before thumbnail resizing. The
central-European flag builder handles these with `flagThumbnail`; Lower Austria's
source SVG remains unchanged while its thumbnail is large enough to render at
the same size as the national flag.
