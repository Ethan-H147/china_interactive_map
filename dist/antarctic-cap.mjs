import {mapPalette} from './map-palette.mjs';
import {loadCompressed} from './korea-data.mjs';
// Native globe tiles stop at 85.051129°S, and their pole fan stretches that
// edge to the pole. Draw the actual land, ice shelves included, on the sphere.
const id='antarctica-pole-surface';
const radians=Math.PI/180;
const polar=([lng,lat])=>{const r=2*Math.tan(Math.PI/4+lat*radians/2);return [r*Math.sin(lng*radians),r*Math.cos(lng*radians)];};
function contains(rings,[x,y]){let inside=false;for(const ring of rings)for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
const includes=(mesh,location)=>mesh.outlines.some(p=>contains(p,polar(location)));
function shader(gl,type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
const vertex=`#version 300 es
precision highp float;
in vec3 a_position;
uniform mat4 u_matrix;
uniform vec4 u_horizon;
out float v_facing;
void main(){v_facing=dot(a_position,u_horizon.xyz)+u_horizon.w;gl_Position=u_matrix*vec4(a_position,1.0);gl_Position.z=(1.0-v_facing)*gl_Position.w;}`;
const fragment=`#version 300 es
precision highp float;
uniform vec3 u_color;
in float v_facing;
out vec4 color;
void main(){if(v_facing<0.0)discard;color=vec4(u_color,1.0);}`;
// The selected claim's outline continues past the tiles' 85°S limit to the pole.
// Each segment is a quad widened in screen space, with a one-pixel soft edge.
const lineVertex=`#version 300 es
precision highp float;
in vec3 a_position;
in vec3 a_other;
in float a_side;
uniform mat4 u_matrix;
uniform vec4 u_horizon;
uniform vec2 u_viewport;
uniform float u_half;
out float v_facing;
out float v_offset;
void main(){
 v_facing=dot(a_position,u_horizon.xyz)+u_horizon.w;
 vec4 p=u_matrix*vec4(a_position,1.0),q=u_matrix*vec4(a_other,1.0);
 // |a_side| is 1 at a segment's start and 2 at its end; its sign is the side.
 vec2 d=(q.xy/q.w-p.xy/p.w)*u_viewport;d=normalize((abs(a_side)>1.5?-d:d)+1e-9);
 v_offset=sign(a_side)*(u_half+1.0);
 gl_Position=p+vec4(vec2(-d.y,d.x)*v_offset*2.0/u_viewport*p.w,0.0,0.0);
 gl_Position.z=(1.0-v_facing)*gl_Position.w;
}`;
const lineFragment=`#version 300 es
precision highp float;
uniform vec3 u_color;
uniform float u_half;
in float v_facing;
in float v_offset;
out vec4 color;
void main(){if(v_facing<0.0)discard;float a=clamp(u_half+0.5-abs(v_offset),0.0,1.0);color=vec4(u_color*a,a);}`;
const sphere=([x,y])=>{const r2=x*x+y*y,d=4+r2;return [4*x/d,(r2-4)/d,4*y/d];};
// Outline edges of a claim's cap, without the cap's own 84°S cut, as quad vertices.
function claimLines(mesh,southOf){
 const limit=2*Math.tan(Math.PI/4+southOf*radians/2),onCut=p=>Math.abs(Math.hypot(p[0],p[1])-limit)<1e-6,out=[];
 for(const rings of mesh.outlines)for(const ring of rings)for(let i=0;i<ring.length;i++){
  const a=ring[i],b=ring[(i+1)%ring.length];if(onCut(a)&&onCut(b))continue;
  const steps=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.005));
  for(let n=0;n<steps;n++){
   const p=sphere([a[0]+(b[0]-a[0])*n/steps,a[1]+(b[1]-a[1])*n/steps]),q=sphere([a[0]+(b[0]-a[0])*(n+1)/steps,a[1]+(b[1]-a[1])*(n+1)/steps]);
   for(const [here,there,side] of [[p,q,1],[p,q,-1],[q,p,2],[q,p,2],[p,q,-1],[q,p,-2]])out.push(...here,...there,side);
  }
 }
 return new Float32Array(out);
}
// Lines are sized as the regional selected outline (regionalLineWidth(1,true)).
const selectedWidth=zoom=>zoom<=6?.7+(Math.max(2,zoom)-2)*.1:Math.min(1.7,1.1+(zoom-6)*.15);
export async function addAntarcticCap(map){
 const data=await loadCompressed('data/antarctica/pole-mesh.bin');
 let attached=false,disposed=false;
 function layer(){let program,vao,buffers,locations,shaders,line;
  return {id,type:'custom',renderingMode:'2d',metadata:{atlas:{role:'land',overview:true}},
   onAdd(_map,gl){
    shaders=[shader(gl,gl.VERTEX_SHADER,vertex),shader(gl,gl.FRAGMENT_SHADER,fragment)];program=gl.createProgram();for(const s of shaders)gl.attachShader(program,s);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
    locations={position:gl.getAttribLocation(program,'a_position'),matrix:gl.getUniformLocation(program,'u_matrix'),horizon:gl.getUniformLocation(program,'u_horizon'),color:gl.getUniformLocation(program,'u_color')};
    vao=gl.createVertexArray();buffers=[data.neutral,...data.claims].map(mesh=>{const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(mesh.positions),gl.STATIC_DRAW);return {buffer,count:mesh.positions.length/3,mesh};});
    line={program:gl.createProgram(),shaders:[shader(gl,gl.VERTEX_SHADER,lineVertex),shader(gl,gl.FRAGMENT_SHADER,lineFragment)],buffers:new Map()};for(const s of line.shaders)gl.attachShader(line.program,s);gl.linkProgram(line.program);if(!gl.getProgramParameter(line.program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(line.program));
    line.locations=Object.fromEntries(['a_position','a_other','a_side'].map(n=>[n,gl.getAttribLocation(line.program,n)]).concat(['u_matrix','u_horizon','u_viewport','u_half','u_color'].map(n=>[n,gl.getUniformLocation(line.program,n)])));
   },
   render(gl,input){
    const projection=input.defaultProjectionData;if(map.getProjection()?.type!=='globe'||projection.projectionTransition<.999)return;
    gl.useProgram(program);gl.bindVertexArray(vao);gl.disable(gl.DEPTH_TEST);gl.depthMask(false);gl.disable(gl.STENCIL_TEST);gl.disable(gl.CULL_FACE);
    gl.uniformMatrix4fv(locations.matrix,false,new Float32Array(projection.mainMatrix));gl.uniform4fv(locations.horizon,projection.clippingPlane);
    // Recolor with the globe's own land, which changes once its tiles reload, not on entry.
    const entry=globalThis.AtlasEntry?.current,country=globalThis.AtlasGlobeOverviewController?.paintedCountry?.()??entry,definition=globalThis.AtlasCountries.countries[country];
    const color=hex=>hex.match(/[a-f\d]{2}/gi).map(s=>parseInt(s,16)/255);
    let outlined=null;
    for(let i=0;i<buffers.length;i++){const {buffer,count,mesh}=buffers[i];if(i&&mesh.country!==country)continue;
     const selected=i&&country===entry&&globalThis.currentAtlas?.()?.getSelection?.()===mesh.region;if(selected)outlined=mesh;
     const paint=i?(selected?definition.map.selected:definition.map.fill):country==='antarctica'?definition.map.fill:mapPalette.country;
     gl.uniform3fv(locations.color,color(paint));gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(locations.position);gl.vertexAttribPointer(locations.position,3,gl.FLOAT,false,0,0);gl.drawArrays(gl.TRIANGLES,0,count);
    }
    gl.disableVertexAttribArray(locations.position);
    if(outlined){
     if(!line.buffers.has(outlined)){const vertices=claimLines(outlined,data.southOf),buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);line.buffers.set(outlined,{buffer,count:vertices.length/7});}
     const {buffer,count}=line.buffers.get(outlined),l=line.locations,ratio=map.getPixelRatio();
     gl.useProgram(line.program);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
     gl.uniformMatrix4fv(l.u_matrix,false,new Float32Array(projection.mainMatrix));gl.uniform4fv(l.u_horizon,projection.clippingPlane);
     gl.uniform2f(l.u_viewport,gl.drawingBufferWidth,gl.drawingBufferHeight);gl.uniform1f(l.u_half,selectedWidth(map.getZoom())*ratio/2);gl.uniform3fv(l.u_color,color(definition.map.line));
     gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
     for(const [name,size,offset] of [['a_position',3,0],['a_other',3,12],['a_side',1,24]]){gl.enableVertexAttribArray(l[name]);gl.vertexAttribPointer(l[name],size,gl.FLOAT,false,28,offset);}
     gl.drawArrays(gl.TRIANGLES,0,count);
     for(const name of ['a_position','a_other','a_side'])gl.disableVertexAttribArray(l[name]);
    }
    gl.bindVertexArray(null);
   },
   onRemove(_map,gl){for(const b of buffers||[])gl.deleteBuffer(b.buffer);for(const s of shaders||[])gl.deleteShader(s);gl.deleteProgram(program);gl.deleteVertexArray(vao);
    if(line){for(const b of line.buffers.values())gl.deleteBuffer(b.buffer);for(const s of line.shaders)gl.deleteShader(s);gl.deleteProgram(line.program);}}
  };
 }
 function sync(){if(disposed||map.style?._loaded===false)return;if(attached&&!map.getLayer(id))attached=false;const visible=map.getProjection()?.type==='globe'&&map.getCenter().lat<-10;if(visible&&!attached){map.addLayer(layer());attached=true;}else if(!visible&&attached){map.removeLayer(id);attached=false;}}
 const controller={hit(point){if(!attached)return null;const loc=map.unproject(point);if(loc.lat>data.southOf||!includes(data.neutral,[loc.lng,loc.lat]))return null;const country=globalThis.AtlasEntry?.current,claim=data.claims.find(c=>c.country===country&&includes(c,[loc.lng,loc.lat]));return claim?{country:claim.country}:{country:'antarctica'};},destroy(){disposed=true;map.off('move',sync);map.off('projectiontransition',sync);map.off('style.load',sync);if(attached&&map.getLayer(id))map.removeLayer(id);}};
 globalThis.AtlasAntarcticCap=controller;map.on('move',sync);map.on('projectiontransition',sync);map.on('style.load',sync);sync();return controller;
}
