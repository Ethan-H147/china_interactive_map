// City quizzes outside the US: cities (not metro areas) by cumulative difficulty, as dots.
// China: grouped by province (adcode), so each city is matched inside its own province.
// Russia: cities anywhere in the Russia layer; a few same-name towns carry their region.
// Tiers: e easy, m medium, h hard, x expert, M master.
export const tiers={e:'easy',m:'medium',h:'hard',x:'expert',M:'master'};
export const chinaProvinces={110000:'Beijing',120000:'Tianjin',130000:'Hebei',140000:'Shanxi',150000:'Inner Mongolia',210000:'Liaoning',220000:'Jilin',230000:'Heilongjiang',310000:'Shanghai',320000:'Jiangsu',330000:'Zhejiang',340000:'Anhui',350000:'Fujian',360000:'Jiangxi',370000:'Shandong',410000:'Henan',420000:'Hubei',430000:'Hunan',440000:'Guangdong',450000:'Guangxi',460000:'Hainan',500000:'Chongqing',510000:'Sichuan',520000:'Guizhou',530000:'Yunnan',540000:'Tibet',610000:'Shaanxi',620000:'Gansu',630000:'Qinghai',640000:'Ningxia',650000:'Xinjiang',710000:'Taiwan',810000:'Hong Kong',820000:'Macau'};
// Taiwan's cities are shown behind the quiz's Include Taiwan option, as in the prefecture quiz.
export const chinaCities={
 110000:'Beijing e',310000:'Shanghai e',120000:'Tianjin e',500000:'Chongqing e',810000:'Hong Kong e',820000:'Macau e',
 440000:'Guangzhou e,Shenzhen e,Foshan h,Dongguan h,Zhuhai h,Shantou h,Huizhou h,Zhanjiang x,Jiangmen x,Zhongshan x,Zhaoqing x,Chaozhou x,Maoming M,Shaoguan M,Meizhou M,Jieyang M',
 510000:'Chengdu e,Mianyang h,Leshan h,Yibin x,Luzhou x,Nanchong x,Panzhihua x,Zigong M,Dazhou M,Kangding M',
 610000:"Xi'an e,Yan'an h,Xianyang x,Hanzhong x,Baoji x,Yulin M",
 420000:'Wuhan e,Yichang h,Xiangyang h,Jingzhou x,Shiyan x,Huangshi M',
 330000:'Hangzhou e,Ningbo m,Shaoxing h,Wenzhou h,Yiwu h,Jinhua x,Taizhou x,Huzhou x,Jiaxing x,Zhoushan x,Quzhou M,Lishui M',
 320000:"Nanjing e,Suzhou m,Wuxi h,Changzhou h,Nantong h,Xuzhou h,Yangzhou h,Lianyungang x,Yancheng x,Huai'an x,Zhenjiang x,Suqian M,Taizhou M",
 540000:'Lhasa e,Shigatse h,Nyingchi x,Qamdo M,Shiquanhe M',
 230000:'Harbin m,Daqing h,Qiqihar h,Mudanjiang x,Jiamusi x,Mohe M',
 210000:'Shenyang m,Dalian m,Anshan h,Dandong x,Jinzhou x,Fushun x,Benxi M,Yingkou M',
 220000:'Changchun m,Jilin h,Yanji x,Siping M,Tonghua M',
 130000:'Shijiazhuang m,Tangshan h,Baoding h,Qinhuangdao h,Handan x,Zhangjiakou x,Chengde x,Cangzhou x,Langfang x,Xingtai M',
 140000:'Taiyuan m,Datong h,Changzhi x,Linfen M,Yuncheng M,Pingyao M',
 150000:'Hohhot m,Baotou h,Ordos h,Chifeng x,Hailar x,Manzhouli x,Erenhot M',
 370000:"Jinan m,Qingdao m,Yantai h,Weifang h,Weihai h,Zibo x,Linyi x,Jining x,Tai'an x,Dongying M,Rizhao M,Liaocheng M,Dezhou M,Heze M,Binzhou M,Zaozhuang M,Qufu M",
 410000:'Zhengzhou m,Luoyang h,Kaifeng h,Nanyang x,Xinxiang x,Anyang x,Shangqiu x,Pingdingshan M,Zhoukou M,Xinyang M,Jiaozuo M',
 340000:"Hefei m,Wuhu h,Huangshan h,Bengbu x,Anqing x,Huainan M,Ma'anshan M,Fuyang M",
 360000:'Nanchang m,Ganzhou x,Jiujiang x,Jingdezhen x,Shangrao M,Pingxiang M',
 430000:'Changsha m,Hengyang x,Changde x,Yueyang x,Xiangtan x,Zhangjiajie x,Shaoyang M,Huaihua M',
 350000:'Fuzhou m,Xiamen m,Quanzhou h,Zhangzhou x,Putian M,Longyan M,Nanping M,Ningde M,Wuyishan M',
 450000:'Nanning m,Guilin m,Liuzhou h,Beihai h,Wuzhou x,Qinzhou x,Guigang M,Yulin M,Baise M',
 460000:'Haikou m,Sanya m,Danzhou M',
 520000:'Guiyang m,Zunyi h,Anshun x,Kaili M,Liupanshui M',
 530000:'Kunming m,Lijiang h,Dali h,Qujing x,Shangri-La x,Tengchong M,Ruili M',
 620000:'Lanzhou m,Dunhuang h,Tianshui x,Zhangye x,Jiayuguan x',
 630000:'Xining m,Golmud x',
 640000:'Yinchuan m,Shizuishan M,Zhongwei M',
 650000:'Ürümqi m,Kashgar m,Turpan h,Karamay x,Yining x,Korla x,Hotan x,Hami M,Altay M,Kuqa M',
 710000:'Taipei e,Kaohsiung m,Taichung m,Tainan m,Hsinchu h,Keelung h,Hualien h,Taoyuan x,Chiayi x,Taitung x,Pingtung M,Yilan M'
};
export const russiaCities={
 e:'Moscow,Saint Petersburg,Novosibirsk,Yekaterinburg,Kazan,Vladivostok,Sochi,Volgograd',
 m:'Irkutsk,Murmansk,Kaliningrad,Nizhny Novgorod,Chelyabinsk,Krasnoyarsk,Samara,Ufa,Rostov-on-Don,Omsk,Krasnodar,Voronezh,Perm,Saratov,Tyumen,Khabarovsk,Yakutsk,Arkhangelsk,Petropavlovsk-Kamchatsky,Norilsk,Grozny,Yaroslavl,Magadan',
 h:'Tolyatti,Izhevsk,Barnaul,Ulyanovsk,Tomsk,Kemerovo,Novokuznetsk,Orenburg,Ryazan,Astrakhan,Tula,Kirov,Tver,Vladimir,Smolensk,Kaluga,Kursk,Belgorod,Ulan-Ude,Chita,Makhachkala,Vladikavkaz,Pskov,Veliky Novgorod,Petrozavodsk,Vologda,Yuzhno-Sakhalinsk,Komsomolsk-on-Amur,Blagoveshchensk,Naberezhnye Chelny,Penza,Lipetsk',
 x:'Maykop,Gorno-Altaysk,Magas,Nalchik,Elista,Cherkessk,Syktyvkar,Yoshkar-Ola,Saransk,Kyzyl,Abakan,Cheboksary,Stavropol,Bryansk,Ivanovo,Kostroma,Kurgan,Oryol,Tambov,Birobidzhan,Anadyr,Khanty-Mansiysk,Naryan-Mar,Salekhard,Magnitogorsk,Nizhny Tagil,Surgut,Nizhnevartovsk,Novy Urengoy,Tobolsk,Vorkuta,Severodvinsk,Cherepovets,Pyatigorsk,Derbent,Bratsk,Nakhodka,Ussuriysk,Suzdal,Novorossiysk,Taganrog,Sterlitamak,Dubna',
 M:'Angarsk,Orsk,Balakovo,Rybinsk,Uglich,Rostov,Pereslavl-Zalessky,Sergiev Posad,Murom,Kolomna,Podolsk,Balashikha,Khimki,Krasnogorsk,Gatchina,Vyborg,Shakhty,Volzhsky,Kamensk-Uralsky,Zlatoust,Miass,Berezniki,Ukhta,Kotlas,Kandalaksha,Apatity,Dudinka,Mirny,Neryungri,Tynda,Okha,Korsakov,Tiksi,Verkhoyansk,Oymyakon,Pevek,Dikson,Sovetsk,Baltiysk,Anapa,Gelendzhik,Kislovodsk,Yessentuki'
};
// Same-name places: the region (as the Russia catalogue names it) that holds the intended town.
export const russiaRegions={Mirny:'Sakha',Dubna:'Moscow Oblast',Rostov:'Yaroslavl Oblast',Sovetsk:'Kaliningrad Oblast',Kirov:'Kirov Oblast'};
// Display names for towns whose plain name is ambiguous with a bigger place.
export const russiaDisplay={Rostov:'Rostov Veliky'};
export const cityAliases={'Hong Kong':['HK'],Macau:['Macao'],'Ürümqi':['Urumqi','Wulumuqi'],Kashgar:['Kashi'],Shigatse:['Xigaze','Rikaze'],Hailar:['Hulunbuir'],'Shangri-La':['Zhongdian','Xianggelila'],Hohhot:['Huhhot','Huhehaote'],Taipei:['Taibei'],Kaohsiung:['Gaoxiong'],Taichung:['Taizhong'],Keelung:['Jilong'],'Saint Petersburg':['St Petersburg','St. Petersburg','Petersburg','Leningrad'],Volgograd:['Stalingrad'],'Rostov-on-Don':['Rostov-na-Donu'],'Yekaterinburg':['Ekaterinburg'],'Petropavlovsk-Kamchatsky':['Petropavlovsk'],'Rostov':['Rostov Velikiy'],'Nizhny Novgorod':['Nizhniy Novgorod'],'Veliky Novgorod':['Novgorod']};
// Western Europe: three cumulative levels (easy, medium, hard), as comma lists per tier.
export const europeCities={
 spain:{e:'Madrid,Barcelona,Valencia,Seville,Málaga,Bilbao,Granada,Palma',
  m:'Zaragoza,Córdoba,Alicante,Valladolid,Salamanca,Toledo,Segovia,San Sebastián,Santiago de Compostela,Pamplona,Santander,Oviedo,Gijón,A Coruña,Vigo,Cádiz,Murcia,Las Palmas,Santa Cruz de Tenerife,Ibiza',
  h:'Vitoria-Gasteiz,Albacete,Almería,Ávila,Badajoz,Burgos,Cáceres,Castellón de la Plana,Ciudad Real,Cuenca,Girona,Guadalajara,Huelva,Huesca,Jaén,León,Lleida,Logroño,Lugo,Ourense,Palencia,Pontevedra,Soria,Tarragona,Teruel,Zamora,Mérida,Ceuta,Melilla,Jerez de la Frontera,Marbella,Cartagena,Elche'},
 germany:{e:'Berlin,Hamburg,Munich,Cologne,Frankfurt,Stuttgart,Düsseldorf,Dresden,Leipzig',
  m:'Bremen,Hanover,Nuremberg,Dortmund,Essen,Bonn,Heidelberg,Freiburg,Mainz,Wiesbaden,Saarbrücken,Kiel,Lübeck,Rostock,Schwerin,Potsdam,Erfurt,Magdeburg,Münster,Aachen,Augsburg,Regensburg',
  h:'Duisburg,Bochum,Wuppertal,Gelsenkirchen,Mönchengladbach,Bielefeld,Mannheim,Karlsruhe,Braunschweig,Wolfsburg,Chemnitz,Halle,Kassel,Würzburg,Bamberg,Bayreuth,Ulm,Ingolstadt,Passau,Oldenburg,Osnabrück,Göttingen,Jena,Weimar,Trier,Koblenz,Flensburg,Konstanz,Cottbus,Görlitz'},
 'united-kingdom':{e:'London,Birmingham,Manchester,Liverpool,Oxford,Cambridge,Edinburgh,Glasgow,Cardiff,Belfast',
  m:'Leeds,Sheffield,Bristol,Newcastle upon Tyne,Nottingham,Leicester,Southampton,Brighton,York,Bath,Plymouth,Norwich,Canterbury,Stratford-upon-Avon,Aberdeen,Dundee,Inverness,Swansea,Derry',
  h:'Coventry,Bradford,Hull,Stoke-on-Trent,Wolverhampton,Portsmouth,Reading,Milton Keynes,Sunderland,Middlesbrough,Preston,Blackpool,Exeter,Gloucester,Chester,Lincoln,Durham,Carlisle,Lancaster,Worcester,Hereford,Salisbury,Winchester,Ipswich,Peterborough,Northampton,Luton,Stirling,Perth,St Andrews,Newport,Wrexham,Bangor,Armagh'},
 france:{e:'Paris,Marseille,Lyon,Toulouse,Nice,Bordeaux,Strasbourg,Lille',
  m:'Nantes,Montpellier,Rennes,Reims,Rouen,Le Havre,Caen,Grenoble,Dijon,Avignon,Cannes,Tours,Orléans,Brest,Ajaccio,Calais,Versailles,Annecy,Metz,Nancy,Clermont-Ferrand,Saint-Malo,Biarritz',
  h:'Limoges,Poitiers,Besançon,Amiens,Perpignan,Nîmes,Toulon,Saint-Étienne,Angers,Le Mans,La Rochelle,Pau,Bayonne,Mulhouse,Colmar,Troyes,Chartres,Lourdes,Carcassonne,Arles,Aix-en-Provence,Antibes,Chamonix,Saint-Tropez,Bastia,Lorient,Quimper,Vannes,Cherbourg,Dunkirk,Valence,Chambéry,Fort-de-France,Pointe-à-Pitre,Cayenne,Saint-Denis,Mamoudzou'},
 italy:{e:'Rome,Milan,Venice,Florence,Naples,Turin,Bologna,Pisa,Verona,Palermo',
  m:'Genoa,Bari,Trieste,Cagliari,Perugia,Ancona,L\'Aquila,Campobasso,Potenza,Catanzaro,Trento,Aosta,Catania,Siena,Como,Bergamo,Padua,Parma,Lucca,Bolzano,Amalfi,Sorrento',
  h:'Brescia,Vicenza,Treviso,Modena,Reggio Emilia,Ferrara,Ravenna,Rimini,Livorno,Arezzo,Pescara,Foggia,Lecce,Taranto,Brindisi,Salerno,Reggio Calabria,Messina,Syracuse,Agrigento,Trapani,Sassari,Olbia,Udine,La Spezia,Sanremo,Cremona,Mantua,Pavia,Matera,Cosenza,Caserta'}
};
// Region (as each catalogue names it) for same-name places, and cities behind an overseas option.
export const europeRegions={'united-kingdom':{Bangor:'Wales',Newport:'Wales',Perth:'Scotland'},france:{'Saint-Denis':'Réunion','Fort-de-France':'Martinique','Pointe-à-Pitre':'Guadeloupe',Cayenne:'French Guiana',Mamoudzou:'Mayotte'}};
export const europeOverseas={france:['Fort-de-France','Pointe-à-Pitre','Cayenne','Saint-Denis','Mamoudzou']};
export const europeDisplay={'united-kingdom':{Derry:'Derry/Londonderry'},france:{'Saint-Denis':'Saint-Denis, Réunion'}};
export const europeAliases={Derry:['Londonderry','Derry Londonderry'],Hull:['Kingston upon Hull'],'Newcastle upon Tyne':['Newcastle'],Frankfurt:['Frankfurt am Main'],Freiburg:['Freiburg im Breisgau'],Halle:['Halle an der Saale','Halle (Saale)'],Braunschweig:['Brunswick'],Konstanz:['Constance'],Palma:['Palma de Mallorca'],'Las Palmas':['Las Palmas de Gran Canaria'],'San Sebastián':['Donostia'],'Vitoria-Gasteiz':['Vitoria','Gasteiz'],'Castellón de la Plana':['Castellón','Castelló'],Chamonix:['Chamonix-Mont-Blanc'],Cherbourg:['Cherbourg-en-Cotentin'],Dunkirk:['Dunkerque'],'Saint-Denis':['Saint-Denis de la Réunion'],'St Andrews':['St. Andrews','Saint Andrews'],'Stratford-upon-Avon':['Stratford']};
// Exact Wikidata labels where the short name also names a province, constituency or other town.
export const searchNames={'Las Palmas':'Las Palmas de Gran Canaria',Freiburg:'Freiburg im Breisgau',Halle:'Halle (Saale)',Braunschweig:'Brunswick',Konstanz:'Constance'};
