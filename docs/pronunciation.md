# Place pronunciation rollout

Coverage is 2435 recordings across 2267 present-day map cards. The original 253 cards remain: China 34 provincial-level entries; France 18 regions and 101 departments; Spain 19 community/city cards and 52 province/city cards; Korea 29 first-level entries in the retained dataset. Expansion adds Russia 83 first-level cards, Germany 16, Italy 20 regions and 110 province equivalents, United States 65 states/district/territory cards, Canada 13 provinces/territories with English and French for each, Mexico 32, Brazil 27, Portugal 20 districts/autonomous regions, Japan 47 prefectures, Vietnam 34 current provinces/cities, and Turkey 81 provinces (level 2 beneath the statistical regions in this map). A further 127 first-level recordings cover Poland 16, Hungary 20, Ukraine 27, Romania 42, Czechia 14 and Slovakia 8. Coverage follows existing map units without changing boundaries. Communes and historical units are excluded. Regional-language names and quiz aliases are preserved.

## Current state

All covered cards use locally stored ElevenLabs recordings with the single stock voice **Daniel — Steady Broadcaster** (voice ID `onwK4e9ZLuTAKqWW03F9`), generated with `eleven_v4` except Irish, which uses `eleven_v3`. Each name has its own request with an explicit language code; supported models also receive native-language preceding context. The user approved the four-language Daniel audition on 7 November 2026. Individual recordings retain `reviewed:false` because voice approval and successful decoding do not establish that every place name is pronounced correctly.

The batch contains 49,861,277 bytes (47.55 MiB) of audio. All 2435 MP3 files were decoded and checked for matching input text, language, voice, SHA-256, duration and non-silent audio before activation. Maine-et-Loire was regenerated after the user reported an instrumental flourish; its replacement uses a new seed and neutral delivery context. Decoding does not establish the absence of audible synthesis artifacts.

A subsequent scan of all 652 recordings found seven files with a repeated utterance: Portugal's Évora, Guarda, Leiria and Setúbal; Brazil's Bahia and Goiás; and Canadian French Québec. The second utterance was removed by copying the original MP3 frames up to a cut inside the intervening silence, without synthesis or re-encoding. The first utterance's decoded samples were checked against the original. Both long- and short-pause scans compared the separated speech segments; pauses within multipart Russian names were retained. Edited entries record the original hash, original size/duration, cut time and edit date. Originals and the audit reports are retained outside the served website in the local pronunciation-repeat-review artifacts. The generation checkpoint and cached files also retain these edits, so resuming a batch does not restore the repeats.

David Castlemore was the earlier public-demo candidate. Its API use was rejected on the free plan, so the user chose and approved Daniel, which works with the current free account. No subscription was purchased. The Microsoft China pilot has been replaced.

The Japan/Vietnam/Turkey batch adds 162 recordings. Four Mexican names containing z or soft c were also regenerated: Ciudad de México, Coahuila de Zaragoza, Veracruz de Ignacio de la Llave, and Zacatecas. They use an explicit Mexican Spanish accent tag and preceding instructions requesting seseo. The 166 new/replacement clips passed decoding, hash, language and repeat screening; all 648 other entries, including the seven earlier trims, were preserved. Accent instructions still require listening review.

## Multilingual expansion

A further 635 recordings cover Belgium levels 1–2 (14 cards, 18 recordings), Netherlands level 1 (18 cards, including retained Caribbean units), UK levels 1–3 (418 cards, 445 recordings), South Africa level 1 (9), Saudi Arabia level 1 (13), and India level 1 (36 cards, 132 recordings). The UK map retains 28 first-level, 226 second-level and 164 third-level records. All requested cards receive a supported-language recording.

Belgium uses Dutch in Flanders, French in Wallonia, French/Dutch in Brussels and additional German for Wallonia/Liège. Dutch provincial disambiguators and GISCO Prov. abbreviations are not spoken. South African names use South African English; Saudi names use Arabic with Saudi context. India uses English fallback plus 96 attested native forms across 14 supported Indian languages, without treating every state as Hindi-speaking. UK names use British English and the retained Welsh/Irish forms. Six unchanged Welsh names use a single Welsh recording.

Unsupported languages are not impersonated. Scottish Gaelic, Scots/Ulster Scots, Cornish, Manx, and unsupported Indian languages such as Ladakhi, Mizo, Khasi, Meitei, Konkani and Kashmiri retain their written names and quiz aliases. English fallback and available supported regional forms provide audio coverage. Irish uses the same Daniel voice with eleven_v3 because it is supported there; its API requests omit the unsupported previous_text parameter. Other recordings retain eleven_v4. See the [provider language lists](https://elevenlabs.io/docs/overview/models).

Poltava was regenerated with a fresh seed, explicit initial-consonant articulation instructions, marked stress and slower delivery after the user reported a missing initial П. The new Hail recording contained a repeated reading; it was trimmed in the intervening silence without altering retained speech. The new batch passed decoding and repeated-speech screening, and all 940 other previously installed recordings were preserved. These checks do not verify every phoneme or accent.

## Latin American Spanish expansion

A further 66 first-level cards have audio: Argentina 24, Uruguay 19, Chile 16 and Costa Rica 7. Argentine, Uruguayan and Chilean entries have separate locale context and accent instructions. The user rejected the three Costa Rican accent auditions; the seven installed Costa Rican entries use neutral Latin American Spanish (es-419), not a verified Costa Rican accent. Accent instructions for the other countries remain subject to listening review.

Reading (GB-C-E06000038) was regenerated after the user reported the verb pronunciation. Its display/input name remains Reading; synthesis uses Redding with explicit British place-name context to request /ˈredɪŋ/. Five new recordings repeated their names: Chubut, Entre Ríos, Formosa, Misiones and Florida. Their second readings were removed by frame copying in silence; retained decoded speech samples match the originals. The batch passed decoding, identity, volume and repeat screening. All 1575 other previously installed recordings were preserved.

Run the multilingual coverage validator and the latin-spanish-pronunciation browser scenarios for complete first-level coverage, typed-answer acceptance, real playback and source cleanup on desktop and phone.

After listening review, Santiago del Estero, Durazno and Lavalleja were regenerated with new seeds, slightly slower delivery and explicit consonant-articulation context. The context requests an audible s in Estero, seseante z in Durazno and distinct rehilado ll versus Spanish j in Lavalleja. Official names and regional locales remain unchanged. All three replacements repeated their names; second readings were trimmed in silence with retained speech samples verified unchanged. All other 1639 recordings were preserved. Consonant accuracy still requires listening review.

Durazno was subsequently regenerated at normal speed (1.0 instead of 0.9), retaining the same voice, seed and consonant context. Its duplicate reading was trimmed, and all other 1641 recordings were preserved.

## Nordic expansion

The five Nordic countries add 125 ElevenLabs recordings for 101 cards: all 76 first-level units retained by the map and five urban areas per country. Finland has both Finnish and Finland Swedish recordings for its 19 regions and five cities; Åland uses Swedish as its primary recording. Denmark, Iceland, Norway and Sweden use Danish, Icelandic, Norwegian Bokmål and Swedish respectively, with explicit provider language codes. These languages are supported by [Eleven v4](https://elevenlabs.io/docs/overview/models). The voice remains Daniel and all 1642 earlier recordings are unchanged.

The user chose the map's largest urban areas, ranked by the retained official settlement populations rather than municipality populations. Connected suburbs are therefore counted within their urban area. Rankings use each country's existing source year; they are not a new claim about a common reference date.

| Country | Five urban areas, largest first | First-level cards | Recordings |
| --- | --- | ---: | ---: |
| Denmark | Copenhagen, Aarhus, Odense, Aalborg, Esbjerg | 8 | 13 |
| Finland | Helsinki, Tampere, Turku, Oulu, Jyväskylä | 19 | 48 |
| Iceland | Greater Reykjavík, Keflavík og Njarðvík, Akureyri, Selfoss, Akranes | 8 | 13 |
| Norway | Oslo, Bergen, Stavanger/Sandnes, Trondheim, Drammen | 20 | 25 |
| Sweden | Stockholm, Göteborg, Malmö, Uppsala, Upplands Väsby och Sollentuna | 21 | 26 |

Coverage includes Denmark's Christiansø, Greenland and Faroe Islands cards and the Norwegian territories and claims already retained at level 1. Greenland and the Faroe Islands use the Danish names Grønland and Færøerne, labelled Danish; unsupported Greenlandic, Faroese and Sámi pronunciations are not impersonated. No boundaries or settlement population definitions change.

The 125 new files passed MP3 decoding, duration, non-silence, input-name and SHA-256 checks. All internal pauses were screened for repeated readings; no duplicate utterances were flagged. These checks do not establish native accent or phoneme accuracy. Audio remains click-only through the existing single player, with the same small borderless controls. Finnish and Swedish spoken forms are also accepted by both typed quiz modes.

Run `npm run test:nordic-pronunciation` for coverage, spoken-name quiz acceptance and real desktop/phone playback. The plan derives names and ranking from the existing country catalogues and settlement records; rerun generation when those inputs change. Generation checkpoints and repeat-screening reports remain outside the published website.

## Russian urban okrug expansion

435 urban okrug cards add Russian short-name recordings using the existing Daniel voice, eleven_v4 and explicit Russian language/context. The exact spoken text comes from the same russiaPlaceNames function as the visible local heading: Мурманск, rather than городской округ Мурманск. Suffix-form administrative labels are also removed from that heading and retained in the separate full technical-name block. Source names, boundaries and administrative classifications remain in the catalogue. The selection preserves the original 435-card display scope; 30 additional suffix-only records require a separate scope review.

The speaker follows the visible Russian short name through the existing lazy player. All 1767 earlier entries and audio bytes are preserved. All 435 new files passed decoding, duration, volume, hash and exact-name checks. Internal-pause comparison flagged no repeated readings; this screening does not establish correct word stress or phoneme accuracy. Individual clips remain reviewed:false.

Run npm run test:russian-city-pronunciation for complete coverage, spoken-name acceptance in both typed quiz modes, desktop/phone speaker placement, actual playback and cleanup.

## Playback

`dist/place-pronunciation.mjs` coordinates every card through one lazy native audio element. Recordings load only on a click. A new selection, country change, historical view, hidden tab or page exit stops playback and releases the source. The visible icon is 14 px, with a 28 px transparent button and an invisible hit-area extension. There is no visible circular border or background. The button follows the local-language name; when that line is suppressed as a duplicate, it follows the main heading. Tooltips and accessible labels disclose AI generation and identify the spoken language.

Multilingual controls use short language labels and spoken names in accessible labels. English follows the main heading; matching native controls follow the visible regional-name rows or the primary local name. Spoken forms are accepted by both typed quiz modes through the shared pronunciation-name index.

Canada has separate EN and FR buttons. English follows the English heading; French follows the visible French name or shares the heading when the spellings match. Small CSS language labels do not alter the heading's text. Switching between either button stops the other, and both share the same lazy player. Every province and territory has both recordings, covering French-speaking communities beyond Quebec and New Brunswick.

## Generation

`scripts/pronunciation-plan.mjs` derives coverage and exact spoken names from the retained map data. Spanish spellings come from the same `dist/spanish-names.mjs` functions used by the cards and quiz aliases, avoiding Catalan/Basque source names being mislabeled as Spanish.

Italy uses the Italian segment of bilingual source names. Canadian French uses the retained French names. American English, Canadian English/French, Mexican Spanish, Brazilian Portuguese and European Portuguese have separate locale metadata and preceding context. The API receives supported base language codes; Canadian French and both Portuguese varieties also receive accent instructions in audio tags. These instructions guide delivery and do not guarantee accent accuracy.

`scripts/prepare-elevenlabs-pronunciations.mjs` generates a staged batch, never writing an API key to a file or browser bundle. It reads `ELEVENLABS_API_KEY` or hidden interactive stdin. Use `--voice` and `--voice-name` to select the user-approved speaker; the default is Daniel. The stock Daniel voice ID is `onwK4e9ZLuTAKqWW03F9`. The default model is `eleven_v4`; `eleven_multilingual_v2` is rejected because it does not support explicit language selection. All clips use one voice, explicit language codes, per-language model metadata and 44.1 kHz 128 kbps MP3 output. Supported models receive native-language preceding context; Irish eleven_v3 requests rely on the explicit Irish language code. Identical request fingerprints reuse generated bytes instead of consuming another synthesis request. No speech model or provider request runs in the website.

Completed files and request fingerprints are checkpointed in the output directory, so a failed or interrupted batch can resume without regenerating verified clips. Use `--only=france:FR-D-49` to generate selected keys while retaining the installed catalog's other entries; only those selected audio files need activation. Change the selected entry's seed or settings when replacing an already cached clip. Do not automatically retry an uncertain failed synthesis request, because it might already have consumed credits. After all clips finish, validate hashes and actual media decoding before copying audio and both generated catalogs into `dist/`. The catalogs record provider, voice, model, exact name, synthesis text including any accent tag, language, locale, context, synthesis settings, timestamp, file size and SHA-256.

Run `node scripts/validate-multilingual-pronunciations.mjs` for complete requested-card coverage and native-name acceptance in both typed quiz modes. Run `node scripts/browser/run.mjs multilingual-pronunciation` for multilingual placement and real desktop/phone playback.

Run `node scripts/validate-place-pronunciations.mjs` after activation. It checks exact scope, source names, provider, consistent voice, languages/locales and file integrity for all 2435 recordings. Run `node scripts/browser/run.mjs place-pronunciation china-pronunciation` for real local-asset playback, Canadian EN/FR controls, card placement, small borderless controls, no preloading, one-player reuse and cleanup on desktop and phone. These browser checks use the activated ElevenLabs catalog and audio rather than intercepted fixtures. The China integrity check verifies its compatibility catalog.

Language selection reduces ambiguity but does not establish native accent or correct articulation. Each voice and language still requires listening review. Keep all changes local until publishing is explicitly requested.

## Russian city-name audit correction

The earlier suffix-only shortening left administrative adjectives in city headings and synthesis text. The sourced, boundary-ID-specific mappings in dist/russia-city-names.mjs correct 91 cards; 46 existing recordings are replaced and 41 previously missed city/town cards receive recordings (87 files total). Four corrections affect English headings only. All other audio is unchanged. See [the complete before/after audit](russian-city-name-audit.md). Full technical names remain separate. The resulting coverage is 476 Russian urban-okrug display cards, plus the unchanged 83 first-level recordings. Automated checks cover independent census city-name references, explicit city-name regression fixtures, genuine adjective-shaped settlement names, file integrity, MP3 decoding, volume, repeat screening and desktop/phone playback. Native pronunciation accuracy still requires listening review.

## Thailand, Bulgaria, Austria and Switzerland

144 recordings cover 140 first-level cards: all 77 Thai provinces/special administrative areas, 28 Bulgarian provinces, 9 Austrian states, and 26 Swiss cantons. Thai and Bulgarian clips speak the exact native card names. Austrian names use German with Austrian standard-language context. Swiss clips use the canton’s actual official language(s): 17 monolingual German cantons, four French cantons, Italian Ticino, German/French Bern, Fribourg and Valais, and German/Italian Graubünden. That gives 30 Swiss recordings. Written Swiss German names use Swiss Standard German, not a fabricated uniform dialect.

Graubünden also shows Romansh Grischun and accepts it in search and typed quizzes. Romansh is absent from the provider’s supported-language list, so it has no synthesized speaker. It is never labelled or synthesized as Romanian. The separate language controls sit next to their exact written forms. No recordings are concatenated into a multilingual utterance. Sources: [Swiss FDFA](https://www.aboutswitzerland.eda.admin.ch/en/multilingualism), [Graubünden’s trilingual cantonal site](https://www.gr.ch/EN/Seiten/welcome.aspx), [provider language coverage](https://elevenlabs.io/docs/overview/models).

All 144 clips passed hash, actual MP3 decoding, duration and volume checks, plus short-pause repeat screening. Luzern, Zug and Ticino initially repeated their names; the second readings were removed by copying MP3 frames through the intervening silence, and the first utterance’s decoded speech samples were verified unchanged. Originals and edit provenance are retained outside dist. All 2243 previously installed recordings are unchanged. Desktop/phone checks verify real local playback, exact language/name placement and one lazy player. These checks do not certify every phoneme or regional accent.

If a Swiss title already uses one of its native names, that language’s speaker sits beside the title. The identical name is omitted from the smaller language rows: Fribourg (French), Bern (German), and Valais (French). Other official-language names remain below.

## Mongolia, Philippine regions and French overseas cards

48 additional ElevenLabs recordings cover Mongolia’s 21 aimags and Ulaanbaatar (22), all 18 Philippine regions, and the eight previously missing French overseas first-level cards. Mongolia speaks the exact Mongolian Cyrillic name beside its speaker; the traditional-script spelling remains available. Philippine cards retain their English region headings and use Philippine English, with the speaker beside that heading. Regional acronyms are spoken as names. These English recordings are not labelled Filipino-language speech. The retained region names follow the [Philippine Statistics Authority](https://psa.gov.ph/classification/psgc/regions).

The French additions are Saint-Pierre-et-Miquelon, Saint-Barthélemy, Saint-Martin, Wallis-et-Futuna, Polynésie française, Nouvelle-Calédonie, Terres australes et antarctiques françaises, and Île de Clipperton. This completes all 26 French first-level atlas cards, including overseas cards with other legal statuses; no classification or boundary change is implied. Each recording reads its exact French name.

All 48 additions passed SHA-256 integrity, actual MP3 decoding, duration and volume checks, and short-pause repeat screening. All 2387 previously installed recordings are unchanged. Recordings retain the existing Daniel voice and eleven_v4 model. Generation and audio audit provenance are retained outside dist. Automated checks do not certify every phoneme or accent.
