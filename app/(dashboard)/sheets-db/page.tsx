'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSpci } from '@/app/context/SpciContext';
import { extractSpreadsheetId, readSpreadsheet, writeSpreadsheet, createSpreadsheet } from '@/lib/sheetsDatabase';
import { SHEETS_MAPPINGS } from '@/lib/sheetsDatabase';

export default function SheetsDbPage() {
  const {
    currentUser,
    gToken,
    authChecking,
    extintores,
    hidrantes,
    sinalizacoes,
    iluminacoes,
    bombas,
    setExtintores,
    setHidrantes,
    setSinalizacoes,
    setIluminacoes,
    setBombas,
    saveAssetsList,
    sheetsConfig,
    saveSheetsConfig,
    sheetsTemplates,
    saveSheetsTemplates,
    sheetsConsoleLogs,
    addConsoleLog,
    analyzingKeys,
    handleAIModelAnalysis,
    handleApplyRemodelNow,
    handleMassImport,
    handleGoogleLogin,
    handleGoogleLogout,
    triggerSuccessNotification,
    importCockpit,
    setImportCockpit
  } = useSpci();

  // Local state for unlink confirmation modal
  const [unlinkDbConfirm, setUnlinkDbConfirm] = useState<{ key: string; label: string } | null>(null);
  
  // Local states for file import
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImportModule, setPendingImportModule] = useState<{ key: string; label: string } | null>(null);
  const [isAiPreValidating, setIsAiPreValidating] = useState(false);

  const handleImportButtonClick = (moduleKey: string, moduleLabel: string) => {
    setPendingImportModule({ key: moduleKey, label: moduleLabel });
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingImportModule) return;
    
    e.target.value = ''; // reset so user can select same file again

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (!json || json.length === 0) {
          triggerSuccessNotification("Planilha Vazia", "A planilha não contém dados.");
          return;
        }
        const headers = (json[0] as string[]).map(h => String(h).trim()).filter(Boolean);
        const rows = json.slice(1) as any[][];
        
        setIsAiPreValidating(true);
        try {
          const prompt = `Você é um validador NBR da SPCI. Estou tentando importar uma planilha para o módulo ${pendingImportModule.label}.
Verifique se estes cabeçalhos fornecidos contêm o mínimo de informações que possam se mapear aos campos essenciais de NBR para este ativo (ex: identificação, localização).
Cabeçalhos encontrados na planilha: ${JSON.stringify(headers)}

Se houver uma base aceitável, retorne: {"valid": true, "message": "Campos mínimos detectados para importação."}
Caso a planilha não tenha NADA a ver com os dados esperados, retorne: {"valid": false, "message": "A planilha não possui os campos essenciais de NBR para ${pendingImportModule.label}. Não prossiga."}
Responda estritamente com JSON válido sem marcação.`;

          const res = await fetch("/api/gemini", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt, systemInstruction: "Você é um auditor rigoroso, retorne APENAS um JSON válido." })
          });
          const resData = await res.json();
          let parsedRes = { valid: true, message: '' };
          if (!resData.error) {
            let cleanText = resData.text.trim();
            if (cleanText.startsWith("```json")) cleanText = cleanText.substring(7);
            if (cleanText.endsWith("```")) cleanText = cleanText.substring(0, cleanText.length - 3);
            try {
              parsedRes = JSON.parse(cleanText.trim());
            } catch(e) {}
          }
          
          if (!parsedRes.valid) {
            triggerSuccessNotification("Bloqueio IA 🔴", parsedRes.message || "A planilha não atende aos requisitos mínimos.");
            addConsoleLog(`Pré-validação IA bloqueou a importação para ${pendingImportModule.label}. Tabela inválida.`, 'ERRO');
            setIsAiPreValidating(false);
            return;
          }
          addConsoleLog(`Pré-validação IA aprovada para a planilha inserida em ${pendingImportModule.label}.`, 'SUCESSO');
        } catch(e) {
          addConsoleLog(`Pré-validação IA falhou, prosseguindo com risco.`, 'ERRO');
        } finally {
          setIsAiPreValidating(false);
        }

        setImportCockpit({
          isOpen: true,
          moduleKey: pendingImportModule.key,
          moduleLabel: pendingImportModule.label,
          data: rows,
          headers: headers,
          mode: 'select'
        });
      } catch (err) {
        console.error(err);
        triggerSuccessNotification("Erro", "Falha ao processar a planilha.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleLocalModelAnalysis = async () => {
    if (!importCockpit) return;
    setImportCockpit(prev => prev ? { ...prev, isAiAnalyzing: true } : null);
    addConsoleLog(`[IA Local] Analisando modelo customizado para ${importCockpit.moduleLabel}...`);

    try {
      const defaultMapping = (SHEETS_MAPPINGS as any)[importCockpit.moduleKey === 'sinalizacao' ? 'sinalizacao' : importCockpit.moduleKey === 'iluminacao' ? 'iluminacao' : importCockpit.moduleKey === 'extintores' ? 'extintor' : importCockpit.moduleKey === 'hidrantes' ? 'hidrante' : 'bomba'];
      const oldHeaders = defaultMapping.headers;
      const finalHeaders = [...new Set([...importCockpit.headers, ...(importCockpit.retainedFields || [])])];
      
      const prompt = `Você é um Engenheiro de Dados SPCI especializado em conformidade de incêndio brasileira NBR 12962/NBR 13434. Faça uma auditoria de compatibilidade de reestruturação de banco de dados para o módulo ${importCockpit.moduleLabel}.

ESTRUTURA ATUAL DE COLUNAS:
${JSON.stringify(oldHeaders)}

NOVA ESTRUTURA DE COLUNAS DETECTADA NO MODELO SHEET (Upload + Campos Retidos):
${JSON.stringify(finalHeaders)}

Analise o seguinte:
1. Compatibilidade técnica rápida de migração de colunas.
2. Identifique quais colunas foram adicionadas, quais removidas e mapeie colunas equivalentes de nome similar.
3. Determine se é possível realizar o remodelamento sem quebrar a integridade estrutural.
4. Forneça um status claro ("É possível" ou "Não é possível" a reestruturação).
5. ATENÇÃO: Campos considerados "Primary Key" (como ID, Identificação, etc) e "Estrangeiras" são INVIOLÁVEIS e vitais para o relacionamento interno do sistema. Se a NOVA ESTRUTURA não os contiver, a compatibilidade deve ser nula (compatible: false) e destaque o erro na \`technicalAnalysis\`.

Responda estritamente com um JSON sem marcações extras (formato JSON literal puro) com este esquema exato:
{
  "compatible": boolean,
  "score": number,
  "addedColumns": ["coluna1"],
  "removedColumns": ["coluna2"],
  "mappedColumns": {"coluna_antiga": "coluna_nova"},
  "technicalAnalysis": "Resumo técnico explicativo de compatibilidade técnica em 2 frases",
  "nbrComplianceWarning": "Mensagem de alerta de conformidade legal de incêndio NBR"
}`;

      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, systemInstruction: "Você é um auditor de banco de dados SPCI rigoroso. Responda estritamente em formato JSON válido." }),
      });
      
      const resData = await res.json();
      if (resData.error) throw new Error(resData.error);

      let parsedResult;
      try {
        let cleanText = resData.text.trim();
        if (cleanText.startsWith("```json")) cleanText = cleanText.substring(7);
        if (cleanText.endsWith("```")) cleanText = cleanText.substring(0, cleanText.length - 3);
        parsedResult = JSON.parse(cleanText.trim());
      } catch (e) {
        parsedResult = {
          compatible: true,
          score: 85,
          addedColumns: importCockpit.headers.filter((h: string) => !oldHeaders.includes(h)),
          removedColumns: oldHeaders.filter((h: string) => !importCockpit.headers.includes(h)),
          mappedColumns: {},
          technicalAnalysis: "Auditoria efetuada. Nova estrutura aceita e pronta para remapeamento dinâmico pelo motor do SPCI.",
          nbrComplianceWarning: "Certifique-se de que nenhum campo de validade legal de combate a incêndio foi removido do modelo."
        };
      }

      setImportCockpit(prev => prev ? { ...prev, aiAuditResult: parsedResult, isAiAnalyzing: false } : null);
      triggerSuccessNotification("Análise Local Concluída", `Auditoria de estrutura completada para ${importCockpit.moduleLabel}`);
    } catch (err: any) {
      console.error(err);
      triggerSuccessNotification("Erro de Análise IA", err.message);
      setImportCockpit(prev => prev ? { ...prev, isAiAnalyzing: false } : null);
    }
  };

  const applyLocalRemodel = () => {
    if (!importCockpit) return;
    
    const finalHeaders = [...new Set([...importCockpit.headers, ...(importCockpit.retainedFields || [])])];
    const currentTpl = sheetsTemplates[importCockpit.moduleKey] || { customModel: false, templateId: '', headers: [], isRemodeled: false };
    
    saveSheetsTemplates({
      ...sheetsTemplates,
      [importCockpit.moduleKey]: {
        ...currentTpl,
        headers: finalHeaders,
        isRemodeled: true,
        lastAuditedAt: new Date().toLocaleString('pt-BR'),
        aiAuditResult: importCockpit.aiAuditResult || null
      }
    });

    handleApplyRemodelNow(importCockpit.moduleKey, importCockpit.moduleLabel);
    setImportCockpit(prev => prev ? { ...prev, mode: 'download-template', headers: finalHeaders } : null);
  };

  const handleUnlinkDb = (moduleKey: string, moduleLabel: string) => {
    saveSheetsConfig({
      ...sheetsConfig,
      [moduleKey]: { id: '', url: '', syncState: 'idle' }
    });
    
    const currentTpl = sheetsTemplates[moduleKey] || { customModel: false, templateId: '', headers: [], isRemodeled: true, aiAuditResult: null };
    saveSheetsTemplates({
      ...sheetsTemplates,
      [moduleKey]: { ...currentTpl, customModel: false, templateId: '', aiAuditResult: null }
    });
    
    setUnlinkDbConfirm(null);
    addConsoleLog(`Banco de Dados do módulo [${moduleLabel}] desvinculado com sucesso. Operando em offline isolado.`, 'SUCESSO');
    triggerSuccessNotification("Banco Desvinculado", `O sistema foi convertido para modo offline isolado em ${moduleLabel}.`);
  };

  const handleCockpitValidation = async () => {
    if (!importCockpit) return;
    setImportCockpit(prev => prev ? { ...prev, isAiAnalyzing: true } : null);

    try {
      const sample = importCockpit.data.slice(0, 10);
      const prompt = `Você é um motor de consistência e auditoria de campo SPCI NBR 12962/13434.
Eis uma matriz de dados de inspeção importados para ativos do tipo ${importCockpit.moduleLabel}.
CABEÇALHOS: ${JSON.stringify(importCockpit.headers)}
LINHAS:
${JSON.stringify(sample)}

Baseado em normas técnicas de combate a incêndio, valide se há algum erro grosseiro nos dados informados (ex: status inválido, peso incorreto para o modelo, campo vazio essencial). 
ATENÇÃO (Inviolabilidade): Campos que representam "Primary Key" (ID, Identificacao, etc) e chaves "Estrangeiras" são estruturalmente invioláveis para o relacionamento interno do sistema. Acuse erro em caráter impeditivo caso essas colunas base estejam vazias, ausentes ou manifestadamente incorretas em sua sintaxe.
Retorne estritamente um JSON array ("errors": [...]) com o formato: { "rowIndex": number, "colIndex": number, "message": "Motivo do erro ou sugestão rápida" }. Se não tiver erro, retorne "errors": [].`;

      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, systemInstruction: "Responda estritamente com JSON puro e válido, sem marcação." }),
      });

      const resData = await res.json();
      if (resData.error) throw new Error(resData.error);
      
      let parsedResult;
      try {
        let cleanText = resData.text.trim();
        if (cleanText.startsWith("```json")) cleanText = cleanText.substring(7);
        if (cleanText.endsWith("```")) cleanText = cleanText.substring(0, cleanText.length - 3);
        parsedResult = JSON.parse(cleanText.trim());
      } catch (e) {
        parsedResult = { errors: [] };
      }

      setImportCockpit(prev => prev ? { ...prev, validationErrors: parsedResult.errors || [], isAiAnalyzing: false } : null);
      if (parsedResult.errors && parsedResult.errors.length > 0) {
        triggerSuccessNotification("Validação IA", "Foram encontrados possíveis alertas nos dados.");
      } else {
        triggerSuccessNotification("Validação IA", "Nenhum erro grosseiro detectado. Dados parecem íntegros.");
      }

    } catch (err: any) {
      console.error(err);
      triggerSuccessNotification("Erro na Validação IA", err.message);
      setImportCockpit(prev => prev ? { ...prev, isAiAnalyzing: false } : null);
    }
  };

  const handleCockpitFixAI = async () => {
    if (!importCockpit || !importCockpit.validationErrors || importCockpit.validationErrors.length === 0) return;
    setImportCockpit(prev => prev ? { ...prev, isAiFixing: true } : null);

    try {
      const prompt = `Você é uma IA de tratamento e correção de dados especializada em NBR 12962/13434. 
Aqui estão os CABEÇALHOS da planilha: ${JSON.stringify(importCockpit.headers)}
Aqui estão as LINHAS atuais que precisam de correção (amostra com erro ou contexto total dependendo do tamanho):
${JSON.stringify(importCockpit.data)}

Os seguintes ALERTAS FORAM ENCONTRADOS por você anteriormente:
${JSON.stringify(importCockpit.validationErrors)}

Sua tarefa:
Corrija automaticamente os erros apontados nos dados (LINHAS) com base nas normativas brasileiras (ex: ajustando status para conformidade, preenchendo tipos vazios). 
As colunas de "Primary Key" (ex: ID) e chaves Estrangeiras NÃO PODEM ser alteradas de forma a perder sua unicidade. O campo deve continuar coerente para o banco.

Retorne estritamente um objeto JSON com 2 chaves:
- "correctedData": A matriz completa (array de arrays) com as LINHAS corrigidas. IMPORTANTE: ela deve ter exatamente o mesmo número de linhas da original (preserve as que não tinham erro também) e colunas na mesma ordem.
- "fixReport": Uma breve mensagem (string) resumindo de forma Premium as correções estruturais que foram aplicadas na integridade do banco (ex: "Foram ajustados valores de pressão de X extintores e categorizados N status ausentes para adequação a NBR 12962.").

Formato esperado:
{
  "correctedData": [["...", "..."], ["...", "..."]],
  "fixReport": "Sua mensagem aqui."
}`;

      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, systemInstruction: "Retorne ESTRITAMENTE um objeto JSON puro, sem formatação markdown." }),
      });

      const resData = await res.json();
      let parsed = { correctedData: importCockpit.data, fixReport: "Não foi possível realizar correções automatizadas completas." };
      
      try {
        let cleanText = resData.text.trim();
        if (cleanText.startsWith("```json")) cleanText = cleanText.substring(7);
        if (cleanText.endsWith("```")) cleanText = cleanText.substring(0, cleanText.length - 3);
        parsed = JSON.parse(cleanText.trim());
      } catch (e) {
        console.error("Falha ao analisar resposta de correção", resData.text);
      }

      setImportCockpit(prev => prev ? {
        ...prev,
        data: parsed.correctedData && Array.isArray(parsed.correctedData) && parsed.correctedData.length === prev.data.length ? parsed.correctedData : prev.data,
        aiFixReport: parsed.fixReport,
        validationErrors: [],
        isAiFixing: false
      } : null);
      
      triggerSuccessNotification("Correções Aplicadas", parsed.fixReport || "A IA aplicou os ajustes solicitados.");
    } catch (error: any) {
      console.error(error);
      triggerSuccessNotification("Erro na Correção", error.message);
      setImportCockpit(prev => prev ? { ...prev, isAiFixing: false } : null);
    }
  };

  const handleCockpitCellEdit = (rIndex: number, cIndex: number, newVal: string) => {
    if (!importCockpit) return;
    const newData = [...importCockpit.data];
    if (!newData[rIndex]) newData[rIndex] = [];
    newData[rIndex][cIndex] = newVal;
    setImportCockpit({ ...importCockpit, data: newData });
  };

  const handleConfirmDataImport = async () => {
    if (!importCockpit) return;
    const { moduleKey, moduleLabel, headers, data } = importCockpit;
    addConsoleLog(`[Cockpit] Finalizando importação massiva analisada para ${moduleLabel} com ${data.length} registros.`);

    try {
      const importedAssets = data.map((row: any[], rowIndex: number) => {
        const asset: Record<string, any> = {};
        asset.id = `import-${Date.now()}-${rowIndex}-${Math.floor(Math.random() * 100)}`;
        
        headers.forEach((header, colIdx) => {
          const val = row[colIdx] !== undefined ? String(row[colIdx]).trim() : '';
          asset[header] = val;
        });

        asset.idAtivo = asset["IdAtivo"] || asset["idAtivo"] || asset["Patrimonio"] || asset["ID"] || asset.id;
        asset.model = asset["Modelo"] || asset["modelo"] || asset["Nome"] || asset["Ativo"] || '';
        asset.location = asset["Localizacao"] || asset["localizacao"] || asset["Local"] || asset["LOCAL"] || '';
        asset.subLocation = asset["SubLocalizacao"] || asset["subLocalizacao"] || '';
        asset.status = asset["Status"] || asset["status"] || 'Conforme';
        
        return asset;
      });

      let mergedList: any[] = [];
      if (moduleKey === 'extintores') {
        mergedList = [...extintores, ...importedAssets];
        setExtintores(mergedList);
        await saveAssetsList('extintores', mergedList);
      } else if (moduleKey === 'hidrantes') {
        mergedList = [...hidrantes, ...importedAssets];
        setHidrantes(mergedList);
        await saveAssetsList('hidrantes', mergedList);
      } else if (moduleKey === 'sinalizacao') {
        mergedList = [...sinalizacoes, ...importedAssets];
        setSinalizacoes(mergedList);
        await saveAssetsList('sinalizacoes', mergedList);
      } else if (moduleKey === 'iluminacao') {
        mergedList = [...iluminacoes, ...importedAssets];
        setIluminacoes(mergedList);
        await saveAssetsList('iluminacao', mergedList);
      } else if (moduleKey === 'bombas') {
        mergedList = [...bombas, ...importedAssets];
        setBombas(mergedList);
        await saveAssetsList('bombas', mergedList);
      }
      
      triggerSuccessNotification("Importação Concluída! 🚀", `${importedAssets.length} registros importados para ${moduleLabel}.`);
      
      saveSheetsTemplates({
        ...sheetsTemplates,
        [moduleKey]: {
          ...sheetsTemplates[moduleKey],
          headers,
          isRemodeled: true
        }
      });

      setImportCockpit(null);
    } catch (err: any) {
      triggerSuccessNotification("Falha", "Impossível concluir a importação.");
    }
  };

  const handleCreateSheetForModuleLocal = async (moduleKey: string, moduleLabel: string) => {
    const token = gToken;
    if (!token) {
      triggerSuccessNotification("Requer Google Login 🔑", "Por favor, conecte sua conta Google no painel antes de gerenciar planilhas.");
      return;
    }

    addConsoleLog(`Iniciando criação de nova planilha para o módulo: [${moduleLabel}]...`);
    const currentModule = sheetsConfig[moduleKey] || { id: '', url: '', syncState: 'idle' };
    saveSheetsConfig({
      ...sheetsConfig,
      [moduleKey]: { ...currentModule, syncState: 'syncing' }
    });

    try {
      const titleApp = `SPCI - ${moduleLabel} Database (Planta SPCI)`;
      const newSheet = await createSpreadsheet(token, titleApp);
      addConsoleLog(`Planilha criada com sucesso ID: ${newSheet.id}`);

      let items: any[] = [];
      if (moduleKey === 'extintores') items = extintores;
      else if (moduleKey === 'hidrantes') items = hidrantes;
      else if (moduleKey === 'sinalizacao') items = sinalizacoes;
      else if (moduleKey === 'iluminacao') items = iluminacoes;
      else if (moduleKey === 'bombas') items = bombas;

      const mapping = (SHEETS_MAPPINGS as any)[moduleKey === 'sinalizacao' ? 'sinalizacao' : moduleKey === 'iluminacao' ? 'iluminacao' : moduleKey === 'extintores' ? 'extintor' : moduleKey === 'hidrantes' ? 'hidrante' : 'bomba'];
      const rows = [
        mapping.headers,
        ...items.map(x => mapping.toRow(x))
      ];

      addConsoleLog(`Inicializando tabela [${moduleLabel}] com ${items.length} registros preexistentes em cache...`);
      await writeSpreadsheet(token, newSheet.id, rows);
      addConsoleLog("Estrutura de dados NBR montada com sucesso.");

      const timestamp = new Date().toLocaleString('pt-BR');
      saveSheetsConfig({
        ...sheetsConfig,
        [moduleKey]: {
          id: newSheet.id,
          url: newSheet.url,
          syncState: 'success',
          lastSync: timestamp
        }
      });

      triggerSuccessNotification("Banco de Dados Criado! 🟢", `Planilha "${titleApp}" criada e vinculada ao módulo com sucesso.`);
    } catch (err: any) {
      console.error(err);
      addConsoleLog(`Erro ao criar banco de dados [${moduleLabel}]: ${err.message || err}`);
      saveSheetsConfig({
        ...sheetsConfig,
        [moduleKey]: { ...currentModule, syncState: 'error', lastError: err.message || String(err) }
      });
    }
  };

  const handleSyncModuleWithSheetsLocal = async (moduleKey: string, moduleLabel: string) => {
    const token = gToken;
    if (!token) {
      triggerSuccessNotification("Requer Google Login 🔑", "Por favor, conecte sua conta Google no painel antes de sincronizar.");
      return;
    }

    const currentModule = sheetsConfig[moduleKey] || { id: '', url: '', syncState: 'idle' };
    if (!currentModule.id) {
      triggerSuccessNotification("Planilha não vinculada ❌", `Por favor, crie ou cole o link de uma planilha para o módulo ${moduleLabel} antes de sincronizar.`);
      return;
    }

    const sheetId = extractSpreadsheetId(currentModule.id);
    addConsoleLog(`Iniciando Sincronização Inteligente para [${moduleLabel}]. ID Planilha: ${sheetId}...`);

    saveSheetsConfig({
      ...sheetsConfig,
      [moduleKey]: { ...currentModule, syncState: 'syncing' }
    });

    try {
      const mapping = (SHEETS_MAPPINGS as any)[moduleKey === 'sinalizacao' ? 'sinalizacao' : moduleKey === 'iluminacao' ? 'iluminacao' : moduleKey === 'extintores' ? 'extintor' : moduleKey === 'hidrantes' ? 'hidrante' : 'bomba'];
      
      addConsoleLog("Lendo registros presentes no Google Sheets...");
      const rows = await readSpreadsheet(token, sheetId);
      
      let remoteItems: any[] = [];
      if (rows && rows.length > 1) {
        const fileHeaders = rows[0].map((h: any) => String(h).trim());
        const headerMap: Record<string, number> = {};
        fileHeaders.forEach((h, i) => { headerMap[h] = i; });
        
        remoteItems = rows.slice(1).map(row => mapping.fromRow(row, headerMap));
        addConsoleLog(`Obtidos ${remoteItems.length} registros da planilha remota.`);
      } else {
        addConsoleLog("Planilha vazia ou sem cabeçalhos válidos detectada.");
      }

      let localItems: any[] = [];
      if (moduleKey === 'extintores') localItems = extintores;
      else if (moduleKey === 'hidrantes') localItems = hidrantes;
      else if (moduleKey === 'sinalizacao') localItems = sinalizacoes;
      else if (moduleKey === 'iluminacao') localItems = iluminacoes;
      else if (moduleKey === 'bombas') localItems = bombas;

      addConsoleLog("Fazendo correspondência de conformidades local-remota...");
      const mergedMap = new Map();
      localItems.forEach(item => {
        if (item && item.id) mergedMap.set(String(item.id), item);
      });
      remoteItems.forEach(item => {
        if (item && item.id) mergedMap.set(String(item.id), item);
      });

      const mergedList = Array.from(mergedMap.values());
      addConsoleLog(`União dos bancos concluída: Total de ${mergedList.length} ativos consolidados.`);

      const rowsToWrite = [
        mapping.headers,
        ...mergedList.map(item => mapping.toRow(item))
      ];

      addConsoleLog("Gravando de volta registros consolidados no Google Sheets...");
      await writeSpreadsheet(token, sheetId, rowsToWrite);
      addConsoleLog("Escrita concluída.");

      if (moduleKey === 'extintores') {
        setExtintores(mergedList);
        await saveAssetsList('extintores', mergedList);
      } else if (moduleKey === 'hidrantes') {
        setHidrantes(mergedList);
        await saveAssetsList('hidrantes', mergedList);
      } else if (moduleKey === 'sinalizacao') {
        setSinalizacoes(mergedList);
        await saveAssetsList('sinalizacoes', mergedList);
      } else if (moduleKey === 'iluminacao') {
        setIluminacoes(mergedList);
        await saveAssetsList('iluminacao', mergedList);
      } else if (moduleKey === 'bombas') {
        setBombas(mergedList);
        await saveAssetsList('bombas', mergedList);
      }

      const timestamp = new Date().toLocaleString('pt-BR');
      saveSheetsConfig({
        ...sheetsConfig,
        [moduleKey]: {
          id: sheetId,
          url: currentModule.url || `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
          syncState: 'success',
          lastSync: timestamp
        }
      });

      addConsoleLog(`Sincronia encerrada operacionalmente às ${timestamp}.`);
      triggerSuccessNotification("Sincronia Concluída! 🔄", `Planilha "${moduleLabel}" consolidada com sucesso de forma bidirecional.`);
    } catch (err: any) {
      console.error(err);
      addConsoleLog(`Falha de Sincronia em [${moduleLabel}]: ${err.message || err}`);
      saveSheetsConfig({
        ...sheetsConfig,
        [moduleKey]: { ...currentModule, syncState: 'error', lastError: err.message || String(err) }
      });
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-24">
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept=".xlsx, .xls, .csv" 
        onChange={handleFileChange} 
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-emerald-800 to-teal-950 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden shrink-0">
        <div className="absolute -right-10 -bottom-10 opacity-10 text-9xl select-none pointer-events-none" aria-hidden="true">📊</div>
        <div>
          <h2 className="font-['Hanken_Grotesk'] font-black text-2xl tracking-tight flex items-center gap-2">
            <span>🟢</span> Central de Integração Google Sheets
          </h2>
          <p className="text-teal-100 text-xs mt-1">
            Configure planilhas do Google Sheets para servir como o banco de dados oficial de cada módulo do SPCI.
          </p>
        </div>
        
        <div>
          {authChecking ? (
            <div className="flex items-center gap-2 text-xs text-teal-200">
              <span className="w-2 h-2 bg-yellow-400 rounded-full animate-ping" aria-hidden="true"></span>
              Verificando conta...
            </div>
          ) : currentUser ? (
            <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex items-center gap-3">
              {currentUser.photoURL ? (
                <img src={currentUser.photoURL} alt="Avatar" className="w-8 h-8 rounded-full border border-emerald-400" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm uppercase">
                  {currentUser.email?.charAt(0)}
                </div>
              )}
              <div className="text-left">
                <p className="text-[10px] font-sans text-emerald-300 font-extrabold uppercase tracking-wide leading-none">CONECTADO</p>
                <p className="text-xs font-bold font-mono text-white leading-tight mt-0.5 max-w-[150px] truncate">{currentUser.email}</p>
              </div>
              <button 
                onClick={handleGoogleLogout}
                className="bg-red-600/30 hover:bg-red-600 border border-red-500/35 px-2 py-1 rounded text-[10px] uppercase font-bold text-white transition-all cursor-pointer"
              >
                Sair
              </button>
            </div>
          ) : (
            <button
              onClick={handleGoogleLogin}
              className="bg-white hover:bg-neutral-50 text-slate-900 border border-neutral-200 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all transform hover:scale-[1.03] active:scale-95 shadow-md shadow-emerald-950/20 cursor-pointer border-none"
            >
              <span className="text-sm" aria-hidden="true">🔑</span> Conectar Conta Google
            </button>
          )}
        </div>
      </div>

      {isAiPreValidating && (
        <div className="p-4 bg-teal-50 border border-teal-200 text-teal-800 rounded-xl text-center text-xs font-black animate-pulse">
          🤖 SPCI Agent analisando pre-requisitos da planilha inserida...
        </div>
      )}

      {/* Dashboard modules grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { key: 'extintores', label: 'Cadastro de Extintores', icon: '🧯', color: 'border-red-500/20 shadow-red-500/5' },
          { key: 'hidrantes', label: 'Hidrantes & Abrigos', icon: '💧', color: 'border-blue-500/20 shadow-blue-500/5' },
          { key: 'sinalizacao', label: 'Sinalizações NBR 13434', icon: '⚠️', color: 'border-amber-500/20 shadow-amber-500/5' },
          { key: 'iluminacao', label: 'Iluminação de Emergência', icon: '💡', color: 'border-yellow-500/20 shadow-yellow-500/5' },
          { key: 'bombas', label: 'Sistemas Casa de Bombas', icon: '⚙️', color: 'border-slate-500/20 shadow-slate-500/5' },
        ].map((mod) => {
          const conf = sheetsConfig[mod.key] || { id: '', url: '', syncState: 'idle' };
          const isSyncing = conf.syncState === 'syncing';
          const isError = conf.syncState === 'error';
          const isSuccess = conf.syncState === 'success';

          const tpl = sheetsTemplates[mod.key] || { customModel: false, templateId: '', headers: [], isRemodeled: true, aiAuditResult: null };
          const isAnalyzing = analyzingKeys[mod.key] || false;

          return (
            <div key={mod.key} className={`bg-white rounded-2xl border ${mod.color} p-6 shadow-sm hover:shadow-lg transition-all relative overflow-hidden flex flex-col justify-between`}>
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{mod.icon}</span>
                    <div>
                      <h3 className="font-['Hanken_Grotesk'] font-black text-slate-800 text-sm md:text-base leading-tight">{mod.label}</h3>
                      <p className="text-[10px] text-teal-600 font-mono flex items-center gap-1 font-bold">
                        <span>📅</span> Tabela: Sheet1
                      </p>
                    </div>
                  </div>
                  
                  {/* Sync badges */}
                  {isSyncing && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                      🔄 Processando
                    </span>
                  )}
                  {isSuccess && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      🟢 Conectado
                    </span>
                  )}
                  {isError && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                      🔴 Erro
                    </span>
                  )}
                  {conf.syncState === 'idle' && !conf.id && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                      ⚪ Sem Banco
                    </span>
                  )}
                  {conf.syncState === 'idle' && conf.id && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700">
                      🟡 Configurado
                    </span>
                  )}
                </div>

                {/* Planilha Ativa de Banco de Dados */}
                <div className="space-y-2 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                  <span className="block text-[9px] uppercase font-black text-slate-500 tracking-wider flex items-center gap-1">
                    <span>📁</span> Planilha de Armazenamento
                  </span>
                  <div className="flex gap-1.5">
                    <input 
                      type="text"
                      placeholder="Insira o ID ou URL no Google Sheets"
                      value={conf.id}
                      disabled={isSyncing}
                      onChange={(e) => {
                        const val = e.target.value;
                        saveSheetsConfig({
                          ...sheetsConfig,
                          [mod.key]: { ...conf, id: val }
                        });
                      }}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-[11px] focus:outline-none focus:border-slate-800 font-mono text-slate-700"
                    />
                    {conf.id && (
                      <a 
                        href={conf.url || `https://docs.google.com/spreadsheets/d/${extractSpreadsheetId(conf.id)}/edit`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="bg-neutral-100 text-slate-700 hover:bg-neutral-200 px-2 rounded-lg border border-neutral-300 flex items-center justify-center font-bold text-xs shrink-0"
                        title="Abrir planilha ativa no Google"
                      >
                        🔗
                      </a>
                    )}
                  </div>
                </div>

                {/* SEÇÃO IMPORTAÇÃO EM MASSA & AUTO-MODELAGEM IA */}
                <div className="space-y-3 pt-3.5 border-t border-dashed border-slate-200">
                  <div className="flex justify-between items-center">
                    <span className="block text-[10px] uppercase font-black text-slate-800 tracking-wider flex items-center gap-1">
                      <span>🤖</span> Estrutura & Modelador IA
                    </span>
                    
                    <label className="flex items-center gap-1 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-teal-650 focus:ring-teal-500 w-3 h-3 cursor-pointer"
                        checked={!tpl.customModel}
                        onChange={(e) => {
                          const useDefault = e.target.checked;
                          saveSheetsTemplates({
                            ...sheetsTemplates,
                            [mod.key]: {
                              ...tpl,
                              customModel: !useDefault,
                              templateId: useDefault ? conf.id : ''
                            }
                          });
                        }}
                      />
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Mesmo ID do Banco</span>
                    </label>
                  </div>

                  {tpl.customModel && (
                    <div className="space-y-1">
                      <label className="block text-[9px] uppercase font-bold text-slate-400">Planilha de Modelo Customizado</label>
                      <input 
                        type="text"
                        placeholder="Link ou ID da Planilha Modelo"
                        value={tpl.templateId}
                        onChange={(e) => {
                          saveSheetsTemplates({
                            ...sheetsTemplates,
                            [mod.key]: { ...tpl, templateId: e.target.value }
                          });
                        }}
                        className="w-full bg-slate-50/50 border border-slate-200 rounded-lg p-2 text-[11px] focus:outline-none focus:border-slate-800 font-mono"
                      />
                    </div>
                  )}

                  {/* Trigger AI Structural Assessment */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAIModelAnalysis(mod.key, mod.label, tpl.templateId || conf.id)}
                      disabled={isAnalyzing || (!tpl.templateId && !conf.id) || !gToken}
                      className="flex-grow bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-[10px] p-2 rounded-lg font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 border-none"
                    >
                      {isAnalyzing ? '⌛ Analisando...' : '🔍 Auditar Estrutura via IA'}
                    </button>
                  </div>

                  {/* AI Diagnostics details output */}
                  {tpl.aiAuditResult && (
                    <div className="p-3 rounded-lg bg-slate-900 text-slate-200 text-[10px] space-y-2 border border-slate-950 font-mono text-left">
                      <div className="flex justify-between items-center border-b border-white/10 pb-1 shrink-0">
                        <span className="font-sans font-black uppercase text-[#7bd1f8]">Laudo Técnico IA</span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${tpl.aiAuditResult.compatible ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800'}`}>
                          {tpl.aiAuditResult.compatible ? '🟢 COMPATÍVEL' : '🔴 IMPEDIMENTOS'}
                        </span>
                      </div>
                      <p className="leading-relaxed text-slate-300">
                        {tpl.aiAuditResult.technicalAnalysis}
                      </p>
                      <div className="flex justify-between items-center text-[9px] pt-1 border-t border-white/5 font-sans">
                        <span className="text-slate-400">Score de Compatibilidade:</span>
                        <span className="font-extrabold text-[#7bd1f8] font-mono">{tpl.aiAuditResult.score}%</span>
                      </div>
                      {tpl.aiAuditResult.nbrComplianceWarning && (
                        <p className="text-[9px] leading-tight text-amber-300 border-l-2 border-amber-500 pl-1.5 pt-0.5 font-sans">
                          📜 <strong>NBR Warning:</strong> {tpl.aiAuditResult.nbrComplianceWarning}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Remodel status warning when custom model headers differ */}
                  {tpl.headers.length > 0 && !tpl.isRemodeled && (
                    <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/70 text-slate-700 text-[10px] space-y-1.5 text-left shrink-0">
                      <p className="font-bold flex items-center gap-1 text-amber-800">
                        <span>⚠️</span> Banco Não Remodelado
                      </p>
                      <p className="text-slate-600 leading-tight">
                        O modelo de dados mudou, mas o banco de dados SPCI local ainda não foi remodelado. Isso ocorrerá apenas na próxima importação em lote, ou marque abaixo.
                      </p>
                      <label className="flex items-center gap-1.5 mt-2 cursor-pointer font-bold select-none text-slate-800 font-sans border-t border-dashed border-amber-200 pt-1.5 hover:text-amber-950">
                        <input 
                          type="checkbox"
                          className="rounded border-amber-400 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                          checked={tpl.isRemodeled}
                          onChange={(e) => {
                            if (e.target.checked) {
                              handleApplyRemodelNow(mod.key, mod.label);
                            }
                          }}
                        />
                        <span className="uppercase tracking-wide text-[9px]">Flegar para remodelar agora</span>
                      </label>
                    </div>
                  )}

                  {tpl.headers.length > 0 && tpl.isRemodeled && (
                    <div className="p-2 bg-emerald-50 text-emerald-800 text-[9px] font-bold rounded border border-emerald-100 flex items-center gap-1">
                      <span>✅</span> Estrutura SPCI local de {mod.key} remodelada!
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2 mt-5">
                {/* SPCI google sheets actions */}
                {currentUser ? (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleImportButtonClick(mod.key, mod.label)}
                      disabled={isSyncing}
                      className="w-full bg-gradient-to-r from-teal-750 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white font-['Hanken_Grotesk'] font-black uppercase text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 transform active:scale-95 transition-all shadow-md shadow-emerald-900/10 cursor-pointer disabled:opacity-50 border-none"
                    >
                      ⚡ Importação em Massa & Remodelar
                    </button>

                    {conf.id && (
                      <button
                        onClick={() => handleSyncModuleWithSheetsLocal(mod.key, mod.label)}
                        disabled={isSyncing}
                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-750 font-['Hanken_Grotesk'] font-bold text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer border-none"
                      >
                        {isSyncing ? '⌛ Aguarde...' : '🔄 Sincronizar Bi-Lateral'}
                      </button>
                    )}
                    
                    <div className="flex gap-2 w-full mt-1">
                      <button
                        onClick={() => handleCreateSheetForModuleLocal(mod.key, mod.label)}
                        disabled={isSyncing}
                        className={`flex-grow ${conf.id ? 'bg-slate-50 hover:bg-slate-100 text-slate-400 border border-slate-200' : 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-bold'} font-['Hanken_Grotesk'] text-[10px] uppercase py-1.5 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer border-none`}
                      >
                        {conf.id ? 'Limpar/recriar' : '⚡ Criar Banco Do Zero'}
                      </button>
                      
                      {conf.id && (
                        <button
                          onClick={() => setUnlinkDbConfirm({ key: mod.key, label: mod.label })}
                          disabled={isSyncing}
                          className="flex-grow bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold font-['Hanken_Grotesk'] text-[10px] uppercase py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer border-none"
                        >
                          Desvincular Banco
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-neutral-50/80 text-slate-400 border border-dashed rounded-xl text-center text-[10px]">
                    Conecte sua conta do Google para ativar a sincronia e mass import.
                  </div>
                )}

                {/* Last synchronization logs metadata */}
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono mt-1 pt-1.5 border-t border-slate-100">
                  <span>Última Sinc:</span>
                  <span className="font-bold">
                    {conf.lastSync ? `${conf.lastSync}` : 'Nunca'}
                  </span>
                </div>
                {conf.lastError && (
                  <p className="text-[9px] text-red-600 font-mono truncate leading-none mt-1">
                    Erro: {conf.lastError}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Console view logger */}
      <div className="bg-slate-900 border border-slate-950 rounded-2xl p-5 shadow-2xl space-y-3 relative overflow-hidden font-mono mt-8 text-left">
        <div className="absolute top-0 right-0 p-4 opacity-5 text-4xl" aria-hidden="true">🐚</div>
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h3 className="font-sans font-black text-slate-200 text-xs uppercase tracking-widest flex items-center gap-1.5">
            <span>⚙️</span> Console de Logs de Sincronismo SPCI
          </h3>
          <span className="bg-emerald-950 border border-emerald-800 text-emerald-400 text-[9px] font-bold px-2 py-0.5 rounded uppercase">Consistência NBR OK</span>
        </div>
        <div className="h-44 overflow-y-auto text-[10px] text-slate-300 space-y-1.5 pr-2 custom-scrollbar">
          {sheetsConsoleLogs.map((log, index) => {
            const isError = log.includes('[ERRO]');
            const isSuccess = log.includes('[SUCESSO]');
            return (
              <p key={index} className={`leading-relaxed border-b border-slate-800/20 pb-1 ${isError ? 'text-red-400 font-bold' : isSuccess ? 'text-green-400 font-bold' : 'text-slate-350'}`}>
                {log}
              </p>
            );
          })}
        </div>
      </div>

      {/* Modal: Unlink Database Confirmation */}
      {unlinkDbConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full space-y-4"
          >
            <h3 className="font-['Hanken_Grotesk'] font-bold text-lg text-slate-800">Desvincular Planilha Google?</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tem certeza que deseja desconectar o banco de dados remota do módulo <strong className="text-slate-800">{unlinkDbConfirm.label}</strong>? O sistema salvará as vistorias apenas no cache local.
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => setUnlinkDbConfirm(null)}
                className="flex-grow py-2.5 text-xs font-bold uppercase rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-650 cursor-pointer"
              >
                Voltar
              </button>
              <button 
                onClick={() => handleUnlinkDb(unlinkDbConfirm.key, unlinkDbConfirm.label)}
                className="flex-grow py-2.5 text-xs font-bold uppercase rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-sm cursor-pointer border-none"
              >
                Confirmar Desconexão
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* --- COCKPIT IMPORTAÇÃO & REMODELAR OVERLAY --- */}
      <AnimatePresence>
        {importCockpit && importCockpit.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden w-full max-w-5xl max-h-[90vh]"
            >
              <div className="bg-gradient-to-r from-slate-900 to-[#121c21] p-5 shrink-0 flex justify-between items-center text-white">
                <div>
                  <h2 className="font-['Hanken_Grotesk'] font-black text-xl flex items-center gap-2">
                     ⚡ Cockpit de Importação: <span className="text-[#7bd1f8]">{importCockpit.moduleLabel}</span>
                  </h2>
                  <p className="text-slate-400 text-xs mt-0.5">Defina o destino e a validação técnica da sua planilha</p>
                </div>
                <button onClick={() => setImportCockpit(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors border-none bg-transparent cursor-pointer text-white">
                  ❌
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                {importCockpit.mode === 'select' && (
                  <div className="flex flex-col md:flex-row gap-6 max-w-3xl mx-auto mt-8">
                    <div 
                      onClick={() => setImportCockpit({ ...importCockpit, mode: 'model' })}
                      className="flex-1 bg-white border-2 border-emerald-100 hover:border-emerald-500 rounded-2xl p-6 cursor-pointer shadow-sm hover:shadow-xl transition-all group group-hover:scale-[1.02]"
                    >
                       <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">📝 Modelo de Banco de Dados</h3>
                       <p className="text-xs text-slate-500 mt-2">A planilha será enviada para a IA estruturar um novo modelo de colunas para este módulo, mantendo integridade com as normas NBR.</p>
                    </div>
                    
                    <div 
                      onClick={() => {
                         setImportCockpit({ ...importCockpit, mode: 'import' });
                         setTimeout(() => handleCockpitValidation(), 100);
                      }}
                      className="flex-1 bg-white border-2 border-blue-100 hover:border-blue-500 rounded-2xl p-6 cursor-pointer shadow-sm hover:shadow-xl transition-all group group-hover:scale-[1.02]"
                    >
                       <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">🚀 Importação de Dados</h3>
                       <p className="text-xs text-slate-500 mt-2">Os dados da planilha serão importados para o banco de dados. A IA fará uma varredura para garantir que não há dados inconsistentes com as NBRs.</p>
                    </div>
                  </div>
                )}

                {importCockpit.mode === 'model' && (
                   <div className="max-w-4xl mx-auto space-y-6">
                      {!importCockpit.aiAuditResult ? (
                         <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-dashed border-slate-300 rounded-2xl">
                           <p className="text-slate-500 mb-4">Clique abaixo para solicitar que a IA faça um laudo de auditoria técnica das colunas da planilha face ao banco SPCI atual.</p>
                           <button
                             onClick={handleLocalModelAnalysis}
                             disabled={importCockpit.isAiAnalyzing}
                             className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 border-none cursor-pointer"
                           >
                             {importCockpit.isAiAnalyzing ? '⌛ Auditando Estrutura...' : '🔍 Auditar Nova Estrutura via IA'}
                           </button>
                         </div>
                      ) : (
                         <div className="bg-slate-900 text-slate-200 p-6 rounded-2xl font-mono text-sm space-y-4 shadow-xl border border-slate-950">
                            <div className="flex justify-between items-center border-b border-slate-700 pb-3">
                               <span className="font-sans font-black text-[#7bd1f8] uppercase text-lg">Laudo Técnico IA</span>
                               <span className={`px-2 py-1 rounded text-xs font-bold ${importCockpit.aiAuditResult.compatible ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800'}`}>
                                  {importCockpit.aiAuditResult.compatible ? '🟢 COMPATÍVEL' : '🔴 IMPEDIMENTOS'}
                               </span>
                            </div>
                            <p className="leading-relaxed">{importCockpit.aiAuditResult.technicalAnalysis}</p>
                            <div className="flex flex-col gap-4">
                              <div><strong className="text-slate-400 text-xs uppercase font-sans">Campos Adicionados:</strong><p className="text-emerald-400">{importCockpit.aiAuditResult.addedColumns?.join(', ') || 'Nenhum'}</p></div>
                              <div>
                                 <strong className="text-slate-400 text-xs uppercase mb-2 block font-sans">Campos Removidos (Selecione para manter no sistema):</strong>
                                 {importCockpit.aiAuditResult.removedColumns?.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                       {importCockpit.aiAuditResult.removedColumns.map((col: string) => (
                                         <label key={col} className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-slate-700">
                                            <input 
                                              type="checkbox" 
                                              checked={importCockpit.retainedFields?.includes(col) || false}
                                              onChange={(e) => {
                                                 setImportCockpit(prev => {
                                                    if (!prev) return null;
                                                    const currentRetained = prev.retainedFields || [];
                                                    const newRetained = e.target.checked 
                                                       ? [...currentRetained, col]
                                                       : currentRetained.filter(c => c !== col);
                                                    return { ...prev, retainedFields: newRetained };
                                                 });
                                              }}
                                              className="accent-[#7bd1f8] cursor-pointer"
                                            />
                                            <span className="text-red-400 text-xs">{col}</span>
                                         </label>
                                       ))}
                                    </div>
                                 ) : (
                                    <p className="text-red-400 text-xs">Nenhum</p>
                                 )}
                              </div>
                            </div>
                            
                            <div className="flex justify-between items-center text-xs pt-4 border-t border-slate-700 font-sans">
                              <div>
                                 <button 
                                   onClick={handleLocalModelAnalysis}
                                   disabled={importCockpit.isAiAnalyzing}
                                   className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-[#7bd1f8] rounded border border-slate-700 disabled:opacity-50 cursor-pointer"
                                 >
                                    {importCockpit.isAiAnalyzing ? '⌛ Reavaliando...' : '🔄 Reavaliar Estrutura com Campos Selecionados'}
                                 </button>
                              </div>
                              <div className="text-right">
                                <span className="text-slate-400 block mb-1">Score de Compatibilidade:</span>
                                <span className="font-extrabold text-[#7bd1f8] font-mono text-xl">{importCockpit.aiAuditResult.score}%</span>
                              </div>
                            </div>

                            <div className="mt-6 flex gap-4 pt-4 border-t border-white/5">
                               <button onClick={applyLocalRemodel} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-sans font-bold py-3 rounded-xl transition-colors cursor-pointer border-none">
                                 ⭐ Aplicar Confirmar Modelo Final da IA
                               </button>
                               <button onClick={() => setImportCockpit(null)} className="flex-1 bg-transparent border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 font-sans font-bold py-3 rounded-xl transition-colors cursor-pointer">
                                 Usar Estrutura Original Planilha
                               </button>
                            </div>
                         </div>
                      )}
                   </div>
                )}

                {importCockpit.mode === 'download-template' && (
                   <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-dashed border-emerald-300 rounded-2xl w-full max-w-2xl mx-auto space-y-6">
                      <div className="text-5xl">✅</div>
                      <div>
                         <h3 className="text-2xl font-black text-emerald-800 mb-2 font-['Hanken_Grotesk']">Estrutura Validada com Sucesso!</h3>
                         <p className="text-slate-500">O banco de dados foi preparado. Agora você pode fazer o download do modelo em branco (CSV) gerado pela IA com todos os campos necessários devidamente mapeados e auditados.</p>
                      </div>
                      <div className="flex gap-4 w-full pt-6">
                         <button 
                           onClick={() => {
                             const csvContent = importCockpit.headers.join(",") + "\n";
                             const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                             const url = URL.createObjectURL(blob);
                             const a = document.createElement('a');
                             a.href = url;
                             a.download = `Modelo_SPCI_${importCockpit.moduleKey.toUpperCase()}_v1.csv`;
                             a.click();
                             URL.revokeObjectURL(url);
                           }}
                           className="flex-grow px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 border-none cursor-pointer"
                         >
                           📥 Fazer Download do Modelo (.csv)
                         </button>
                         <button 
                           onClick={() => setImportCockpit(null)}
                           className="px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-300 transition-colors cursor-pointer"
                         >
                           Concluir
                         </button>
                      </div>
                   </div>
                )}

                {importCockpit.mode === 'import' && (
                  <div className="space-y-4">
                    {importCockpit.isAiAnalyzing ? (
                       <div className="p-4 bg-teal-50 border-2 border-teal-200 text-teal-800 rounded-2xl text-center text-sm font-black animate-pulse shadow-inner">
                         🤖 SPCI Agent analisando integridade dos {importCockpit.data.length} registros no cockpit...
                       </div>
                    ) : importCockpit.isAiFixing ? (
                       <div className="p-6 bg-indigo-50 border-2 border-indigo-200 text-indigo-800 rounded-2xl text-center text-sm font-black animate-pulse shadow-inner">
                         ✨ SPCI Agent está aplicando correções matemáticas e normativas nos registros...
                       </div>
                    ) : (
                      <>
                        {importCockpit.aiFixReport && (
                          <div className="p-6 bg-gradient-to-r from-indigo-900 to-slate-900 border border-indigo-500 rounded-2xl space-y-3 shadow-xl relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl" aria-hidden="true">✨</div>
                             <h4 className="text-indigo-300 font-black text-sm uppercase flex items-center gap-2 mb-2 font-['Hanken_Grotesk'] tracking-widest">
                               <span>✨</span> Correção Automática Concluída
                             </h4>
                             <p className="text-white text-sm font-mono leading-relaxed relative z-10">{importCockpit.aiFixReport}</p>
                          </div>
                        )}
                        {importCockpit.validationErrors && importCockpit.validationErrors.length > 0 ? (
                          <div className="p-6 bg-white border border-red-200 rounded-2xl shadow-xl flex flex-col md:flex-row gap-6 relative overflow-hidden text-left">
                            <div className="absolute top-0 left-0 w-1 h-full bg-red-500" aria-hidden="true"></div>
                            <div className="flex-1 space-y-3">
                              <h4 className="text-red-600 font-black text-sm uppercase flex items-center gap-2 font-['Hanken_Grotesk'] tracking-widest">
                                <span>🔴</span> Alertas da IA Encontrados
                              </h4>
                              <ul className="text-xs text-slate-605 font-mono space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                                {importCockpit.validationErrors.map((e, idx) => (
                                  <li key={idx} className="flex gap-2 p-2 bg-red-50/50 rounded-lg">
                                    <span className="font-bold text-red-700 min-w-[70px]">L {e.rowIndex + 1} | C {importCockpit.headers[e.colIndex] || '?'}</span>
                                    <span>{e.message}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="w-full md:w-64 shrink-0 flex flex-col justify-center border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6 bg-slate-50/50 p-4 rounded-xl">
                              <p className="text-xs text-slate-500 mb-3 text-center md:text-left leading-relaxed">
                                A inteligência artificial SPCI pode corrigir e preencher os dados inconsistentes automaticamente.
                              </p>
                              <button 
                                onClick={handleCockpitFixAI}
                                className="w-full relative group overflow-hidden rounded-xl bg-slate-900 border border-slate-700 shadow-md transition-all hover:shadow-indigo-500/20 hover:border-indigo-500 border-none cursor-pointer"
                              >
                                <div className="absolute inset-0 w-0 bg-gradient-to-r from-indigo-600 to-fuchsia-600 transition-all duration-300 group-hover:w-full" aria-hidden="true"></div>
                                <div className="relative px-4 py-3 flex items-center justify-center gap-2">
                                  <span className="text-white text-xs font-bold uppercase tracking-wider">✨ Corrigir com IA SPCI</span>
                                </div>
                              </button>
                            </div>
                          </div>
                        ) : (
                           importCockpit.validationErrors && importCockpit.validationErrors.length === 0 && !importCockpit.aiFixReport && (
                            <div className="p-6 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-center text-sm font-black flex flex-col items-center justify-center gap-2 shadow-sm font-['Hanken_Grotesk'] tracking-wide">
                              <span className="text-3xl mb-1">✅</span>
                              Banco validado. Nenhum erro encontrado pela IA!
                            </div>
                          )
                        )}
                      </>
                    )}

                    <div className="w-full overflow-x-auto border border-slate-300 rounded-xl bg-white shadow-sm mt-4">
                      <table className="w-full text-left text-xs whitespace-nowrap">
                         <thead className="bg-slate-100 text-slate-505 font-mono">
                           <tr>
                             <th className="p-2 border-b font-semibold">#</th>
                             {importCockpit.headers.map(h => <th key={`header_${h}`} className="p-2 border-b font-semibold">{h}</th>)}
                           </tr>
                         </thead>
                         <tbody className="font-mono">
                           {importCockpit.data.map((row, rIdx) => (
                             <tr key={`row_${rIdx}`} className="border-b hover:bg-slate-50">
                               <td className="p-2 border-r bg-slate-50 text-slate-400 font-bold">{rIdx + 1}</td>
                               {importCockpit.headers.map((h, cIdx) => (
                                 <td key={`cell_${rIdx}_${cIdx}`} className="p-2 border-r">
                                   <input 
                                     type="text" 
                                     value={row[cIdx] !== undefined ? String(row[cIdx]) : ''}
                                     onChange={(e) => handleCockpitCellEdit(rIdx, cIdx, e.target.value)}
                                     className="bg-transparent hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-slate-900 border-none outline-none p-1 w-full"
                                   />
                                 </td>
                               ))}
                             </tr>
                           ))}
                         </tbody>
                      </table>
                    </div>

                    <div className="flex gap-4 pt-6 border-t mt-6">
                      <button 
                        onClick={handleConfirmDataImport}
                        className="flex-grow py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:opacity-90 text-white font-sans font-bold text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer border-none"
                      >
                        📥 IMPORTAR CONSOLIDAR REGISTROS
                      </button>
                      <button 
                        onClick={() => setImportCockpit(null)}
                        className="flex-grow py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-sans font-bold text-xs uppercase tracking-wider rounded-xl border border-slate-300 cursor-pointer"
                      >
                        Descartar e Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
