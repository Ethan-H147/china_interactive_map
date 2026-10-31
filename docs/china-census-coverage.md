# China census population coverage

The supplied workbook is retained unchanged at `scripts/boundary-sources/china-population/china-census-2020-original.xlsx`. Its extracted population fields and PDF page locators are in `census-2020.json` in the same directory. Extract again with `python scripts/extract-china-census.py path/to/original.xlsx`, then run `npm run build:china-population`.

The extractor treats every cell as data and never executes workbook content. It imports only the population table, not instructions in other sheets. Matching requires the province and parent context, with explicit row-specific exceptions listed below. National and intermediate totals are retained as source rows, never added to subdivision populations. The workbook covers mainland divisions; Taiwan, Hong Kong and Macau are not compared or replaced. No geography, national overview visibility, or province display source is changed.

Matched rows: 31 provinces, 333 prefectures, 2841 county-level divisions. Source rows accounted for: 3211 matched + 152 unmatched = 3363. Main numerical discrepancies: [China population review](china-population-review.md).

## Mapped divisions without a matching workbook row

These remain unavailable rather than receiving a parent population or a partial predecessor total. Historical rows are retained below for review; no street-level allocation or population estimates are made.

| Code | Map name | Reason |
| --- | --- | --- |
| 659011 | 新星市 | Xinxing was established after the census; no standalone row in this workbook. |
| 659012 | 白杨市 | Baiyang was established after the census; no standalone row in this workbook. |
| 330113 | 临平区 | Linping was split from 2020 Yuhang; this sheet has no street-level breakdown to isolate it. |
| 330114 | 钱塘区 | Qiantang combines parts of 2020 Jianggan and Xiaoshan; this sheet has no street-level breakdown to isolate it. |

## Explicit source-name matches

Source labels are preserved verbatim. Spelling variants are only accepted at the listed row and parent. Historical matches identify the source census area, and do not assert that all later boundaries stayed unchanged. Mohe’s source row is mislabeled 海伦市: its parent context and 54,036 total are corroborated by [Mohe government](https://www.mohe.gov.cn/mohe/c101200/mhgk.shtml).

| Workbook row | Source name | Map code | Map name | Match basis |
| ---: | --- | --- | --- | --- |
| 554 | 风城市 | 210682 | 凤城市 | Explicit source spelling/character variant matched within its parent; original workbook label retained |
| 610 | 南鼎区 | 211404 | 南票区 | Explicit source spelling/character variant matched within its parent; original workbook label retained |
| 826 | 海伦市 | 232701 | 漠河市 | Source row repeats Hailun after the Daxing’anling heading. Scoped match to Mohe, independently corroborated by Mohe government census total 54,036. |
| 910 | 海门市 | 320614 | 海门区 | Historical census name matched to its mapped successor; values retain the 2020 source geography |
| 1094 | 芜湖县 | 340210 | 湾沚区 | Historical census name matched to its mapped successor; values retain the 2020 source geography |
| 1095 | 繁昌县 | 340212 | 繁昌区 | Historical census name matched to its mapped successor; values retain the 2020 source geography |
| 1161 | 风阳县 | 341126 | 凤阳县 | Explicit source spelling/character variant matched within its parent; original workbook label retained |
| 1248 | 沙县 | 350405 | 沙县区 | Historical census name matched to its mapped successor; values retain the 2020 source geography |
| 1254 | 埋城区 | 350502 | 鲤城区 | Explicit source spelling/character variant matched within its parent; original workbook label retained |
| 1271 | 长泰县 | 350605 | 长泰区 | Historical census name matched to its mapped successor; values retain the 2020 source geography |
| 1276 | 龙海市 | 350604 | 龙海区 | Historical census name matched to its mapped successor; values retain the 2020 source geography |
| 1337 | 湖门县 | 360429 | 湖口县 | Explicit source spelling/character variant matched within its parent; original workbook label retained |
| 1446 | 湖川区 | 370302 | 淄川区 | Explicit source spelling/character variant matched within its parent; original workbook label retained |
| 1631 | 偃师市 | 410307 | 偃师区 | Historical census name matched to its mapped successor; values retain the 2020 source geography |
| 1671 | 延 | 410726 | 延津县 | Explicit source spelling/character variant matched within its parent; original workbook label retained |
| 1769 | 沈厅县 | 411624 | 沈丘县 | Explicit source spelling/character variant matched within its parent; original workbook label retained |
| 1866 | 监利县 | 421088 | 监利市 | Historical census name matched to its mapped successor; values retain the 2020 source geography |
| 1885 | 成安区 | 421202 | 咸安区 | Explicit source spelling/character variant matched within its parent; original workbook label retained |
| 1930 | 酸陵市 | 430281 | 醴陵市 | Explicit source spelling/character variant matched within its parent; original workbook label retained |
| 2020 | 祁阳县 | 431181 | 祁阳市 | Historical census name matched to its mapped successor; values retain the 2020 source geography |
| 2040 | 新见侗族自治县 | 431227 | 新晃侗族自治县 | Explicit source spelling/character variant matched within its parent; original workbook label retained |
| 2183 | 连山北族瑶族自治县 | 441825 | 连山壮族瑶族自治县 | Explicit source spelling/character variant matched within its parent; original workbook label retained |
| 2193 | 湖安区 | 445103 | 潮安区 | Explicit source spelling/character variant matched within its parent; original workbook label retained |
| 2220 | 横县 | 450181 | 横州市 | Historical census name matched to its mapped successor; values retain the 2020 source geography |
| 2290 | 川东县 | 451022 | 田东县 | Explicit source spelling/character variant matched within its parent; original workbook label retained |
| 2323 | 金秀瑞族自治县 | 451324 | 金秀瑶族自治县 | Explicit source spelling/character variant matched within its parent; original workbook label retained |
| 2346 | 南沙群島 | 460303 | 南沙区 | Historical census name matched to its mapped successor; values retain the 2020 source geography |
| 2389 | 流南区 | 500152 | 潼南区 | Explicit source spelling/character variant matched within its parent; original workbook label retained |
| 2417 | 温汇区 | 510115 | 温江区 | Explicit source spelling/character variant matched within its parent; original workbook label retained |
| 2498 | 马边外族自治县 | 511133 | 马边彝族自治县 | Explicit source spelling/character variant matched within its parent; original workbook label retained |
| 2530 | 前律区 | 511603 | 前锋区 | Explicit source spelling/character variant matched within its parent; original workbook label retained |
| 2534 | 华鉴市 | 511681 | 华蓥市 | Explicit source spelling/character variant matched within its parent; original workbook label retained |
| 2578 | 甘孜族自治州 | 513300 | 甘孜藏族自治州 | Explicit source spelling/character variant matched within its parent; original workbook label retained |
| 2602 | 会理县 | 513402 | 会理市 | Historical census name matched to its mapped successor; values retain the 2020 source geography |
| 2630 | 水城县 | 520204 | 水城区 | Historical census name matched to its mapped successor; values retain the 2020 source geography |
| 2639 | 道真伦佬族苗族自治县 | 520325 | 道真仡佬族苗族自治县 | Explicit source spelling/character variant matched within its parent; original workbook label retained |
| 2657 | 黔西县 | 520581 | 黔西市 | Historical census name matched to its mapped successor; values retain the 2020 source geography |
| 2661 | 威宁作族回族苗族自治县 | 520526 | 威宁彝族回族苗族自治县 | Explicit source spelling/character variant matched within its parent; original workbook label retained |
| 2783 | 西盟优族自治县 | 530829 | 西盟佤族自治县 | Explicit source spelling/character variant matched within its parent; original workbook label retained |
| 2803 | 禄丰县 | 532302 | 禄丰市 | Historical census name matched to its mapped successor; values retain the 2020 source geography |
| 2816 | 绿养县 | 532531 | 绿春县 | Explicit source spelling/character variant matched within its parent; original workbook label retained |
| 2906 | 米林县 | 540481 | 米林市 | Historical census name matched to its mapped successor; values retain the 2020 source geography |
| 2922 | 错那县 | 540581 | 错那市 | Historical census name matched to its mapped successor; values retain the 2020 source geography |
| 2968 | 凤翔县 | 610305 | 凤翔区 | Historical census name matched to its mapped successor; values retain the 2020 source geography |
| 2987 | 句邑县 | 610429 | 旬邑县 | Explicit source spelling/character variant matched within its parent; original workbook label retained |
| 3019 | 议台区 | 610702 | 汉台区 | Explicit source spelling/character variant matched within its parent; original workbook label retained |
| 3052 | 旬阳县 | 610981 | 旬阳市 | Historical census name matched to its mapped successor; values retain the 2020 source geography |
| 3101 | 临洋县 | 620723 | 临泽县 | Explicit source spelling/character variant matched within its parent; original workbook label retained |
| 3186 | 黃南藏族自治州 | 632300 | 黄南藏族自治州 | Explicit source spelling/character variant matched within its parent; original workbook label retained |
| 3187 | 同仁县 | 632301 | 同仁市 | Historical census name matched to its mapped successor; values retain the 2020 source geography |
| 3190 | 河南蒙占族自治县 | 632324 | 河南蒙古族自治县 | Explicit source spelling/character variant matched within its parent; original workbook label retained |
| 3262 | 吐魯番市 | 650400 | 吐鲁番市 | Explicit source spelling/character variant matched within its parent; original workbook label retained |
| 3283 | 巴音郫楞蒙古自治州 | 652800 | 巴音郭楞蒙古自治州 | Explicit source spelling/character variant matched within its parent; original workbook label retained |
| 3312 | 英青沙县 | 653123 | 英吉沙县 | Explicit source spelling/character variant matched within its parent; original workbook label retained |
| 3346 | 沙湾县 | 654203 | 沙湾市 | Historical census name matched to its mapped successor; values retain the 2020 source geography |
| 903 | 崇川区 + 港闸区 | 320613 | 崇川区 | Sum of complete predecessor areas; no estimation or partial-area allocation |
| 975 | 下城区 + 拱墅区 | 330105 | 拱墅区 | Sum of complete predecessor areas; no estimation or partial-area allocation |
| 1091 | 弋江区 + 三山区 | 340209 | 弋江区 | Sum of complete predecessor areas; no estimation or partial-area allocation |
| 1241 | 梅列区 + 三元区 | 350404 | 三元区 | Sum of complete predecessor areas; no estimation or partial-area allocation |
| 1620 | 吉利区 + 孟津县 | 410308 | 孟津区 | Sum of complete predecessor areas; no estimation or partial-area allocation |
| 2345 | 西沙群岛 + 中沙群岛的岛礁及其海域 | 460302 | 西沙区 | Sum of complete predecessor areas; no estimation or partial-area allocation |

## Known geography cautions

These records display a geography note. Six present-day divisions are represented by sums of complete predecessor areas, with each source component retained. No partial-area populations are estimated. The remaining cautions identify historical areas whose figures cannot be allocated to the current boundaries from this workbook.

| Code | Map name | Census rows | Note | Boundary evidence |
| --- | --- | --- | --- | --- |
| 330102 | 上城区 | 974 | The workbook figure is for the historical 2020 census area. Its boundary differs from the current mapped division; no population was redistributed or estimated. | See retained name-match configuration |
| 330109 | 萧山区 | 980 | The workbook figure is for the historical 2020 census area. Its boundary differs from the current mapped division; no population was redistributed or estimated. | See retained name-match configuration |
| 330110 | 余杭区 | 981 | The workbook figure is for the historical 2020 census area. Its boundary differs from the current mapped division; no population was redistributed or estimated. | See retained name-match configuration |
| 520201 | 钟山区 | 2628 | The workbook figure is for the historical 2020 census area. Its boundary differs from the current mapped division; no population was redistributed or estimated. | See retained name-match configuration |
| 520204 | 水城区 | 2630 | The workbook figure is for the historical 2020 census area. Its boundary differs from the current mapped division; no population was redistributed or estimated. | See retained name-match configuration |
| 320613 | 崇川区 | 903, 904 | Sum of 2020 census areas: 崇川区 + 港闸区. | [Reference](https://zh.wikipedia.org/wiki/2020年中华人民共和国县级以上行政区划变更列表) |
| 330105 | 拱墅区 | 975, 977 | Sum of 2020 census areas: 下城区 + 拱墅区. | [Reference](https://zh.wikipedia.org/wiki/2021年中华人民共和国县级以上行政区划变更列表) |
| 340209 | 弋江区 | 1091, 1093 | Sum of 2020 census areas: 弋江区 + 三山区. | [Reference](https://zh.wikipedia.org/wiki/2020年中华人民共和国县级以上行政区划变更列表) |
| 350404 | 三元区 | 1241, 1242 | Sum of 2020 census areas: 梅列区 + 三元区. | [Reference](https://zh.wikipedia.org/wiki/2021年中华人民共和国县级以上行政区划变更列表) |
| 410308 | 孟津区 | 1620, 1622 | Sum of 2020 census areas: 吉利区 + 孟津县. | [Reference](https://oss.ly.gov.cn/upload-file/files/20251218/b40ce6e1eee9457397ae7d1273a19346.pdf) |
| 460302 | 西沙区 | 2345, 2347 | Sum of 2020 census areas: 西沙群岛 + 中沙群岛的岛礁及其海域. | [Reference](https://www.mod.gov.cn/gfbw/qwfb/4863771.html?big=fan) |

## Blank or previously missing figures

| Code | Region | Measure | Previous website | Workbook | Cell | Treatment |
| --- | --- | --- | ---: | ---: | --- | --- |
| — | None | — | — | — | — | — |

## Unmatched workbook rows

Every unmatched row is listed, including national totals, intermediate totals, functional zones without atlas boundaries, and historic divisions. These are preserved in the extracted source; omission here never means a zero population.

| Workbook row | Province | Region | Total | Reason |
| ---: | --- | --- | ---: | --- |
| 6 | 全国 | 合计 | 1,409,778,724 | National total; not a mapped subdivision |
| 8 | 北京市 | 市辖区 | 21,893,095 | Aggregate row, not a selectable region |
| 26 | 天津市 | 市辖区 | 13,866,009 | Aggregate row, not a selectable region |
| 64 | 河北省 | 石家庄高新技术产业开发区 | 304,675 | Functional area without a separate atlas boundary |
| 65 | 河北省 | 石家庄循环化工园区 | 56,147 | Functional area without a separate atlas boundary |
| 81 | 河北省 | 河北唐山芦台经济开发区 | 43,558 | Functional area without a separate atlas boundary |
| 82 | 河北省 | 唐山市汉沽管理区 | 52,550 | Functional area without a separate atlas boundary |
| 83 | 河北省 | 唐山高新技术产业开发区 | 169,923 | Functional area without a separate atlas boundary |
| 84 | 河北省 | 河北唐山海港经济开发区 | 98,218 | Functional area without a separate atlas boundary |
| 96 | 河北省 | 秦皇岛市经济技术开发区 | 197,898 | Functional area without a separate atlas boundary |
| 97 | 河北省 | 北戴河新区 | 74,732 | Functional area without a separate atlas boundary |
| 116 | 河北省 | 邯郸经济技术开发区 | 294,436 | Functional area without a separate atlas boundary |
| 117 | 河北省 | 邯郸冀南新区 | 285,480 | Functional area without a separate atlas boundary |
| 136 | 河北省 | 河北邢台经济开发区 | 182,585 | Functional area without a separate atlas boundary |
| 160 | 河北省 | 保定高新技术产业开发区 | 96,301 | Functional area without a separate atlas boundary |
| 161 | 河北省 | 保定白沟新城 | 153,132 | Functional area without a separate atlas boundary |
| 183 | 河北省 | 张家口经济开发区 | 257,331 | Functional area without a separate atlas boundary |
| 184 | 河北省 | 张家口市察北管理区 | 16,915 | Functional area without a separate atlas boundary |
| 185 | 河北省 | 张家口市寨北管理区 | 6,592 | Functional area without a separate atlas boundary |
| 197 | 河北省 | 承德高新技术产业开发区 | 135,375 | Functional area without a separate atlas boundary |
| 212 | 河北省 | 河北沧州经济开发区 | 31,524 | Functional area without a separate atlas boundary |
| 213 | 河北省 | 沧州高新技术产业开发区 | 14,953 | Functional area without a separate atlas boundary |
| 214 | 河北省 | 沧州渤海新区 | 153,135 | Functional area without a separate atlas boundary |
| 228 | 河北省 | 廊坊经济技术开发区 | 128,967 | Functional area without a separate atlas boundary |
| 242 | 河北省 | 河北衡水高新技术产业开发区 | 144,731 | Functional area without a separate atlas boundary |
| 243 | 河北省 | 衡水滨湖新区 | 79,771 | Functional area without a separate atlas boundary |
| 256 | 山西省 | 山西转型综合改革示范区 | 258,826 | Functional area without a separate atlas boundary |
| 269 | 山西省 | 山西大同经济开发区 | 16,809 | Functional area without a separate atlas boundary |
| 302 | 山西省 | 山西朔州经济开发区 | 71,744 | Functional area without a separate atlas boundary |
| 344 | 山西省 | 五台山风景名胜区 | 17,050 | Functional area without a separate atlas boundary |
| 389 | 内蒙古自治区 | 呼和浩特经济技术开发区 | 136,150 | Functional area without a separate atlas boundary |
| 400 | 内蒙古自治区 | 包头稀土高新技术产业开发区 | 184,127 | Functional area without a separate atlas boundary |
| 426 | 内蒙古自治区 | 通辽经济技术开发区 | 203,143 | Functional area without a separate atlas boundary |
| 493 | 内蒙古自治区 | 乌拉盖管委会 | 23,466 | Functional area without a separate atlas boundary |
| 498 | 内蒙古自治区 | 内蒙古阿拉善经济开发区 | 27,214 | Functional area without a separate atlas boundary |
| 624 | 吉林省 | 长春经济技术开发区 | 429,387 | Functional area without a separate atlas boundary |
| 625 | 吉林省 | 长春净月高新技术产业开发区 | 408,740 | Functional area without a separate atlas boundary |
| 626 | 吉林省 | 长春高新技术产业开发区 | 460,607 | Functional area without a separate atlas boundary |
| 627 | 吉林省 | 长春汽车经济技术开发区 | 317,978 | Functional area without a separate atlas boundary |
| 637 | 吉林省 | 吉林经济开发区 | 55,692 | Functional area without a separate atlas boundary |
| 638 | 吉林省 | 吉林高新技术产业开发区 | 162,447 | Functional area without a separate atlas boundary |
| 639 | 吉林省 | 吉林中国新加坡食品区 | 37,164 | Functional area without a separate atlas boundary |
| 675 | 吉林省 | 吉林松原经济开发区 | 94,066 | Functional area without a separate atlas boundary |
| 681 | 吉林省 | 吉林白城经济开发区 | 118,222 | Functional area without a separate atlas boundary |
| 768 | 黑龙江省 | 大庆高新技术产业开发区 | 233,779 | Functional area without a separate atlas boundary |
| 830 | 黑龙江省 | 松岭区 | 15,996 | Historical division or source label without a matching atlas boundary |
| 831 | 黑龙江省 | 新林区 | 20,362 | Historical division or source label without a matching atlas boundary |
| 832 | 黑龙江省 | 呼中区 | 16,359 | Historical division or source label without a matching atlas boundary |
| 834 | 上海市 | 市辖区 | 24,870,895 | Aggregate row, not a selectable region |
| 881 | 江苏省 | 徐州经济技术开发区 | 381,407 | Functional area without a separate atlas boundary |
| 897 | 江苏省 | 苏州工业园区 | 1,133,927 | Functional area without a separate atlas boundary |
| 907 | 江苏省 | 南通经济技术开发区 | 332,273 | Functional area without a separate atlas boundary |
| 919 | 江苏省 | 连云港经济技术开发区 | 90,248 | Functional area without a separate atlas boundary |
| 920 | 江苏省 | 连云港高新技术产业开发区 | 173,232 | Functional area without a separate atlas boundary |
| 929 | 江苏省 | 淮安经济技术开发区 | 416,180 | Functional area without a separate atlas boundary |
| 939 | 江苏省 | 盐城经济技术开发区 | 103,004 | Functional area without a separate atlas boundary |
| 946 | 江苏省 | 扬州经济技术开发区 | 238,785 | Functional area without a separate atlas boundary |
| 953 | 江苏省 | 镇江新区 | 263,813 | Functional area without a separate atlas boundary |
| 961 | 江苏省 | 泰州医药高新技术产业开发区 | 222,691 | Functional area without a separate atlas boundary |
| 971 | 江苏省 | 宿迁经济技术开发区 | 189,245 | Functional area without a separate atlas boundary |
| 976 | 浙江省 | 江干区 | 1,487,787 | Historical division or source label without a matching atlas boundary |
| 1008 | 浙江省 | 温州经济技术开发区 | 249,343 | Functional area without a separate atlas boundary |
| 1085 | 安徽省 | 合肥高新技术产业开发区 | 269,922 | Functional area without a separate atlas boundary |
| 1086 | 安徽省 | 合肥经济技术开发区 | 557,858 | Functional area without a separate atlas boundary |
| 1087 | 安徽省 | 合肥新站高新技术产业开发区 | 466,464 | Functional area without a separate atlas boundary |
| 1097 | 安徽省 | 芜湖经济技术开发区 | 181,034 | Functional area without a separate atlas boundary |
| 1098 | 安徽省 | 安徹芜湖长江大桥经济开发区 | 22,298 | Functional area without a separate atlas boundary |
| 1108 | 安徽省 | 蚌埠市高新技术开发区 | 61,850 | Functional area without a separate atlas boundary |
| 1109 | 安徽省 | 蚌埠市经济开发区 | 276,637 | Functional area without a separate atlas boundary |
| 1144 | 安徽省 | 安徽安庆经济开发区 | 140,015 | Functional area without a separate atlas boundary |
| 1162 | 安徽省 | 苏滁现代产业园 | 23,609 | Functional area without a separate atlas boundary |
| 1163 | 安徽省 | 滁州经济技术开发区 | 141,870 | Functional area without a separate atlas boundary |
| 1174 | 安徽省 | 阜阳合肥现代产业园区 | 40,352 | Functional area without a separate atlas boundary |
| 1175 | 安徽省 | 阜阳经济技术开发区 | 123,468 | Functional area without a separate atlas boundary |
| 1183 | 安徽省 | 宿州马鞍山现代产业园区 | 48,012 | Functional area without a separate atlas boundary |
| 1184 | 安徽省 | 宿州经济技术开发区 | 59,591 | Functional area without a separate atlas boundary |
| 1209 | 安徽省 | 宣城市经济开发区 | 106,576 | Functional area without a separate atlas boundary |
| 1432 | 山东省 | 济南高新技术产业开发区 | 424,047 | Functional area without a separate atlas boundary |
| 1441 | 山东省 | 青岛高新技术产业开发区 | 41,823 | Functional area without a separate atlas boundary |
| 1467 | 山东省 | 东营经济技术开发区 | 81,814 | Functional area without a separate atlas boundary |
| 1468 | 山东省 | 东营港经济开发区 | 3,614 | Functional area without a separate atlas boundary |
| 1475 | 山东省 | 烟台高新技术产业开发区 | 83,847 | Functional area without a separate atlas boundary |
| 1476 | 山东省 | 烟台经济技术开发区 | 416,452 | Functional area without a separate atlas boundary |
| 1490 | 山东省 | 潍坊滨海经济技术开发区 | 136,714 | Functional area without a separate atlas boundary |
| 1507 | 山东省 | 济宁高新技术产业开发区 | 334,601 | Functional area without a separate atlas boundary |
| 1520 | 山东省 | 威海火炬高技术产业开发区 | 336,407 | Functional area without a separate atlas boundary |
| 1521 | 山东省 | 威海经济技术开发区 | 280,457 | Functional area without a separate atlas boundary |
| 1522 | 山东省 | 威海临港经济技术开发区 | 101,673 | Functional area without a separate atlas boundary |
| 1530 | 山东省 | 日照经济技术开发区 | 168,493 | Functional area without a separate atlas boundary |
| 1544 | 山东省 | 临沂高新技术产业开发区 | 146,529 | Functional area without a separate atlas boundary |
| 1555 | 山东省 | 德州经济技术开发区 | 284,708 | Functional area without a separate atlas boundary |
| 1556 | 山东省 | 德州运河经济开发区 | 118,810 | Functional area without a separate atlas boundary |
| 1586 | 山东省 | 荷泽经济技术开发区 | 412,353 | Functional area without a separate atlas boundary |
| 1587 | 山东省 | 荷泽高新技术开发区 | 185,162 | Functional area without a separate atlas boundary |
| 1597 | 河南省 | 郑州经济技术开发区 | 328,812 | Functional area without a separate atlas boundary |
| 1598 | 河南省 | 郑州高新技术产业开发区 | 546,226 | Functional area without a separate atlas boundary |
| 1599 | 河南省 | 郑州航空港经济综合实验区 | 621,382 | Functional area without a separate atlas boundary |
| 1630 | 河南省 | 洛阳高新技术产业开发区 | 208,845 | Functional area without a separate atlas boundary |
| 1641 | 河南省 | 平顶山高新技术产业开发区 | 53,555 | Functional area without a separate atlas boundary |
| 1642 | 河南省 | 平顶山市城乡一体化示范区 | 128,195 | Functional area without a separate atlas boundary |
| 1654 | 河南省 | 安阳高新技术产业开发区 | 193,017 | Functional area without a separate atlas boundary |
| 1662 | 河南省 | 鹤壁经济技术开发区 | 42,622 | Functional area without a separate atlas boundary |
| 1673 | 河南省 | 新乡高新技术产业开发区 | 136,917 | Functional area without a separate atlas boundary |
| 1674 | 河南省 | 新乡经济技术开发区 | 41,270 | Functional area without a separate atlas boundary |
| 1675 | 河南省 | 新乡市平原城乡一体化示范区 | 206,350 | Functional area without a separate atlas boundary |
| 1688 | 河南省 | 焦作城乡一体化示范区 | 207,029 | Functional area without a separate atlas boundary |
| 1698 | 河南省 | 河南濮阳工业园区 | 27,299 | Functional area without a separate atlas boundary |
| 1699 | 河南省 | 濮阳经济技术开发区 | 329,185 | Functional area without a separate atlas boundary |
| 1705 | 河南省 | 许昌经济技术开发区 | 69,498 | Functional area without a separate atlas boundary |
| 1714 | 河南省 | 漯河经济技术开发区 | 98,176 | Functional area without a separate atlas boundary |
| 1720 | 河南省 | 河南三门峡经济开发区 | 42,041 | Functional area without a separate atlas boundary |
| 1736 | 河南省 | 南阳高新技术产业开发区 | 226,911 | Functional area without a separate atlas boundary |
| 1737 | 河南省 | 南阳市城乡一体化示范区 | 225,116 | Functional area without a separate atlas boundary |
| 1748 | 河南省 | 豫东综合物流产业聚集区 | 139,093 | Historical division or source label without a matching atlas boundary |
| 1749 | 河南省 | 河南商丘经济开发区 | 176,334 | Functional area without a separate atlas boundary |
| 1762 | 河南省 | 信阳高新技术产业开发区 | 23,523 | Functional area without a separate atlas boundary |
| 1773 | 河南省 | 河南周口经济开发区 | 90,620 | Functional area without a separate atlas boundary |
| 1786 | 河南省 | 河南驻马店经济开发区 | 268,684 | Functional area without a separate atlas boundary |
| 1787 | 河南省 | 省直辖县级行政区划 | 727,265 | Aggregate row, not a selectable region |
| 1868 | 湖北省 | 荆州经济技术开发区 | 190,084 | Functional area without a separate atlas boundary |
| 1881 | 湖北省 | 龙感湖管理区 | 27,855 | Functional area without a separate atlas boundary |
| 1904 | 湖北省 | 省直辖县级行政区划 | 3,380,473 | Aggregate row, not a selectable region |
| 1929 | 湖南省 | 云龙示范区 | 115,818 | Functional area without a separate atlas boundary |
| 1935 | 湖南省 | 湖南湘潭高新技术产业园区 | 62,749 | Functional area without a separate atlas boundary |
| 1936 | 湖南省 | 湘潭昭山示范区 | 30,775 | Functional area without a separate atlas boundary |
| 1937 | 湖南省 | 湘源九华示范区 | 186,423 | Functional area without a separate atlas boundary |
| 1951 | 湖南省 | 衡阳综合保税区 | 30,206 | Functional area without a separate atlas boundary |
| 1952 | 湖南省 | 湖南衡阳高新技术产业园区 | 183,686 | Functional area without a separate atlas boundary |
| 1953 | 湖南省 | 湖南衡阳松木经济开发区 | 16,651 | Functional area without a separate atlas boundary |
| 1977 | 湖南省 | 岳阳市届原管理区 | 71,521 | Functional area without a separate atlas boundary |
| 1989 | 湖南省 | 常德市西洞庭管理区 | 49,892 | Functional area without a separate atlas boundary |
| 2002 | 湖南省 | 益阳市大通湖管理区 | 83,100 | Functional area without a separate atlas boundary |
| 2003 | 湖南省 | 湖南益阳高新技术产业园区 | 159,188 | Functional area without a separate atlas boundary |
| 2029 | 湖南省 | 永州经济技术开发区 | 47,111 | Functional area without a separate atlas boundary |
| 2030 | 湖南省 | 永州市金洞管理区 | 40,874 | Functional area without a separate atlas boundary |
| 2031 | 湖南省 | 永州市回龙圩管理区 | 10,077 | Functional area without a separate atlas boundary |
| 2044 | 湖南省 | 怀化市洪江管理区 | 57,004 | Functional area without a separate atlas boundary |
| 2188 | 广东省 | 市辖区 | 10,466,625 | Aggregate row, not a selectable region |
| 2190 | 广东省 | 市辖区 | 4,418,060 | Aggregate row, not a selectable region |
| 2349 | 海南省 | 市辖区 | 954,259 | Aggregate row, not a selectable region |
| 2350 | 海南省 | 省直辖县级行政区划 | 5,219,886 | Aggregate row, not a selectable region |
| 2367 | 重庆市 | 市辖区 | 25,379,469 | Aggregate row, not a selectable region |
| 2394 | 重庆市 | 县 | 6,674,690 | Aggregate row, not a selectable region |
| 2486 | 四川省 | 内江经济开发区 | 87,914 | Functional area without a separate atlas boundary |
| 2542 | 四川省 | 达州经济开发区 | 45,463 | Functional area without a separate atlas boundary |
| 2559 | 四川省 | 巴中经济开发区 | 67,504 | Functional area without a separate atlas boundary |
| 2869 | 西藏自治区 | 拉萨经济技术开发区 | 11,804 | Functional area without a separate atlas boundary |
| 2870 | 西藏自治区 | 西藏文化旅游创意园区 | 4,689 | Functional area without a separate atlas boundary |
| 2871 | 西藏自治区 | 达孜工业园区 | 632 | Functional area without a separate atlas boundary |
| 3072 | 甘肃省 | 兰州新区 | 288,200 | Functional area without a separate atlas boundary |
| 3074 | 甘肃省 | 市辖区 | 312,663 | Aggregate row, not a selectable region |
| 3358 | 新疆维吾尔自治区 | 自治区直辖县级行政区划 | 1,573,931 | Aggregate row, not a selectable region |

## Source consistency

All matched rows pass integer, male + female, urban + rural, and population subset checks (blank components are not imported as zero).
