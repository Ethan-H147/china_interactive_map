import sharp from 'sharp';
// MediaWiki may report a small default size for a very large SVG viewBox.
// Bound only the rasterization canvas; retain the source bytes for the viewer.
export async function flagThumbnail(bytes,{width,height},targetHeight=180){
 let input=bytes;
 const text=bytes.toString('utf8'),root=text.match(/<svg\b[^>]*>/i);
 if(root&&/\bviewBox\s*=/i.test(root[0])){
  const tag=root[0].replace(/\s(?:width|height)\s*=\s*(?:"[^"]*"|'[^']*')/gi,'');
  input=Buffer.from(text.replace(root[0],tag.slice(0,-1)+' width="1200" height="'+(1200*height/width)+'">'));
 }
 return sharp(input,{density:72,limitInputPixels:100000000}).resize({height:targetHeight}).webp({lossless:true}).toBuffer();
}
