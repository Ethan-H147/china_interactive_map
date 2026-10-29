// Curated identities; coordinates are resolved from pinned Wikidata records or UNESCO component coordinates.
// Fields: scope suffix | question | Chinese | enwiki identity | context | modern locality | optional coverage note.
const rows=`
dynasty-capitals|Yin|殷|Yinxu|Late Shang|Anyang, Henan
dynasty-capitals|Haojing|镐京|Haojing|Western Zhou|Xi'an area, Shaanxi
dynasty-capitals|Xianyang|咸阳|Xianyang|Qin|Xianyang, Shaanxi|City-locality reference; the Qin palace ruins lie east of the modern city.
dynasty-capitals|Chang'an / Daxing|长安／大兴|Xi'an|Western Han and Tang: Chang'an; Sui: Daxing|Xi'an, Shaanxi|Han and Sui–Tang capitals occupied different parts of the same city region; one grouped dot.
dynasty-capitals|Luoyang / Shendu|洛阳／神都|Luoyang|Eastern Han and Northern Wei; Wu Zhou: Shendu|Luoyang, Henan|Successive capital sites in the Luoyang region are grouped.
dynasty-capitals|Jianye / Jiankang / Yingtian|建业／建康／应天|Nanjing|Eastern Wu: Jianye; Eastern Jin and Southern dynasties: Jiankang; early Ming: Yingtian|Nanjing, Jiangsu
dynasty-capitals|Ye|邺|Ye (ancient city)|Eastern Wei and Northern Qi|Linzhang, Hebei
dynasty-capitals|Pingcheng|平城|Datong|Northern Wei, before the move to Luoyang|Datong, Shanxi
dynasty-capitals|Bianjing / Dongjing|汴京／东京|Kaifeng|Northern Song|Kaifeng, Henan
dynasty-capitals|Lin'an|临安|Hangzhou|Southern Song|Hangzhou, Zhejiang
dynasty-capitals|Dadu / Beijing|大都／北京|Beijing|Yuan: Dadu; Ming and Qing: Beijing|Beijing|Yuan and later imperial city centers share a city-locality dot.
dynasty-capitals|Shangdu|上都|Shangdu|Yuan summer capital|Zhenglan Banner, Inner Mongolia
dynasty-capitals|Shengjing|盛京|Shenyang|Later Jin and early Qing|Shenyang, Liaoning
dynasty-capitals|Xingqing|兴庆|Yinchuan|Western Xia|Yinchuan, Ningxia
dynasty-capitals|Shangjing Huining|上京会宁|Huining Prefecture|Jin, before the move to Zhongdu|Acheng, Harbin, Heilongjiang
dynasty-capitals|Shangjing Linhuang|上京临潢|Shangjing (Liao dynasty)|Liao upper capital|Bairin Left Banner, Inner Mongolia
dynasty-capitals|Dali|大理|Dali Town|Dali Kingdom|Dali, Yunnan
ancient-battles|Muye|牧野之战|Battle of Muye|c. 1046 BCE · Zhou against Shang|Xinxiang area, Henan|Traditional battlefield locality; no exact battle footprint is asserted.
ancient-battles|Changping|长平之战|Battle of Changping|260 BCE · Qin against Zhao|Gaoping, Shanxi
ancient-battles|Julu|巨鹿之战|Battle of Julu|207 BCE · Xiang Yu against Qin|Pingxiang area, Hebei|Ancient Julu is represented by the battle locality, not the modern county center.
ancient-battles|Jingxing|井陉之战|Battle of Jingxing|204 BCE · Han Xin against Zhao|Jingxing, Hebei
ancient-battles|Gaixia|垓下之战|Battle of Gaixia|202 BCE · Han against Chu|Guzhen, Anhui|Representative traditional battle locality.
ancient-battles|Kunyang|昆阳之战|Battle of Kunyang|23 CE · rebels against Xin|Ye County, Henan
ancient-battles|Guandu|官渡之战|Battle of Guandu|200 CE · Cao Cao against Yuan Shao|Zhongmu, Henan
ancient-battles|Red Cliffs|赤壁之战|Battle of Red Cliffs|208–209 CE · Sun Quan and Liu Bei against Cao Cao|Chibi, Hubei|The precise battle location is debated; the dot uses the traditional Chibi site, not Su Shi's literary Red Cliff at Huangzhou.
ancient-battles|Yiling|夷陵之战|Battle of Xiaoting|222 CE · Eastern Wu against Shu Han|Yichang area, Hubei|Locality reference for the Yiling/Xiaoting campaign.
ancient-battles|Fei River|淝水之战|Battle of Fei River|383 CE · Eastern Jin against Former Qin|Shouxian area, Anhui|Reference near ancient Shouyang; the battlefield covered a broader river landscape.
ancient-battles|Hulao|虎牢之战|Battle of Hulao|621 CE · Tang against Dou Jiande|Sishui, Xingyang, Henan
ancient-battles|Yamen|崖山海战|Battle of Yamen|1279 CE · Yuan against Southern Song|Xinhui, Guangdong|Naval battle locality; the point is not a reconstructed fleet position.
ancient-battles|Diaoyu Fortress|钓鱼城之战|Diaoyucheng|1259 CE · Southern Song fortress against the Mongols|Hechuan, Chongqing
ancient-battles|Xiangyang|襄阳之战|Battle of Xiangyang|1267–1273 CE · Mongols against Southern Song|Xiangyang, Hubei|City-locality reference for the siege of Xiangyang and Fancheng.
ancient-battles|Lake Poyang|鄱阳湖之战|Battle of Lake Poyang|1363 CE · Zhu Yuanzhang against Chen Youliang|Lake Poyang, Jiangxi|Broad naval battle area, not an exact battle position.
ancient-battles|Tumu|土木之变|Tumu Crisis|1449 CE · Oirats against Ming|Huailai, Hebei
silk-road|Chang'an|长安|Xi'an|Eastern Silk Road capital|Xi'an, Shaanxi
silk-road|Luoyang|洛阳|Luoyang|Eastern Silk Road capital|Luoyang, Henan
silk-road|Wuwei|武威|Wuwei, Gansu|Hexi Corridor oasis|Wuwei, Gansu
silk-road|Zhangye|张掖|Zhangye|Hexi Corridor oasis|Zhangye, Gansu
silk-road|Jiuquan|酒泉|Jiuquan|Hexi Corridor oasis|Jiuquan, Gansu
silk-road|Dunhuang|敦煌|Dunhuang|Gateway at the western end of the Hexi Corridor|Dunhuang, Gansu
silk-road|Yumen Pass|玉门关|Yumen Pass|Han frontier gateway|Dunhuang area, Gansu
silk-road|Suoyang|锁阳城|Suoyang City|Walled Silk Road settlement|Guazhou, Gansu
silk-road|Xuanquan Posthouse|悬泉置|Xuanquanzhi|Han postal and reception station|Dunhuang area, Gansu
silk-road|Hami|哈密|Hami|Eastern Xinjiang oasis|Hami, Xinjiang
silk-road|Gaochang / Qocho|高昌|Gaochang|Ancient oasis capital|Turpan, Xinjiang
silk-road|Jiaohe / Yar|交河|Jiaohe ruins|Ancient oasis city|Turpan, Xinjiang
silk-road|Beiting / Beshbalik|北庭|Beshbalik|Northern Tian Shan route|Jimsar, Xinjiang
silk-road|Kucha|龟兹|Kucha|Northern Tarim Basin oasis|Kuqa, Xinjiang
silk-road|Khotan|于阗|Hotan|Southern Tarim Basin oasis|Hotan, Xinjiang
silk-road|Kashgar|喀什|Kashgar|Western Tarim Basin crossroads|Kashgar, Xinjiang
silk-road|Suyab|碎叶|Suyab|City of Ak-Beshim|Chüy Valley, Kyrgyzstan
silk-road|Balasagun|八剌沙衮|Balasagun|Site of Burana|Chüy Valley, Kyrgyzstan
silk-road|Nevaket|新城|Nevaket|Site of Krasnaya Rechka|Chüy Valley, Kyrgyzstan
silk-road|Talgar|塔尔加尔|Talgar|Medieval settlement|Almaty Region, Kazakhstan
sacred-mountains|Mount Tai|泰山|Mount Tai|Eastern Great Mountain|Shandong
sacred-mountains|Mount Hua|华山|Mount Hua|Western Great Mountain|Shaanxi
sacred-mountains|Mount Heng (Hunan)|衡山（南岳）|Mount Heng (Hunan)|Southern Great Mountain|Hunan
sacred-mountains|Mount Heng (Shanxi)|恒山（北岳）|Mount Heng (Shanxi)|Northern Great Mountain|Shanxi
sacred-mountains|Mount Song|嵩山|Mount Song|Central Great Mountain|Henan
sacred-mountains|Mount Wutai|五台山|Mount Wutai|Buddhist sacred mountain|Shanxi
sacred-mountains|Mount Emei|峨眉山|Mount Emei|Buddhist sacred mountain|Sichuan
sacred-mountains|Mount Jiuhua|九华山|Mount Jiuhua|Buddhist sacred mountain|Anhui
sacred-mountains|Mount Putuo|普陀山|Mount Putuo|Buddhist sacred mountain|Zhejiang
sacred-mountains|Mount Wudang|武当山|Wudang Mountains|Taoist sacred mountain|Hubei
sacred-mountains|Mount Qingcheng|青城山|Mount Qingcheng|Taoist sacred mountain|Sichuan
sacred-mountains|Mount Longhu|龙虎山|Mount Longhu|Taoist sacred mountain|Jiangxi
sacred-mountains|Mount Qiyun|齐云山|Mount Qiyun|Taoist sacred mountain|Anhui
wall-passes|Jiayu Pass|嘉峪关|Jiayu Pass|Western Ming Wall gateway|Gansu
wall-passes|Shanhai Pass|山海关|Shanhai Pass|Eastern Ming Wall gateway|Hebei
wall-passes|Juyong Pass|居庸关|Juyong Pass|Northern approach to Beijing|Beijing
wall-passes|Yanmen Pass|雁门关|Yanmen Pass|Northern Shanxi pass|Shanxi
wall-passes|Niangzi Pass|娘子关|Niangzi Pass|Taihang Mountains pass|Shanxi
wall-passes|Zijing Pass|紫荆关|Zijing Pass|Inner Great Wall pass|Hebei
wall-passes|Daoma Pass|倒马关|Daoma Pass|Inner Great Wall pass|Hebei
wall-passes|Gubeikou|古北口|Gubeikou|Great Wall gateway|Beijing
wall-passes|Xifengkou|喜峰口|Xifengkou|Great Wall gateway|Hebei
wall-passes|Huangya Pass|黄崖关|Huangya Pass|Great Wall gateway|Tianjin
wall-passes|Pingxing Pass|平型关|Pingxing Pass|Inner Great Wall pass|Shanxi
wall-passes|Dajing Gate|大境门|Dajingmen|Great Wall gate|Zhangjiakou, Hebei
imperial-tombs|Qin Shi Huang's Mausoleum|秦始皇陵|Mausoleum of the First Qin Emperor|Qin Shi Huang · Qin|Lintong, Xi'an, Shaanxi|The mound of the mausoleum, rather than the separate Terracotta Army museum.
imperial-tombs|Maoling|茂陵|Maoling|Emperor Wu · Western Han|Xingping, Shaanxi
imperial-tombs|Han Yangling|汉阳陵|Han Yang Ling|Emperor Jing and Empress Wang · Western Han|Xianyang, Shaanxi
imperial-tombs|Qianling|乾陵|Qianling Mausoleum|Emperor Gaozong and Wu Zetian · Tang|Qian County, Shaanxi
imperial-tombs|Zhaoling (Tang)|唐昭陵|Zhao Mausoleum (Tang dynasty)|Emperor Taizong · Tang|Liquan, Shaanxi
imperial-tombs|Qiaoling|桥陵|Qiaoling|Emperor Ruizong · Tang|Pucheng, Shaanxi
imperial-tombs|Northern Song Imperial Tombs|北宋皇陵|Song dynasty mausoleums|Northern Song emperors · grouped complex|Gongyi, Henan
imperial-tombs|Western Xia Imperial Tombs|西夏陵|Western Xia mausoleums|Western Xia emperors · grouped complex|Yinchuan, Ningxia
imperial-tombs|Ming Xiaoling|明孝陵|Ming Xiaoling|Hongwu Emperor · Ming|Nanjing, Jiangsu
imperial-tombs|Ming Tombs|明十三陵|Ming tombs|Thirteen Ming imperial tombs · grouped complex|Changping, Beijing
imperial-tombs|Ming Xianling|明显陵|Xianling (Ming dynasty)|Jiajing Emperor's parents · Ming|Zhongxiang, Hubei
imperial-tombs|Eastern Qing Tombs|清东陵|Eastern Qing tombs|Qing emperors · grouped complex|Zunhua, Hebei
imperial-tombs|Western Qing Tombs|清西陵|Western Qing tombs|Qing emperors · grouped complex|Yi County, Hebei
imperial-tombs|Fuling|清福陵|Fuling Tomb|Nurhaci and Empress Xiaocigao · Qing|Shenyang, Liaoning
imperial-tombs|Zhaoling (Qing)|清昭陵|Zhao Mausoleum (Qing dynasty)|Huang Taiji and Empress Xiaoduanwen · Qing|Shenyang, Liaoning
imperial-tombs|Yongling (Qing)|清永陵|Yongling (Qing dynasty)|Qing imperial ancestors|Xinbin, Liaoning
grottoes-temples|Mogao Caves|莫高窟|Mogao Caves|Buddhist cave-art complex|Dunhuang, Gansu
grottoes-temples|Yungang Grottoes|云冈石窟|Yungang Grottoes|Northern Wei cave-art complex|Datong, Shanxi
grottoes-temples|Longmen Grottoes|龙门石窟|Longmen Grottoes|Buddhist cave-art complex|Luoyang, Henan
grottoes-temples|Maijishan Grottoes|麦积山石窟|Maijishan Grottoes|Buddhist cave-art complex|Tianshui, Gansu
grottoes-temples|Bingling Temple|炳灵寺石窟|Bingling Temple|Buddhist cave-art complex|Yongjing, Gansu
grottoes-temples|Kizil Caves|克孜尔石窟|Kizil Caves|Buddhist cave-art complex|Baicheng, Xinjiang
grottoes-temples|Dazu Rock Carvings|大足石刻|Dazu Rock Carvings|Reference for the wider carving sites|Dazu, Chongqing
grottoes-temples|Yulin Caves|榆林窟|Yulin Caves|Buddhist cave-art complex|Guazhou, Gansu
grottoes-temples|Gongxian Grottoes|巩县石窟|Gongxian Grottoes|Buddhist cave-art complex|Gongyi, Henan
grottoes-temples|Xumishan Grottoes|须弥山石窟|Xumishan Grottoes|Buddhist cave-art complex|Guyuan, Ningxia
grottoes-temples|Tiantishan Grottoes|天梯山石窟|Tiantishan Grottoes|Buddhist cave-art complex|Wuwei, Gansu
grottoes-temples|Bezeklik Caves|柏孜克里克千佛洞|Bezeklik Caves|Buddhist cave-art complex|Turpan, Xinjiang
grottoes-temples|Shaolin Temple|少林寺|Shaolin Monastery|Historic Buddhist monastery|Dengfeng, Henan
grottoes-temples|White Horse Temple|白马寺|White Horse Temple|Historic Buddhist temple|Luoyang, Henan
grottoes-temples|Famen Temple|法门寺|Famen Temple|Historic Buddhist temple|Fufeng, Shaanxi
grottoes-temples|Hanging Temple|悬空寺|Hanging Temple|Buddhist, Taoist and Confucian traditions|Hunyuan, Shanxi
grottoes-temples|Yonghe Temple|雍和宫|Yonghe Temple|Tibetan Buddhist monastery|Beijing
grottoes-temples|Lingyin Temple|灵隐寺|Lingyin Temple|Historic Buddhist monastery|Hangzhou, Zhejiang
grottoes-temples|Jokhang|大昭寺|Jokhang|Tibetan Buddhist temple|Lhasa, Tibet
poet-birthplaces|Li Bai|李白|Suyab|Tang · 701–762|Suyab (Ak-Beshim), Kyrgyzstan|The quiz follows the Suyab birthplace attribution; Li Bai's precise birthplace is debated. The dot marks the ancient city, not an identified birth house.
poet-birthplaces|Du Fu|杜甫|Gongyi|Tang · 712–770|Gongyi, Henan
poet-birthplaces|Bai Juyi|白居易|Xinzheng|Tang · 772–846|Xinzheng, Henan
poet-birthplaces|Su Shi & Su Zhe|苏轼／苏辙|Meishan|Northern Song · Su Shi 1037–1101; Su Zhe 1039–1112|Meishan, Sichuan|The brothers share one birthplace-locality dot.
poet-birthplaces|Li Qingzhao|李清照|Zhangqiu District|Song · 1084–c. 1155|Zhangqiu, Jinan, Shandong|Traditional birthplace locality; exact early-life details are uncertain.
poet-birthplaces|Xin Qiji|辛弃疾|Licheng District, Jinan|Southern Song · 1140–1207|Licheng, Jinan, Shandong|District-locality reference for the traditionally attributed Licheng birthplace; not an identified birth house.
poet-birthplaces|Meng Haoran|孟浩然|Xiangyang|Tang · 689–740|Xiangyang, Hubei
poet-birthplaces|Du Mu|杜牧|Xi'an|Tang · 803–852|Chang'an (present-day Xi'an), Shaanxi
poet-birthplaces|Huang Tingjian|黄庭坚|Xiushui County|Northern Song · 1045–1105|Xiushui (historical Fenning), Jiangxi
poet-birthplaces|Li He|李贺|Yiyang County|Tang · 790–816|Fuchang, Yiyang, Henan|Locality reference near the poet's traditionally identified home at Changgu.
poet-birthplaces|Lu You|陆游|Shou County|Southern Song · 1125–1210|Near Shouchun (present-day Shouxian), Anhui|Born aboard a boat near the Huai River according to the Shouxian local-history account. The dot represents the Shouchun locality; Shaoxing was his ancestral home.
poet-birthplaces|Yang Wanli|杨万里|Jishui County|Southern Song · 1127–1206|Jishui, Jiangxi
poet-birthplaces|Wen Tianxiang|文天祥|Ji'an County|Southern Song · 1236–1283|Ji'an, Jiangxi
poet-birthplaces|Tao Yuanming|陶渊明|Chaisang District|Eastern Jin · c. 365–427|Chaisang, Jiujiang, Jiangxi|Traditional locality; the exact birthplace is uncertain.
poet-birthplaces|Qu Yuan|屈原|Zigui County|Warring States · c. 340–278 BCE|Zigui, Hubei|Traditional birthplace locality, rather than an archaeologically identified birth house.
poet-birthplaces|Wang Anshi|王安石|Zhangshu|Northern Song · 1021–1086|Qingjiang (present-day Zhangshu), Jiangxi|Birthplace county reference; Linchuan was his ancestral home. The exact birth-house location is not asserted.
`;
export const chinaMiscPlaces=rows.trim().split('\n').map((line,i)=>{const[scope,en,local,title,period,location,note]=line.split('|');return{id:'CN-MISC-'+String(i+1).padStart(3,'0'),parent:'misc-'+scope,en,local,title,period,location,...(note?{note}:{})};});