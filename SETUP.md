# Habbit Desktop - Guia de Setup

## ✅ Pré-requisitos

1. **Node.js** v22.x instalado
2. **pnpm** instalado (`npm install -g pnpm`)
3. **Docker Desktop** rodando (para o backend)
4. **Backend API** rodando na porta 3333

## 🚀 Setup do Backend

1. Inicie o Docker Desktop
2. Navegue até a pasta do backend:
```bash
cd ../backend
```

3. Inicie os containers Docker (PostgreSQL + Redis):
```bash
docker-compose up -d
```

4. Execute as migrations do Prisma:
```bash
pnpm prisma migrate dev
```

5. Inicie o backend:
```bash
pnpm start:dev
```

O backend estará rodando em `http://localhost:3333`

## 📱 Setup do Frontend Desktop

1. Instale as dependências:
```bash
pnpm install
```

2. Build o projeto:
```bash
pnpm run build
```

3. Inicie o aplicativo:
```bash
pnpm start
```

## 🔑 Credenciais Padrão

Email: `admin@habbit.com`
Senha: `admin123`

## 🐛 Troubleshooting

### Erro: "Can't reach database server"
- Certifique-se que o Docker Desktop está rodando
- Execute `docker-compose up -d` na pasta do backend
- Verifique se o PostgreSQL está na porta 5432: `docker ps`

### Erro: "Cannot read properties of undefined (reading 'disableHardwareAcceleration')"
- Este é um problema de compatibilidade ESM/CommonJS
- Certifique-se de usar as versões compatíveis:
  - electron-store: 8.2.0
  - clipboardy: 3.0.0

### Erro: "electronAPI is not defined"
- Verifique se o preload script está sendo carregado
- Abra o DevTools (modo dev) e verifique o console

### App não abre
- Execute em modo desenvolvimento para ver os logs:
```bash
set NODE_ENV=development&& pnpm exec electron .
```

### Login não funciona
- Verifique se o backend está rodando: `curl http://localhost:3333/auth/login`
- Abra o DevTools (F12) e verifique erros no console

### Atalho não funciona
- Verifique se outro aplicativo não está usando o mesmo atalho
- No Windows, pode ser necessário executar como Administrador
- Tente mudar o atalho nas Configurações

## 📝 Scripts Disponíveis

- `pnpm run build` - Compila TypeScript e copia arquivos
- `pnpm start` - Build e inicia o app
- `pnpm run dev` - Inicia em modo desenvolvimento (com DevTools)
- `pnpm run watch` - Watch mode do TypeScript

## 🔒 Segurança

O app implementa:
- Context Isolation ✅
- Sandbox ✅
- CSP (Content Security Policy) ✅
- Armazenamento criptografado ✅
- No Node Integration no renderer ✅

## 📋 Estrutura do Projeto

```
dist/              # Código compilado
src/
├── api/          # Clientes API
├── services/     # Serviços (auth, keyboard, clipboard, etc)
├── windows/      # Arquivos HTML/JS das janelas
├── preload/      # Preload scripts
├── types/        # Tipos TypeScript
└── main.ts       # Processo principal
```

## 🌐 API Endpoints

O frontend se conecta aos seguintes endpoints:

- `POST /auth/login` - Login
- `GET /auth/me` - Dados do usuário
- `PUT /auth/shortcut` - Atualizar atalho
- `POST /corrections` - Criar correção
- `GET /corrections/stats` - Estatísticas

## 💡 Dicas

1. **Primeiro uso**: Faça login, depois configure seu atalho preferido
2. **Testar correção**: Selecione texto em qualquer app e pressione o atalho
3. **Ver histórico**: Abra Configurações no menu do tray
4. **Desinstalar**: Remova a pasta e delete os dados em `%APPDATA%/habbit-secure`
