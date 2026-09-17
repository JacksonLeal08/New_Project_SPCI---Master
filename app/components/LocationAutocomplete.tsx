'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { MapPin, Layers, Plus, Check } from 'lucide-react';
import { LocalizacoesService, LocalizacaoOperacional } from '@/lib/localizacoesService';
import { useSpci } from '@/app/context/SpciContext';

interface LocationAutocompleteProps {
  selectedSetor: string;
  selectedSubLocal: string;
  onSetorChange: (setor: string) => void;
  onSubLocalChange: (subLocal: string) => void;
  disabled?: boolean;
}

export const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  selectedSetor,
  selectedSubLocal,
  onSetorChange,
  onSubLocalChange,
  disabled = false
}) => {
  const { activeSite } = useSpci();
  const [localizacoes, setLocalizacoes] = useState<LocalizacaoOperacional[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Estados de foco/sugestão
  const [subLocalInput, setSubLocalInput] = useState<string>(selectedSubLocal || '');
  const [isSubLocalOpen, setIsSubLocalOpen] = useState<boolean>(false);

  useEffect(() => {
    setSubLocalInput(selectedSubLocal || '');
  }, [selectedSubLocal]);

  // Carrega localizações homologadas
  useEffect(() => {
    let isMounted = true;
    LocalizacoesService.listarTodas(activeSite).then(data => {
      if (isMounted) {
        setLocalizacoes(data);
        setLoading(false);
      }
    });

    const handleUpdate = () => {
      LocalizacoesService.listarTodas(activeSite).then(data => {
        if (isMounted) setLocalizacoes(data);
      });
    };

    window.addEventListener('spci_localizacoes_updated', handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('spci_localizacoes_updated', handleUpdate);
    };
  }, [activeSite]);

  // Lista única de setores ordenados alfabeticamente
  const setoresDisponiveis = useMemo(() => {
    const set = new Set<string>();
    localizacoes.forEach(loc => {
      if (loc.setor_planta) set.add(loc.setor_planta);
    });
    return Array.from(set).sort();
  }, [localizacoes]);

  // Lista de sub-locais filtrados pelo setor selecionado
  const subLocaisDisponiveis = useMemo(() => {
    if (!selectedSetor) return [];
    return localizacoes
      .filter(l => l.setor_planta.toUpperCase() === selectedSetor.toUpperCase())
      .map(l => l.sub_local)
      .filter(Boolean);
  }, [localizacoes, selectedSetor]);

  // Sugestões filtradas pelo texto digitado
  const filteredSubLocais = useMemo(() => {
    if (!subLocalInput) return subLocaisDisponiveis;
    const term = subLocalInput.toLowerCase().trim();
    return subLocaisDisponiveis.filter(s => s.toLowerCase().includes(term));
  }, [subLocaisDisponiveis, subLocalInput]);

  const isNewSubLocal = subLocalInput && !subLocaisDisponiveis.some(
    s => s.toLowerCase().trim() === subLocalInput.toLowerCase().trim()
  );

  const handleSubLocalSelect = (sub: string) => {
    setSubLocalInput(sub);
    onSubLocalChange(sub);
    setIsSubLocalOpen(false);
  };

  const handleSubLocalBlur = () => {
    setTimeout(() => {
      setIsSubLocalOpen(false);
      // Aplica deduplicação estrita com UPPER/TRIM
      const normalized = subLocalInput.trim().toUpperCase();
      onSubLocalChange(normalized);
    }, 200);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-left">
      {/* Campo: Setor da Planta (Dropdown com Busca) */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-blue-600" />
          Setor da Planta (SSOT) *
        </label>
        <div className="relative">
          <select
            disabled={disabled}
            value={selectedSetor}
            onChange={(e) => {
              onSetorChange(e.target.value);
              // Ao mudar setor, limpa sub-local
              onSubLocalChange('');
              setSubLocalInput('');
            }}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer disabled:opacity-50"
          >
            <option value="">Selecione o Setor Oficial...</option>
            {setoresDisponiveis.map((setor, idx) => (
              <option key={idx} value={setor}>
                {setor}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Campo: Sub-Local / Posição Física (Typeahead Inteligente com Deduplicação) */}
      <div className="space-y-1.5 relative">
        <div className="flex justify-between items-center">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            Sub-Local (Posição Física) *
          </label>
          {isNewSubLocal && (
            <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              Novo Sub-Local
            </span>
          )}
        </div>

        <div className="relative">
          <input
            type="text"
            disabled={disabled || !selectedSetor}
            placeholder={!selectedSetor ? 'Selecione o setor primeiro' : 'Digite ou selecione a posição...'}
            value={subLocalInput}
            onChange={(e) => {
              setSubLocalInput(e.target.value);
              onSubLocalChange(e.target.value);
            }}
            onFocus={() => setIsSubLocalOpen(true)}
            onBlur={handleSubLocalBlur}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all disabled:opacity-50 uppercase"
          />

          {/* Menu Dropdown de Sugestões Typeahead */}
          {isSubLocalOpen && selectedSetor && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-48 overflow-y-auto z-50 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filteredSubLocais.length > 0 ? (
                filteredSubLocais.map((sub, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onMouseDown={() => handleSubLocalSelect(sub)}
                    className="w-full p-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 flex justify-between items-center transition-colors cursor-pointer border-none bg-transparent"
                  >
                    <span>{sub}</span>
                    {subLocalInput.trim().toUpperCase() === sub && (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                  </button>
                ))
              ) : (
                <div className="p-3 text-[10.5px] text-slate-500 flex items-center justify-between">
                  <span>Nenhum sub-local cadastrado para este setor.</span>
                  {subLocalInput && (
                    <span className="text-[9px] font-black uppercase text-emerald-600 flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Registrar Novo
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LocationAutocomplete;
