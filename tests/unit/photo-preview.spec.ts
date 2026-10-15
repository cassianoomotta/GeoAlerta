import {test,expect} from '@playwright/test';

test('RF-004 prévia exibe a imagem preparada para envio',async()=>{
  const preview=await import('../../src/features/occurrences/ui/PhotoPreview').catch(()=>null);
  expect(preview).not.toBeNull();

  const markup=JSON.stringify(preview!.PhotoPreview({src:'blob:photo-preview',alt:'Prévia da foto selecionada'}));

  expect(markup).toContain('Prévia da foto selecionada');
  expect(markup).toContain('blob:photo-preview');
});
