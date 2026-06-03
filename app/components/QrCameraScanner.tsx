'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Html5Qrcode } from 'html5-qrcode';

interface QrCameraScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (code: string) => void;
}

interface CameraDevice {
  id: string;
  label: string;
}

export default function QrCameraScanner({ isOpen, onClose, onScanSuccess }: QrCameraScannerProps) {
  const [activeTab, setActiveTab] = useState<'camera' | 'manual'>('camera');
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [currentDeviceIndex, setCurrentDeviceIndex] = useState<number>(0);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [manualCode, setManualCode] = useState<string>('');
  
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'spci-qr-reader-container';

  // Gerador de tom de áudio nativo (Bip tático de campo)
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(950, audioCtx.currentTime); // Frequência de 950Hz
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime); // Volume suave

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.08); // Duração de 80ms
    } catch (e) {
      console.warn('[QrScanner] Áudio suspenso ou não suportado:', e);
    }
  };

  const startScanner = (scannerInstance: Html5Qrcode, cameraId: string) => {
    setIsScanning(true);
    setErrorMsg(null);
    scannerInstance.start(
      cameraId,
      {
        fps: 12,
        qrbox: (width, height) => {
          // Caixa de escaneamento dinâmica (aprox. 65% do menor eixo)
          const size = Math.min(width, height) * 0.65;
          return { width: size, height: size };
        }
      },
      (decodedText) => {
        playBeep();
        // Para a câmera de imediato
        if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
          html5QrCodeRef.current.stop().then(() => {
            onScanSuccess(decodedText);
          }).catch(err => {
            console.error('Erro ao parar câmera após sucesso:', err);
            onScanSuccess(decodedText); // Prossegue mesmo com falha no stop
          });
        } else {
          onScanSuccess(decodedText);
        }
      },
      () => {
        // Silenciar erros de leitura comuns enquanto a câmera varre o frame
      }
    ).catch(err => {
      console.error('Erro ao iniciar câmera:', err);
      setErrorMsg('Falha ao inicializar o feed da câmera.');
      setIsScanning(false);
    });
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        console.log('[QrScanner] Camera stream desligada.');
      } catch (err) {
        console.error('Erro ao desligar a câmera:', err);
      }
    }
  };

  // Inicialização e gerenciamento de dispositivos
  useEffect(() => {
    if (!isOpen || activeTab !== 'camera') {
      stopScanner();
      return;
    }

    const html5QrCode = new Html5Qrcode(scannerContainerId);
    html5QrCodeRef.current = html5QrCode;

    Html5Qrcode.getCameras()
      .then((camerasList) => {
        setDevices(camerasList);
        if (camerasList.length > 0) {
          setHasCamera(true);
          // Prefere a última câmera (normalmente a traseira do celular)
          const backCamIndex = camerasList.length - 1;
          setCurrentDeviceIndex(backCamIndex);
          startScanner(html5QrCode, camerasList[backCamIndex].id);
        } else {
          setHasCamera(false);
          setActiveTab('manual');
          setErrorMsg('Nenhuma câmera encontrada. Entrada manual ativada.');
        }
      })
      .catch((err) => {
        console.warn('Erro ao obter câmeras:', err);
        setHasCamera(false);
        setActiveTab('manual');
        setErrorMsg('Acesso à câmera negado ou indisponível.');
      });

    return () => {
      stopScanner();
    };
  }, [isOpen, activeTab]);

  // Alterna as câmeras disponíveis
  const handleToggleCamera = async () => {
    if (devices.length <= 1 || !html5QrCodeRef.current) return;
    const nextIndex = (currentDeviceIndex + 1) % devices.length;
    setCurrentDeviceIndex(nextIndex);

    await stopScanner();
    if (html5QrCodeRef.current) {
      startScanner(html5QrCodeRef.current, devices[nextIndex].id);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = manualCode.toUpperCase().trim();
    if (code) {
      onScanSuccess(code);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-mono">
      <style>{`
        @keyframes laser-sweep {
          0% { top: 4%; }
          50% { top: 96%; }
          100% { top: 4%; }
        }
        .laser-line {
          animation: laser-sweep 2.5s infinite linear;
        }
        /* Oculta links/botões nativos feios injetados pelo html5-qrcode */
        #spci-qr-reader-container a {
          display: none !important;
        }
        #spci-qr-reader-container video {
          object-fit: cover !important;
          width: 100% !important;
          height: 100% !important;
        }
      `}</style>

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        className="bg-slate-900 border border-slate-800 p-6 shadow-2xl max-w-sm w-full relative overflow-hidden rounded-none flex flex-col"
        style={{ borderTop: '4px solid #10b981' }} // Verde Esmeralda HUD
      >
        {/* Header HUD */}
        <div className="flex justify-between items-center mb-4 shrink-0 border-b border-slate-850 pb-3">
          <div>
            <h3 className="font-bold text-xs text-slate-100 uppercase tracking-wider">Leitor Óptico SPCI</h3>
            <p className="text-[9px] text-slate-400 font-sans mt-0.5">Normas NBR 12962 / NBR 13434</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 font-bold border-none bg-transparent cursor-pointer text-lg leading-none"
            aria-label="Fechar leitor"
          >
            ×
          </button>
        </div>

        {/* Abas HUD */}
        <div className="flex bg-slate-950 border border-slate-800 p-0.5 mb-4 shrink-0">
          <button
            onClick={() => hasCamera && setActiveTab('camera')}
            disabled={!hasCamera}
            className={`flex-1 py-1.5 text-[9px] font-bold uppercase tracking-wider transition-colors border-none cursor-pointer ${
              activeTab === 'camera'
                ? 'bg-emerald-600 text-slate-950'
                : 'text-slate-450 hover:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
          >
            📷 Câmera Real
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-1.5 text-[9px] font-bold uppercase tracking-wider transition-colors border-none cursor-pointer ${
              activeTab === 'manual'
                ? 'bg-emerald-600 text-slate-950'
                : 'text-slate-450 hover:text-slate-200'
            }`}
          >
            ⌨️ Código Manual
          </button>
        </div>

        {/* Conteúdo das Abas */}
        <div className="relative min-h-[220px] bg-slate-950 border border-slate-850 flex items-center justify-center overflow-hidden shrink-0">
          {activeTab === 'camera' && (
            <div className="absolute inset-0 w-full h-full flex flex-col justify-between">
              {/* Feed de vídeo da câmera */}
              <div id={scannerContainerId} className="w-full h-full relative z-0 bg-slate-950"></div>

              {/* HUD Reticle Overlay */}
              <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
                {/* Linha laser de escaneamento */}
                {isScanning && (
                  <div className="laser-line absolute left-4 right-4 h-0.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                )}

                {/* Cantos táticos do HUD */}
                <div className="w-[180px] h-[180px] border border-dashed border-emerald-500/20 relative">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-500"></div>
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-500"></div>
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-500"></div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-500"></div>
                </div>
              </div>

              {/* Status de Escaneamento HUD */}
              <div className="absolute bottom-2 left-2 right-2 bg-slate-900/80 backdrop-blur-xs border border-slate-800 p-1.5 z-20 flex justify-between items-center text-[8px] tracking-widest text-emerald-400">
                <span>SYS_STATUS: ACTIVE</span>
                <span className="animate-pulse">● SCANNING_FRAME</span>
              </div>
            </div>
          )}

          {activeTab === 'manual' && (
            <form onSubmit={handleManualSubmit} className="w-full p-4 space-y-4">
              {errorMsg && (
                <div className="border border-red-900/60 bg-red-950/20 p-2 text-center text-[10px] text-red-400 leading-normal">
                  ⚠️ {errorMsg}
                </div>
              )}
              
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-bold text-slate-450 tracking-wider">Identificador do Ativo *</label>
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="EX: PAT-E-101 OU CO2-03"
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs p-3 focus:outline-none focus:border-emerald-600 rounded-none font-mono text-center uppercase tracking-widest font-black"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-[10px] uppercase tracking-wider cursor-pointer rounded-none disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Buscar Equipamento 🔍
              </button>
            </form>
          )}
        </div>

        {/* Controles de Câmera (Se houver múltiplas) */}
        {activeTab === 'camera' && devices.length > 1 && (
          <button
            onClick={handleToggleCamera}
            className="mt-3 w-full py-2 border border-slate-800 hover:border-slate-700 bg-slate-850 hover:bg-slate-800 text-slate-350 hover:text-slate-100 font-bold text-[9px] uppercase tracking-wider cursor-pointer rounded-none flex items-center justify-center gap-1.5 transition-colors shrink-0"
          >
            🔄 Alternar Lente de Captura ({currentDeviceIndex + 1}/{devices.length})
          </button>
        )}

        <div className="mt-4 text-[9px] text-slate-500 text-center leading-normal font-sans pt-3 border-t border-slate-850">
          Aponte a lente para a etiqueta ou insira o código manual para iniciar a vistoria.
        </div>
      </motion.div>
    </div>
  );
}
