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
// Brazil: five cumulative levels like China and Russia; every state capital is in by Hard.
europeCities.brazil={e:'Rio de Janeiro,São Paulo,Brasília,Salvador,Manaus,Recife,Fortaleza,Belo Horizonte,Porto Alegre,Curitiba',
 m:'Belém,Goiânia,Florianópolis,Natal,João Pessoa,Maceió,São Luís,Vitória,Cuiabá,Campo Grande,Teresina,Aracaju,Santos,Campinas',
 h:'Porto Velho,Rio Branco,Boa Vista,Macapá,Palmas,Guarulhos,Osasco,Niterói,São Gonçalo,Duque de Caxias,Nova Iguaçu,Ribeirão Preto,Sorocaba,São José dos Campos,Uberlândia,Contagem,Juiz de Fora,Joinville,Londrina,Feira de Santana,Caxias do Sul,Petrópolis,Ouro Preto,Paraty,Foz do Iguaçu',
 x:'Santo André,São Bernardo do Campo,Mauá,Mogi das Cruzes,Jaboatão dos Guararapes,Olinda,Aparecida de Goiânia,Serra,Vila Velha,Cariacica,Betim,Canoas,Anápolis,Campos dos Goytacazes,Jundiaí,Piracicaba,Bauru,São José do Rio Preto,Montes Claros,Maringá,Ponta Grossa,Cascavel,Blumenau,Pelotas,Santa Maria,Caruaru,Petrolina,Juazeiro do Norte,Campina Grande,Mossoró,Imperatriz,Santarém,Marabá,Vitória da Conquista,Ilhéus,Porto Seguro,Bonito,Gramado,Angra dos Reis,Parintins',
 M:'Uberaba,Divinópolis,Governador Valadares,Ipatinga,Teófilo Otoni,Sete Lagoas,Diamantina,Tiradentes,Volta Redonda,Cabo Frio,Macaé,Nova Friburgo,Guarujá,Ubatuba,Campos do Jordão,Presidente Prudente,Marília,Franca,Araraquara,São Carlos,Chapecó,Criciúma,Itajaí,Balneário Camboriú,Passo Fundo,Rio Grande,Uruguaiana,Chuí,Itabuna,Juazeiro,Barreiras,Lençóis,Sobral,Crato,Parnaíba,Arapiraca,Fernando de Noronha,Corumbá,Ponta Porã,Rondonópolis,Sinop,Ji-Paraná,Cruzeiro do Sul,Tabatinga,São Gabriel da Cachoeira,Altamira,Parauapebas,Araguaína,Oiapoque'};

// Canada and Argentina: four cumulative levels, ending at established regional cities.
europeCities.canada={
 e:'Toronto,Montréal,Vancouver,Ottawa,Calgary,Edmonton,Québec City,Winnipeg,Halifax,Victoria',
 m:"Hamilton,London,Windsor,Kitchener,Niagara Falls,Kelowna,Saskatoon,Regina,St. John's,Saint John,Fredericton,Charlottetown,Whitehorse,Yellowknife,Iqaluit",
 h:'Mississauga,Brampton,Gatineau,Laval,Sherbrooke,Trois-Rivières,Saguenay,Kingston,Greater Sudbury,Thunder Bay,Sault Ste. Marie,Oshawa,Guelph,Surrey,Burnaby,Richmond,Abbotsford,Nanaimo,Moncton,Banff',
 x:'Peterborough,Barrie,Waterloo,St. Catharines,Kamloops,Prince George,Red Deer,Lethbridge,Medicine Hat,Brandon,Sydney,Corner Brook,Jasper,Whistler,Churchill,Drummondville,Rimouski,Prince Rupert,Fort McMurray,Grande Prairie'
};
europeCities.argentina={
 e:'Buenos Aires,Córdoba,Rosario,Mendoza,La Plata,Mar del Plata,Bariloche,Ushuaia',
 m:'Salta,San Miguel de Tucumán,Santa Fe,Paraná,San Juan,Neuquén,San Salvador de Jujuy,Posadas,Corrientes,San Luis,La Rioja,San Fernando del Valle de Catamarca,Santiago del Estero,Resistencia,Formosa,Puerto Iguazú,El Calafate',
 h:'Santa Rosa,Viedma,Rawson,Río Gallegos,Bahía Blanca,Comodoro Rivadavia,Trelew,Puerto Madryn,Río Grande,San Rafael,San Martín de los Andes,Esquel,Tandil,Olavarría,Río Cuarto,Villa María,Concordia,Gualeguaychú,San Nicolás de los Arroyos,Junín',
 x:'Pergamino,Azul,Necochea,Chivilcoy,Balcarce,Zárate,Campana,Reconquista,Rafaela,Venado Tuerto,San Francisco,Villa Mercedes,General Roca,Cipolletti,Zapala,Eldorado,Oberá,Termas de Río Hondo,Chilecito,San Ramón de la Nueva Orán'
};

// Region (as each catalogue names it) for same-name places, and cities behind an overseas option.
export const europeRegions={brazil:{Palmas:'Tocantins',Vitória:'Espírito Santo',Serra:'Espírito Santo',Bonito:'Mato Grosso do Sul',Lençóis:'Bahia','Santa Maria':'Rio Grande do Sul','Rio Grande':'Rio Grande do Sul',Juazeiro:'Bahia',Crato:'Ceará',Altamira:'Pará','Cruzeiro do Sul':'Acre',Tabatinga:'Amazonas','Campo Grande':'Mato Grosso do Sul','Boa Vista':'Roraima','Rio Branco':'Acre',Belém:'Pará',Natal:'Rio Grande do Norte','São Gonçalo':'Rio de Janeiro',Santos:'São Paulo',Diamantina:'Minas Gerais',Tiradentes:'Minas Gerais',Sobral:'Ceará',Franca:'São Paulo',Gramado:'Rio Grande do Sul'},'united-kingdom':{Bangor:'Wales',Newport:'Wales',Perth:'Scotland'},france:{'Saint-Denis':'Réunion','Fort-de-France':'Martinique','Pointe-à-Pitre':'Guadeloupe',Cayenne:'French Guiana',Mamoudzou:'Mayotte'}};
export const europeOverseas={france:['Fort-de-France','Pointe-à-Pitre','Cayenne','Saint-Denis','Mamoudzou']};
export const europeDisplay={'united-kingdom':{Derry:'Derry/Londonderry'},france:{'Saint-Denis':'Saint-Denis, Réunion'}};
export const europeAliases={Derry:['Londonderry','Derry Londonderry'],Hull:['Kingston upon Hull'],'Newcastle upon Tyne':['Newcastle'],Frankfurt:['Frankfurt am Main'],Freiburg:['Freiburg im Breisgau'],Halle:['Halle an der Saale','Halle (Saale)'],Braunschweig:['Brunswick'],Konstanz:['Constance'],Palma:['Palma de Mallorca'],'Las Palmas':['Las Palmas de Gran Canaria'],'San Sebastián':['Donostia'],'Vitoria-Gasteiz':['Vitoria','Gasteiz'],'Castellón de la Plana':['Castellón','Castelló'],Chamonix:['Chamonix-Mont-Blanc'],Cherbourg:['Cherbourg-en-Cotentin'],Dunkirk:['Dunkerque'],'Saint-Denis':['Saint-Denis de la Réunion'],'St Andrews':['St. Andrews','Saint Andrews'],'Stratford-upon-Avon':['Stratford']};
// Exact Wikidata labels where the short name also names a province, constituency or other town.
export const searchNames={'Las Palmas':'Las Palmas de Gran Canaria',Freiburg:'Freiburg im Breisgau',Halle:'Halle (Saale)',Braunschweig:'Brunswick',Konstanz:'Constance'};

europeRegions.canada={Toronto:'Ontario','Montréal':'Quebec',Vancouver:'British Columbia',Ottawa:'Ontario',Calgary:'Alberta',Edmonton:'Alberta','Québec City':'Quebec',Winnipeg:'Manitoba',Halifax:'Nova Scotia',Victoria:'British Columbia',Hamilton:'Ontario',London:'Ontario',Windsor:'Ontario',Kitchener:'Ontario','Niagara Falls':'Ontario',Kelowna:'British Columbia',Saskatoon:'Saskatchewan',Regina:'Saskatchewan',"St. John's":'Newfoundland and Labrador','Saint John':'New Brunswick',Fredericton:'New Brunswick',Charlottetown:'Prince Edward Island',Whitehorse:'Yukon',Yellowknife:'Northwest Territories',Iqaluit:'Nunavut',Mississauga:'Ontario',Brampton:'Ontario',Gatineau:'Quebec',Laval:'Quebec',Sherbrooke:'Quebec','Trois-Rivières':'Quebec',Saguenay:'Quebec',Kingston:'Ontario','Greater Sudbury':'Ontario','Thunder Bay':'Ontario','Sault Ste. Marie':'Ontario',Oshawa:'Ontario',Guelph:'Ontario',Surrey:'British Columbia',Burnaby:'British Columbia',Richmond:'British Columbia',Abbotsford:'British Columbia',Nanaimo:'British Columbia',Moncton:'New Brunswick',Banff:'Alberta',Peterborough:'Ontario',Barrie:'Ontario',Waterloo:'Ontario','St. Catharines':'Ontario',Kamloops:'British Columbia','Prince George':'British Columbia','Red Deer':'Alberta',Lethbridge:'Alberta','Medicine Hat':'Alberta',Brandon:'Manitoba',Sydney:'Nova Scotia','Corner Brook':'Newfoundland and Labrador',Jasper:'Alberta',Whistler:'British Columbia',Churchill:'Manitoba',Drummondville:'Quebec',Rimouski:'Quebec','Prince Rupert':'British Columbia','Fort McMurray':'Alberta','Grande Prairie':'Alberta'};
europeRegions.argentina={'Buenos Aires':'Buenos Aires City','Córdoba':'Córdoba',Rosario:'Santa Fe',Mendoza:'Mendoza','La Plata':'Buenos Aires','Mar del Plata':'Buenos Aires',Bariloche:'Río Negro',Ushuaia:'Tierra del Fuego',Salta:'Salta','San Miguel de Tucumán':'Tucumán','Santa Fe':'Santa Fe','Paraná':'Entre Ríos','San Juan':'San Juan','Neuquén':'Neuquén','San Salvador de Jujuy':'Jujuy',Posadas:'Misiones',Corrientes:'Corrientes','San Luis':'San Luis','La Rioja':'La Rioja','San Fernando del Valle de Catamarca':'Catamarca','Santiago del Estero':'Santiago del Estero',Resistencia:'Chaco',Formosa:'Formosa','Puerto Iguazú':'Misiones','El Calafate':'Santa Cruz','Santa Rosa':'La Pampa',Viedma:'Río Negro',Rawson:'Chubut','Río Gallegos':'Santa Cruz','Bahía Blanca':'Buenos Aires','Comodoro Rivadavia':'Chubut',Trelew:'Chubut','Puerto Madryn':'Chubut','Río Grande':'Tierra del Fuego','San Rafael':'Mendoza','San Martín de los Andes':'Neuquén',Esquel:'Chubut',Tandil:'Buenos Aires','Olavarría':'Buenos Aires','Río Cuarto':'Córdoba','Villa María':'Córdoba',Concordia:'Entre Ríos','Gualeguaychú':'Entre Ríos','San Nicolás de los Arroyos':'Buenos Aires','Junín':'Buenos Aires',Pergamino:'Buenos Aires',Azul:'Buenos Aires',Necochea:'Buenos Aires',Chivilcoy:'Buenos Aires',Balcarce:'Buenos Aires','Zárate':'Buenos Aires',Campana:'Buenos Aires',Reconquista:'Santa Fe',Rafaela:'Santa Fe','Venado Tuerto':'Santa Fe','San Francisco':'Córdoba','Villa Mercedes':'San Luis','General Roca':'Río Negro',Cipolletti:'Río Negro',Zapala:'Neuquén',Eldorado:'Misiones','Oberá':'Misiones','Termas de Río Hondo':'Santiago del Estero',Chilecito:'La Rioja','San Ramón de la Nueva Orán':'Salta'};
europeAliases['Québec City']=['Quebec City','Quebec','Québec'];
europeAliases['Greater Sudbury']=['Sudbury','Grand Sudbury'];
europeAliases['Bariloche']=['San Carlos de Bariloche'];
europeAliases['San Fernando del Valle de Catamarca']=['Catamarca'];
europeAliases['San Ramón de la Nueva Orán']=['Orán','Oran'];

// Mexico and Japan use four cumulative tiers; South Africa and South Korea use three.
europeCities.mexico={
 e:'Mexico City,Guadalajara,Monterrey,Cancún,Tijuana,Puebla,Acapulco,Mérida',
 m:'León,Querétaro,Oaxaca,Veracruz,Chihuahua,Ciudad Juárez,San Luis Potosí,Morelia,Guanajuato,San Miguel de Allende,Puerto Vallarta,Mazatlán,Toluca,Cuernavaca,La Paz,San Cristóbal de las Casas',
 h:'Aguascalientes,Mexicali,Hermosillo,Culiacán,Durango,Zacatecas,Saltillo,Torreón,Tampico,Reynosa,Matamoros,Nuevo Laredo,Tuxtla Gutiérrez,Villahermosa,Campeche,Chetumal,Colima,Tepic,Tlaxcala,Pachuca,Chilpancingo,Xalapa',
 x:'Ensenada,Los Mochis,Ciudad Obregón,Guaymas,Nogales,Ciudad Victoria,Monclova,Manzanillo,Uruapan,Zamora,Cuautla,Tehuacán,Orizaba,Córdoba,Coatzacoalcos,Tapachula,Comitán,Playa del Carmen,Cozumel,Tulum,Cabo San Lucas,San José del Cabo'};
europeCities['south-africa']={
 e:'Johannesburg,Cape Town,Durban,Pretoria,Bloemfontein,Gqeberha',
 m:'East London,Kimberley,Polokwane,Mbombela,Pietermaritzburg,George,Stellenbosch,Paarl,Soweto,Rustenburg,Richards Bay,Mthatha',
 h:'Bhisho,Mahikeng,Upington,Welkom,Klerksdorp,Potchefstroom,Vereeniging,Vanderbijlpark,Newcastle,Ladysmith,Knysna,Mossel Bay,Oudtshoorn,Worcester,Hermanus,Makhanda,Graaff-Reinet,Queenstown,Thohoyandou,Musina,Emalahleni,Secunda'};
europeCities.korea={
 e:'Seoul,Busan,Incheon,Daegu,Daejeon,Gwangju,Jeju City',
 m:'Ulsan,Suwon,Sejong,Jeonju,Gyeongju,Pohang,Chuncheon,Gangneung,Sokcho,Seogwipo,Changwon,Cheongju',
 h:'Goyang,Yongin,Seongnam,Bucheon,Ansan,Anyang,Pyeongtaek,Uijeongbu,Paju,Gimpo,Wonju,Andong,Gimcheon,Gumi,Jinju,Gimhae,Yangsan,Tongyeong,Geoje,Mokpo,Yeosu,Suncheon,Gunsan,Iksan,Chungju,Jecheon,Cheonan,Asan,Gongju,Boryeong'};
europeCities.japan={
 e:'Tokyo,Osaka,Kyoto,Yokohama,Hiroshima,Nagasaki,Sapporo,Nagoya,Fukuoka,Nara',
 m:'Kobe,Sendai,Kanazawa,Naha,Hakodate,Nikko,Kamakura,Himeji,Matsumoto,Nagano,Niigata,Shizuoka,Hamamatsu,Kumamoto,Kagoshima',
 h:'Aomori,Morioka,Akita,Yamagata,Fukushima,Mito,Utsunomiya,Maebashi,Saitama,Chiba,Kawasaki,Toyama,Fukui,Kofu,Gifu,Tsu,Otsu,Wakayama,Tottori,Matsue,Okayama,Yamaguchi,Tokushima,Takamatsu,Matsuyama,Kochi,Saga,Oita,Miyazaki,Kitakyushu',
 x:'Asahikawa,Otaru,Kushiro,Obihiro,Hirosaki,Hachinohe,Iwaki,Koriyama,Tsukuba,Takasaki,Kawagoe,Yokosuka,Odawara,Fujisawa,Atami,Takayama,Shirakawa,Hikone,Uji,Sakai,Kurashiki,Onomichi,Kure,Shimonoseki,Beppu,Sasebo,Ishigaki,Miyakojima'};

Object.assign(europeAliases,{
 'Mexico City':['Ciudad de México','CDMX','Mexico DF'],Puebla:['Puebla de Zaragoza'],Oaxaca:['Oaxaca de Juárez'],Toluca:['Toluca de Lerdo'],Pachuca:['Pachuca de Soto'],Chilpancingo:['Chilpancingo de los Bravo'],
 Gqeberha:['Port Elizabeth'],Mbombela:['Nelspruit'],Makhanda:['Grahamstown'],Bhisho:['Bisho'],Mahikeng:['Mafikeng'],Polokwane:['Pietersburg'],Emalahleni:['Witbank'],Queenstown:['Komani'],
 Busan:['Pusan'],Daegu:['Taegu'],Daejeon:['Taejon'],Gwangju:['Kwangju'],Incheon:['Inchon'],Gyeongju:['Kyongju'],'Jeju City':['Jeju','Jeju-si'],
 Tokyo:['Tōkyō','東京','東京都'],Osaka:['Ōsaka'],Kyoto:['Kyōto'],Kochi:['Kōchi'],Oita:['Ōita']
});
europeRegions['south-africa']={Emalahleni:'Mpumalanga',Ladysmith:'KwaZulu-Natal',Queenstown:'Eastern Cape'};
europeRegions.korea={Gwangju:'Jeonnam–Gwangju',Suncheon:'Jeonnam–Gwangju'};

// Exact labels avoid similarly named villages and municipality-wide coordinates.
Object.assign(searchNames,{'San Cristóbal de las Casas':'San Cristóbal de Las Casas',Emalahleni:'Witbank',Asan:'Asan-si',Tlaxcala:'Tlaxcala de Xicoténcatl'});
europeAliases.Asan=['아산'];
// Asan's main item has an inaccurate coordinate; the administrative item lies within the city.
export const cityItems={korea:{Asan:'Q27288910'}};

// Mexico often shares a short name among a state, municipality and several villages.
// Pin the intended urban locality rather than selecting the exact-label namesake.
cityItems.mexico={Acapulco:'Q81398',Puebla:'Q125293',Chihuahua:'Q61302',Oaxaca:'Q131429','Querétaro':'Q173121',Toluca:'Q209034',Aguascalientes:'Q200805',Campeche:'Q61301',Durango:'Q112813',Chilpancingo:'Q207935','Comitán':'Q1961680',Cozumel:'Q929946',Guaymas:'Q985521',Cuautla:'Q939959',Nogales:'Q990001',Tapachula:'Q988225',Uruapan:'Q399270',Zamora:'Q145865'};
europeRegions.mexico={Acapulco:'Guerrero',Puebla:'Puebla',Chihuahua:'Chihuahua',Oaxaca:'Oaxaca','Querétaro':'Querétaro',Toluca:'México',Aguascalientes:'Aguascalientes',Campeche:'Campeche',Durango:'Durango',Chilpancingo:'Guerrero','Comitán':'Chiapas',Cozumel:'Quintana Roo',Guaymas:'Sonora',Cuautla:'Morelos',Nogales:'Sonora',Tapachula:'Chiapas',Uruapan:'Michoacán de Ocampo',Zamora:'Michoacán de Ocampo',Córdoba:'Veracruz de Ignacio de la Llave','La Paz':'Baja California Sur',Matamoros:'Tamaulipas'};
