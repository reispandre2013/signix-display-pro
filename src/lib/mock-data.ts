// Centralized mock data layer — replace with Supabase queries when wiring backend.

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

const units = [
  "Matriz São Paulo",
  "Filial Rio de Janeiro",
  "Filial Belo Horizonte",
  "Filial Curitiba",
  "Filial Porto Alegre",
  "Filial Salvador",
  "Filial Recife",
];

const campaignNames = [
  "Black Friday 2025",
  "Promoção de Verão",
  "Cardápio Almoço",
  "Boas-vindas Hall",
  "Comunicado Interno",
  "Lançamento Produto X",
  "Institucional Marca",
  "Saldão de Janeiro",
];

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function timeAgo(minutes: number) {
  const d = new Date();
  d.setMinutes(d.getMinutes() - minutes);
  return d.toISOString();
}

export const mockUnits: Unit[] = units.map((name, i) => ({
  id: `u-${i + 1}`,
  name,
  address: `Av. Paulista, ${1000 + i * 137}`,
  city: name.split(" ").slice(1).join(" "),
  state: ["SP", "RJ", "MG", "PR", "RS", "BA", "PE"][i],
  responsible: [
    "Ana Souza",
    "Carlos Lima",
    "Marina Reis",
    "Pedro Alves",
    "Júlia Mota",
    "Rafael Dias",
    "Beatriz Nunes",
  ][i],
  phone: `(${10 + i}) 9${pad(1000 + i)}-${pad(2000 + i * 11)}`,
  status: i === 5 ? "inactive" : "active",
  screens: [12, 8, 6, 5, 4, 0, 3][i],
}));

export const mockScreens: Screen[] = Array.from({ length: 38 }).map((_, i) => {
  const unit = mockUnits[i % mockUnits.length];
  const statuses: DeviceStatus[] = [
    "online",
    "online",
    "online",
    "online",
    "offline",
    "warning",
    "syncing",
  ];
  const status = statuses[i % statuses.length];
  return {
    id: `scr-${pad(i + 1)}`,
    name: `Tela ${pad(i + 1)} • ${unit.name.split(" ").slice(-1)[0]}`,
    unit: unit.name,
    unitId: unit.id,
    pairCode: `${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    resolution: rand(["1920x1080", "3840x2160", "1080x1920", "1366x768"]),
    orientation: i % 5 === 0 ? "vertical" : "horizontal",
    platform: rand(["Android TV", "WebOS", "Tizen", "BrightSign", "Chrome OS"]),
    os: rand(["Android 12", "Android 11", "WebOS 6", "Tizen 7", "Chrome 121"]),
    playerVersion: `v${2 + (i % 2)}.${i % 9}.${i % 5}`,
    lastSync: timeAgo(i * 7 + 2),
    lastPing: timeAgo(status === "offline" ? 240 + i * 5 : i),
    status,
    currentCampaign: status === "offline" ? null : rand(campaignNames),
    health: status === "offline" ? 0 : status === "warning" ? 55 + (i % 20) : 88 + (i % 12),
    notes: i % 7 === 0 ? "Instalação no hall principal" : undefined,
  };
});

export const mockCampaigns: Campaign[] = campaignNames.map((name, i) => ({
  id: `cmp-${i + 1}`,
  name,
  description: `Campanha ${name} para exibição programada nas unidades selecionadas.`,
  playlistId: `pl-${(i % 5) + 1}`,
  playlistName: `Playlist ${(i % 5) + 1}`,
  priority: (["baixa", "média", "alta", "crítica"] as const)[i % 4],
  startDate: timeAgo(60 * 24 * (i + 1)),
  endDate: timeAgo(-60 * 24 * (15 - i)),
  status: (
    ["ativa", "agendada", "pausada", "ativa", "ativa", "encerrada", "ativa", "agendada"] as const
  )[i],
  screens: 4 + i * 3,
  units: 1 + (i % 5),
}));

export const mockMedia: Media[] = Array.from({ length: 24 }).map((_, i) => {
  const types = ["imagem", "vídeo", "banner", "cardápio", "aviso", "html"] as const;
  const type = types[i % types.length];
  return {
    id: `med-${pad(i + 1)}`,
    name: `${type === "vídeo" ? "Promo" : type === "cardápio" ? "Menu" : "Mídia"}_${pad(i + 1)}.${type === "vídeo" ? "mp4" : type === "html" ? "html" : "jpg"}`,
    type,
    category: rand(["Marketing", "Institucional", "Operacional", "Eventos", "Comunicados"]),
    tags: [rand(["promo", "novo", "destaque", "sazonal"]), rand(["hall", "loja", "balcão"])],
    url: `https://picsum.photos/seed/${i + 10}/1920/1080`,
    thumb: `https://picsum.photos/seed/${i + 10}/400/240`,
    duration: type === "vídeo" ? 15 + (i % 30) : 8 + (i % 12),
    size: `${(0.5 + i * 0.13).toFixed(1)} MB`,
    expiresAt: i % 6 === 0 ? null : timeAgo(-60 * 24 * (10 + i)),
    status: i % 9 === 0 ? "expirado" : i % 7 === 0 ? "rascunho" : "ativo",
    uploadedAt: timeAgo(60 * 24 * (i + 1)),
  };
});

export const mockPlaylists: Playlist[] = Array.from({ length: 7 }).map((_, i) => ({
  id: `pl-${i + 1}`,
  name: [
    "Hall Principal Manhã",
    "Cardápio Almoço",
    "Promo Sazonal",
    "Comunicados RH",
    "Loop Institucional",
    "Lançamentos",
    "Vitrine Digital",
  ][i],
  description: "Sequência otimizada para exibição contínua com transições suaves.",
  items: 4 + i * 2,
  duration: 60 + i * 45,
  status: i % 4 === 0 ? "rascunho" : "publicada",
  createdAt: timeAgo(60 * 24 * (i + 2)),
}));

export const mockAlerts: Alert[] = Array.from({ length: 14 }).map((_, i) => {
  const sev: Severity[] = ["low", "medium", "high", "critical"];
  return {
    id: `alt-${i + 1}`,
    type: rand([
      "Player offline",
      "Falha de sync",
      "Mídia corrompida",
      "Pareamento perdido",
      "CPU alta",
      "Sem internet",
    ]),
    severity: sev[i % 4],
    screen: mockScreens[i % mockScreens.length].name,
    date: timeAgo(i * 23 + 5),
    message: "Detalhes técnicos do incidente registrado pelo agente do player.",
    resolved: i % 3 === 0,
  };
});

export const mockAudit: AuditLog[] = Array.from({ length: 22 }).map((_, i) => ({
  id: `log-${i + 1}`,
  user: rand(["Ana Souza", "Carlos Lima", "Marina Reis", "Pedro Alves", "Operador 01"]),
  action: rand([
    "criou",
    "editou",
    "excluiu",
    "publicou",
    "fez upload de",
    "pareou",
    "alterou campanha em",
  ]),
  entity: rand(["Campanha", "Playlist", "Mídia", "Tela", "Unidade", "Usuário"]),
  target: rand([
    "Black Friday 2025",
    "Promo Verão",
    "Tela 04 • SP",
    "Hall Principal",
    "Cardápio Almoço",
  ]),
  date: timeAgo(i * 17 + 3),
}));

export const mockUsers: UserAccount[] = [
  {
    id: "us-1",
    name: "Ana Souza",
    email: "ana@signix.com",
    role: "Admin Master",
    status: "ativo",
    unit: "Todas",
    createdAt: timeAgo(60 * 24 * 120),
  },
  {
    id: "us-2",
    name: "Carlos Lima",
    email: "carlos@signix.com",
    role: "Gestor",
    status: "ativo",
    unit: "Matriz São Paulo",
    createdAt: timeAgo(60 * 24 * 90),
  },
  {
    id: "us-3",
    name: "Marina Reis",
    email: "marina@signix.com",
    role: "Operador",
    status: "ativo",
    unit: "Filial Rio de Janeiro",
    createdAt: timeAgo(60 * 24 * 60),
  },
  {
    id: "us-4",
    name: "Pedro Alves",
    email: "pedro@signix.com",
    role: "Operador",
    status: "ativo",
    unit: "Filial Curitiba",
    createdAt: timeAgo(60 * 24 * 45),
  },
  {
    id: "us-5",
    name: "Júlia Mota",
    email: "julia@signix.com",
    role: "Visualizador",
    status: "inativo",
    unit: "Filial BH",
    createdAt: timeAgo(60 * 24 * 30),
  },
  {
    id: "us-6",
    name: "Rafael Dias",
    email: "rafael@signix.com",
    role: "Gestor",
    status: "ativo",
    unit: "Filial Salvador",
    createdAt: timeAgo(60 * 24 * 15),
  },
];

export const mockGroups = [
  {
    id: "g-1",
    name: "Hall Lobby",
    description: "Telas de recepção em todas as unidades",
    screens: 7,
    status: "ativo",
  },
  {
    id: "g-2",
    name: "Restaurante Interno",
    description: "Cardápio digital de praças de alimentação",
    screens: 5,
    status: "ativo",
  },
  {
    id: "g-3",
    name: "Vitrines Externas",
    description: "Telas voltadas para o público externo",
    screens: 9,
    status: "ativo",
  },
  {
    id: "g-4",
    name: "Áreas Operacionais",
    description: "Comunicação interna para colaboradores",
    screens: 6,
    status: "ativo",
  },
  {
    id: "g-5",
    name: "Eventos Sazonais",
    description: "Telas reservadas para campanhas pontuais",
    screens: 4,
    status: "inativo",
  },
];

export const mockSchedules = Array.from({ length: 8 }).map((_, i) => ({
  id: `sch-${i + 1}`,
  campaign: campaignNames[i % campaignNames.length],
  days: [
    ["Seg", "Ter", "Qua", "Qui", "Sex"],
    ["Sáb", "Dom"],
    ["Seg", "Qua", "Sex"],
    ["Diariamente"],
  ][i % 4],
  start: ["07:00", "10:00", "12:00", "14:00", "18:00"][i % 5],
  end: ["10:00", "12:00", "14:00", "18:00", "22:00"][i % 5],
  recurrence: ["Diária", "Semanal", "Mensal"][i % 3],
  timezone: "America/Sao_Paulo",
  status: i % 3 === 0 ? "pausada" : "ativa",
}));

// Charts
export const exhibitionsByDay = Array.from({ length: 14 }).map((_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (13 - i));
  return {
    date: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`,
    exibicoes: 1200 + Math.round(Math.random() * 800) + i * 40,
    falhas: Math.round(Math.random() * 60),
  };
});

export const statusByUnit = mockUnits.slice(0, 6).map((u) => ({
  name: u.name.replace("Filial ", "").replace("Matriz ", ""),
  online: Math.max(0, u.screens - Math.round(Math.random() * 2)),
  offline: Math.round(Math.random() * 2),
}));

export const stats = {
  total: mockScreens.length,
  online: mockScreens.filter((s) => s.status === "online" || s.status === "syncing").length,
  offline: mockScreens.filter((s) => s.status === "offline").length,
  warning: mockScreens.filter((s) => s.status === "warning").length,
  campaigns: mockCampaigns.filter((c) => c.status === "ativa").length,
  media: mockMedia.length,
  playlists: mockPlaylists.length,
};
