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

export interface BaseAsset {
  id: string;
  idAtivo: string;
  category: string;
  location: string;
  subLocation?: string;
  status: string;
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


