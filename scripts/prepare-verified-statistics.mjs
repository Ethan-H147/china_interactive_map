import fs from 'node:fs';
const sources={
 'korea-official':{title:'Statistics Korea: 2024 regional income, preliminary',url:'https://mods.go.kr/boardDownload.es?bid=11755&list_no=443802&seq=1',published:'2025-12-23',pages:'6–7',retrieved:'2026-10-05'},
 'hk-official':{title:'Hong Kong C&SD: GDP, table 310-31001',url:'https://www.censtatd.gov.hk/en/web_table.html?id=31',retrieved:'2026-10-05'},
 'macao-official':{title:'Macao DSEC: 2025 annual GDP',url:'https://www.gcs.gov.mo/news/detail/zh-hant/N26BM8Epe1',published:'2026-02-13',retrieved:'2026-10-05'},
 'taiwan-official':{title:'DGBAS: GDP, GNI and NI, August 2026 release',url:'https://ws.dgbas.gov.tw/001/Upload/464/relfile/10854/236587/t1-2e.xlsx',published:'2026-08-14',retrieved:'2026-10-05'},
 'taiwan-per-capita':{title:'DGBAS: Statistical Abstract of National Income, February 2026',url:'https://ws.dgbas.gov.tw/001/Upload/464/relfile/10866/235856/nie.pdf',published:'2026-02',retrieved:'2026-10-05',page:2}
};
const records={};
const money=(value,currency,year,source,note)=>({value,currency,year,source,...(note?{note}:{})});
// Transcribed from the two adjoining official table pages. GDP is trillion KRW;
// per-capita GDP is ten thousand KRW. Preserve the report's rounding.
const korea=[['KR-11',575,6122],['KR-26',121.1,3708],['KR-27',74.5,3137],['KR-28',125.6,4119],['KR-30',56.3,3822],['KR-31',94,8519],['KR-36',17.4,4461],['KR-41',651.4,4700],['KR-51',64.6,4256],['KR-43',91.8,5633],['KR-44',150.7,6776],['KR-52',66.8,3798],['KR-47',134.7,5230],['KR-48',151.2,4655],['KR-50',26.9,3991]];
for(const [id,gdp,pc] of korea)records['korea:'+id]={gdp:money(gdp*1e12,'KRW',2024,'korea-official','Preliminary, rounded as published.'),gdpPerCapita:money(pc*1e4,'KRW',2024,'korea-official','Preliminary, rounded as published.')};
records['korea:KR-12']={gdp:money((104+54.8)*1e12,'KRW',2024,'korea-official','Calculated sum of Jeonnam and Gwangju’s 2024 GDP, before their merger.'),note:'GDP sums the two predecessor regions. A combined per-capita figure has not been verified; neither predecessor’s value is used for the merged region.'};
records['china:810000']={gdp:money(3329843e6,'HKD',2025,'hk-official','Revised.'),gdpPerCapita:money(444044,'HKD',2025,'hk-official','Revised.')};
records['china:820000']={gdp:money(418.04e9,'MOP',2025,'macao-official','Revised; rounded as published.'),gdpPerCapita:money(607000,'MOP',2025,'macao-official','Rounded as published.')};
records['china:710000']={gdp:{...money(28715120e6,'TWD',2025,'taiwan-official'),usd:922454e6},gdpPerCapita:{...money(1229318,'TWD',2025,'taiwan-per-capita','Preliminary February 2026 release; GDP total uses the later August revision.'),usd:39492}};
fs.writeFileSync(new URL('./statistics-sources/verified-records.json',import.meta.url),JSON.stringify({sources,records},null,2));
