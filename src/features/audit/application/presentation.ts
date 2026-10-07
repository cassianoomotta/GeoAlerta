export function formatAuditActor(value: string | null) {
  return value ? `${value.slice(0, 8)}…${value.slice(-4)}` : 'Sistema';
}

const ACTION_LABELS: Record<string, string> = {
  OPENED: 'Ocorrência aberta',
  OCCURRENCE_EDITED: 'Ocorrência editada',
  STATUS_TRANSITIONED: 'Status da ocorrência alterado',
  PRIORITY_RECLASSIFIED: 'Prioridade reclassificada',
  OCCURRENCE_DELETED: 'Ocorrência excluída',
  OCCURRENCE_RESTORED: 'Ocorrência restaurada',
  SERVICE_ACTION_RECORDED: 'Atendimento registrado',
  ADMIN_USER_PROVISIONED: 'Usuário provisionado',
  ADMIN_USER_PROVISIONING_RETRIED: 'Provisionamento retomado',
  ADMIN_USER_ACCESS_UPDATED: 'Acesso de usuário alterado',
  ADMIN_GROUP_CREATED: 'Grupo criado',
  ADMIN_GROUP_UPDATED: 'Grupo alterado',
  ADMIN_STATUS_PRESENTATIONS_UPDATED: 'Apresentação dos status alterada',
  ADMIN_STATUS_TRANSITION_UPDATED: 'Transição de status alterada',
  ADMIN_RISK_ZONE_CREATED: 'Zona de risco criada',
  ADMIN_RISK_ZONE_VERSION_CREATED: 'Versão da zona de risco criada',
  LEGACY_RISK_ZONE_IMPORTED: 'Zona de risco legada importada',
  ADMIN_SHELTER_CREATED: 'Abrigo cadastrado',
  ADMIN_SHELTER_UPDATED: 'Abrigo alterado',
  ADMIN_SHELTER_ACTIVATED: 'Abrigo ativado',
  ADMIN_SHELTER_DEACTIVATED: 'Abrigo desativado',
  ADMIN_SHELTER_DELETED: 'Abrigo excluído',
};

export function auditActionLabel(kind: string) {
  return ACTION_LABELS[kind] ?? kind;
}

export function auditActionTarget(kind: string) {
  if (kind.startsWith('ADMIN_USER_')) return 'Usuário';
  if (kind.startsWith('ADMIN_GROUP_')) return 'Grupo';
  if (kind.startsWith('ADMIN_STATUS_')) return 'Configuração de status';
  if (kind.startsWith('ADMIN_RISK_ZONE_') || kind === 'LEGACY_RISK_ZONE_IMPORTED') return 'Zona de risco';
  if (kind.startsWith('ADMIN_SHELTER_')) return 'Abrigo';
  if (kind === 'STATUS_TRANSITIONED' || kind === 'PRIORITY_RECLASSIFIED' || kind.startsWith('OCCURRENCE_') || kind === 'OPENED' || kind === 'SERVICE_ACTION_RECORDED') return 'Ocorrência';
  return 'Registro';
}
