import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {readData} from './read-data.mjs';

export const articleUrl='https://zh.wikipedia.org/wiki/中華人民共和國城市人口排名';
const decode=text=>text.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,(_,entity)=>{
  if(entity[0]==='#')return String.fromCodePoint(entity[1].toLowerCase()==='x'?parseInt(entity.slice(2),16):Number(entity.slice(1)));
  return {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '}[entity.toLowerCase()];
});
const plain=html=>decode(html.replace(/<sup\b[^>]*>[\s\S]*?<\/sup>/gi,'').replace(/<[^>]*>/g,'')).replace(/\s+/g,' ').trim();
export function parseTable(html){
  const table=[...html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)].map(m=>m[0]).find(t=>t.includes('地区人口')||t.includes('地區人口'));
  if(!table)throw new Error('Population table not found');
  const rows=[],spans=[];
  for(const match of table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
    const columns=[];
    for(let col=0;col<spans.length;col++)if(spans[col]){columns[col]=spans[col].value;if(--spans[col].remaining===0)spans[col]=null;}
    let col=0;
    for(const cell of match[1].matchAll(/<(td|th)\b([^>]*)>([\s\S]*?)<\/\1>/gi)){
      while(columns[col]!==undefined)col++;
      const width=Number(cell[2].match(/colspan="?(\d+)/i)?.[1]||1),height=Number(cell[2].match(/rowspan="?(\d+)/i)?.[1]||1),value=plain(cell[3]);
      for(let offset=0;offset<width;offset++){columns[col+offset]=value;if(height>1)spans[col+offset]={value,remaining:height-1};}col+=width;
    }
    if(columns.length!==7||columns[1]==='城市')continue;
    const number=value=>value===''?null:/^[\d,]+$/.test(value)?Number(value.replaceAll(',','')):(()=>{throw new Error('Invalid population: '+value);})();
    rows.push({province:columns[0],name:columns[1],type:columns[2],total:number(columns[3]),towns:number(columns[4]),urbanCore:number(columns[5]),date:columns[6]});
  }
  if(!rows.length)throw new Error('Empty population table');
  return rows;
}

const provinceAliases={110000:'北京',120000:'天津',130000:'河北',140000:'山西',150000:'内蒙古',210000:'辽宁',220000:'吉林',230000:'黑龙江',310000:'上海',320000:'江苏',330000:'浙江',340000:'安徽',350000:'福建',360000:'江西',370000:'山东',410000:'河南',420000:'湖北',430000:'湖南',440000:'广东',450000:'广西',460000:'海南',500000:'重庆',510000:'四川',520000:'贵州',530000:'云南',540000:'西藏',610000:'陕西',620000:'甘肃',630000:'青海',640000:'宁夏',650000:'新疆',810000:'香港',820000:'澳门'};
const normalizeProvince=name=>name.replace(/澳門/g,'澳门').replace(/维吾尔自治区|壮族自治区|回族自治区|自治区|特别行政区|特別行政區|省|市/g,'');
export function matchRows(rows,features){
  const index=new Map(),regions={},unmatched=[],used=new Set();
  const key=(province,name)=>normalizeProvince(province)+'|'+name;
  for(const {properties:p} of features){
    const parent=p.provinceCode||p.adcode,province=provinceAliases[parent];
    if(!province)continue;
    const names=[p.name];
    if(p.adcode===810000)names.push('香港','香港特别行政区');
    if(p.adcode===820000)names.push('澳门','澳門','澳门特别行政区');
    for(const name of names){const k=key(province,name);if(index.has(k)&&index.get(k)!==p.adcode)throw new Error('Ambiguous map name: '+k);index.set(k,p.adcode);}
  }
  for(const [rowIndex,row] of rows.entries()){
    const adcode=index.get(key(row.province,row.name));
    if(adcode===undefined){unmatched.push({row:rowIndex+1,province:row.province,name:row.name});continue;}
    if(used.has(adcode))throw new Error('Duplicate population match: '+adcode);
    used.add(adcode);
    const inconsistent=row.total!==null&&((row.towns!==null&&row.towns>row.total)||(row.urbanCore!==null&&row.urbanCore>row.total))||row.towns!==null&&row.urbanCore!==null&&row.urbanCore>row.towns;
    regions[adcode]={name:row.name,total:row.total,towns:row.towns,urbanCore:row.urbanCore,date:row.date,sourceRow:rowIndex+1,...(inconsistent?{inconsistent:true}:{})};
  }
  return {regions,unmatched};
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
  const input=process.argv[2];
  const sourcePath=new URL('population-source.json',import.meta.url);
  let source;
  if(input){
    const html=fs.readFileSync(input,'utf8'),revision=html.match(/"wgRevisionId":(\d+)/)?.[1]||html.match(/[?&]oldid=(\d+)/)?.[1];
    if(!revision)throw new Error('Source revision not found');
    source={title:'中華人民共和國城市人口排名',url:articleUrl,revision:Number(revision),revisionUrl:'https://zh.wikipedia.org/w/index.php?title='+encodeURIComponent('中華人民共和國城市人口排名')+'&oldid='+revision,retrieved:new Date().toISOString().slice(0,10),htmlSha256:createHash('sha256').update(html).digest('hex'),measures:{total:'Entire administrative region (地区人口)',towns:'Cities and towns (城镇人口)',urbanCore:'Urban core (城区人口)'},boundaryYear:2020,rows:parseTable(html)};
    fs.writeFileSync(sourcePath,JSON.stringify(source,null,2)+'\n');
  }else source=JSON.parse(fs.readFileSync(sourcePath,'utf8'));
  const display=readData('display-boundaries.json'),features=[...display.provinces.features,...display.subdivisions.features];
  const {regions,unmatched}=matchRows(source.rows,features),{rows,...metadata}=source;
  const result={source:metadata,coverage:{sourceRows:rows.length,matchedRegions:Object.keys(regions).length,unmatchedRows:unmatched.length},regions};
  fs.writeFileSync(new URL('../dist/data/region-population.json',import.meta.url),JSON.stringify(result)+'\n');
  fs.writeFileSync(new URL('population-match-report.json',import.meta.url),JSON.stringify({coverage:result.coverage,unmatched,flagged:Object.entries(regions).filter(([,r])=>r.inconsistent).map(([adcode,r])=>({adcode,...r}))},null,2)+'\n');
  console.log(JSON.stringify({coverage:result.coverage,dates:[...new Set(rows.map(r=>r.date))],flagged:Object.entries(regions).filter(([,r])=>r.inconsistent).map(([adcode,r])=>({adcode,...r})),sar:{hk:regions[810000],mo:regions[820000]}}));
}
