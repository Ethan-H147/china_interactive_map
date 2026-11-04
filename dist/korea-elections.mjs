// Korean elections for the shared election view (elections.mjs). South Korea: direct presidential
// elections since 1987 by province. North Korea: officially reported returns of its single-list
// elections, the same national figure in every province.
export const koreaElections={
 label:'Election',store:'atlas-korea-election-year',units:['province','provinces'],
 datasets:[{id:'KR',label:'South Korea',file:'south.bin'},{id:'KP',label:'North Korea',file:'north.bin'}],
 // Korean names put the family name first, and several candidates share one.
 shortName:name=>name,mark:()=>true,
 covers:(record,dataset)=>record.country===dataset
};
