import {columnLabels,type Column,type ListItem} from './list-input';
type CsvColumn=Column|'climateEventId'|'climateEventName';
const csvLabels:Record<CsvColumn,string>={...columnLabels,climateEventId:'ID do evento climático',climateEventName:'Evento climático'};

function safeCell(value:unknown):string{
  let text=value===null||value===undefined?'':value instanceof Date?value.toISOString():String(value);
  if(/^[\s\u0000-\u001f]*[=+\-@]/u.test(text))text=`'${text}`;
  return `"${text.replaceAll('"','""')}"`;
}

export function buildOccurrencesCsv(items:readonly ListItem[],columns:readonly Column[]):string{
  const exportColumns=[...columns,'climateEventId','climateEventName'] as CsvColumn[];
  const header=exportColumns.map(column=>safeCell(csvLabels[column])).join(';');
  const rows=items.map(item=>exportColumns.map(column=>{
    const value=column==='groupId'?item.groupName
      :column==='climateEventName'?(item.climateEventName??'Sem evento')
      :column==='needsMedicalSupport'?(item.needsMedicalSupport==null?'Não informado':item.needsMedicalSupport?'Sim':'Não')
      :item[column];
    return safeCell(value);
  }).join(';'));
  return `\uFEFF${[header,...rows].join('\r\n')}${rows.length?'\r\n':''}`;
}
