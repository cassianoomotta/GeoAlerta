import {MAX_PHOTO_BYTES,photoMetadata,photoMime} from './contracts';

const TARGET_PHOTO_BYTES=4.5*1024*1024;
const MAX_IMAGE_EDGE=2560;
const IMAGE_EDGES=[MAX_IMAGE_EDGE,2304,2048,1792,1536,1280];
const JPEG_QUALITIES=[0.9,0.84,0.78,0.72,0.66];

export class PhotoCompressionError extends Error {
  constructor(){super('Não foi possível preparar esta foto para envio. Escolha outra imagem ou continue sem foto.');this.name='PhotoCompressionError';}
}

function encode(canvas:HTMLCanvasElement,type:string,quality:number){
  return new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new PhotoCompressionError()),type,quality));
}

function outputName(name:string,type:string){
  const extensions:Record<string,string>={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
  const extension=extensions[type];
  if(!extension)throw new PhotoCompressionError();
  return `${name.replace(/\.[^.]*$/,'')||'foto'}.${extension}`;
}

export async function prepareOccurrencePhoto(file:File):Promise<{file:File;compressed:boolean}>{
  if(file.size<=MAX_PHOTO_BYTES){photoMetadata(file);return {file,compressed:false};}
  const sourceMime=photoMime(file);
  let bitmap:ImageBitmap|undefined;
  try{
    bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});
    const longestEdge=Math.max(bitmap.width,bitmap.height);
    if(!longestEdge)throw new PhotoCompressionError();
    let smallest:Blob|null=null;
    for(const maxEdge of IMAGE_EDGES){
      const scale=Math.min(1,maxEdge/longestEdge);
      const width=Math.max(1,Math.round(bitmap.width*scale));
      const height=Math.max(1,Math.round(bitmap.height*scale));
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
      const context=canvas.getContext('2d');
      if(!context)throw new PhotoCompressionError();
      const targetMime=sourceMime==='image/png'?'image/webp':sourceMime;
      if(targetMime==='image/jpeg'){context.fillStyle='#fff';context.fillRect(0,0,width,height);}
      context.drawImage(bitmap,0,0,width,height);
      for(const quality of JPEG_QUALITIES){
        const blob=await encode(canvas,targetMime,quality);
        if(blob.size<1)continue;
        const actualMime=blob.type||'image/png';
        if(!['image/jpeg','image/png','image/webp'].includes(actualMime))continue;
        if(blob.size<=TARGET_PHOTO_BYTES){
          const prepared=new File([blob],outputName(file.name,actualMime),{type:actualMime,lastModified:file.lastModified});
          photoMetadata(prepared);
          return {file:prepared,compressed:true};
        }
        if(blob.size<=MAX_PHOTO_BYTES&&(!smallest||blob.size<smallest.size))smallest=blob;
      }
    }
    if(smallest){
      const prepared=new File([smallest],outputName(file.name,smallest.type||'image/png'),{type:smallest.type||'image/png',lastModified:file.lastModified});
      photoMetadata(prepared);
      return {file:prepared,compressed:true};
    }
    throw new PhotoCompressionError();
  }catch(error){
    if(error instanceof PhotoCompressionError)throw error;
    throw new PhotoCompressionError();
  }finally{bitmap?.close();}
}
