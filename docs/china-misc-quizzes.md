# China miscellaneous quizzes

Implemented locally on 29 October 2026. China → Quiz → Category → Miscellaneous offers eight independent quizzes:

| Quiz | Locations |
| --- | ---: |
| Dynasty capitals | 17 |
| Ancient battlefields | 16 |
| Silk Road stops | 20 |
| Sacred mountains | 13 |
| Great Wall passes | 12 |
| Imperial tombs | 16 |
| Grottoes & ancient temples | 19 |
| Poets’ birthplaces | 16 |

All 129 questions use dots. Each topic supports Preview, clicking the named place, typing every name, naming a highlighted place, satellite imagery, answer colors, saved naming drafts and account records. Chinese names and common English variants are accepted. Correct answers retain the location feedback added for the US quizzes.

Capitals use historical names and dynasty context before answering. Modern locality names appear in feedback and Preview. Successive names in the same city region are grouped: Chang’an/Daxing, Luoyang/Shendu, Jianye/Jiankang/Yingtian, Bianjing/Dongjing and Dadu/Beijing each have one selectable dot. The grouped point is a city reference rather than a claim that every dynasty occupied the same palace footprint. Nearby but distinct capital sites, such as Haojing and Xianyang, remain separate. The set includes several contemporary states’ capitals and secondary or summer capitals, rather than suggesting that China always had one unified court.

The Silk Road and poet topics include Central Asian sites. Their default extent includes every dot; an additional Central Asia view provides a closer look. Li Bai uses Suyab (Ak-Beshim) in present-day Kyrgyzstan. His dot matches the Silk Road Suyab dot, using UNESCO component 1442-008 at 42°48′07″N, 75°12′12″E. This follows the Suyab birthplace attribution, while the included-places note explains that his precise birthplace is debated. The location does not change the atlas’s country boundaries.

Birthplaces use representative locality dots, not invented birth-house positions. Su Shi and Su Zhe share Meishan, giving 17 poets at 16 locations. Lu You uses the Shouchun/Huai River attribution documented by the Shouxian local-history account, rather than his ancestral home of Shaoxing. Wang Anshi uses Qingjiang (present-day Zhangshu), rather than his ancestral Linchuan. Qu Yuan, Tao Yuanming and Li Qingzhao have explicit qualifications about traditional or uncertain locations. These are geographic learning references; they do not resolve contested biographical scholarship.

Battlefields use a traditional site or representative locality; naval and siege campaigns covered wider areas. Red Cliffs explicitly uses Chibi and notes the location debate, distinguishing it from the literary Red Cliff at Huangzhou. The Fei River point uses Shouxian rather than an unsuitable generic river coordinate. Guandu uses the Henan town identity, and Julu uses the Pingxiang locality. The mountain quiz distinguishes the southern Hengshan in Hunan from the northern Hengshan near Hunyuan, using the latter’s mountain identity rather than the misleading generic Hengshan coordinate. Grouped tomb complexes likewise use reference points rather than boundaries. The Qin point identifies the imperial mausoleum, not the separate Terracotta Army museum.

The source snapshots and SHA-256 manifest are retained under scripts/boundary-sources/china-misc. Wikidata coordinate claims are public structured data (CC0); reviewed entity overrides in scripts/china-misc-quiz-sources.mjs disambiguate cities, historical sites and representative localities. UNESCO’s four Central Asian component coordinates are retained as an explicitly labeled transcription from its web-readable component table, not a copied HTML response. The local data build is offline and verifies retained source checksums. Source links and coverage notes appear in each quiz’s included-places disclosure.

Selected primary references: [Xi’an local history: Daxing and Chang’an](https://xadfz.xa.gov.cn/xadq/rwxa/1960625284585664514.html), [Henan heritage: Luoyang](https://english.henan.gov.cn/2024/08-16/3051738.html), [UNESCO Beijing Central Axis](https://whc.unesco.org/en/list/1714/), [UNESCO Silk Road component coordinates](https://whc.unesco.org/en/list/1442/maps/), [Hebei archaeology: Ye](https://www.hbswwkg.com/2021-04/16/content_8466360.html), [Academy of Chinese Studies: Li Bai](https://chiculture.org.hk/en/china-five-thousand-years/1937), [Shouxian: Lu You](https://www.shouxian.gov.cn/ztbd/ztzl/wxzxcjzl/8127061.html), [Jiangxi Daily: Wang Anshi chronology](https://jiangxi.jxnews.com.cn/system/2021/12/16/019481587_03.shtml), and [UNESCO Ming and Qing imperial tombs](https://whc.unesco.org/en/list/1004/).

Miscellaneous is category 4 in the interface. Attempts use existing level 3 with a unique misc-prefixed topic scope, preserving the current Supabase schema and separating them from city difficulties. No backend migration is required. Older clients can retain these records without knowing the questions, since attempts carry their own scope label and scores. The account dashboard launches all eight topics and labels their history as Miscellaneous.

Run npm run build:china-misc-quiz for the local dataset and npm run test:china-misc-quiz for data, source, historical-alias, map, Preview, phone, draft and simulated account-sync checks. Publishing remains a separate user-authorized action.
Poets' birthplaces now use China's default home bounds for the initial round, Preview and map refit. Li Bai's Suyab dot remains visible at this extent. The All sites / Central Asia view controls remain only in Silk Road stops; question targeting and individual-answer review still use the shared quiz behavior.
