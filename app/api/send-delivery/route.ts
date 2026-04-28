import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email, displayName, prompt, imageUrl, generationId } = await request.json()

    if (!email || !prompt || !imageUrl) {
      return NextResponse.json(
        { error: 'Campos obrigatórios faltando' },
        { status: 400 }
      )
    }

    const userName = displayName || email.split('@')[0]

    const emailContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sua Geração Miragem Está Pronta!</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #0f0f23;
            color: #ffffff;
            margin: 0;
            padding: 20px;
            line-height: 1.6;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border-radius: 16px;
            border: 1px solid rgba(147, 112, 219, 0.3);
            overflow: hidden;
            box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
          }
          .header {
            background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%);
            padding: 40px 30px;
            text-align: center;
          }
          .logo {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 10px;
            background: linear-gradient(135deg, #ffffff 0%, #e9d5ff 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          .content {
            padding: 40px 30px;
          }
          .title {
            font-size: 24px;
            font-weight: 600;
            color: #e9d5ff;
            margin-bottom: 20px;
            text-align: center;
          }
          .prompt-box {
            background: rgba(147, 112, 219, 0.1);
            border: 1px solid rgba(147, 112, 219, 0.3);
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
          }
          .prompt-label {
            font-size: 14px;
            color: #a78bfa;
            margin-bottom: 8px;
            font-weight: 500;
          }
          .prompt-text {
            font-size: 16px;
            color: #ffffff;
            line-height: 1.5;
          }
          .image-container {
            text-align: center;
            margin: 30px 0;
          }
          .generation-image {
            max-width: 100%;
            height: auto;
            border-radius: 12px;
            border: 1px solid rgba(147, 112, 219, 0.3);
            box-shadow: 0 8px 32px rgba(147, 112, 219, 0.2);
          }
          .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%);
            color: white;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 8px;
            font-weight: 600;
            text-align: center;
            margin: 20px 0;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
          }
          .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 40px rgba(147, 112, 219, 0.4);
          }
          .footer {
            background: rgba(15, 15, 35, 0.8);
            padding: 30px;
            text-align: center;
            border-top: 1px solid rgba(147, 112, 219, 0.2);
          }
          .footer-text {
            font-size: 14px;
            color: #9ca3af;
          }
          .generation-id {
            font-size: 12px;
            color: #6b7280;
            margin-top: 20px;
            font-family: monospace;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">✨ Miragem</div>
            <div style="color: #e9d5ff; font-size: 18px;">Seu Portal de Criação com IA</div>
          </div>
          
          <div class="content">
            <h1 class="title">Sua Geração Está Pronta! 🎨</h1>
            
            <p style="text-align: center; color: #d4b8f0; font-size: 18px; margin-bottom: 30px;">
              Olá, <strong>${userName}</strong>! Sua criação foi finalizada e está disponível.
            </p>
            
            <div class="prompt-box">
              <div class="prompt-label">Prompt Utilizado:</div>
              <div class="prompt-text">"${prompt}"</div>
            </div>
            
            <div class="image-container">
              <img src="${imageUrl}" alt="Generated Image" class="generation-image" />
            </div>
            
            <div style="text-align: center;">
              <a href="${imageUrl}" class="cta-button" download>
                📥 Baixar Imagem em Alta Qualidade
              </a>
            </div>
            
            <div class="generation-id">
              ID da Geração: ${generationId?.slice(0, 8) || 'N/A'}
            </div>
          </div>
          
          <div class="footer">
            <div class="footer-text">
              <p>Este email foi enviado automaticamente pelo sistema Miragem.</p>
              <p style="margin-top: 10px;">
                Se você não solicitou esta geração, por favor ignore este email.
              </p>
              <p style="margin-top: 20px;">
                <a href="#" style="color: #9ca3af; text-decoration: none;">Cancelar inscrição</a> | 
                <a href="#" style="color: #9ca3af; text-decoration: none;">Suporte</a>
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `

    // Simulação de envio de email (implementação futura com serviço de email)
    console.log('Email enviado para:', email)
    console.log('Assunto: ✨ Sua Geração Miragem Está Pronta!')
    
    return NextResponse.json({
      success: true,
      message: 'Email enviado com sucesso (simulado)',
      email: email,
      generationId
    })

  } catch (error) {
    console.error('Error sending delivery email:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
