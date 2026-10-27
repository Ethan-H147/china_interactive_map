import {mapPalette} from './map-palette.mjs';
import {loadCompressed} from './korea-data.mjs';
// Native globe tiles stop at 85.051129°S. Their pole fan stretches the Ross
// Sea's water at that edge to the pole. Draw the actual land on the sphere.
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
export async function addAntarcticCap(map){
 const data=await loadCompressed('data/antarctica/pole-mesh.bin');
 let attached=false,disposed=false;
 function layer(){let program,vao,buffers,locations,shaders;
  return {id,type:'custom',renderingMode:'2d',metadata:{atlas:{role:'land',overview:true}},
   onAdd(_map,gl){
    shaders=[shader(gl,gl.VERTEX_SHADER,vertex),shader(gl,gl.FRAGMENT_SHADER,fragment)];program=gl.createProgram();for(const s of shaders)gl.attachShader(program,s);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
    locations={position:gl.getAttribLocation(program,'a_position'),matrix:gl.getUniformLocation(program,'u_matrix'),horizon:gl.getUniformLocation(program,'u_horizon'),color:gl.getUniformLocation(program,'u_color')};
    vao=gl.createVertexArray();buffers=[data.neutral,...data.claims].map(mesh=>{const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(mesh.positions),gl.STATIC_DRAW);return {buffer,count:mesh.positions.length/3,mesh};});
   },
   render(gl,input){
    const projection=input.defaultProjectionData;if(map.getProjection()?.type!=='globe'||projection.projectionTransition<.999)return;
    gl.useProgram(program);gl.bindVertexArray(vao);gl.disable(gl.DEPTH_TEST);gl.depthMask(false);gl.disable(gl.STENCIL_TEST);gl.disable(gl.CULL_FACE);
    gl.uniformMatrix4fv(locations.matrix,false,new Float32Array(projection.mainMatrix));gl.uniform4fv(locations.horizon,projection.clippingPlane);
    const country=globalThis.AtlasEntry?.current,definition=globalThis.AtlasCountries.countries[country];
    const color=hex=>hex.match(/[a-f\d]{2}/gi).map(s=>parseInt(s,16)/255);
    for(let i=0;i<buffers.length;i++){const {buffer,count,mesh}=buffers[i];if(i&&mesh.country!==country)continue;
     const selected=i&&globalThis.currentAtlas?.()?.getSelection?.()===mesh.region;
     const paint=i?(selected?definition.map.selected:definition.map.fill):country==='antarctica'?definition.map.fill:mapPalette.country;
     gl.uniform3fv(locations.color,color(paint));gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(locations.position);gl.vertexAttribPointer(locations.position,3,gl.FLOAT,false,0,0);gl.drawArrays(gl.TRIANGLES,0,count);
    }
    gl.bindVertexArray(null);
   },
   onRemove(_map,gl){for(const b of buffers||[])gl.deleteBuffer(b.buffer);for(const s of shaders||[])gl.deleteShader(s);gl.deleteProgram(program);gl.deleteVertexArray(vao);}
  };
 }
 function sync(){if(disposed||map.style?._loaded===false)return;if(attached&&!map.getLayer(id))attached=false;const visible=map.getProjection()?.type==='globe'&&map.getCenter().lat<-10;if(visible&&!attached){map.addLayer(layer());attached=true;}else if(!visible&&attached){map.removeLayer(id);attached=false;}}
 const controller={hit(point){if(!attached)return null;const loc=map.unproject(point);if(loc.lat>data.southOf||!includes(data.neutral,[loc.lng,loc.lat]))return null;const country=globalThis.AtlasEntry?.current,claim=data.claims.find(c=>c.country===country&&includes(c,[loc.lng,loc.lat]));return claim?{country:claim.country}:{country:'antarctica'};},destroy(){disposed=true;map.off('move',sync);map.off('projectiontransition',sync);map.off('style.load',sync);if(attached&&map.getLayer(id))map.removeLayer(id);}};
 globalThis.AtlasAntarcticCap=controller;map.on('move',sync);map.on('projectiontransition',sync);map.on('style.load',sync);sync();return controller;
}
