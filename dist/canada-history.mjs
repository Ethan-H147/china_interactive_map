export const canadaHistory={
 label:'Historical snapshot',store:'atlas-canada-history-year',file:'history/borders.bin',defaultYear:1867,
 sourceName:'Atlas of Canada and Canadian Heritage',source:'https://www.canada.ca/en/canadian-heritage/services/historical-boundaries-canada.html',
 outside:'Outside the mapped divisions',standalone:true,
 title:year=>year===1866?'British North America':'Boundary changes in '+year,
 names:['province','provinces'],
 kind(unit){return unit.type==='Province'?'state':['Colony','Dominion'].includes(unit.type)?'colony':unit.type==='Disputed'?'disputed':unit.type==='Territory'||unit.type==='Territorial district'?'territory':'claims';},
 kindLabel:unit=>unit.type,describe:unit=>unit.note,
 noChanges:'No documented provincial or territorial change this year.',
 coverage:'Historical boundaries are generalized and use the current coastline and international land outline. This map shows colonial and federal administration within present-day Canada; it does not map Indigenous nations or treaty territories.'
};

export const canadaElections={
 label:'Federal election',store:'atlas-canada-election-year',units:['riding','ridings'],standalone:true,
 datasets:[{id:'CA',file:'elections/federal.bin'}],
 shortName:name=>name,
 partyColors:[[/^Liberal$/,'#d5383b'],[/^Conservative$|^Progressive Conservative$/,'#245ca4'],[/^Bloc Québécois$/,'#369bbb'],[/^New Democratic Party$|^Co-operative Commonwealth Federation$/,'#e37920'],[/^Green Party$/,'#408342'],[/^Reform$|^Canadian Alliance$/,'#527844'],[/^Independent$/,'#7d7670']],
 historic:{file:'elections/boundaries.bin',fixed:true,sourceName:'Taylor et al. and Elections Canada',source:'https://doi.org/10.5683/SP3/4E8DCR',outside:'No riding at this location in this election.'}
};
