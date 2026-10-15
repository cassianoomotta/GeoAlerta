export function PhotoPreview({src,alt}:{src:string;alt:string}){
  return <div className="h-52 w-full overflow-hidden rounded-xl border border-border bg-background sm:h-60">
    {/* The browser already decoded this local blob for compression; Next image optimization does not apply. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={src} alt={alt} className="h-full w-full object-contain" />
  </div>;
}
