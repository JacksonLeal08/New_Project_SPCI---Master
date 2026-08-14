export type AssetCategory = 'extintores' | 'hidrantes' | 'sinalizacoes' | 'iluminacao' | 'bombas';

export type AssetStatus = 
  | 'Conforme' 
  | 'Não Conforme' 
  | 'Vencido' 
  | 'Em Manutenção' 
  | 'Faltante' 
  | 'Operacional' 
  | 'Atenção' 
  | 'Falha Carga' 
  | 'Standby' 
  | 'Manutenção Req.';

export type TipoMovimentacaoType = 
  | 'na_area_aplicado'
  | 'estoque_aplicacao'
  | 'estoque_ag_manut'
  | 'em_manutencao'
  | 'condenado'
  | 'extraviado';

export interface TipoMovimentacaoConfig {
  value: TipoMovimentacaoType;
  label: string;
  badgeClass: string;
  iconColor: string;
  dotColor: string;
  description: string;
}

export const TIPO_MOVIMENTACAO_OPTIONS: TipoMovimentacaoConfig[] = [
  {
    value: 'na_area_aplicado',
    label: 'NA ÁREA (APLICADO)',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    iconColor: 'text-emerald-600',
    dotColor: 'bg-emerald-500',
    description: 'Extintor instalado e em uso na área operacional'
  },
  {
    value: 'estoque_aplicacao',
    label: 'ESTOQUE (APLICAÇÃO)',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
    iconColor: 'text-blue-600',
    dotColor: 'bg-blue-500',
    description: 'Extintor em estoque aguardando aplicação em área'
  },
  {
    value: 'estoque_ag_manut',
    label: 'ESTOQUE (AG. MANUT.)',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    iconColor: 'text-amber-600',
    dotColor: 'bg-amber-500',
    description: 'Extintor em estoque aguardando manutenção'
  },
  {
    value: 'em_manutencao',
    label: 'EM MANUTENÇÃO',
    badgeClass: 'bg-orange-100 text-orange-800 border-orange-300',
    iconColor: 'text-orange-600',
    dotColor: 'bg-orange-500',
    description: 'Extintor encaminhado para manutenção'
  },
  {
    value: 'condenado',
    label: 'CONDENADO',
    badgeClass: 'bg-red-100 text-red-800 border-red-300',
    iconColor: 'text-red-600',
    dotColor: 'bg-red-500',
    description: 'Extintor condenado/descartado'
  },
  {
    value: 'extraviado',
    label: 'EXTRAVIADO',
    badgeClass: 'bg-slate-200 text-slate-800 border-slate-300',
    iconColor: 'text-slate-600',
    dotColor: 'bg-slate-500',
    description: 'Extintor não localizado/perdido'
  }
];

export const TIPO_MOVIMENTACAO_MAP: Record<string, TipoMovimentacaoConfig> = {
  na_area_aplicado: TIPO_MOVIMENTACAO_OPTIONS[0],
  estoque_aplicacao: TIPO_MOVIMENTACAO_OPTIONS[1],
  estoque_ag_manut: TIPO_MOVIMENTACAO_OPTIONS[2],
  em_manutencao: TIPO_MOVIMENTACAO_OPTIONS[3],
  condenado: TIPO_MOVIMENTACAO_OPTIONS[4],
  extraviado: TIPO_MOVIMENTACAO_OPTIONS[5]
};

export const normalizeTipoMovimentacao = (val: any): TipoMovimentacaoType => {
  if (!val) return 'na_area_aplicado';
  const clean = String(val).trim().toLowerCase().replace(/[\(\)\.\-\s]/g, '_');
  if (clean.includes('area') || clean.includes('aplicado') || clean === 'na_area_aplicado') return 'na_area_aplicado';
  if (clean.includes('ag_manut') || clean.includes('ag__manut') || clean.includes('aguardando') || clean === 'estoque_ag_manut') return 'estoque_ag_manut';
  if (clean.includes('estoque') || clean === 'estoque_aplicacao') return 'estoque_aplicacao';
  if (clean.includes('em_manutencao') || clean.includes('manutencao')) return 'em_manutencao';
  if (clean.includes('condenad') || clean === 'condenado') return 'condenado';
  if (clean.includes('extraviad') || clean === 'extraviado') return 'extraviado';
  return 'na_area_aplicado';
};

export interface BaseAsset {
  id: string;
  idAtivo: string;
  category: string;
  location: string;
  subLocation?: string;
  status: string;
  tipo_movimentacao?: TipoMovimentacaoType | string;
  createdAt?: string;
  updatedAt?: string;
  geolocation?: {
    lat: number;
    lng: number;
  } | null;
}

export interface ExtintorDetails extends BaseAsset {
  model: string;
  seloInmetro: string;
  chassi: string;
  peso: string;
  lastRecarga: string;
  recurrenceInterval?: string;
  validadeRecarga: string;
  validadeTesteHidro: string;
  tipo_movimentacao?: TipoMovimentacaoType | string;
}

export interface HidranteDetails extends BaseAsset {
  components: string[];
  lastInsp: string;
  nextInsp: string;
}

export interface SinalizacaoDetails extends BaseAsset {
  model: string;
  group: string;
}

export interface IluminacaoDetails extends BaseAsset {
  systemType: string;
  model: string;
  qty: number;
  battery: string;
  autonomy: string;
}

export interface BombaDetails extends BaseAsset {
  name?: string;
  code?: string;
  type?: string;
  model?: string;
  pressure?: string;
  starts: string;
  power: string;
  range: string;
}

export type AnyAsset = 
  | ExtintorDetails 
  | HidranteDetails 
  | SinalizacaoDetails 
  | IluminacaoDetails 
  | BombaDetails;

export interface InspecaoRealizada {
  id?: string;
  asset_id: string;
  asset_patrimonio: string;
  status: 'Conforme' | 'Não Conforme';
  observacoes?: string;
  tecnico_nome: string;
  data_inspecao: string;
  details: {
    lacre_presente: boolean;
    pressao_adequada: boolean;
    valido_inmetro: boolean;
    obstruido: boolean;
    sinalizado: boolean;
    [key: string]: any;
  };
  created_at?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'cadastro' | 'inspecao' | 'alerta';
  category?: string;
  patrimonio?: string;
  read: boolean;
  created_at: string;
}


