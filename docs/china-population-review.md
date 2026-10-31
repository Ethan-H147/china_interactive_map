# China population review

Scanned 3180 mapped population records using existing website data only. The scan itself performs no external-source checks; applied corrections retain their source attribution. Rebuild with `npm run audit:china-population`.

“Inconsistent” means a subset exceeds its parent figure. “Outlier” means cities and towns is below 10% of a total of at least one million, or urban core is below 10% of a cities-and-towns population of at least 500,000. These thresholds identify candidates, not verified errors. Distributed settlements and different geographic definitions can produce valid outliers. This scan cannot detect every typo or say which column is wrong.

Shuozhou's previously verified urban-core correction (41,807 → 417,807) and the user-reviewed Wikipedia corrections for Meizhou, Zhanjiang, Baotou, Dezhou, Dingxi, Karamay and Wuzhong are applied. The latest four total-population corrections follow Wikipedia revision 95347066.

| City | Flag | Total | Cities and towns | Urban core | Reason to review |
| --- | --- | ---: | ---: | ---: | --- |
| None | — | — | — | — | No candidates under the checks above |

## Supplied 2020 census workbook comparison

Source: `china-census-2020-original.xlsx`, sheet 人口基本状况, columns C (total), H (cities and towns), J (urban core), census date 1 November 2020. Workbook SHA-256: `e41e889b1852a59ddc863c46449b0a4ac6ea276ebb7d5b1b83a6c48daffe7f34`.

Read 3,363 workbook records. Matched 3,211 rows to mapped provinces, prefectures and county-level divisions. Added 2,862 missing regional records (40 prefecture-level and 2,822 county-level), and filled 0 missing figures in existing records. Regional population coverage is now 3,180 records.

**36 differing figures across 35 existing website regions were corrected to the workbook values. Previous figures are retained below for audit.** The user selected the supplied workbook as the authority for these differences. The website comparison includes applied corrections from the preceding review. Province totals are compared with their separately sourced, dated website records.

Blank source cells remain null / not reported. No missing urban-core value is inherited from a parent or filled with zero. A source-only number fills a missing website measure; its cell-level source is retained. County figures use the census geography, and known boundary changes are labeled on the map. Where the census tabulates functional areas separately, county rows can exclude those populations even though today's map includes the land. Separate development-zone totals are not allocated or added to county figures.

Rebuild with `npm run build:china-population`. Full matching, additions, source-cell availability differences, and unmatched-row lists are in [the coverage report](china-census-coverage.md) and `scripts/boundary-sources/china-population/census-comparison.json`.

| Code | Region | Measure | Previous website | Applied workbook | Workbook cell | PDF pages |
| --- | --- | --- | ---: | ---: | --- | --- |
| 130100 | 石家庄市 | Cities and towns | 7,884,319 | 7,884,379 | H44 | 7–8 |
| 130100 | 石家庄市 | Urban core | 4,332,382 | 4,423,882 | J44 | 7–8 |
| 130200 | 唐山市 | Total | 7,701,983 | 7,717,983 | C69 | 9–10 |
| 130500 | 邢台市 | Cities and towns | 3,264,141 | 3,846,965 | H119 | 9–10 |
| 130700 | 张家口市 | Urban core | 1,092,783 | 1,093,783 | J166 | 11–12 |
| 131000 | 廊坊市 | Total | 5,465,087 | 5,464,087 | C219 | 13–14 |
| 210300 | 鞍山市 | Cities and towns | 2,579,691 | 2,479,691 | H525 | 23–24 |
| 210600 | 丹东市 | Urban core | 684,536 | 684,563 | J548 | 25–26 |
| 210700 | 锦州市 | Cities and towns | 1,090,598 | 1,613,255 | H555 | 25–26 |
| 220200 | 吉林市 | Urban core | 1,296,206 | 1,296,202 | J631 | 27–28 |
| 230300 | 鸡西市 | Cities and towns | 1,091,891 | 1,091,691 | H730 | 31–32 |
| 230400 | 鹤岗市 | Urban core | 502,639 | 502,649 | J740 | 31–32 |
| 230700 | 伊春市 | Urban core | 296,248 | 296,258 | J769 | 31–32 |
| 230900 | 七台河市 | Cities and towns | 532,136 | 532,126 | H791 | 33–34 |
| 340200 | 芜湖市 | Urban core | 1,217,401 | 1,317,401 | J1089 | 43–44 |
| 340800 | 安庆市 | Cities and towns | 2,412,500 | 2,312,500 | H1135 | 45–46 |
| 341700 | 池州市 | Total | 1,242,764 | 1,342,764 | C1198 | 47–48 |
| 360700 | 赣州市 | Total | 8,960,600 | 8,970,014 | C1349 | 51–52 |
| 411100 | 漯河市 | Urban core | 658,697 | 658,597 | J1708 | 63–64 |
| 411600 | 周口市 | Cities and towns | 3,843,349 | 3,843,339 | H1763 | 65–66 |
| 420300 | 十堰市 | Cities and towns | 1,221,419 | 1,987,585 | H1811 | 67–68 |
| 421200 | 咸宁市 | Total | 2,685,316 | 2,658,316 | C1884 | 69–70 |
| 430600 | 岳阳市 | Cities and towns | 3,064,473 | 3,064,474 | H1969 | 73–74 |
| 431100 | 永州市 | Cities and towns | 2,583,050 | 2,483,050 | H2017 | 73–74 |
| 440200 | 韶关市 | Cities and towns | 1,637,895 | 1,636,895 | H2074 | 75–76 |
| 440400 | 珠海市 | Urban core | 1,898,012 | 1,898,013 | J2095 | 77–78 |
| 451200 | 河池市 | Total | 3,417,845 | 3,417,945 | C2306 | 83–84 |
| 451300 | 来宾市 | Cities and towns | 1,005,712 | 1,006,712 | H2318 | 83–84 |
| 469005 | 文昌市 | Cities and towns | 225,608 | 341,862 | H2353 | 85–86 |
| 510400 | 攀枝花市 | Urban core | 670,491 | 670,591 | J2436 | 89–90 |
| 511000 | 内江市 | Urban core | 443,664 | 553,664 | J2481 | 89–90 |
| 520400 | 安顺市 | Total | 2,570,630 | 2,470,630 | C2647 | 95–96 |
| 540500 | 山南市 | Cities and towns | 114,048 | 113,048 | H2911 | 105–106 |
| 620700 | 张掖市 | Urban core | 264,770 | 264,779 | J3097 | 111–112 |
| 640200 | 石嘴山市 | Total | 2,859,074 | 751,389 | C3227 | 115–116 |
| 650400 | 吐鲁番市 | Urban core | 117,560 | 117,650 | J3262 | 117–118 |
