// Each active atlas owns a bounded set of installed chunks. Eviction releases
// both MapLibre sources and their blob URLs, rather than just hiding layers.
export class BoundaryBudget{
 constructor({maxBytes=12*1024*1024,maxCount=3,remove}){this.maxBytes=maxBytes;this.maxCount=maxCount;this.remove=remove;this.entries=new Map();}
 get bytes(){return [...this.entries.values()].reduce((sum,item)=>sum+item.bytes,0);}
 has(id){return this.entries.has(id);}
 touch(id){const item=this.entries.get(id);if(item){this.entries.delete(id);this.entries.set(id,item);}return item;}
 reserve(id,bytes){if(bytes>this.maxBytes)return false;this.delete(id);while(this.entries.size>=this.maxCount||this.bytes+bytes>this.maxBytes)this.delete(this.entries.keys().next().value);return true;}
 add(id,bytes,value){this.entries.set(id,{bytes,value});}
 delete(id){const item=this.entries.get(id);if(!item)return;this.entries.delete(id);this.remove(id,item.value);}
 clear(){for(const id of [...this.entries.keys()])this.delete(id);}
}
export function intersects(a,b){return a[0][0]<=b[1][0]&&a[1][0]>=b[0][0]&&a[0][1]<=b[1][1]&&a[1][1]>=b[0][1];}
export function chooseChunks(records,bounds,center,{limit=3,pinned}={}){return records.filter(r=>r.level===1&&intersects(r.bounds,bounds)).sort((a,b)=>Number(b.id===pinned)-Number(a.id===pinned)||Math.hypot(a.center[0]-center[0],a.center[1]-center[1])-Math.hypot(b.center[0]-center[0],b.center[1]-center[1])).slice(0,limit).map(r=>r.id);}
