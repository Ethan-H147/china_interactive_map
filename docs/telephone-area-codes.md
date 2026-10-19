# Japan and South Africa area-code views

Added locally on 18 October 2026. The small arrow beside the administrative level buttons offers **Administrative** and **Area codes**, matching the existing Brazil/US interaction. Telephone selection is independent of administrative selection. Switching back restores the previous administrative place and level; saved views retain the telephone view and selected code. Search accepts a full domestic code, international prefix or mapped place name.

The area-code view has its own coverage cards and never inherits a municipality's population, GDP or flag. Geometry loads only when the view is opened, is decoded in a worker, and is released on leaving it or changing countries. Interrupted loads cannot install geometry in a later country.

## Japan

MIC's official list, dated 1 March 2026, contains 582 numbering-area rows and **387 distinct geographic area codes**. Exactly one domestic zero is prepended to the source code: 3 becomes 03, 11 becomes 011, and 4992 becomes 04992. The reference screenshot's broad three-digit groups are not substituted for full codes.

The coverage prose is joined to the atlas's MLIT 2026 municipalities and designated-city wards, covering 1,892 non-overlapping local units. Prefectures, counties, municipality names, ward qualifications and nested inclusion/exclusion clauses are retained. The source's older 篠山市 name is reconciled with current 丹波篠山市, whose 2019 rename is documented by the National Mayors Association.

This is **municipal coverage**, not a surveyed telephone-boundary dataset. A municipality split between codes retains their complete set and appears gray, including when selected. Selecting a code highlights its municipal reference footprint, and its card provides the original MIC coverage text and address exceptions. Examples include Iwamizawa (0126/01267), Kushiro (0154/01547), Yakumo (0137/01398) and Mitaka (03/0422). No internal telephone boundaries are invented.

Sources: MIC [national code list](https://www.soumu.go.jp/main_sosiki/joho_tsusin/top/tel_number/shigai_list.html) and [PDF](https://www.soumu.go.jp/main_content/000141817.pdf), reused under Public Data License 1.0 with MIC attribution and the processing described above. Geometry retains the existing atlas's MLIT/GSI provenance in `dist/data/japan-local-source.json`.

## South Africa

The view includes **37 released geographic codes**, from ICASA's National Numbering Plan Table 3, checked against the July 2026 Fourth Amendment. Protected, mobile and non-geographic services receive no area polygons. Domestic zeros are retained; international forms remove them, for example 021 and +27 21.

ICASA specifies the same Johannesburg region for 010 and 011. Both codes therefore share their complete mapped reference footprint and can be searched separately. The view maps **345 individually verified places** using the existing Telkom, SAPS and audited local-government assignments and Stats SA 2011 census main-place geometry. The verified towns appear in stronger colors with subtle outlines. Full reference regions use lighter shades of the same colors. Rural coverage is estimated from the nearest verified town using a longitude-scaled plane at 30° south, with town polygons taking precedence, then clipped to the atlas land mask. Adjacent regions share their edges; Lesotho, Eswatini and the sea remain outside the fill. These are **approximate reference regions, not official telephone boundaries**. The map and selected-code card identify that distinction.

No public official national telephone-boundary polygon download was found. ICASA's numbering reasons document discusses obtaining precise maps and making them available on request. This limitation appears in the map and selected-code card. Original locality provenance is retained in `dist/data/southern-africa/south-africa/phone-codes.json` and census geometry provenance in `settlement-boundaries/manifest.json`.

Sources: [ICASA Numbering Plan](https://www.icasa.org.za/uploads/files/NumberingPlanReg.pdf), [Fourth Amendment, July 2026](https://www.icasa.org.za/uploads/files/54930-1-7-ICASA-1-Numbering-Plan-Regs-4th-Ammendment.pdf), and [Telkom town dialling codes](https://ecdev2.telkom.co.za/corporate/customer-support/utilities/useful_information/sa_codes.html).

## Rebuild and checks

`npm run build:telephone-areas` fetches retained sources, checks SHA-256 hashes and rebuilds both datasets. `ONLY=japan` or `ONLY=south-africa` scopes the generator. Downloads are retained in `scripts/boundary-sources/telephone-areas/`. `npm run test:telephone-areas` checks the official code sets, every reference footprint, source hashes, international formatting, split municipalities, exact-code search, Johannesburg overlays and saved-view scopes. `npm run test:telephone-areas-browser` checks the real arrow menu, map clicks, search, saved views, phone layouts, return to administrative selection and cancellation during country changes.

The mobile sheet also closes from full to half when the same search result is selected again; an unchanged breadcrumb must not leave the sheet covering the map-view arrow. Map-view refreshes avoid rewriting an unchanged value or hidden state while the native menu is being used.
