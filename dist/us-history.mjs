import {describeShared} from './us-elections.mjs';
// The United States historical snapshot (historic-view.mjs): state and territory boundaries at
// the end of every year from 1783 to 2000, from scripts/build-us-historic-borders.mjs.

export const usHistory={
 label:'Historical snapshot',store:'atlas-us-history-year',file:'history/borders.bin',defaultYear:1789,
 sourceName:'Newberry Library, Atlas of Historical County Boundaries',source:'https://publications.newberry.org/ahcb/',
 outside:'Not part of the United States',
 title:year=>'Boundary changes in '+year,
 kindLabel(unit,kind){
  if(kind==='state')return unit.type==='District of Columbia'?'Federal district':'State';
  if(kind==='territory')return 'Territory';
  if(kind==='unorganized')return 'Unorganized territory';
  if(kind==='disputed')return 'Disputed';
  return unit.type!=='Foreign'||unit.sovereign==='Hawaii'?'Independent':'Held by '+unit.sovereign;
 },
 describe:unit=>describeShared(unit),
 // Changes of holder outside the source, which records only United States jurisdictions.
 events:[
  {date:'1795-05-01',when:'May 1795',name:'Hawaiian Islands',text:'Kamehameha I\'s conquests united most of the islands as the Kingdom of Hawaii.'},
  {date:'1800-10-01',name:'Louisiana',text:'Spain returned Louisiana to France by the Treaty of San Ildefonso, though Spain went on governing it until 1803.'},
  {date:'1821-09-28',name:'Mexico',text:'Mexico declared its independence from Spain, taking over New Spain\'s lands in the present-day United States.'},
  {date:'1893-01-17',name:'Hawaii',text:'The Hawaiian monarchy was overthrown and a provisional government took power.'},
  {date:'1894-07-04',name:'Hawaii',text:'The Republic of Hawaii was proclaimed.'}
 ]
};
