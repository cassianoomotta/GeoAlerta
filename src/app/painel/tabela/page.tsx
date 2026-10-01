import {redirect} from 'next/navigation';
const compatible=['from','to','status','priority','type','groupId','page','pageSize','sort','direction','columns'];
export default async function LegacyTable({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const params=new URLSearchParams();
  const aliases:Record<string,string>={Novo:'NOVA',Aberto:'NOVA','Em Atendimento':'EM_ATENDIMENTO',Resolvido:'RESOLVIDA',Recusado:'CANCELADA'};
  for(const [key,value]of Object.entries(await searchParams))if(compatible.includes(key)&&typeof value==='string')params.set(key,key==='status'?(aliases[value]??value):value);
  redirect(`/painel/ocorrencias${params.size?`?${params}`:''}`);
}
