export const brazilPeriods=[
 [1808,'Portuguese court in Brazil',1872,'Captaincy'],[1821,'United Kingdom',1872,'Province'],[1822,'First Reign',1872,'Province'],[1835,'Regency',1872,'Province'],[1872,'Second Reign',1872,'Province'],[1900,'First Republic',1900,'State'],[1933,'Provisional Government',1933,'State'],[1934,'Constitutional Government',1933,'State'],[1940,'Estado Novo',1940,'State'],[1960,'Fourth Republic',1960,'State'],[1980,'Military government',1980,'State'],[1991,'New Republic',1991,'State']
];
export const mexicoPeriods=[
 [1820,'Late New Spain'],[1822,'First Mexican Empire'],[1824,'First Federal Republic'],[1843,'Centralist Republic'],[1847,'Second Federal Republic'],[1853,'Santa Anna dictatorship'],[1857,'Reform Republic'],[1865,'Second Mexican Empire'],[1870,'Restored Republic'],[1910,'Porfiriato'],[1917,'Constitutional Republic'],[1946,'PRI era'],[2000,'Democratic transition']
];
const period=(list,y)=>list.find(p=>p[0]===y)?.[1]||String(y);
const counts=units=>{const n=new Map();for(const u of units)n.set(u.type,(n.get(u.type)||0)+1);const plurals={'Captaincy':'captaincies','Province':'provinces','State':'states','Department':'departments','Intendancy':'intendancies','Territory':'territories','Federal district':'federal district','Neutral municipality':'neutral municipality','State district':'state district','Disputed claim':'disputed claims','Seceding republic':'seceding republic','Annexed province':'annexed provinces'};return [...n].map(([t,k])=>k+' '+(k===1?t.toLowerCase():plurals[t]||t.toLowerCase()+'s')).join(', ');};
const common={label:'Historical snapshot',file:'history/borders.bin',sourcesFile:'history/sources.json',periods:true,labelTicks:true,standalone:true,frameOuter:true,releaseOnLeave:true,counts,kindLabel:u=>u.type,describe:u=>u.note,yearText:String};
export const brazilHistory={...common,store:'atlas-brazil-history-year',defaultYear:1872,details:true,
 sourceName:'IBGE, historical territorial divisions',source:'https://geoftp.ibge.gov.br/organizacao_do_territorio/estrutura_territorial/evolucao_da_divisao_territorial_do_brasil/evolucao_da_divisao_territorial_do_brasil_1872_2010/',
 dateText:y=>period(brazilPeriods,y),title:y=>period(brazilPeriods,y),
 kind:u=>u.type==='Territory'?'territory':['Neutral municipality','Federal district','State district'].includes(u.type)?'district':'state',
 keys:[['state',y=>y===1808?'Captaincy':y<1889?'Province':'State','#dcebd9'],['territory','Territory','#e7dfbd'],['district','District or neutral municipality','#d0e0e9']],
 omitFrontiers:y=>({country:'BRA',pairs:y===1821||y===1822?['BRA-URY']:[]}),
 coverage:y=>y<1872?'Early reconstruction: later provinces are merged from IBGE’s 1872 map. Local boundaries and international frontiers are generalized, rather than surveyed for this date. Cisplatina in 1821–1822 uses present-day Uruguay as a proxy. These frames do not map Indigenous nations, settlement or effective occupation.':y===1934?'The 1933 IBGE state boundaries represent the 1934 constitutional period. No later municipal boundaries are substituted.':'IBGE’s '+y+' territorial division. Zoom in for the municipal boundary network recorded for this year. Historical spellings are retained; present-day statistics and municipal borders are hidden.'
};
export const mexicoHistory={...common,store:'atlas-mexico-history-year',defaultYear:1824,
 dateText:y=>period(mexicoPeriods,y),title:y=>period(mexicoPeriods,y),
 kind:u=>['Disputed claim','Seceding republic'].includes(u.type)?'disputed':u.type==='Territory'?'territory':u.type==='Federal district'?'district':u.type==='Annexed province'?'annexed':'state',
 keys:[['state',y=>y===1820?'Intendancy':y===1822?'Province':[1843,1853,1865].includes(y)?'Department':'State','#ecd9d7'],['territory','Territory','#e7dfbd'],['district','Federal district','#d0e0e9'],['disputed','Disputed or seceding','#eadcc0'],['annexed','Annexed province','#e1e6cd']],
 sourceName:y=>y===1865?'Goran tek-en, 1865 departments; UNAM':'Newberry Library and historical administrative references',
 source:y=>y===1865?'https://moderna.historicas.unam.mx/index.php/ehm/article/download/68932/68892?inline=1':'https://publications.newberry.org/ahcb/',
 omitFrontiers:y=>({country:'MEX',pairs:y===1822?['GTM-HND','GTM-SLV','HND-SLV','HND-NIC','CRI-NIC']:[]}),
 coverage:y=>y===1865?'The 50 departments decreed on 3 March 1865, georeferenced from a generalized historical map and fitted to the current land outline. This is the imperial administrative plan, not a map of effective control.':(y<=1853?'Northern territory uses the Newberry historical boundary mosaic. Texas after 1836 is shown as disputed, rather than Mexican control. Interior northern boundaries use a generalized 1821 map. ':'')+(y===1822?'The First Empire includes Central American provinces, with generalized present-day country outlines. ':'')+'Internal divisions are reconstructed by grouping current states; smaller historical boundary changes are not surveyed. These are selected regime snapshots, not an annual boundary record.'
};
