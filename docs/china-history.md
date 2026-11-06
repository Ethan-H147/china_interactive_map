# China historical snapshots

**Historical snapshot** beside the China header switches the map to one of seven periods, from the Han to the Republic of China. **Present day** returns. The timeline ends with the **1949** Republic of China snapshot on the same map. It runs on the shared historic view and engine (`dist/historic-view.mjs`, `dist/historic-borders.mjs`), configured and attached by `dist/china-history.mjs`, which `dist/app.js` loads when the button is first pressed. The interaction is Korea's (`docs/korea-history.md`): a click selects the historical unit, which gets its own card; search opens the unit at the place found.

| Period | Year | Mapped units |
| --- | --- | --- |
| Han | 2 CE | Han, Xiongnu, Goguryeo |
| Three Kingdoms | 250 CE | Wei, Shu, Wu, Goguryeo |
| Tang | 742 | Tang, Tibetan Empire, Türgesh, Balhae, Nanzhao |
| Song | 1100 | Northern Song, Liao, Western Xia, Dali, Qocho, Kara-Khanid Khanate, Tibetan states, Kamarupa, Kashmir, Pagan |
| Ming | 1430 | Ming, Tibet, Chagatai Khanate, Northern Yuan, Oirats |
| Qing | 1820 | 18 provinces, frontier regions, disputed Nerchinsk treaty frontier, Sakhalin claim, Portuguese Macau |
| Republic of China | 1949 | 35 provinces, areas, capital and special-municipality locations |

## Method

From Han through Ming, every historical unit is a set of whole present-day county-level divisions: the 2,728 counties, the municipalities' districts, the directly administered units, Taiwan's counties and cities, Hong Kong's districts and Macau's parishes. Slivers and gaps where county or province outlines do not meet join the nearest division, so the fill has no holes. Each takes the polity covering most of it in [Cliopatria](https://github.com/Seshat-Global-History-Databank/cliopatria) (Seshat Global History Databank, CC BY 4.0) for the snapshot year. A division mostly outside every Cliopatria polygon is left gray, keyed **No state recorded**; this covers much of the west and north in the early periods. Each polygon is widened by 10 km, about its vertex spacing, so a coarse coast or edge does not leave the land beside it gray. Small islands (landmasses under 5,000 km², such as Zhoushan) and small coastal divisions (under 1,000 km², such as Dongtou) that the polygons still miss take the polity of land within 0.5°. Frontier areas follow Cliopatria and are approximate; in 742, for example, it gives Turpan and Hami to the Türgesh. Each polity's land outside present-day China is not shown.

The faces are drawn without tile simplification (`fillTolerance: 0` in `dist/china-history.mjs`): at the shared default, long narrow outlines in Gansu and Xinjiang crossed themselves and drew stray triangles.

**Qing, 1820.** The atlas uses the [Stanford University Grave Reform in Modern China province shapefile](https://purl.stanford.edu/wd799pc4692), credited to Jeffrey Snyder-Reinke and published under [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). Man Zhimin compiled the boundary geometry and Zou Yilin checked it, as credited in the shapefile. The historical divisions extend into modern Mongolia, Russia and Central Asia. The map separates the regular provinces from frontier regions and shows the unresolved Nerchinsk treaty frontier in a separate color. The retained geometry was reprojected, cleaned, lightly simplified, and relabeled. The land comes from the atlas’s existing modern China and neighboring land shapes. The historical source supplies the boundaries between divisions and the extent across neighboring lands. Modern Chinese land that the source misses joins the adjoining historical division, or the nearest historical shore for small offshore islands. The historical fill replaces the modern China fills in 1820, and selection recolors those same polygons. Sakhalin is shown as a Qing claim. The modern Macau land outline is used as a small approximation for Portuguese Macau. Five South China Sea reef entries are omitted. The shared historical renderer draws the resulting shapes and suppresses modern borders in this frame.

**Republic of China, 1949.** The historical provincial boundaries are fitted to the same atlas land used for Qing. The frontier combines the atlas land seam with substantial source-backed extensions beyond the modern border. See [the 1949 data and coverage](china-1949.md).

## Not included

- **Warring States.** Cliopatria's polygons for the period misplace the states: its Wei lies at 37–40°N over Beijing, Datong and Shijiazhuang (Yan and Zhao land), Wei's capital Daliang and Han's capital Xinzheng fall inside Chu, and the Zhou royal domain is linked to the 10th-century Later Zhou. No openly licensed alternative was found.
- The Harvard–Fudan [CHGIS distribution](https://chgis.fas.harvard.edu/data/chgis/v6/) has its own license that restricts redistribution. The Qing frame uses the separately published Stanford archive item under its stated license.

Both are recorded under `rejected` in the manifest.

## Files

- `scripts/boundary-sources/china-history/`: the retained Cliopatria polities (copied unchanged from the pinned release; hashes and the selection rule in `manifest.json`), `qing-1820.geojson.gz`, the retained Stanford geometry, and `polities.json`, the English and Chinese names, kinds and notes compiled for this atlas.
- `scripts/build-china-history.mjs` builds `dist/data/china/history/borders.bin` through `scripts/historic-mosaic.mjs`, which Korea's build shares.

## Check locally

- `npm run build:china-history` rebuilds the snapshots from the retained sources; nothing is downloaded. It peaks at about 2 GB.
- `npm run test:china-history` runs the data check (`scripts/validate-china-history.mjs`: land coverage, each period's states and spot checks) and the browser scenarios in `scripts/browser/china-history.test.mjs`.
