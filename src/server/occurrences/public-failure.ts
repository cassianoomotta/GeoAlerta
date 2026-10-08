// Log only stable codes and stages; never request bodies, URLs or credentials.
export function reportPublicFailure(error:unknown,stage:string){
  const code=typeof error==='object'&&error!==null&&'code' in error&&typeof error.code==='string'&&/^[A-Z0-9_]{1,40}$/.test(error.code)?error.code:'UNHANDLED_FAILURE';
  console.error(JSON.stringify({event:'PUBLIC_INTAKE_FAILURE',stage,code}));
}
