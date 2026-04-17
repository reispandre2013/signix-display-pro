/** Valor visual de “saúde” quando o schema não expõe métrica numérica. */
export function screenHealthPercent(row: { is_online: boolean; device_status: string }): number {
  if (!row.is_online) return 12;
  switch (row.device_status) {
    case "online":
      return 94;
    case "warning":
      return 58;
    case "syncing":
      return 72;
    case "maintenance":
      return 40;
    default:
      return 50;
  }
}

export function campaignPriorityLabel(priority: number): string {
  if (priority < 30) return "baixa";
  if (priority < 55) return "média";
  if (priority < 80) return "alta";
  return "crítica";
}

export function recordStatusLabel(status: string): string {
  const m: Record<string, string> = {
    active: "Ativo",
    inactive: "Inativo",
    draft: "Rascunho",
    archived: "Arquivado",
    suspended: "Suspenso",
  };
  return m[status] ?? status;
}
