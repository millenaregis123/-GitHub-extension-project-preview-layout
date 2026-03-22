# PR Preview — Vercel

Extensão Chrome que detecta automaticamente o **preview deploy da Vercel** associado a um Pull Request no GitHub e abre com um clique, sem sair da página do PR.

---

## Como funciona

```
Usuário abre PR no GitHub
        ↓
content.js injeta botão na interface
        ↓
Busca detalhes do PR via GitHub API
(headSha + headRef)
        ↓
Vercel API: busca deployments de preview
  1. Tenta pelo SHA exato do commit
  2. Fallback: busca pelo nome do branch
        ↓
Botão "Ver Preview Vercel" aparece
        ↓
Clique → abre https://<slug>.vercel.app
+ painel de detalhes inline (toggle)
```

---

## Pré-requisito: configurar a Vercel

O projeto precisa ter o **GitHub Integration** ativo na Vercel:

1. Acesse [vercel.com/new](https://vercel.com/new)
2. Importe o repositório GitHub
3. A Vercel passa a criar um preview deploy automaticamente para cada PR

> Se o projeto já usa Vercel, isso provavelmente já está configurado.

---

## Instalação da extensão

### 1. Carregar no Chrome

```
chrome://extensions → Modo desenvolvedor (ON) → Carregar sem compactação → pasta extension/
```

### 2. Configurar tokens

Clique no ícone da extensão:

| Campo | Onde obter | Necessário |
|-------|-----------|-----------|
| **Token Vercel** | [vercel.com/account/tokens](https://vercel.com/account/tokens) | Sempre |
| **Team ID** | URL do dashboard do time: `vercel.com/teams/<team-id>` | Apenas para times |
| **Projeto Vercel** | Selecionável na lista ou pelo slug do projeto | Recomendado |
| **Token GitHub** | [github.com/settings/tokens](https://github.com/settings/tokens) (escopo `repo`) | Repos privados |

### 3. Teste

Abra qualquer PR de um repositório conectado à Vercel. O botão aparece automaticamente.

---

## Estrutura dos arquivos

```
extension/
├── manifest.json      ← Chrome MV3
├── vercel-api.js      ← Cliente da Vercel API (injetado antes do content.js)
├── content.js         ← Detecta PR, busca deploy, injeta botão + painel
├── content.css        ← Estilos do botão e painel
├── background.js      ← Service worker (abre novas abas)
├── popup.html         ← Interface de configuração
├── popup.js
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## Estratégia de busca do deploy

A extensão usa a **Vercel REST API v6/v9** e tenta duas abordagens:

### 1. Por SHA do commit (mais preciso)
```
GET /v6/deployments?projectId={id}&target=preview&limit=50
→ filtra por meta.githubCommitSha === headSha
```

### 2. Por branch (fallback)
```
GET /v6/deployments?projectId={id}&target=preview&limit=25
→ filtra por meta.githubCommitRef === headRef
→ pega o mais recente
```

Se o `vercelProjectId` não estiver configurado, a extensão chama `/v9/projects` e
compara o campo `link.repo` de cada projeto com o `owner/repo` do PR atual.

---

## Estados do botão

| Estado | Significado |
|--------|-------------|
| Carregando… | Buscando deploy na API |
| **Ver Preview Vercel** (preto) | Deploy encontrado e pronto |
| Preview não encontrado | Projeto não está na Vercel ou token incorreto |
| Configure o token Vercel | Sem token configurado |
| Erro — ver detalhes | Erro de API (clique para detalhes) |

### Painel de detalhes (toggle ao clicar no botão)

Ao clicar no botão "Ver Preview Vercel":
1. Abre o preview em nova aba
2. Exibe/oculta um painel inline com: status do deploy, projeto, branch, SHA e URL

Se o deploy ainda está em build (status `BUILDING`/`QUEUED`), a extensão faz polling a
cada 8 segundos e atualiza o painel automaticamente.

---

## Variáveis de ambiente para o token Vercel

Ao criar o token em [vercel.com/account/tokens](https://vercel.com/account/tokens):

- **Scope**: Full Account (ou o time específico)
- **Expiration**: sem expiração para uso contínuo, ou 90 dias para mais segurança

---

## Roadmap

- [ ] Suporte a Firefox (WebExtensions API — a base já é compatível)
- [ ] Comentar automaticamente no PR com o link do preview
- [ ] Comparação lado a lado (branch atual vs `main`)
- [ ] Badge de status no título do PR
- [ ] Suporte a Netlify e Railway como fontes alternativas

---

## Licença

MIT
