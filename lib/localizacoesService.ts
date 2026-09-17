import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabaseClient';
import { idb } from '@/lib/indexedDb';

export interface LocalizacaoOperacional {
  id?: string;
  contrato_id: string;
  projeto_site: string;
  setor_planta: string;
  sub_local: string;
  prancha_projeto?: string | null;
  area_operacional?: string | null;
  codigo_instalacao_vale?: string | null;
  gerencia_responsavel?: string | null;
  diretoria_responsavel?: string | null;
  is_ativo?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DryRunValidationResult {
  totalRows: number;
  validRows: LocalizacaoOperacional[];
  invalidRows: { rowNum: number; errors: string[]; rawData: any }[];
  novosCount: number;
  atualizadosCount: number;
  setoresUnicos: number;
}

export interface VinculoAtivoItem {
  id: string;
  patrimonio: string;
  categoria: string;
  status: string;
}

export interface LocalizacaoBloqueada {
  localizacao: LocalizacaoOperacional;
  totalAtivos: number;
  ativos: VinculoAtivoItem[];
}

export interface ResultadoValidacaoBulkDelete {
  success: boolean;
  totalSolicitado: number;
  totalAptos: number;
  totalBloqueados: number;
  aptos: LocalizacaoOperacional[];
  bloqueados: LocalizacaoBloqueada[];
  erro?: string;
}

const CACHE_STORE = 'config';
const CACHE_KEY = 'spci_localizacoes_cache';

export class LocalizacoesService {
  /**
   * Baixa a planilha modelo canônica com as 8 colunas oficiais e exemplos práticos.
   */
  static baixarPlanilhaModelo(formato: 'xlsx' | 'csv' = 'xlsx') {
    const dadosExemplo = [
      {
        'SETOR_DA_PLANTA': 'USINA DE BENEFICIAMENTO',
        'SUB-LOCAL': 'PAINEL ELÉTRICO CCM-01 (SALA ELÉTRICA)',
        'PRANCHA': 'DE-120-04-SPCI',
        'ÁREA': 'ÁREA 100',
        'NUMERO_VALE': 'VALE-BR-0941',
        'GERENCIA': 'GERÊNCIA DE MANUTENÇÃO',
        'DIRETORIA': 'DIRETORIA DE OPERAÇÕES',
        'PROJETO': 'ONÇA PUMA'
      },
      {
        'SETOR_DA_PLANTA': 'BRITAGEM PRIMÁRIA',
        'SUB-LOCAL': 'GALERIA DE CORREIAS CV-102',
        'PRANCHA': 'DE-120-05-SPCI',
        'ÁREA': 'ÁREA 200',
        'NUMERO_VALE': 'VALE-BR-0942',
        'GERENCIA': 'GERÊNCIA DE BENEFICIAMENTO',
        'DIRETORIA': 'DIRETORIA DE OPERAÇÕES',
        'PROJETO': 'ONÇA PUMA'
      },
      {
        'SETOR_DA_PLANTA': 'CASA DE BOMBAS DE INCÊNDIO',
        'SUB-LOCAL': 'BOMBA PRINCIPAL DIESEL 01',
        'PRANCHA': 'DE-130-01-SPCI',
        'ÁREA': 'ÁREA 500',
        'NUMERO_VALE': 'VALE-BR-0950',
        'GERENCIA': 'GERÊNCIA DE UTILIDADES',
        'DIRETORIA': 'DIRETORIA DE ENGENHARIA',
        'PROJETO': 'ONÇA PUMA'
      },
      {
        'SETOR_DA_PLANTA': 'OFICINA CENTRAL DE EQUIPAMENTOS',
        'SUB-LOCAL': 'BANCADA DE SOLDA PESADA',
        'PRANCHA': 'DE-140-02-SPCI',
        'ÁREA': 'ÁREA 300',
        'NUMERO_VALE': 'VALE-BR-0965',
        'GERENCIA': 'GERÊNCIA DE MANUTENÇÃO',
        'DIRETORIA': 'DIRETORIA DE OPERAÇÕES',
        'PROJETO': 'ONÇA PUMA'
      },
      {
        'SETOR_DA_PLANTA': 'PRÉDIO ADMINISTRATIVO CENTRAL',
        'SUB-LOCAL': 'CORREDOR CENTRAL 1º ANDAR',
        'PRANCHA': 'DE-110-01-SPCI',
        'ÁREA': 'ÁREA ADM',
        'NUMERO_VALE': 'VALE-BR-0901',
        'GERENCIA': 'GERÊNCIA DE FACILITIES',
        'DIRETORIA': 'DIRETORIA ADMINISTRATIVA',
        'PROJETO': 'ONÇA PUMA'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(dadosExemplo);

    // Ajuste de largura das colunas
    worksheet['!cols'] = [
      { wch: 32 }, // SETOR_DA_PLANTA
      { wch: 38 }, // SUB-LOCAL
      { wch: 18 }, // PRANCHA
      { wch: 14 }, // ÁREA
      { wch: 18 }, // NUMERO_VALE
      { wch: 28 }, // GERENCIA
      { wch: 28 }, // DIRETORIA
      { wch: 18 }  // PROJETO
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'LOCALIZACOES_MODELO');

    if (formato === 'csv') {
      XLSX.writeFile(workbook, 'Modelo_Localizacoes_SPCI_Master.csv', { bookType: 'csv' });
    } else {
      XLSX.writeFile(workbook, 'Modelo_Localizacoes_SPCI_Master.xlsx', { bookType: 'xlsx' });
    }
  }

  /**
   * Realiza a leitura e a conferência prévia (Dry-Run) da planilha carregada.
   */
  static async validarPlanilha(
    file: File, 
    contratoPadrao: string = 'ONÇA PUMA'
  ): Promise<DryRunValidationResult> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

          if (!rawRows || rawRows.length === 0) {
            return resolve({
              totalRows: 0,
              validRows: [],
              invalidRows: [],
              novosCount: 0,
              atualizadosCount: 0,
              setoresUnicos: 0
            });
          }

          // Busca existentes para calcular novos vs existentes
          const existentes = await this.listarTodas(contratoPadrao);
          const mapExistentes = new Set(
            existentes.map(x => `${x.contrato_id.toLowerCase()}|${x.setor_planta.trim().toLowerCase()}|${x.sub_local.trim().toLowerCase()}`)
          );

          const validRows: LocalizacaoOperacional[] = [];
          const invalidRows: { rowNum: number; errors: string[]; rawData: any }[] = [];
          const deduplicationMap = new Map<string, LocalizacaoOperacional>();
          const setoresSet = new Set<string>();

          let novosCount = 0;
          let atualizadosCount = 0;

          rawRows.forEach((row, index) => {
            const rowNum = index + 2; // Cabeçalho é linha 1
            const errors: string[] = [];

            // Mapeamento flexível de chaves
            const getVal = (aliases: string[]) => {
              for (const alias of aliases) {
                const foundKey = Object.keys(row).find(
                  k => k.trim().toUpperCase().replace(/[\s\-_]/g, '') === alias.toUpperCase().replace(/[\s\-_]/g, '')
                );
                if (foundKey && String(row[foundKey]).trim() !== '') {
                  return String(row[foundKey]).trim();
                }
              }
              return '';
            };

            const setor = getVal(['SETOR_DA_PLANTA', 'SETOR_PLANTA', 'SETOR', 'LOCAL']);
            const subLocal = getVal(['SUB-LOCAL', 'SUB_LOCAL', 'SUBLOCAL', 'POSICAO_FISICA', 'POSICAO']);
            const prancha = getVal(['PRANCHA', 'PRANCHA_PROJETO', 'DESENHO']);
            const area = getVal(['ÁREA', 'AREA', 'AREA_OPERACIONAL']);
            const numeroVale = getVal(['NUMERO_VALE', 'NUMEROVALE', 'CODIGO_INSTALACAO_VALE', 'TAG_VALE']);
            const gerencia = getVal(['GERENCIA', 'GERENCIA_RESPONSAVEL']);
            const diretoria = getVal(['DIRETORIA', 'DIRETORIA_RESPONSAVEL']);
            const projeto = getVal(['PROJETO', 'PROJETO_SITE', 'CONTRATO']) || contratoPadrao;

            if (!setor) {
              errors.push('Campo SETOR_DA_PLANTA é obrigatório.');
            }
            if (!subLocal) {
              errors.push('Campo SUB-LOCAL é obrigatório.');
            }

            if (errors.length > 0) {
              invalidRows.push({ rowNum, errors, rawData: row });
            } else {
              const dedupeKey = `${projeto.toLowerCase()}|${setor.toLowerCase()}|${subLocal.toLowerCase()}`;
              
              const item: LocalizacaoOperacional = {
                contrato_id: projeto,
                projeto_site: projeto,
                setor_planta: setor.toUpperCase(),
                sub_local: subLocal.toUpperCase(),
                prancha_projeto: prancha || null,
                area_operacional: area || null,
                codigo_instalacao_vale: numeroVale || null,
                gerencia_responsavel: gerencia || null,
                diretoria_responsavel: diretoria || null,
                is_ativo: true
              };

              // Substitui ocorrência mantendo o mais recente se houver duplicata dentro da própria planilha
              deduplicationMap.set(dedupeKey, item);
              setoresSet.add(setor.toUpperCase());

              if (mapExistentes.has(dedupeKey)) {
                atualizadosCount++;
              } else {
                novosCount++;
              }
            }
          });

          resolve({
            totalRows: rawRows.length,
            validRows: Array.from(deduplicationMap.values()),
            invalidRows,
            novosCount,
            atualizadosCount,
            setoresUnicos: setoresSet.size
          });
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Salva em lote as localizações validadas com relatório de progresso.
   */
  static async salvarEmLote(
    itens: LocalizacaoOperacional[],
    onProgress?: (percent: number, current: number, total: number) => void
  ): Promise<{ sucessos: number; falhas: number; erros: string[] }> {
    const total = itens.length;
    let current = 0;
    let sucessos = 0;
    let falhas = 0;
    const erros: string[] = [];
    const chunkSize = 50;

    for (let i = 0; i < total; i += chunkSize) {
      const chunk = itens.slice(i, i + chunkSize);

      try {
        const { error } = await supabase
          .from('localizacoes_operacionais')
          .upsert(
            chunk.map(c => ({
              contrato_id: c.contrato_id,
              projeto_site: c.projeto_site,
              setor_planta: c.setor_planta,
              sub_local: c.sub_local,
              prancha_projeto: c.prancha_projeto,
              area_operacional: c.area_operacional,
              codigo_instalacao_vale: c.codigo_instalacao_vale,
              gerencia_responsavel: c.gerencia_responsavel,
              diretoria_responsavel: c.diretoria_responsavel,
              is_ativo: true,
              updated_at: new Date().toISOString()
            })),
            {
              onConflict: 'contrato_id,setor_planta,sub_local',
              ignoreDuplicates: false
            }
          );

        if (error) {
          // Fallback resiliente: busca existentes pelo contrato e setor/sub_local
          for (const item of chunk) {
            try {
              const { data: existing } = await supabase
                .from('localizacoes_operacionais')
                .select('id')
                .eq('contrato_id', item.contrato_id)
                .ilike('setor_planta', item.setor_planta.trim())
                .ilike('sub_local', item.sub_local.trim())
                .maybeSingle();

              if (existing?.id) {
                const { error: updErr } = await supabase
                  .from('localizacoes_operacionais')
                  .update({
                    projeto_site: item.projeto_site,
                    prancha_projeto: item.prancha_projeto,
                    area_operacional: item.area_operacional,
                    codigo_instalacao_vale: item.codigo_instalacao_vale,
                    gerencia_responsavel: item.gerencia_responsavel,
                    diretoria_responsavel: item.diretoria_responsavel,
                    is_ativo: true,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', existing.id);
                if (updErr) {
                  falhas++;
                  erros.push(`${item.setor_planta} - ${item.sub_local}: ${updErr.message}`);
                } else {
                  sucessos++;
                }
              } else {
                const { error: insErr } = await supabase
                  .from('localizacoes_operacionais')
                  .insert({
                    contrato_id: item.contrato_id,
                    projeto_site: item.projeto_site,
                    setor_planta: item.setor_planta,
                    sub_local: item.sub_local,
                    prancha_projeto: item.prancha_projeto,
                    area_operacional: item.area_operacional,
                    codigo_instalacao_vale: item.codigo_instalacao_vale,
                    gerencia_responsavel: item.gerencia_responsavel,
                    diretoria_responsavel: item.diretoria_responsavel,
                    is_ativo: true,
                    updated_at: new Date().toISOString()
                  });
                if (insErr) {
                  falhas++;
                  erros.push(`${item.setor_planta} - ${item.sub_local}: ${insErr.message}`);
                } else {
                  sucessos++;
                }
              }
            } catch (singleCatchErr: any) {
              falhas++;
              erros.push(`${item.setor_planta} - ${item.sub_local}: ${singleCatchErr.message}`);
            }
          }
        } else {
          sucessos += chunk.length;
        }
      } catch (err: any) {
        falhas += chunk.length;
        erros.push(`Falha no bloco ${i + 1}-${i + chunk.length}: ${err.message}`);
      }

      current = Math.min(total, i + chunkSize);
      const percent = Math.round((current / total) * 100);
      if (onProgress) {
        onProgress(percent, current, total);
      }
    }

    // Atualiza o cache local e emite eventos unificados
    try {
      const atualizados = await this.listarTodas();
      await idb.set(CACHE_STORE, CACHE_KEY, atualizados);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('spci_localizacoes_updated'));
        window.dispatchEvent(new CustomEvent('spci_locations_updated'));
      }
    } catch (e) {
      console.warn('[LocalizacoesService] Erro ao sincronizar cache local:', e);
    }

    return { sucessos, falhas, erros };
  }

  /**
   * Sincroniza e cadastra automaticamente localizações extraídas de ativos existentes (extintores, hidrantes, etc.).
   */
  static async sincronizarLocaisDeAtivos(
    ativos: { location?: string; subLocation?: string; sub_location?: string; site?: string }[],
    contratoPadrao: string = 'ONÇA PUMA'
  ): Promise<{ inseridos: number; totalMapeados: number }> {
    const mapa = new Map<string, LocalizacaoOperacional>();

    ativos.forEach(a => {
      const setor = (a.location || '').trim().toUpperCase();
      const sub = (a.subLocation || a.sub_location || '').trim().toUpperCase();
      const contrato = (a.site || contratoPadrao).trim();

      if (setor && sub) {
        const key = `${contrato.toLowerCase()}|${setor.toLowerCase()}|${sub.toLowerCase()}`;
        if (!mapa.has(key)) {
          mapa.set(key, {
            contrato_id: contrato,
            projeto_site: contrato,
            setor_planta: setor,
            sub_local: sub,
            is_ativo: true
          });
        }
      }
    });

    const itensParaSalvar = Array.from(mapa.values());
    if (itensParaSalvar.length === 0) {
      return { inseridos: 0, totalMapeados: 0 };
    }

    const { error } = await supabase
      .from('localizacoes_operacionais')
      .insert(itensParaSalvar);

    if (error) {
      console.warn('Erro ao sincronizar locais de ativos:', error.message);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('spci_localizacoes_updated'));
      window.dispatchEvent(new CustomEvent('spci_locations_updated'));
    }

    return { inseridos: itensParaSalvar.length, totalMapeados: itensParaSalvar.length };
  }

  /**
   * Lista todas as localizações operacionais cadastradas para o contrato/site.
   */
  static async listarTodas(contrato?: string): Promise<LocalizacaoOperacional[]> {
    try {
      let query = supabase
        .from('localizacoes_operacionais')
        .select('*')
        .order('setor_planta', { ascending: true })
        .order('sub_local', { ascending: true });

      if (contrato && contrato !== 'TODOS OS SITES (Acesso Global)') {
        query = query.eq('contrato_id', contrato);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (e) {
      // Fallback para cache local se offline
      try {
        const cached = await idb.get(CACHE_STORE, CACHE_KEY);
        return cached || [];
      } catch {
        return [];
      }
    }
  }

  /**
   * Executa ações em lote nos registros selecionados.
   */
  static async executarAcoesEmMassa(
    ids: string[],
    tipoAcao: 'gerencia' | 'diretoria' | 'prancha' | 'inativar' | 'ativar' | 'excluir',
    valor?: string
  ): Promise<{ sucesso: boolean; afetados: number; erro?: string }> {
    if (!ids || ids.length === 0) {
      return { sucesso: false, afetados: 0, erro: 'Nenhum registro selecionado.' };
    }

    try {
      if (tipoAcao === 'excluir') {
        const { error } = await supabase
          .from('localizacoes_operacionais')
          .delete()
          .in('id', ids);

        if (error) throw error;
        return { sucesso: true, afetados: ids.length };
      }

      let updatePayload: any = { updated_at: new Date().toISOString() };
      if (tipoAcao === 'gerencia') updatePayload.gerencia_responsavel = valor || null;
      if (tipoAcao === 'diretoria') updatePayload.diretoria_responsavel = valor || null;
      if (tipoAcao === 'prancha') updatePayload.prancha_projeto = valor || null;
      if (tipoAcao === 'inativar') updatePayload.is_ativo = false;
      if (tipoAcao === 'ativar') updatePayload.is_ativo = true;

      const { error } = await supabase
        .from('localizacoes_operacionais')
        .update(updatePayload)
        .in('id', ids);

      if (error) throw error;
      return { sucesso: true, afetados: ids.length };
    } catch (err: any) {
      return { sucesso: false, afetados: 0, erro: err.message };
    }
  }

  /**
   * Registra ou reaproveita um sub-local dinâmico garantindo deduplicação estrita.
   */
  static async registrarOuReaproveitarLocalizacao(
    contrato: string,
    setor: string,
    subLocal: string
  ): Promise<LocalizacaoOperacional> {
    const limpoSetor = setor.trim().toUpperCase();
    const limpoSubLocal = subLocal.trim().toUpperCase();

    // Busca se já existe com mesma chave
    const { data } = await supabase
      .from('localizacoes_operacionais')
      .select('*')
      .eq('contrato_id', contrato)
      .ilike('setor_planta', limpoSetor)
      .ilike('sub_local', limpoSubLocal)
      .limit(1);

    if (data && data.length > 0) {
      return data[0];
    }

    // Se não existir, insere novo
    const { data: inserted, error } = await supabase
      .from('localizacoes_operacionais')
      .insert([{
        contrato_id: contrato,
        projeto_site: contrato,
        setor_planta: limpoSetor,
        sub_local: limpoSubLocal,
        is_ativo: true
      }])
      .select()
      .single();

    if (error) {
      console.warn('[LocalizacoesService] Erro ao registrar novo local:', error.message);
      return {
        contrato_id: contrato,
        projeto_site: contrato,
        setor_planta: limpoSetor,
        sub_local: limpoSubLocal,
        is_ativo: true
      };
    }

    return inserted;
  }

  /**
   * Validação preventiva e auditoria de vínculos para exclusão em massa.
   * Realiza a consulta na API do servidor e cruza com os ativos em memória do contexto.
   */
  static async validarExclusaoEmMassa(
    ids: string[],
    contratoId?: string,
    memoryAssets?: any[]
  ): Promise<ResultadoValidacaoBulkDelete> {
    if (!ids || ids.length === 0) {
      return {
        success: true,
        totalSolicitado: 0,
        totalAptos: 0,
        totalBloqueados: 0,
        aptos: [],
        bloqueados: []
      };
    }

    try {
      // 1. Chamada à API Next.js de validação preventiva
      const response = await fetch('/api/localizacoes/validate-bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, contrato_id: contratoId })
      });

      let resData: ResultadoValidacaoBulkDelete;
      if (response.ok) {
        resData = await response.json();
      } else {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Falha na requisição (${response.status})`);
      }

      // 2. Dupla checagem com ativos em memória do PWA/Contexto (se fornecidos)
      if (memoryAssets && memoryAssets.length > 0 && resData.aptos.length > 0) {
        const novosAptos: LocalizacaoOperacional[] = [];
        const novosBloqueados = [...resData.bloqueados];

        for (const apto of resData.aptos) {
          const setor = (apto.setor_planta || '').trim().toUpperCase();
          const sub = (apto.sub_local || '').trim().toUpperCase();

          const ativosMemoria = memoryAssets.filter((m: any) => {
            const mLoc = (m.location || m.setor_planta || '').trim().toUpperCase();
            const mSub = (m.subLocation || m.sub_location || m.sub_local || '').trim().toUpperCase();
            const mStatus = String(m.status_operacional || m.status || '').toUpperCase();
            if (mStatus.includes('CONDENADO') || mStatus.includes('DESCARTE')) return false;
            return mLoc === setor && mSub === sub;
          }).map((m: any) => ({
            id: m.id || m.idAtivo || 'S/N',
            patrimonio: m.idAtivo || m.numero_patrimonio || m.patrimonio || 'Ativo',
            categoria: m.category || 'Ativo de Campo',
            status: m.status_operacional || m.status || 'Ativo'
          }));

          if (ativosMemoria.length > 0) {
            novosBloqueados.push({
              localizacao: apto,
              totalAtivos: ativosMemoria.length,
              ativos: ativosMemoria
            });
          } else {
            novosAptos.push(apto);
          }
        }

        resData.aptos = novosAptos;
        resData.bloqueados = novosBloqueados;
        resData.totalAptos = novosAptos.length;
        resData.totalBloqueados = novosBloqueados.length;
      }

      return resData;
    } catch (err: any) {
      console.error('[validarExclusaoEmMassa] Erro:', err);
      return {
        success: false,
        totalSolicitado: ids.length,
        totalAptos: 0,
        totalBloqueados: 0,
        aptos: [],
        bloqueados: [],
        erro: err.message
      };
    }
  }

  /**
   * Executa a exclusão em massa com feedback de progresso e emissão de evento de sincronização.
   */
  static async executarExclusaoEmMassaComProgresso(
    ids: string[],
    options?: {
      contratoId?: string;
      usuarioId?: string;
      usuarioNome?: string;
      onProgress?: (current: number, total: number) => void;
    }
  ): Promise<{ sucesso: boolean; afetados: number; erro?: string }> {
    if (!ids || ids.length === 0) {
      return { sucesso: false, afetados: 0, erro: 'Nenhum item selecionado.' };
    }

    try {
      if (options?.onProgress) options.onProgress(0, ids.length);

      // Processa via API com suporte a chunks se a lista for muito grande (>100)
      const chunkSize = 100;
      let totalExcluidos = 0;

      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        
        const res = await fetch('/api/localizacoes/bulk-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ids: chunk,
            contrato_id: options?.contratoId,
            usuario_id: options?.usuarioId,
            usuario_nome: options?.usuarioNome
          })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Falha ao excluir lote de localizações.');
        }

        totalExcluidos += (data.quantidade_excluida || chunk.length);
        if (options?.onProgress) {
          options.onProgress(Math.min(i + chunk.length, ids.length), ids.length);
        }
      }

      // Notifica o restante do app (autocomplete, listas, etc) para recarregar
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('spci_locations_updated'));
        window.dispatchEvent(new CustomEvent('spci_localizacoes_updated'));
      }

      return { sucesso: true, afetados: totalExcluidos };
    } catch (err: any) {
      console.error('[executarExclusaoEmMassaComProgresso] Erro:', err);
      return { sucesso: false, afetados: 0, erro: err.message };
    }
  }
}
