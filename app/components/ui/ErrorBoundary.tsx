'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RefreshCw, Copy, Check, Home, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
  onReset?: () => void;
  showDiagnostics?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

/**
 * ErrorBoundary robusto para blindagem de módulos e componentes da interface SPCI.
 * Impede que uma exceção em um componente derrube toda a aplicação.
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary SPCI] Exceção capturada no componente:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleCopyDiagnosis = () => {
    const errorDetails = `[SPCI ERROR DIAGNOSTICS]
Timestamp: ${new Date().toISOString()}
Error: ${this.state.error?.name}: ${this.state.error?.message}
Stack: ${this.state.error?.stack || 'N/A'}
ComponentStack: ${this.state.errorInfo?.componentStack || 'N/A'}`;

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(errorDetails).then(() => {
        this.setState({ copied: true });
        setTimeout(() => this.setState({ copied: false }), 2500);
      });
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const title = this.props.fallbackTitle || 'Instabilidade Temporária no Módulo';
      const description = this.props.fallbackDescription || 
        'Ocorreu uma falha ao renderizar este bloco. Seus dados gravados localmente continuam seguros.';

      return (
        <div className="w-full my-3 p-5 sm:p-6 bg-slate-900/90 dark:bg-slate-950/90 border border-slate-800 rounded-2xl shadow-xl backdrop-blur-md text-slate-200 font-sans relative overflow-hidden">
          {/* Barra decorativa superior */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
              <AlertOctagon className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono tracking-widest text-amber-400 uppercase">
                  ESCUDO DE FALHA // ERROR_BOUNDARY
                </span>
              </div>
              <h4 className="text-base font-bold text-white mt-1">
                {title}
              </h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {description}
              </p>

              {/* Detalhe técnico do erro */}
              {this.state.error && (
                <div className="mt-3 p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl font-mono text-[11px] text-red-400 overflow-x-auto max-h-24 scrollbar-thin">
                  <span className="text-slate-500 uppercase font-bold text-[9px] block mb-1">Motivo do Erro:</span>
                  {this.state.error.message || String(this.state.error)}
                </div>
              )}

              {/* Botões de Ação */}
              <div className="flex flex-wrap items-center gap-2.5 mt-4 pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer min-h-[44px]"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Recarregar Módulo</span>
                </button>

                <button
                  type="button"
                  onClick={this.handleCopyDiagnosis}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white font-medium text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer min-h-[44px]"
                >
                  {this.state.copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Diagnóstico</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
