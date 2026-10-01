import {columnLabels,type Column,type ListItem} from './list-input';

function safeCell(value:unknown):string{
  let text=value===null||value===undefined?'':value instanceof Date?value.toISOString():String(value);
  if(/^[\s\u0000-\u001f]*[=+\-@]/u.test(text))text=`'${text}`;
  return `"${text.replaceAll('"','""')}"`;
}

export function buildOccurrencesCsv(items:readonly ListItem[],columns:readonly Column[]):string{
  const header=columns.map(column=>safeCell(columnLabels[column])).join(';');
  const rows=items.map(item=>columns.map(column=>{
    const value=column==='groupId'?item.groupName:item[column];
    return safeCell(value);
  }).join(';'));
  return `\uFEFF${[header,...rows].join('\r\n')}${rows.length?'\r\n':''}`;
}
