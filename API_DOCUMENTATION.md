# Habbit API - Documentação Completa

**Base URL:** `http://localhost:3333`

**Versão:** 1.0.0

---

## 📋 Índice

1. [Autenticação](#autenticação)
2. [Usuário](#usuário)
3. [Correções](#correções)
4. [Tipos e Enums](#tipos-e-enums)
5. [Erros](#erros)

---

## 🔐 Autenticação

Todos os endpoints (exceto `/auth/login`) requerem autenticação via **JWT Bearer Token**.

### Como autenticar:

```http
Authorization: Bearer <seu_token_jwt>
```

---

## 📌 Endpoints

### 🔑 Autenticação

#### `POST /auth/login`

Login do usuário e obtenção do token JWT.

**Público:** ✅ Não requer autenticação

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:** `201 Created`
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Erros:**
- `401 Unauthorized` - Credenciais inválidas

**Exemplo:**
```bash
curl -X POST http://localhost:3333/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@habbit.com",
    "password": "admin123"
  }'
```

---

#### `GET /auth/me`

Retorna informações do usuário autenticado.

**Autenticação:** ✅ Requerida

**Response:** `200 OK`
```json
{
  "user": {
    "id": "uuid",
    "email": "string",
    "name": "string | null",
    "plan": "FREE | PRO | BUSINESS",
    "role": "USER | ADMIN",
    "shortcut": "string",
    "createdAt": "ISO8601"
  }
}
```

**Erros:**
- `401 Unauthorized` - Token inválido ou expirado

**Exemplo:**
```bash
curl -X GET http://localhost:3333/auth/me \
  -H "Authorization: Bearer <token>"
```

---

#### `PUT /auth/shortcut`

Atualiza o atalho de teclado do usuário.

**Autenticação:** ✅ Requerida

**Request Body:**
```json
{
  "shortcut": "string"
}
```

**Response:** `200 OK`
```json
{
  "message": "Shortcut updated successfully"
}
```

**Erros:**
- `401 Unauthorized` - Token inválido
- `404 Not Found` - Usuário não encontrado

**Exemplo:**
```bash
curl -X PUT http://localhost:3333/auth/shortcut \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "shortcut": "Ctrl+Alt+C"
  }'
```

---

### ✍️ Correções

#### `POST /corrections`

Cria uma nova correção de texto usando IA.

**Autenticação:** ✅ Requerida

**Request Body:**
```json
{
  "text": "string",
  "language": "string (opcional, padrão: 'pt')"
}
```

**Response:** `201 Created`
```json
{
  "correction": {
    "id": "uuid",
    "originalText": "string",
    "correctedText": "string",
    "changes": [
      {
        "type": "grammar | spelling | punctuation | style",
        "original": "string",
        "corrected": "string",
        "explanation": "string"
      }
    ] | null,
    "language": "string",
    "tokensUsed": number,
    "createdAt": "ISO8601"
  },
  "usage": {
    "monthly": number,
    "limit": number | "unlimited",
    "remaining": number | "unlimited"
  }
}
```

**Limites por Plano:**
- **FREE:** 50 correções/mês
- **PRO:** Ilimitado
- **BUSINESS:** Ilimitado

**Erros:**
- `400 Bad Request` - Limite mensal excedido ou texto inválido
- `401 Unauthorized` - Token inválido

**Exemplo:**
```bash
curl -X POST http://localhost:3333/corrections \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Eu fui no mercado ontem e comprei varias coisas.",
    "language": "pt"
  }'
```

---

#### `GET /corrections`

Lista as correções do usuário com paginação.

**Autenticação:** ✅ Requerida

**Query Parameters:**
- `page` (opcional, padrão: `1`) - Número da página
- `perPage` (opcional, padrão: `20`) - Itens por página (máx: 100)

**Response:** `200 OK`
```json
{
  "corrections": [
    {
      "id": "uuid",
      "originalText": "string",
      "correctedText": "string",
      "changes": [...] | null,
      "language": "string",
      "tokensUsed": number,
      "createdAt": "ISO8601"
    }
  ]
}
```

**Erros:**
- `401 Unauthorized` - Token inválido

**Exemplo:**
```bash
curl -X GET "http://localhost:3333/corrections?page=1&perPage=20" \
  -H "Authorization: Bearer <token>"
```

---

#### `GET /corrections/stats`

Retorna estatísticas de uso do usuário no mês atual.

**Autenticação:** ✅ Requerida

**Response:** `200 OK`
```json
{
  "totalCorrections": number,
  "monthlyLimit": number | "unlimited",
  "remaining": number | "unlimited",
  "totalTokensUsed": number
}
```

**Erros:**
- `401 Unauthorized` - Token inválido

**Exemplo:**
```bash
curl -X GET http://localhost:3333/corrections/stats \
  -H "Authorization: Bearer <token>"
```

---

#### `GET /corrections/:id`

Retorna detalhes de uma correção específica.

**Autenticação:** ✅ Requerida

**Params:**
- `id` (UUID) - ID da correção

**Response:** `200 OK`
```json
{
  "correction": {
    "id": "uuid",
    "originalText": "string",
    "correctedText": "string",
    "changes": [...] | null,
    "language": "string",
    "tokensUsed": number,
    "createdAt": "ISO8601"
  }
}
```

**Erros:**
- `401 Unauthorized` - Token inválido
- `403 Forbidden` - Correção pertence a outro usuário
- `404 Not Found` - Correção não encontrada

**Exemplo:**
```bash
curl -X GET http://localhost:3333/corrections/<correction-id> \
  -H "Authorization: Bearer <token>"
```

---

#### `DELETE /corrections/:id`

Deleta uma correção.

**Autenticação:** ✅ Requerida

**Params:**
- `id` (UUID) - ID da correção

**Response:** `200 OK`
```json
{
  "message": "Correction deleted successfully"
}
```

**Erros:**
- `401 Unauthorized` - Token inválido
- `403 Forbidden` - Correção pertence a outro usuário
- `404 Not Found` - Correção não encontrada

**Exemplo:**
```bash
curl -X DELETE http://localhost:3333/corrections/<correction-id> \
  -H "Authorization: Bearer <token>"
```

---

## 📊 Tipos e Enums

### UserPlan
```typescript
enum UserPlan {
  FREE = "FREE",
  PRO = "PRO",
  BUSINESS = "BUSINESS"
}
```

### UserRole
```typescript
enum UserRole {
  USER = "USER",
  ADMIN = "ADMIN"
}
```

### TextChange
```typescript
interface TextChange {
  type: "grammar" | "spelling" | "punctuation" | "style"
  original: string
  corrected: string
  explanation: string
}
```

### User
```typescript
interface User {
  id: string
  email: string
  name: string | null
  plan: UserPlan
  role: UserRole
  shortcut: string
  createdAt: string // ISO8601
}
```

### Correction
```typescript
interface Correction {
  id: string
  originalText: string
  correctedText: string
  changes: TextChange[] | null
  language: string
  tokensUsed: number
  createdAt: string // ISO8601
}
```

---

## ⚠️ Erros

### Códigos HTTP

| Código | Descrição |
|--------|-----------|
| `200` | Sucesso |
| `201` | Criado com sucesso |
| `400` | Requisição inválida |
| `401` | Não autenticado |
| `403` | Sem permissão |
| `404` | Não encontrado |
| `500` | Erro interno do servidor |

### Formato de Erro

```json
{
  "statusCode": number,
  "message": "string" | ["string"],
  "error": "string"
}
```

---

## 🔧 Configuração do Cliente

### Headers Padrão

```typescript
const defaultHeaders = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
}
```

### Armazenamento do Token

Recomenda-se armazenar o JWT em:
- **Electron/Desktop:** Secure Storage (electron-store com encryption)
- **Web:** localStorage ou sessionStorage

### Expiração do Token

- **Duração:** 7 dias (configurável via `JWT_EXPIRES_IN`)
- **Renovação:** Fazer novo login quando expirar

---

## 🚀 Integração com Desktop App (Electron)

### 1. Fluxo de Autenticação

```typescript
// Login
async function login(email: string, password: string) {
  const response = await fetch('http://localhost:3333/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })

  const { accessToken } = await response.json()

  // Salvar token de forma segura
  await secureStore.set('jwt_token', accessToken)

  return accessToken
}

// Obter usuário atual
async function getCurrentUser(token: string) {
  const response = await fetch('http://localhost:3333/auth/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  })

  return await response.json()
}
```

### 2. Correção de Texto com Atalho

```typescript
// Registrar atalho global
import { globalShortcut } from 'electron'

async function registerShortcut(shortcut: string) {
  globalShortcut.register(shortcut, async () => {
    // Capturar texto selecionado
    const selectedText = await getSelectedText()

    // Enviar para API
    const corrected = await correctText(selectedText)

    // Substituir texto
    await replaceSelectedText(corrected)
  })
}

// Corrigir texto
async function correctText(text: string) {
  const token = await secureStore.get('jwt_token')

  const response = await fetch('http://localhost:3333/corrections', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ text, language: 'pt' })
  })

  const { correction } = await response.json()
  return correction.correctedText
}
```

### 3. Atualizar Atalho nas Configurações

```typescript
async function updateShortcut(newShortcut: string) {
  const token = await secureStore.get('jwt_token')

  // Atualizar no backend
  await fetch('http://localhost:3333/auth/shortcut', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ shortcut: newShortcut })
  })

  // Desregistrar atalho antigo
  globalShortcut.unregisterAll()

  // Registrar novo atalho
  await registerShortcut(newShortcut)
}
```

### 4. Histórico de Correções

```typescript
async function getCorrectionsHistory(page: number = 1, perPage: number = 20) {
  const token = await secureStore.get('jwt_token')

  const response = await fetch(
    `http://localhost:3333/corrections?page=${page}&perPage=${perPage}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  )

  return await response.json()
}
```

### 5. Estatísticas de Uso

```typescript
async function getUsageStats() {
  const token = await secureStore.get('jwt_token')

  const response = await fetch('http://localhost:3333/corrections/stats', {
    headers: { 'Authorization': `Bearer ${token}` }
  })

  const stats = await response.json()

  // Exemplo: { totalCorrections: 15, monthlyLimit: "unlimited", ... }
  return stats
}
```

---

## 🔒 Segurança

### CORS

O backend está configurado para aceitar requisições de qualquer origem em desenvolvimento. Em produção, configure as origens permitidas.

### Rate Limiting

⚠️ **TODO:** Implementar rate limiting para proteger contra abuso.

### Validação

Todas as rotas validam os dados de entrada usando `class-validator`.

---

## 🌐 Variáveis de Ambiente

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/habbit_db"

# Redis
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_PASSWORD="password"

# JWT
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"

# Server
PORT=3333
NODE_ENV="development"

# OpenAI
OPENAI_API_KEY="sk-..."
```

---

## 📦 Estrutura de Pastas Recomendada (Frontend)

```
src/
├── api/
│   ├── client.ts          # Axios/Fetch configurado
│   ├── auth.ts            # Funções de autenticação
│   ├── corrections.ts     # Funções de correções
│   └── types.ts           # Tipos TypeScript
├── stores/
│   ├── auth.ts            # Store de autenticação
│   └── corrections.ts     # Store de correções
└── electron/
    ├── shortcuts.ts       # Gerenciamento de atalhos
    └── clipboard.ts       # Integração com clipboard
```

---

## 🧪 Testes

### Teste de Autenticação

```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:3333/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@habbit.com","password":"admin123"}' \
  | jq -r '.accessToken')

# Obter usuário
curl -X GET http://localhost:3333/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### Teste de Correção

```bash
# Criar correção
curl -X POST http://localhost:3333/corrections \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text":"Eu fui no mercado ontem e comprei varias coisas.","language":"pt"}'

# Ver estatísticas
curl -X GET http://localhost:3333/corrections/stats \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📞 Suporte

Para dúvidas ou problemas, contate o time de desenvolvimento.

**Versão da API:** 1.0.0
**Última atualização:** 2025-10-05
