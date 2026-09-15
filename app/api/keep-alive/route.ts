import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('assets')
      .select('id, id_ativo, category')
      .limit(1);

    const latencyMs = Date.now() - startTime;

    if (error) {
      return NextResponse.json(
        {
          success: false,
          message: 'Erro ao consultar banco de dados',
          error: error.message,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Supabase Keep-Alive ativo. Contador de inatividade zerado.',
      latencyMs: `${latencyMs}ms`,
      sampleAsset: data?.[0]?.id_ativo || 'Nenhum ativo retornado',
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Erro inesperado',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
