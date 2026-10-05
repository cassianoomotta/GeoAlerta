type ViewportBounds={west:number;south:number;east:number;north:number};
type DashboardMapLike={
  invalidateSize:(options:{pan:false;debounceMoveend:true})=>void;
  getBounds:()=>{getWest:()=>number;getSouth:()=>number;getEast:()=>number;getNorth:()=>number};
};

export function resizeDashboardMapViewport(map:DashboardMapLike,onChange:(bounds:ViewportBounds)=>void):void{
  map.invalidateSize({pan:false,debounceMoveend:true});
  const bounds=map.getBounds();
  onChange({west:bounds.getWest(),south:bounds.getSouth(),east:bounds.getEast(),north:bounds.getNorth()});
}
