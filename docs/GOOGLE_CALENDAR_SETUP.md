# Google Calendar Integration — Setup Guide

Guia para configurar o Google OAuth App e habilitar a integração Google Calendar no Kronos CRM.

---

## 1. Criar projeto no Google Cloud Console

1. Acesse [console.cloud.google.com](https://console.cloud.google.com)
2. Clique em **"Select a project"** > **"New Project"**
3. Nome: `Kronos CRM`
4. Clique **Create**

---

## 2. Ativar a Google Calendar API

1. No menu lateral: **APIs & Services** > **Library**
2. Pesquise **"Google Calendar API"**
3. Clique e depois **Enable**

---

## 3. Configurar a Tela de Consentimento OAuth

1. Menu: **APIs & Services** > **OAuth consent screen**
2. Selecione **External** (para qualquer conta Google) > **Create**
3. Preencha:
   - **App name**: `Kronos CRM`
   - **User support email**: seu email
   - **App logo**: logo do Kronos (opcional mas recomendado para confiança do usuário)
   - **App domain**: `kronoshub.com.br`
   - **Authorized domains**: `kronoshub.com.br`
   - **Developer contact email**: seu email
4. Clique **Save and Continue**

### Scopes

1. Clique **Add or Remove Scopes**
2. Pesquise e marque: `https://www.googleapis.com/auth/calendar.events`
   - Isso permite ler e escrever eventos no calendário do usuário
   - É classificado como "sensitive scope" pelo Google
3. **Save and Continue**

### Test Users (modo Testing)

1. Adicione seu email e emails de teste (até 100 usuários)
2. **Save and Continue**
3. Clique **Back to Dashboard**

> **Importante**: Enquanto o app estiver em modo "Testing", apenas os test users conseguem conectar. Isso é útil para validar tudo antes de publicar.

---

## 4. Criar Credenciais OAuth 2.0

1. Menu: **APIs & Services** > **Credentials**
2. Clique **+ Create Credentials** > **OAuth client ID**
3. Tipo: **Web application**
4. Nome: `Kronos CRM Web Client`
5. **Authorized JavaScript origins**: (deixe vazio)
6. **Authorized redirect URIs** — adicione as duas:
   - `http://localhost:3000/api/integrations/google/callback` (desenvolvimento)
   - `https://app.kronoshub.com.br/api/integrations/google/callback` (produção)
7. Clique **Create**
8. **Copie** o `Client ID` e `Client Secret` — você vai precisar deles no próximo passo

---

## 5. Configurar variáveis de ambiente

### Gerar ENCRYPTION_KEY

No terminal, execute:

```bash
openssl rand -hex 32
```

Copie o resultado (64 caracteres hex).

### Adicionar ao .env

```bash
# Google OAuth (Calendar Integration)
GOOGLE_CLIENT_ID="xxxxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxxxx"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/integrations/google/callback"
ENCRYPTION_KEY="cole_aqui_o_resultado_do_openssl"
```

> **Produção**: altere `GOOGLE_REDIRECT_URI` para `https://app.kronoshub.com.br/api/integrations/google/callback`

### Verificar

Reinicie o `pnpm dev`. Acesse **Configurações > Integrações** — o card do Google Calendar deve mostrar o botão "Conectar" ao invés de "Em breve".

---

## 6. Publicar o App (produção)

Para liberar a integração para todos os usuários (não apenas test users):

1. Volte em **OAuth consent screen**
2. Clique **Publish App**
3. O Google vai solicitar uma **verificação** porque o scope `calendar.events` é "sensitive"

### O que o Google pede na verificação

| Requisito | Descrição |
|-----------|-----------|
| Domínio verificado | Verificar `kronoshub.com.br` no Google Search Console |
| Política de Privacidade | URL pública com a política de privacidade |
| Termos de Uso | URL pública com os termos de uso |
| Descrição do uso | Explicar como o app usa os dados do Calendar |
| Vídeo demonstrativo | (Opcional) Vídeo mostrando o fluxo de conexão e uso |

### Prazo

A verificação leva de **1 a 4 semanas**. Durante esse período:

- O app continua funcionando para os test users adicionados manualmente
- Você pode adicionar até 100 test users (clientes selecionados para beta)
- Novos usuários que não estão na lista verão um aviso "This app isn't verified" ao tentar conectar

### Dica para acelerar

Enquanto aguarda a verificação, adicione seus clientes mais engajados como test users no Google Console. Isso permite rodar a integração em produção com um grupo controlado.

---

## 7. Fluxo do usuário final

Uma vez configurado, o fluxo para o cliente é:

1. Acessa **Configurações > Integrações**
2. Clica **"Conectar Google Calendar"**
3. Google abre tela de permissão → usuário clica **"Permitir"**
4. Redirecionado de volta ao Kronos → toast "Conectado com sucesso!"
5. A partir desse momento, agendamentos do CRM sincronizam automaticamente com o Google Calendar do usuário

---

## Troubleshooting

### "Em breve" aparece mesmo com envs configuradas

- Verifique se `GOOGLE_CLIENT_ID` está no `.env` (não vazio)
- Reinicie o servidor (`pnpm dev`)

### "Error: redirect_uri_mismatch"

- A URL em `GOOGLE_REDIRECT_URI` deve ser **exatamente igual** à configurada em **Authorized redirect URIs** no Google Console
- Verifique http vs https e presença/ausência de barra final

### "Error: access_denied"

- Em modo Testing: verifique se o email do usuário está na lista de test users
- Em produção: verifique se o app foi publicado e aprovado

### "Google não retornou token de atualização"

- Isso acontece quando o usuário já conectou antes e o Google reutiliza a autorização anterior
- Solução: o usuário deve ir em [myaccount.google.com/permissions](https://myaccount.google.com/permissions), revogar o acesso ao Kronos, e reconectar

### "ENCRYPTION_KEY environment variable is required"

- Gere a key com `openssl rand -hex 32` e adicione ao `.env`
- A key deve ter exatamente 64 caracteres hexadecimais (32 bytes)
