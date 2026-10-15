import {test,expect} from '@playwright/test';
import {MAX_PHOTO_BYTES} from '../../src/features/occurrences/photos/contracts';

const descriptors = new Map<string,PropertyDescriptor|undefined>();
function replaceGlobal(name:string,value:unknown){
  descriptors.set(name,Object.getOwnPropertyDescriptor(globalThis,name));
  Object.defineProperty(globalThis,name,{configurable:true,value});
}
test.afterEach(()=>{
  for(const [name,descriptor] of descriptors){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else Reflect.deleteProperty(globalThis,name);}
  descriptors.clear();
});

test('RF-004 foto grande é redimensionada e reencodada abaixo do limite com orientação da câmera',async()=>{
  const compression=await import('../../src/features/occurrences/photos/compress').catch(()=>null);
  expect(compression).not.toBeNull();
  const seen:{options?:ImageBitmapOptions;qualities:number[];dimensions:[number,number][]}={qualities:[],dimensions:[]};
  const canvas={width:0,height:0,getContext:()=>({fillStyle:'',fillRect:()=>{},drawImage:()=>{}}),toBlob:(callback:(blob:Blob|null)=>void,type?:string,quality?:number)=>{
    seen.qualities.push(quality??1);seen.dimensions.push([canvas.width,canvas.height]);
    const bytes=(quality??1)>=0.84?MAX_PHOTO_BYTES+100:4*1024*1024;
    callback(new Blob([new Uint8Array(bytes)],{type}));
  }};
  replaceGlobal('document',{createElement:()=>canvas});
  replaceGlobal('createImageBitmap',async(_file:Blob,options?:ImageBitmapOptions)=>{seen.options=options;return {width:4000,height:3000,close:()=>{}};});
  const source=new File([new Uint8Array(MAX_PHOTO_BYTES+1)],'evidencia.jpg',{type:'image/jpeg'});

  const prepared=await compression!.prepareOccurrencePhoto(source);

  expect(seen.options?.imageOrientation).toBe('from-image');
  expect(seen.dimensions[0]).toEqual([2560,1920]);
  expect(seen.qualities.length).toBeGreaterThan(1);
  expect(prepared.compressed).toBe(true);
  expect(prepared.file.size).toBeLessThanOrEqual(4.5*1024*1024);
  expect(prepared.file.type).toBe('image/jpeg');
  expect(prepared.file.name).toBe('evidencia.jpg');
});

test('RF-004 foto já dentro do limite mantém os bytes originais',async()=>{
  const compression=await import('../../src/features/occurrences/photos/compress').catch(()=>null);
  expect(compression).not.toBeNull();
  let decoded=false;replaceGlobal('createImageBitmap',async()=>{decoded=true;throw new Error('não deveria decodificar');});
  const source=new File(['foto pequena'],'evidencia.jpg',{type:'image/jpeg'});

  const prepared=await compression!.prepareOccurrencePhoto(source);

  expect(prepared.file).toBe(source);expect(prepared.compressed).toBe(false);expect(decoded).toBe(false);
});

test('RF-004 falha de compressão não produz arquivo acima do limite',async()=>{
  const compression=await import('../../src/features/occurrences/photos/compress').catch(()=>null);
  expect(compression).not.toBeNull();
  const canvas={width:0,height:0,getContext:()=>({fillStyle:'',fillRect:()=>{},drawImage:()=>{}}),toBlob:(callback:(blob:Blob|null)=>void,type?:string)=>callback(new Blob([new Uint8Array(MAX_PHOTO_BYTES+1)],{type}))};
  replaceGlobal('document',{createElement:()=>canvas});
  replaceGlobal('createImageBitmap',async()=>({width:4000,height:3000,close:()=>{}}));
  const source=new File([new Uint8Array(MAX_PHOTO_BYTES+1)],'evidencia.jpg',{type:'image/jpeg'});

  await expect(compression!.prepareOccurrencePhoto(source)).rejects.toMatchObject({name:'PhotoCompressionError'});
});
