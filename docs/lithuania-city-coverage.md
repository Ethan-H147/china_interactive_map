# Lithuania city coverage

Lithuania retains 10 counties, 60 municipalities and 533 official elderships.
Municipalities are not reconstructed solely from elderships: some cities are
administered outside them. The detailed view adds Birštonas, Druskininkai,
Kupiškis and Molėtai as cities within their actual municipality, plus the part
of Šiauliai City Municipality outside Medelyno and Rėkyvos elderships as a city
area. No municipality or eldership is created. The Šiauliai remainder is excluded
from quiz pools because it is a display area rather than an administrative unit.

`scripts/lithuania-city-coverage.mjs` derives these five areas from retained
SSVA/Centre of Registers municipal geometry minus their own official elderships.
The Baltic builder applies this after frontier alignment. Existing municipality
and county population and reported area remain unchanged. Lake masks still apply.
Cards use the existing city type and municipality breadcrumb without an explanatory description. The retained population table supplies city counts for Birštonas (12016), Druskininkai (13783), Kupiškis (18758) and Molėtai (21316). No whole-city count is assigned to the partial Šiauliai area.

County-centre dots and their setting are disabled for Estonia and Lithuania.
Polygon selection, labels, municipal cards and statistics remain available.

For an existing dataset, run `node scripts/repair-lithuania-city-coverage.mjs`.
It preserves originals under `artifacts/lithuania-city-coverage/before/`, updates
affected parent fills, child chunks, catalogue, background and compact copies.
Verify with `node scripts/validate-lithuania-city-coverage.mjs`,
`node scripts/validate-baltics.mjs` and
`node scripts/browser/run.mjs lithuania-city-coverage`.

Shared topology is cleaned before dissolving parents. Enclosed rounding seams up to 10 m² are repaired without changing the larger holes. The Jurbarkas river omission uses the retained official municipal footprint and its existing eldership divider. `node scripts/repair-lithuania-topology.mjs` applies this to an existing dataset, preserving originals under `artifacts/lithuania-city-coverage/before-topology/`. Existing city population values and cards remain unchanged.
