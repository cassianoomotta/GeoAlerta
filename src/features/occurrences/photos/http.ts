import {MAX_PHOTO_BYTES, PhotoError} from './contracts';
export async function readPhotoForm(request: Request): Promise<File> {
  const type = request.headers.get('content-type');
  if (!type?.toLowerCase().startsWith('multipart/form-data;')) throw new PhotoError(422, 'INVALID_PHOTO');
  const reader = request.body?.getReader();
  if (!reader) throw new PhotoError(422, 'INVALID_PHOTO');
  const chunks: Uint8Array[] = []; let bytes = 0;
  try {
    while (true) {
      const chunk = await reader.read(); if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > MAX_PHOTO_BYTES + 16384) { await reader.cancel(); throw new PhotoError(422, 'INVALID_PHOTO'); }
      chunks.push(chunk.value);
    }
  } finally { reader.releaseLock(); }
  try {
    const form = await new Response(Buffer.concat(chunks), {headers: {'Content-Type': type}}).formData();
    const file = form.get('file');
    if (!(file instanceof File) || [...form.keys()].length !== 1) throw new Error();
    return file;
  } catch { throw new PhotoError(422, 'INVALID_PHOTO'); }
}
export function photoResponse(error: unknown) {
  const status = error instanceof PhotoError ? error.status : 503;
  const code = error instanceof PhotoError ? error.code : 'PHOTO_UNAVAILABLE';
  const message = status === 422 ? 'Foto inválida ou expirada. Selecione JPEG, PNG ou WebP de até 5 MiB e tente novamente.' : status === 404 ? 'Registro não encontrado.' : status === 409 ? 'Esta tentativa já foi confirmada.' : status === 429 ? 'Limite de uploads atingido. Aguarde um minuto.' : 'Não foi possível enviar ou consultar a foto. Tente novamente.';
  return Response.json({error: {code, message}}, {status, headers: {'Cache-Control': 'no-store', ...(status === 429 ? {'Retry-After': '60'} : {})}});
}
