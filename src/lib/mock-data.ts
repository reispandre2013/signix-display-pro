/**
 * Tipos legados usados por partes do UI. Não há mais dados mock gerados aqui —
 * use hooks em `@/hooks/use-signage` e consultas em `@/lib/signage-queries`.
 */

export type DeviceStatus = "online" | "offline" | "warning" | "syncing";
export type Severity = "low" | "medium" | "high" | "critical";

export interface Screen {
  id: string;
  name: string;
  unit: string;
  unitId: string;
  pairCode: string;
  resolution: string;
  orientation: "horizontal" | "vertical";
  platform: string;
  os: string;
  playerVersion: string;
  lastSync: string;
  lastPing: string;
  status: DeviceStatus;
  currentCampaign: string | null;
  health: number;
  notes?: string;
}

export interface Unit {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  responsible: string;
  phone: string;
  status: "active" | "inactive";
  screens: number;
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  playlistId: string;
  playlistName: string;
  priority: "baixa" | "média" | "alta" | "crítica";
  startDate: string;
  endDate: string;
  status: "ativa" | "agendada" | "pausada" | "encerrada";
  screens: number;
  units: number;
}

export interface Media {
  id: string;
  name: string;
  type: "imagem" | "vídeo" | "banner" | "cardápio" | "aviso" | "html";
  category: string;
  tags: string[];
  url: string;
  thumb: string;
  duration: number;
  size: string;
  expiresAt: string | null;
  status: "ativo" | "expirado" | "rascunho";
  uploadedAt: string;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  items: number;
  duration: number;
  status: "publicada" | "rascunho";
  createdAt: string;
}

export interface Alert {
  id: string;
  type: string;
  severity: Severity;
  screen: string;
  date: string;
  message: string;
  resolved: boolean;
}

export interface AuditLog {
  id: string;
  user: string;
  action: string;
  entity: string;
  target: string;
  date: string;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: "Admin Master" | "Gestor" | "Operador" | "Visualizador";
  status: "ativo" | "inativo";
  unit: string;
  createdAt: string;
}
