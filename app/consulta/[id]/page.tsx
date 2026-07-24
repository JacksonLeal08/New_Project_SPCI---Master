import { Metadata } from 'next';
import ConsultaClient from './ConsultaClient';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const idUpper = id ? id.toUpperCase() : 'ATIVO';

  return {
    title: `Consulta de Equipamento ${idUpper} | SISTEMA SPCI`,
    description: `Ficha técnica e status de conformidade do ativo de segurança contra incêndio ${idUpper}.`,
    alternates: {
      canonical: `/consulta/${id}`,
    },
    openGraph: {
      title: `Equipamento ${idUpper} - Inspeção SPCI`,
      description: `Verificação de conformidade e histórico de manutenção do ativo ${idUpper}.`,
      url: `https://spci.compliance.app/consulta/${id}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: `Equipamento ${idUpper} - Inspeção SPCI`,
      description: `Status de conformidade do ativo ${idUpper} no sistema SPCI Compliance.`,
    },
  };
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return <ConsultaClient assetId={id} />;
}
