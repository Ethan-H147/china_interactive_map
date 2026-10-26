export const taiwanPinyin={
'TW-09007':['Lianjiang','Liánjiāng'],'TW-10002':['Yilan','Yílán'],
'TW-10007':['Zhanghua','Zhānghuà'],'TW-10008':['Nantou','Nántóu'],
'TW-10009':['Yunlin','Yúnlín'],'TW-10017':['Jilong','Jīlóng'],
'TW-63000':['Taibei','Táiběi'],'TW-65000':['Xinbei','Xīnběi'],
'TW-66000':['Taizhong','Táizhōng'],'TW-67000':['Tainan','Táinán'],
'TW-68000':['Taoyuan','Táoyuán'],'TW-10005':['Miaoli','Miáolì'],
'TW-10020':['Jiayi','Jiāyì'],'TW-10010':['Jiayi','Jiāyì'],
'TW-09020':['Jinmen','Jīnmén'],'TW-64000':['Gaoxiong','Gāoxióng'],
'TW-10014':['Taidong','Táidōng'],'TW-10015':['Hualian','Huālián'],
'TW-10016':['Penghu','Pénghú'],'TW-10018':['Xinzhu','Xīnzhú'],
'TW-10004':['Xinzhu','Xīnzhú'],'TW-10013':['Pingdong','Píngdōng']
};
export const historicalCityAliases={110000:['Peking'],120000:['Tientsin'],500000:['Chungking'],440100:['Canton'],320100:['Nanking'],370200:['Tsingtao','Tsingtau'],350200:['Amoy'],350100:['Foochow','Fuchow'],330200:['Ningpo'],320500:['Soochow'],330100:['Hangchow'],510100:['Chengtu']};
export function applyChinaSearchAliases(p){
 const names=taiwanPinyin[p.adcode]||historicalCityAliases[p.adcode];
 if(!names)return p;
 const suffix=/County$/.test(p.englishName||'')?'County':/City$/.test(p.englishName||'')?'City':'';
 const aliases=[...(p.searchAliases||'').split(/[;,|]/),...names];
 if(taiwanPinyin[p.adcode]&&suffix)aliases.push(...names.map(name=>name+' '+suffix));
 p.searchAliases=[...new Set(aliases.map(s=>s.trim()).filter(Boolean))].join(';');
 return p;
}
export const normalizeChinaSearch=value=>String(value).normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[\s'’ʼ′-]/g,'');
