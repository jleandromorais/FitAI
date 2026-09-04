---
name: FitAI
description: Plataforma de treinos com geração de planos por IA — tema escuro fixo, direção "Combustão"
colors:
  bg: "#12100e"
  surface: "#1c1815"
  surface-2: "#241f1a"
  surface-3: "#2c261f"
  border: "#332b23"
  border-soft: "#241f1a"
  text: "#f5f1ea"
  text-dim: "#a89e8f"
  text-mute: "#6b6053"
  accent: "#ff5a2e"
  accent-hover: "#ff7a52"
  accent-soft: "rgba(255,90,46,0.1)"
  gain: "#8fe85a"
  gain-soft: "rgba(143,232,90,0.1)"
  danger: "#ff4d4d"
typography:
  display:
    fontFamily: "var(--font-space), 'Space Grotesk', system-ui, sans-serif"
    fontWeight: 700
  body:
    fontFamily: "var(--font-inter), 'Inter', system-ui, sans-serif"
    fontSize: "14px"
    lineHeight: 1.5
  mono:
    fontFamily: "var(--font-jetbrains), 'JetBrains Mono', monospace"
rounded:
  sm: "11px"
  md: "18px"
  lg: "26px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "28px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "#16100c"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text-dim}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-dim}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  button-danger:
    backgroundColor: "rgba(255,77,77,0.12)"
    textColor: "{colors.danger}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "20px"
  card-tight:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "14px 16px"
  input:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    padding: "10px 14px"
  chip-accent:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
    rounded: "20px"
    padding: "3px 10px"
---

# Design System: FitAI

## Overview

**Creative North Star: "Combustão"**

FitAI não é uma app de fitness clínica e branca — é carvão quente em vez de preto-terminal, com uma brasa laranja como identidade de energia e esforço. O fundo nunca é preto puro nem cinza neutro: é um carvão morno (`#12100e`) que sobe em degraus de calor (`surface` → `surface-2` → `surface-3`) para separar camadas, sem nunca recorrer a sombra. A brasa (`--accent`, laranja `#ff5a2e`) é o único acento realmente vivo do sistema — usada com intenção, não espalhada. O verde (`--gain`) é deliberadamente reservado: não é uma segunda cor de marca, é um sinal semântico único para "conquista" (streak, recorde, meta batida) — usá-lo fora desse contexto dilui o único momento em que o sistema muda de linguagem.

A tipografia reforça a mesma lógica de intensidade contida: Space Grotesk em negrito para números e títulos que devem "pesar" no ecrã (stats, headlines), Inter para o texto corrido do dia a dia, e JetBrains Mono — com `tabular-nums` — para qualquer valor que mude ao vivo (cronómetro, contador de reps, pesos). Esta escolha não é decorativa: no RepCounter da página de autenticação, o número em mono com glow (`text-shadow` laranja) é literalmente o elemento que vende o produto antes do login.

**Key Characteristics:**
- Tema escuro único e fixo — não existe modo claro nem toggle.
- Superfícies flat: hierarquia por degrau de cor + borda de 1px, nunca por sombra.
- Sombra reservada estritamente a elementos elevados acima do conteúdo (modais, sidebar mobile em overlay) — nunca em cards, botões ou inputs em repouso.
- Um único acento vivo (laranja); o verde é sinal, não paleta.
- Dados que mudam em tempo real (cronómetro, reps, pesos) usam sempre a fonte mono com `tabular-nums`.

## Colors

Paleta reduzida e disciplinada: um fundo quente em degraus, um acento vivo, e um sinal semântico único — nada mais compete por atenção.

### Primary
- **Brasa** (`#ff5a2e`): o único acento de marca. CTAs primários, estado ativo da navegação, glows, gráficos por defeito, texto em destaque (`flame-word`). Usado com moderação — nunca como cor de fundo de grandes áreas.
- **Brasa Clara** (`#ff7a52`): estado hover da Brasa. Nunca usada isolada fora de interações.

### Secondary
- **Verde-Conquista** (`#8fe85a`): sinal semântico único de sucesso/conquista (streak, recorde pessoal, set concluído). Não é uma segunda cor de marca — reservar exclusivamente para este significado.
- **Vermelho-Alerta** (`#ff4d4d`): erro, ação destrutiva, danger.

### Neutral
- **Carvão Quente** (`#12100e`): fundo base da aplicação (`--bg`).
- **Cinza Quente** (`#1c1815`): superfície de cards e sidebar (`--surface`), um degrau acima do fundo.
- **Cinza Levantado** (`#241f1a`): superfície secundária — inputs, badges, hover de itens de navegação (`--surface-2` / `--border-soft`).
- **Cinza Aceso** (`#2c261f`): superfície terciária — usada nos gráficos de barra para pontos que não são o mais recente (`--surface-3`).
- **Fuligem** (`#332b23`): borda padrão de cards, inputs e divisores (`--border`).
- **Alvo Quente** (`#f5f1ea`): texto principal (`--text`).
- **Cinza Morno** (`#a89e8f`): texto secundário/dimmed (`--text-dim`).
- **Cinza Apagado** (`#6b6053`): texto terciário/mute — labels, timestamps, separadores (`--text-mute`).

### Named Rules
**A Regra da Brasa Única.** Só existe um acento vivo no sistema — a Brasa. Antes de introduzir qualquer nova cor "de destaque", pergunta se ela não devia ser apenas Brasa com outra opacidade.

**A Regra do Verde-Sinal.** Verde-Conquista significa uma coisa: o utilizador conseguiu algo (streak, PR, set feito). Nunca o uses como cor decorativa, de marca, ou de estado neutro — isso esvazia o sinal.





## Typography

**Display Font:** Space Grotesk (com fallback `system-ui, sans-serif`)
**Body Font:** Inter (com fallback `system-ui, sans-serif`)
**Label/Mono Font:** JetBrains Mono

**Character:** Space Grotesk carrega o peso — títulos e números grandes que precisam de comandar o ecrã. Inter faz o trabalho invisível do texto corrido. JetBrains Mono marca qualquer valor que muda ou é medido: é a fonte da "verdade ao vivo" (pesos, reps, tempo), sempre com `tabular-nums` onde os dígitos mudam a cada tick para não saltarem de largura.

### Hierarchy
- **Display** (700, ~30–42px conforme contexto, 1.1–1.2 line-height): `.page-title`, headline da auth, `.h-display`. Aparece uma vez por ecrã.
- **Headline/Stat** (700, 36px): `.stat-num` — os números grandes dos cards de estatística.
- **Title** (600–700, ~16–18px): títulos de cards, de modais, nomes de exercícios/treinos.
- **Body** (400, 14px, line-height 1.5): texto corrido por defeito de toda a aplicação (`body` global).
- **Label/Eyebrow** (700, 10px, letter-spacing 0.12em, uppercase): `.h-eyebrow`, `.stat-label` — pequenos rótulos categóricos acima de um título ou número.
- **Mono/Numeric** (JetBrains Mono, `tabular-nums` quando animado): valores de peso/reps em tabelas, cronómetro de descanso, stopwatch de sessão, `.rep-counter-num`, iniciais de avatar, índices numerados de exercício.

### Named Rules
**A Regra do Mono ao Vivo.** Qualquer número que muda em tempo real (timer, reps, peso durante a sessão) é sempre JetBrains Mono com `tabular-nums` — nunca a fonte de corpo. É o que diferencia "dado a acontecer agora" de "texto estático".

## Layout

Sem container de largura máxima — o conteúdo é fluido, limitado apenas pela viewport. Estrutura de shell fixa: sidebar de 240px (`flex` item fixo) + `.content` fluido (`flex:1`, padding `36px 40px`, scroll vertical próprio).

Grelha principal do dashboard é `.grid-3` (`1fr 320px`, coluna larga + coluna estreita), colapsando para uma coluna em ≤900px. Cards de estatística usam `.grid-cols-3`/`.grid-cols-4`, colapsando para 2 colunas em ≤900px e 1 coluna em ≤560px.

Não há prefixos responsivos do Tailwind (`sm:`/`md:`/`lg:`) em uso — toda a responsividade é feita por `@media` queries manuais, em três breakpoints fixos: **768px** (sidebar vira drawer off-canvas), **900px** (grelhas de 2-3 colunas colapsam), **560px** (grelhas colapsam para 1 coluna). O painel de marca da página de auth só aparece em desktop (`min-width: 1024px`).

Ritmo de espaçamento observado: `8 / 12 / 16 / 20 / 28px` para gaps e margens entre secções; padding de card por defeito `20px` (`14px 16px` na variante tight, `28px` em cards hero/destaque, `48–60px` em estados vazios/resultado).

## Elevation & Depth

O sistema é **flat por defeito** — a profundidade vem de degraus de cor de fundo (`bg` → `surface` → `surface-2` → `surface-3`) e de uma borda de 1px, nunca de sombra ambiente. Sombra é usada apenas como resposta estrutural a um elemento que se sobrepõe ao conteúdo por trás dele.

**Exceção deliberada (2026-09-04):** superfícies que já vestem `card-accent` (o vocabulário de "brasa" — ver Painel de Sistema) ganham uma sombra colorida sutil (`rgba(255,90,46,...)`) mesmo em repouso, e o CTA primário (`.btn-primary`) é a única forma de botão com glow próprio. Isso substitui um "flat sempre" absoluto por "flat por padrão, luz só onde a Brasa já vive" — a regra continua protegendo contra sombra genérica cinza em qualquer superfície neutra.

### Shadow Vocabulary
- **Modal grande** (`box-shadow: 0 32px 80px rgba(0,0,0,0.5)`): wizards de várias etapas (ex: criar treino), sempre com `backdrop-filter: blur(4px)` no scrim por trás.
- **Modal pequeno/confirmação** (`box-shadow: 0 24px 60px rgba(0,0,0,0.4)`): diálogos de confirmação (ex: eliminar treino).
- **Drawer mobile** (`box-shadow: 2px 0 24px rgba(0,0,0,0.4)`): sidebar em overlay em ecrãs ≤768px.
- **Glow de foco vivo** (não é box-shadow tradicional, é `text-shadow`/`box-shadow` pequeno com cor de acento): `.rep-counter-num` (`text-shadow: 0 0 32px rgba(255,90,46,0.35)`) e o dot atual do RepCounter (`box-shadow: 0 0 12px rgba(255,90,46,0.6)` com pulse) — reservado a esse elemento de assinatura, não é um padrão geral de destaque.

### Named Rules
**A Regra Flat-por-Defeito.** Cards, botões, chips e inputs neutros em repouso nunca têm `box-shadow`. Sombra estrutural aparece quando um elemento se eleva fisicamente sobre outro (modal sobre página, drawer sobre conteúdo). A única exceção sancionada é a sombra colorida da própria Brasa (`card-accent`, `.btn-primary`) — nunca cinza, nunca em superfície neutra.

## Shapes

Escala de radius em três degraus, aumentada em 2026-09-04 pra uma sensação mais premium/arredondada (menos "template de admin", mais tátil):
- **`--radius-sm` (11px)**: botões, inputs, tabs, itens de navegação, tiles pequenos.
- **`--radius` (18px)**: cards e painéis.
- **`--radius-lg` (26px)**: superfícies grandes — modais, `.auth-status-icon`.
- **Pill/circular**: `border-radius: 50%` para avatares, ícones de estado, step-dots; `999px` (pill total) reservado ao `.btn-primary` — o único botão com esse tratamento; `20px`/`99px` para badges, chips e tracks de barra de progresso.

Bordas são quase sempre `1px solid var(--border)` (ou `var(--border-soft)` para divisores internos mais subtis), subindo para `1.5px` e cor de acento em estados de destaque/foco (ex: card de exercício em foco durante a sessão ao vivo).

### Named Rules
**A Regra dos Três Degraus.** Tiles pequenos/ícones ficam no `--radius-sm`, cards/painéis no `--radius`, modais no `--radius-lg`. Um card com radius de botão ou um botão com radius de card quebra a leitura de hierarquia por tamanho de superfície.

## Components

### Buttons
- **Shape:** `border-radius: 9px` (`--radius-sm`); padding `8px 16px` (`5px 11px` na variante `sm`, `11px 22px` na `lg`).
- **Primary:** fundo `Brasa` (`#ff5a2e`), texto quase-preto (`#16100c`) para contraste — não branco.
- **Hover:** fundo passa a `Brasa Clara` (`#ff7a52`). **Active:** `transform: scale(0.97)` — feedback tátil por movimento, não por sombra.
- **Secondary:** fundo `Cinza Levantado`, texto `Cinza Morno`, borda `Fuligem` — usado para ações não-primárias no mesmo contexto de um primary.
- **Ghost:** transparente, texto `Cinza Morno` — ações terciárias.
- **Danger:** fundo `rgba(255,77,77,0.12)`, texto `Vermelho-Alerta`, borda `rgba(255,77,77,0.2)`.
- Nenhuma variante usa `box-shadow`.

### Chips
- **Chip de filtro** (`.chip`, `.chip.active`): interativo, usado para escolher/filtrar (ex: grupo muscular no catálogo de exercícios).
- **Chip de exibição** (`.chip.chip-accent`): fundo `accent-soft`, texto `Brasa`, `cursor: default` — não é clicável, é só uma etiqueta (ex: tag de grupo muscular num card de treino). Distinguir sempre estas duas variantes pelo contexto: se não faz nada ao clicar, é `chip-accent` de exibição.

### Cards / Containers
- **Corner Style:** 14px (`--radius`); variante `card-tight` mantém o mesmo radius com padding reduzido.
- **Background:** `Cinza Quente` (`--surface`), transição suave de `border-color` no hover (sobe para um tom mais claro de Fuligem).
- **Shadow Strategy:** nenhuma — ver Elevation & Depth.
- **Border:** `1px solid Fuligem`.
- **Variante hero (`card-accent`/`card-gain`):** acrescenta um glow radial subtil (`accent-soft`/`gain-soft`) no canto superior direito, para o card "em destaque" de um ecrã (ex: treino em destaque no dashboard).
- **Internal Padding:** 20px por defeito; 14px/16px na tight; 28px na hero; 48–60px em estados vazios/resultado.

### Inputs / Fields
- **Style:** fundo `Cinza Levantado`, borda `1px solid Fuligem`, radius 9px, padding `10px 14px`.
- **Focus:** a borda muda de cor para `Brasa` — sem glow, sem ring, sem sombra.
- **Ícone/senha:** inputs com ícone usam wrapper com SVG absoluto à esquerda (`padding-left: 38px`); campos de password têm toggle de visibilidade absoluto à direita.

### Navigation
- Sidebar fixa de 240px, fundo `Cinza Quente`, borda direita `Fuligem`. Item de navegação ativo: fundo `accent-soft` + texto `Brasa` (preenchimento tintado, não sublinhado nem borda). O item de CTA de IA ("Gerar treino com IA") destaca-se visualmente como um mini-botão dentro da lista de navegação, não como um item de nav comum.
- Mobile (≤768px): sidebar vira drawer off-canvas (`translateX(-100%)` → `0`, 0.25s ease), com backdrop escuro e a única sombra própria de navegação (`2px 0 24px rgba(0,0,0,0.4)`).

### Números ao vivo (componente de assinatura)
Qualquer valor que muda em tempo real durante uma sessão de treino — cronómetro de descanso, stopwatch, contador de reps — usa sempre JetBrains Mono com `tabular-nums`, tipicamente em tamanho grande (32–64px conforme o contexto). O RepCounter da página de autenticação (número gigante com glow laranja, 4 dots de progresso pulsantes) é a expressão mais elaborada deste padrão e funciona como o elemento de venda visual do produto antes do login — respeitando `prefers-reduced-motion`.

### Camada "painel de sistema" (tech/IA)
Vocabulário reservado para cards que representam dado **genuinamente** computado a partir de dados reais do utilizador (hero do dashboard, recordes) — reforça a leitura "isto é um sistema a trabalhar", sem introduzir nenhuma cor fora de Brasa/Verde-Conquista.
- **Cantos HUD** (`HudCorners`, `components/ui/HudCorners.tsx`): 4 pequenas molduras em L nos cantos do card, cor `--accent` ou `--gain` conforme o card, `opacity: 0.55`. Reservado a cards de dado real "vivo" — não usar em cards estáticos (Foco muscular, lista de treinos) nem em cards cujo conteúdo seja regra local/estática (ver Regra da Honestidade do Painel, abaixo).
- **Grelha técnica** (`.tech-grid`): textura de grelha 24×24px feita só com `--border-soft`, aplicada ao fundo do card. Combina com `card-accent` via `.tech-grid.card-accent`, que empilha o glow radial por cima da grelha.
- **Selo "ao vivo"** (`.live-dot`): ponto de 6px, cor `--accent` (ou `--gain` dentro de `.card-gain`), com `.pulse` (opacity 1↔0.4, 2s) — junto a um eyebrow, sinaliza que o conteúdo ao lado foi computado agora a partir de dado real. Nunca usar num card cujo texto seja lógica local fixa.
- **Glow respirando** (`.glow-live`, `@keyframes glowPulse`): box-shadow `--accent` que cresce e recolhe em 3.2s — reservado ao hero (no máximo um `.glow-live` por ecrã). Atraso inicial (~800ms, via `animationDelay` inline) até a contagem animada assentar, pra não disparar junto com os contadores.
- **Contagem animada** (`useCountUp`, `hooks/useCountUp.ts`): números grandes (`stat-num`) contam de 0 até ao valor real ao montar (~700ms, ease-out, escalonados ~70ms entre si), e trocam para JetBrains Mono só enquanto a contagem está em curso — assim que assenta (`done: true`), volta a Space Grotesk, o mesmo que as mesmas métricas usam em `progresso/page.tsx`. Salta direto para o valor final com `prefers-reduced-motion` **ou** se já animou nesta sessão de navegador (`sessionStorage`, chave `fitai:dashboard-intro-seen`) — a 2ª visita não repete o "boot".
- **Pulso no ponto mais recente** (`Sparkline` com `pulse`, `components/ui/Charts.tsx`): halo `.pulse` + ponto sólido no último valor do gráfico, com `pulseDelayMs` opcional pra escalonar — a mesma ideia do dot atual do RepCounter, aplicada a dados de progresso.

### Named Rules
**A Regra do Painel Único.** `HudCorners` e `.glow-live` ficam reservados a cards de dado vivo/gerado (hero, recordes) — no máximo um `.glow-live` por ecrã. Aplicar a todos os cards devolve o ruído visual que a Regra da Brasa Única existe para evitar.

**A Regra da Honestidade do Painel.** O vocabulário de painel de sistema (cantos HUD, grelha, selo "ao vivo") só pode vestir um card cujo conteúdo seja genuinamente computado a partir de dado real do utilizador. O card "Sugestão da IA" no dashboard não gera texto via IA — é uma regra local sobre `workouts.length` — por isso não leva nenhum destes elementos, mesmo mencionando "IA" no nome. Vestir lógica estática de "dado ao vivo" fabrica um sinal que o produto não tem, contra o princípio "track truth, not vibes" do PRODUCT.md.

## Do's and Don'ts

### Do:
- **Do** usar sempre JetBrains Mono + `tabular-nums` para qualquer número que mude ao vivo (timer, reps, peso).
- **Do** manter cards, botões, chips e inputs *neutros* sem sombra em repouso — profundidade vem de degrau de cor + borda; a única sombra permitida em repouso é a colorida da Brasa (`card-accent`, `.btn-primary`).
- **Do** reservar Verde-Conquista exclusivamente para sinalizar sucesso/conquista (PR, streak, set concluído).
- **Do** usar `scale(0.97)` (ou equivalente tátil por movimento) como feedback de "active" em vez de mudança de sombra.
- **Do** seguir a escala de radius por tipo de superfície: `--radius-sm` tiles/botões, `--radius` cards, `--radius-lg` modais.
- **Do** usar `HudCorners`/`.tech-grid`/`.live-dot` só em cards de dado vivo ou gerado — não decorar cards estáticos com o vocabulário "painel de sistema".

### Don't:
- **Don't** introduzir uma segunda cor de "destaque" ao lado da Brasa — se algo precisa de chamar a atenção, é Brasa com outra opacidade, não uma nova cor.
- **Don't** aplicar o vocabulário de painel de sistema a um card cujo conteúdo seja regra local/estática — se não é dado real computado agora, não leva cantos HUD, grelha nem selo "ao vivo" (ver Regra da Honestidade do Painel).
- **Don't** usar Verde-Conquista como cor de marca, decorativa, ou de estado neutro.
- **Don't** adicionar `box-shadow` a um card, botão, chip ou input em repouso — reservar sombra só a modais e overlays (drawer mobile).
- **Don't** reintroduzir o verde neon `rgba(0,255,136,...)` — usar sempre `--accent`/`--accent-soft` (elementos comuns) ou `--gain`/`--gain-soft` (momentos de conquista genuínos).
