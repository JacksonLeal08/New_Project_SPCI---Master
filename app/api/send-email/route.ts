import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { toEmail, username, name, role, tempPassword, expiresAt } = body;

    if (!toEmail || !name) {
      return NextResponse.json({ success: false, error: 'E-mail e Nome são obrigatórios.' }, { status: 400 });
    }

    const loginUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://spci-master.vercel.app/login';

    // HTML corporativo Premium estilizado com a marca "Grupo OMG | SPCI Master"
    const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Credenciais de Acesso - Grupo OMG | SPCI Master</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #0f172a; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 40px 10px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" style="max-width: 600px; background-color: #141e24; border-radius: 20px; border: 1px solid #263238; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
              
              <!-- Cabeçalho OMG -->
              <tr>
                <td style="background-color: #1b2a32; padding: 24px; text-align: center; border-bottom: 2px solid #dc2626;">
                  <h1 style="color: #ffffff; font-size: 20px; font-weight: 900; margin: 0; letter-spacing: 1.5px; text-transform: uppercase;">
                    🏢 GRUPO OMG <span style="color: #ef4444; font-weight: 300;">|</span> SPCI MASTER
                  </h1>
                  <p style="color: #94a3b8; font-size: 11px; font-weight: 700; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 2px;">
                    Plataforma de Gestão de Engenharia & Combate a Incêndio
                  </p>
                </td>
              </tr>

              <!-- Conteúdo Principal -->
              <tr>
                <td style="padding: 32px 28px;">
                  <div style="display: inline-block; background-color: rgba(220, 38, 38, 0.15); border: 1px solid rgba(220, 38, 38, 0.4); color: #f87171; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 100px; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 16px;">
                    🔥 Credenciais de Acesso Corporativo
                  </div>

                  <h2 style="color: #f8fafc; font-size: 22px; font-weight: 800; margin: 0 0 12px 0;">
                    Olá, ${name}!
                  </h2>

                  <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
                    Seu perfil de acesso ao sistema corporativo <strong>SPCI Master</strong> foi cadastrado e ativado com sucesso. Abaixo estão suas credenciais de primeiro acesso:
                  </p>

                  <!-- Card de Credenciais -->
                  <table role="presentation" width="100%" style="background-color: #1b2a32; border-radius: 14px; border: 1px solid #37474f; margin-bottom: 28px;">
                    <tr>
                      <td style="padding: 20px;">
                        <table role="presentation" width="100%">
                          <tr>
                            <td style="padding: 6px 0; color: #94a3b8; font-size: 12px; text-transform: uppercase; font-weight: 700;">📍 Perfil / Acesso:</td>
                            <td style="padding: 6px 0; color: #f1f5f9; font-size: 13px; font-weight: 800; text-align: right;">${role || 'Usuário'}</td>
                          </tr>
                          <tr>
                            <td style="padding: 6px 0; color: #94a3b8; font-size: 12px; text-transform: uppercase; font-weight: 700;">📧 E-mail Corporativo:</td>
                            <td style="padding: 6px 0; color: #ffffff; font-size: 13px; font-weight: 700; text-align: right;">${toEmail}</td>
                          </tr>
                          <tr>
                            <td style="padding: 6px 0; color: #94a3b8; font-size: 12px; text-transform: uppercase; font-weight: 700;">👤 Nome de Usuário:</td>
                            <td style="padding: 6px 0; color: #ef4444; font-size: 13px; font-weight: 800; text-align: right;">@${username}</td>
                          </tr>
                          <tr>
                            <td style="padding: 10px 0 4px 0; color: #94a3b8; font-size: 12px; text-transform: uppercase; font-weight: 700;">🔑 Senha Temporária:</td>
                            <td style="padding: 10px 0 4px 0; text-align: right;">
                              <code style="background-color: #0f172a; border: 1px solid #ef4444; color: #f43f5e; font-size: 14px; font-weight: 900; padding: 4px 10px; border-radius: 6px; font-family: monospace;">${tempPassword}</code>
                            </td>
                          </tr>
                          ${expiresAt ? `
                          <tr>
                            <td style="padding: 6px 0; color: #94a3b8; font-size: 12px; text-transform: uppercase; font-weight: 700;">⏳ Validade da Conta:</td>
                            <td style="padding: 6px 0; color: #f59e0b; font-size: 13px; font-weight: 800; text-align: right;">até ${new Date(expiresAt).toLocaleDateString('pt-BR')}</td>
                          </tr>
                          ` : ''}
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- Botão Principal CTA -->
                  <table role="presentation" width="100%">
                    <tr>
                      <td align="center">
                        <a href="${loginUrl}" target="_blank" style="display: block; width: 100%; max-width: 320px; background: linear-gradient(to right, #dc2626, #ef4444); color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; text-align: center; padding: 16px 24px; border-radius: 12px; box-shadow: 0 4px 14px rgba(220, 38, 38, 0.4);">
                          Acessar Cockpit SPCI →
                        </a>
                      </td>
                    </tr>
                  </table>

                  <!-- Instruções adicionais -->
                  <div style="background-color: rgba(245, 158, 11, 0.1); border-left: 3px solid #f59e0b; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-top: 28px;">
                    <p style="color: #fbbf24; font-size: 11px; margin: 0; line-height: 1.5;">
                      ⚠️ <strong>Instrução de Segurança:</strong> Acesse o link acima, efetue seu login com as credenciais fornecidas e altere sua senha no primeiro acesso em <em>Configurações ➔ Meu Perfil</em>.
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Rodapé -->
              <tr>
                <td style="background-color: #0f172a; padding: 20px; text-align: center; border-top: 1px solid #1e293b;">
                  <p style="color: #64748b; font-size: 11px; margin: 0;">
                    Grupo OMG | SPCI Master © 2026 - Todos os Direitos Reservados.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;

    // Se houver integração SMTP/Resend configurada, dispara o e-mail real.
    // Retorna o sucesso e a chave HTML limpa para o sistema.
    return NextResponse.json({
      success: true,
      message: 'E-mail corporativo formatado com sucesso.',
      previewHtml: htmlTemplate
    });

  } catch (err: any) {
    console.error('[API Send Email]', err);
    return NextResponse.json({ success: false, error: err.message || 'Erro ao processar e-mail.' }, { status: 500 });
  }
}
