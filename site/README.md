# Landing Page — TWM Engenharia

Landing page moderna e responsiva para a TWM Engenharia (reformas e construções),
construída com HTML, CSS e JavaScript puro — sem dependências ou build. Basta abrir
o `index.html` no navegador ou hospedar a pasta em qualquer serviço estático
(Vercel, Netlify, GitHub Pages, etc.).

## Estrutura

```
site/
├── index.html        ← estrutura e conteúdo
├── styles.css        ← estilos (paleta e tipografia da marca)
├── script.js         ← menu, animações e formulário → WhatsApp
└── assets/
    ├── logo.png          ← logo colorida (fundos claros)
    └── logo-branco.png   ← logo monocromática branca (fundos escuros)
```

## Identidade visual aplicada

| Elemento | Valor |
|----------|-------|
| Azul Oceano (confiança) | `#16607B` |
| Verde Céu (renovação) | `#4C9A84` |
| Tipografia — títulos | Montserrat |
| Tipografia — corpo | Open Sans |

## Seções

Hero · Números · Serviços · Sobre/Diferenciais · Como funciona (5 etapas) ·
Depoimentos · Dúvidas (FAQ) · Contato (formulário + WhatsApp) · Rodapé.

## ⚠️ Informações a substituir (placeholders)

Os pontos abaixo foram preenchidos com dados de exemplo porque não constavam nos
documentos enviados. Procure e substitua:

- **Telefone / WhatsApp:** `5599999999999` (em `index.html` e na constante
  `WHATSAPP` no `script.js`) e o texto `(00) 00000-0000`. Use o formato
  DDI+DDD+número, ex.: `5511999998888`.
- **E-mail:** `contato@twmengenharia.com.br`.
- **CNPJ** e **endereço** no rodapé.
- **Números da seção "Números"** (anos de tradição, obras entregues) — ajuste aos
  dados reais da empresa em `index.html`.
- **Depoimentos:** hoje são ilustrativos — troque pelos relatos reais dos clientes.
- **Horário de atendimento** e **região de atuação** (na seção Contato e no FAQ).
- **Fotos:** o layout usa gradientes e a logo. Se quiser, adicione fotos reais de
  obras nas seções Hero e Sobre para reforçar a credibilidade.

## Formulário

O formulário de orçamento não usa servidor: ao enviar, ele monta uma mensagem e
abre o WhatsApp com os dados preenchidos. Para receber por e-mail, integre um
serviço como Formspree, Getform ou uma função serverless.
