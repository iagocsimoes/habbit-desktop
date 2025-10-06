# Habbit Desktop - Corretor de Texto Inteligente

Aplicativo desktop que oferece correção inteligente de texto em qualquer aplicação do sistema através de um atalho de teclado.

## 🚀 Funcionalidades

- ✅ **Correção instantânea**: Pressione o atalho (padrão: Ctrl+/) para corrigir texto selecionado
- 🔒 **Segurança máxima**: Context isolation, sandbox, armazenamento criptografado
- 🎨 **Interface minimalista dark**: Tray icon com menu contextual
- 🔑 **Autenticação JWT**: Login seguro com token armazenado de forma criptografada
- ⚡ **Alta performance**: Clipboard management otimizado
- 📊 **Estatísticas de uso**: Acompanhe suas correções mensais

## 🛠️ Tecnologias

- **Electron** - Framework desktop
- **TypeScript** - Tipagem estática
- **node-global-key-listener** - Atalhos globais de teclado
- **clipboardy** - Gerenciamento de clipboard
- **electron-store** - Armazenamento seguro
- **axios** - Cliente HTTP

## 📦 Instalação

```bash
# Instalar dependências
pnpm install

# Build do projeto
pnpm run build

# Iniciar aplicação
pnpm start

# Modo desenvolvimento (com watch)
pnpm run dev
```

## 🔧 Configuração

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto (opcional):

```env
API_BASE_URL=http://localhost:3333
```

### Primeiro Uso

1. Inicie o aplicativo com `pnpm start`
2. Faça login com suas credenciais
3. O atalho padrão é **Ctrl+/**
4. Selecione qualquer texto em qualquer aplicação
5. Pressione o atalho para corrigir

## 🔐 Segurança

- **Context Isolation**: Renderer process isolado
- **Sandbox**: Processo renderer em sandbox
- **CSP**: Content Security Policy configurado
- **No Node Integration**: Sem integração Node no renderer
- **Encrypted Storage**: Token armazenado com criptografia OS-level
- **No External Navigation**: Navegação externa bloqueada

## 📁 Estrutura do Projeto

```
src/
├── api/              # Clientes API
│   ├── client.ts     # Cliente HTTP configurado
│   ├── auth.ts       # Endpoints de autenticação
│   └── corrections.ts # Endpoints de correções
├── services/         # Serviços principais
│   ├── auth.ts       # Serviço de autenticação
│   ├── keyboard.ts   # Gerenciamento de atalhos
│   ├── clipboard.ts  # Gerenciamento de clipboard
│   ├── correction.ts # Serviço de correção
│   └── storage.ts    # Armazenamento seguro
├── windows/          # Janelas HTML
│   ├── login.html    # Tela de login
│   └── settings.html # Tela de configurações
├── preload/          # Scripts preload
│   └── preload.ts    # Bridge seguro IPC
├── types/            # Tipos TypeScript
│   └── index.ts      # Interfaces e enums
└── main.ts           # Processo principal
```

## 🎯 Como Funciona

1. **Atalho pressionado** → Listener detecta combinação de teclas
2. **Captura texto** → Simula Ctrl+C para copiar texto selecionado
3. **Envia para API** → Requisição POST para `/corrections`
4. **Substitui texto** → Simula Ctrl+V com texto corrigido
5. **Notificação** → Mostra feedback ao usuário

## 🔑 Atalhos Customizáveis

Acesse **Configurações** no menu do tray para alterar o atalho padrão.

Exemplos de atalhos válidos:
- `Ctrl+/`
- `Ctrl+Alt+C`
- `Ctrl+Shift+Space`

## 📊 Limitações por Plano

- **FREE**: 50 correções/mês
- **PRO**: Ilimitado
- **BUSINESS**: Ilimitado + recursos extras

## 🐛 Troubleshooting

### Atalho não funciona
- Verifique se outro aplicativo não está usando o mesmo atalho
- Execute o app com permissões de administrador (Windows)

### Texto não é substituído
- Certifique-se de que o texto está selecionado antes de pressionar o atalho
- Verifique se a aplicação alvo permite colagem via Ctrl+V

### Erro de autenticação
- Verifique se a API está rodando em `http://localhost:3333`
- Confirme suas credenciais de login

## 📝 Licença

Proprietário - Todos os direitos reservados
