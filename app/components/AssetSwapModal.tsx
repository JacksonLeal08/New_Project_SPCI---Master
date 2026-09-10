'use client';

import React from 'react';
import WizardTrocaModalMobile, { WizardTrocaModalMobileProps } from './WizardTrocaModalMobile';

export type AssetSwapModalProps = WizardTrocaModalMobileProps;

/**
 * AssetSwapModal - Componente unificado que renderiza a nova arquitetura mobile
 * com cabeçalho fixo, branding do bombeiro operacional, stepper horizontal minimalista,
 * rodapé ancorado seguro e cards de ativos sem truncamento (AssetSelectionCard).
 */
export default function AssetSwapModal(props: AssetSwapModalProps) {
  return <WizardTrocaModalMobile {...props} />;
}
