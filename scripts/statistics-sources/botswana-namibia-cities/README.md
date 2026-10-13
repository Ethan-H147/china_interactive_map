# Botswana and Namibia settlements

The city layer is independent of the administrative hierarchy. Botswana includes all seven census cities/towns and all 59 villages of at least 5,000 residents. Namibia includes every one of the 57 urban localities tabulated in Appendix III of the final 2023 census main report.

- Botswana populations: Statistics Botswana's revised December 2022 locality report, pages 10–15 and 17–18 of the PDF. The complete source PDF and text are in the neighboring `botswana-namibia` statistics source directory.
- Namibia populations: Namibia Statistics Agency's final 2023 census main report, PDF pages 115–116, printed pages 88–89. `namibia-final-town-table.txt` preserves the extracted appendix. The final report corrects several preliminary town counts, so preliminary areas are not joined to the corrected populations.
- Coordinates: pinned GeoNames national gazetteers, CC BY 4.0. Names are matched and homonyms manually checked against their documented locations. Gazetteer populations are never used. Current first-level polygon containment assigns the displayed parent.
- Kazungula uses the GeoNames named residential-area point, verified within the official UNFPA/OCHA census locality polygon. The polygon is pinned in `kazungula-locality.json`.
- Ramotswa Station/Taung uses its named railway station as the location anchor. The gazetteer point is displaced southwest of the village; the primary OpenStreetMap station node is pinned and attributed separately.
- Linguistic labels: Wikidata labels, CC0. The snapshot retains English Wikipedia's entity lookup and each retrieved label. Linguistic labels are not described as official designations.
- Flags: original Wikimedia Commons assets and metadata are retained without image alteration. The displayed municipal flags are Gaborone, Francistown, Windhoek, Oshakati, Walvis Bay and Oranjemund; their use is documented by Flags of the World. Unverified provincial designs and flag-like council logos are not assigned as official flags. Henties Bay artwork is retained in the research assets but is not displayed without further verification.

Run `node scripts/prepare-botswana-namibia-settlements.mjs` after the country boundary builder. The script validates pinned checksums, positive integer census populations, unique IDs, original flag checksums and exactly one containing first-level subdivision per settlement. Outputs are deterministic; a source revision requires explicit checksum review.
