// Reads rendered MediaWiki HTML into table grids, expanding rowspan and colspan.
// Each table keeps the nearest preceding h2/h3 text so callers can choose a section.
import htmlparser2 from 'htmlparser2';

const decode=text=>text.replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'");
export const clean=text=>decode(text).replace(/\[[^\]]*\]/g,'').replace(/­/g,'').replace(/\s+/g,' ').trim();

export function readTables(html){
 const tables=[],stack=[];let heading='',headingText=null,skip=0,cell=null,row=null;
 const parser=new htmlparser2.Parser({
  onopentag(name,attrs){
   const cls=attrs.class||'';
   if(skip||/\b(reference|mw-editsection|sortkey|sr-only)\b/.test(cls)||name==='style'||name==='sup'&&/reference/.test(cls)||attrs.style&&/display:\s*none/.test(attrs.style)){skip++;return;}
   if(/^h[23]$/.test(name)&&!stack.length)headingText='';
   if(name==='table'){stack.push({heading,class:cls,rows:[],rowIndex:-1});}
   const table=stack[stack.length-1];if(!table)return;
   if(name==='tr'&&stack.length&&table){row={cells:[]};table.rows.push(row);}
   if((name==='td'||name==='th')&&row&&!cell){cell={text:'',header:name==='th',rowspan:+attrs.rowspan||1,colspan:+attrs.colspan||1,style:attrs.style||'',links:[]};row.cells.push(cell);}
   if(name==='a'&&cell)cell.links.push(attrs.href||'');
   if(name==='br'&&cell)cell.text+=' ';
  },
  ontext(text){if(skip)return;if(headingText!==null)headingText+=text;if(cell&&stack.length)cell.text+=text;},
  onclosetag(name){
   if(skip){skip--;return;}
   if(/^h[23]$/.test(name)&&headingText!==null){heading=clean(headingText);headingText=null;}
   if((name==='td'||name==='th')&&cell){cell.text=clean(cell.text);cell=null;}
   if(name==='tr')row=null;
   if(name==='table'){const table=stack.pop();if(!table)return;tables.push(expand(table));row=null;}
  }
 },{decodeEntities:false,recognizeSelfClosing:true});
 parser.write(html);parser.end();
 return tables;
}

function expand(table){
 const grid=[],styles=[];
 table.rows.forEach((row,r)=>{grid[r]??=[];styles[r]??=[];let c=0;
  for(const cell of row.cells){
   while(grid[r][c]!==undefined)c++;
   for(let dr=0;dr<cell.rowspan;dr++)for(let dc=0;dc<cell.colspan;dc++){grid[r+dr]??=[];styles[r+dr]??=[];grid[r+dr][c+dc]=cell.text;styles[r+dr][c+dc]={header:cell.header,colspan:cell.colspan,style:cell.style,links:cell.links,origin:dr===0&&dc===0};}
   c+=cell.colspan;
  }
 });
 return {heading:table.heading,class:table.class,grid,cells:styles};
}
