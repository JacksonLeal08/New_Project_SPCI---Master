import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { prompt, systemInstruction } = await req.json();

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'DEEPSEEK_API_KEY não foi configurada nas variáveis de ambiente (.env.local).' },
        { status: 500 }
      );
    }

    const messages = [];
    if (systemInstruction) {
      messages.push({ role: 'system', content: systemInstruction });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        temperature: 0.7,
        max_tokens: 1000,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepSeek API Error Response:', errorText);
      return NextResponse.json(
        { error: `Erro na API da DeepSeek (${response.status}): ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || 'Sem resposta da API DeepSeek.';

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error('Erro de servidor na rota DeepSeek:', error);
    return NextResponse.json(
      { error: error?.message || 'Falha ao processar solicitação no servidor DeepSeek.' },
      { status: 500 }
    );
  }
}
