export async function loadCompressed(url,{signal}={}){
 const response=await fetch(url,{signal});if(!response.ok)throw Error(`${url}: ${response.status}`);
 const bytes=await response.arrayBuffer(),signature=new Uint8Array(bytes,0,2);
 const body=signature[0]===31&&signature[1]===139?new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')):bytes;
 return new Response(body).json();
}
