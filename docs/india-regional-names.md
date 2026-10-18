# India regional names

All 28 states and eight union territories use a curated regional-language profile. The primary local name uses the region’s language and script rather than a Hindi name for every state. A visible language caption above it identifies that language, using the same caption style as China’s regional names. Established regional and Indigenous communities are included; a census-wide migrant-language list and the smallest speech communities are outside this update’s scope. This is not a register of official-language status, and it does not claim exhaustive dialect coverage.

The retained source snapshot produces 142 attested name forms and 157 additional language-presence entries. The latter identify communities for which this dataset does not contain a verified state-name spelling. The UI keeps these under **Other regional languages**, rather than inventing translations. Some attested forms have identical spellings in different languages. English primary forms in Nagaland and Arunachal Pradesh are included in the source total.

Names use their attested script and language tag, including Urdu/Kashmiri right-to-left text, Santali in Ol Chiki, Meitei Mayek and Tibetan script. Sikkim’s three source-attested traditional Latin forms are explicitly marked **romanized**. These are regional traditional names, not additional official names. Name forms are searchable aliases. Existing English aliases remain searchable.

A **Regional languages** disclosure is closed by default when there are more than three additional names or language-presence entries. Shorter lists remain visible. Each name links to its source. Language-presence links identify coverage sources; they do not assert a particular translated spelling. **Sources & coverage** links to the complete public dataset.

## Sources and reproducibility

- `scripts/name-sources/india/identity.json` pins the exact state/UT Wikidata identities, distinguishing Punjab and Puducherry from other places with those names.
- `scripts/name-sources/india/wikidata.json` retains the CC0 labels and claims used by the builder, with retrieval date and API URL. Label existence alone is not an inclusion rule: profiles filter out unrelated exonyms.
- `scripts/india-language-profiles.mjs` defines regional coverage independently of spelling availability, and records individually sourced additions from Indian government, education and language publications.
- `dist/data/europe/india/regional-names.json` contains per-name provenance, script/direction metadata, language-presence coverage and the scope statement.
- `scripts/name-sources/india/coverage-audit.json` summarizes each state/UT’s coverage.

The Census of India C-16 mother-tongue table and Commissioner for Linguistic Minorities report support regional coverage. The report predates recent state/UT reorganizations; present-day identities are joined explicitly. State education and cultural sources supplement the coverage profiles. Wikidata supplies attributed written labels, not proof that a language is spoken in a state. Manual additions preserve their exact source forms.

Run `npm run build:india-names` to rebuild metadata from the retained snapshots. The India path of `build:europe` also calls this builder, so a later geography build preserves the names. `npm run fetch:india-names` refreshes the identity and label snapshots; review source differences before rebuilding. To extend coverage, update the profile and supply a source-attested spelling, or leave it as language-presence coverage. Do not generate a spelling by transliteration or copy a language code from a similarly named unrelated language.

The runtime uses the shared `regional-names.mjs` renderer and the `nameVariants` country option. It reads the small, 36-record country catalogue already needed for selection; there is no new per-selection request. This feature changes metadata and sidebar content, not geometry, map simplification or the three-country memory limit.

## Local verification

Open `http://127.0.0.1:4174/?preview=india-regional-names#india` and refresh. Select Tamil Nadu or Punjab to check the primary script, Jharkhand or Assam for the expandable list, Jammu and Kashmir for right-to-left names, and Sikkim for Tibetan and explicitly romanized traditional forms. Search also accepts the attested native names.

- `npm run test:india-names` validates exact identities, coverage independent of spelling availability, source metadata, scripts/direction, native aliases and repeatable builds.
- `npm run test:india-names-browser` checks all 36 records in real Chrome, disclosure defaults, keyboard and touch interaction, source links, safe literal text, phone layout and country switching.
