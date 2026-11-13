import fs from'node:fs';import path from'node:path';import{fileURLToPath}from'node:url';import{createHash}from'node:crypto';import assert from'node:assert/strict';
const here=path.dirname(fileURLToPath(import.meta.url)),project=path.resolve(here,'../BoundaryAtlas.swiftpm'),res=project+'/Sources/AtlasCore/Resources';
const inventory=JSON.parse(fs.readFileSync(here+'/../asset-inventory.json')),manifest=JSON.parse(fs.readFileSync(res+'/Countries/china/catalogue.json'));
assert.equal(manifest.regions.length,34);assert.equal(new Set(manifest.regions.map(r=>r.id)).size,34);
for(const file of inventory.files){const data=fs.readFileSync(res+'/'+file.file);assert.equal(data.length,file.bytes);assert.equal(createHash('sha256').update(data).digest('hex'),file.sha256);}
const fills=fs.readFileSync(res+'/'+manifest.geometry.fills),lines=fs.readFileSync(res+'/'+manifest.geometry.lines);
assert.equal(fills.length,manifest.geometry.fillVertices*16);assert.equal(lines.length,manifest.geometry.lineInstances*32);
const indices=fs.readFileSync(res+'/'+manifest.geometry.indices);assert.equal(indices.length,manifest.geometry.indexCount*4);
const coverage=new Set();let maxEdge=0;
function checkMesh(fills,indices){
for(let i=0;i<indices.length;i+=12){const offsets=[0,4,8].map(n=>indices.readUInt32LE(i+n)*16);assert(offsets.every(n=>n<fills.length));const pts=offsets.map(n=>[fills.readFloatLE(n),fills.readFloatLE(n+4)]);for(let j=0;j<3;j++){const[a,b]=[pts[j],pts[(j+1)%3]];assert(a.every(Number.isFinite));assert(a[1]>=-90&&a[1]<=90);maxEdge=Math.max(maxEdge,Math.hypot(a[0]-b[0],a[1]-b[1]));}coverage.add(fills.readFloatLE(offsets[0]+8));}
}
checkMesh(fills,indices);checkMesh(fs.readFileSync(res+'/'+manifest.background.fills),fs.readFileSync(res+'/'+manifest.background.indices));
assert.deepEqual([...coverage].sort((a,b)=>a-b),Array.from({length:35},(_,i)=>i));assert(maxEdge<=2.01,'Globe triangles must not cut through the globe: '+maxEdge);
for(let i=0;i<lines.length;i+=32){const a=lines.readFloatLE(i+16),b=lines.readFloatLE(i+20);assert(a>0&&b>0&&a!==b,'A boundary must have two distinct provincial owners');}
const key=s=>s.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
for(const r of manifest.regions){assert(r.english&&r.local&&r.audio&&r.polygons.length);assert(r.aliases.some(a=>key(a)===key(r.english)));assert(r.aliases.some(a=>key(a)===key(r.local)));for(const n of r.names)assert(r.aliases.includes(n.text));assert(fs.existsSync(res+'/'+r.audio));if(r.flag)assert(fs.existsSync(res+'/'+r.flag));}
assert(manifest.regions.find(r=>r.id==='540000').names.some(n=>n.language==='bo'));
const read=f=>fs.readFileSync(project+'/Sources/AtlasApp/'+f,'utf8');
assert(!read('AtlasRootView.swift').includes('WKWebView'));assert(read('AtlasShaders.swift').includes('flagVertex'));assert(read('AtlasMetalView.swift').includes('stopInertia()'));
assert(read('AtlasStore.swift').includes('AVAudioPlayer'));assert(read('AtlasMetalView.swift').includes('!store.hidesAnswers'));
assert.equal((read('AtlasStore.swift').match(/private var audio: AVAudioPlayer/g)||[]).length,1);
const renderer=read('AtlasMetalView.swift');
assert(renderer.includes('nonisolated func draw(in view: MTKView)'));
assert(renderer.includes('nonisolated func mtkView(_ view: MTKView,drawableSizeWillChange size: CGSize)'));
assert(renderer.includes('MainActor.assumeIsolated { drawAttachedFrame() }'));
console.log(JSON.stringify({provinceCards:34,audioFiles:34,fillVertices:manifest.geometry.fillVertices,sharedBoundarySegments:manifest.geometry.lineInstances,resourceBytes:inventory.totalBytes,maxTriangleEdgeDegrees:maxEdge,nativeAppleBuild:'NOT RUN: Apple SDK unavailable on Windows'},null,2));
