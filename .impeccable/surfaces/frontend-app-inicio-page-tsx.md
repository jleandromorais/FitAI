---
version: 1
slug: "frontend-app-inicio-page-tsx"
primary_target: "frontend/app/inicio/page.tsx"
related_targets: []
---

# Surface brief — /inicio (landing page pública)

## Scope & modo
Rota pública nova, fora do app autenticado. Modo **Persuade**: visitante decide se cria conta.

## Audiência, tarefa, prova, restrições
- Audiência: alguém que já treina na academia, cansado de apps que só registram o que ele já decidiu fazer.
- Tarefa: entender em segundos que o FitAI *propõe* o plano via IA (não é só um logger), e criar conta.
- Prova disponível: nenhuma prova social real (portfólio, sem usuários) — proibido fabricar depoimentos/números/clientes (ver PRODUCT.md, "Evidence on Hand"). A prova aqui é o próprio mecanismo demonstrado (card de demo do fluxo de `/ai-gen`, reuso real do `RepCounter`, gráfico de exemplo rotulado como ilustrativo) — nunca estatística inventada.
- Restrição de nome/idioma: "FitAI", copy em pt-BR (mesmos compromissos de marca do resto do produto).

## Direção escolhida
Estrutura clássica (hero → destaques → CTA final), escolhida via `concept-seed.mjs --scope surface --mode persuade` (seed 75c4bc0a, candidato 7/7) — sistema visual Combustão herdado sem alteração, nenhum token novo. Momento memorável: o card de demonstração do fluxo de geração por IA no hero, com etiqueta explícita de "demonstração" — é a prova do diferencial do produto, não uma ilustração genérica.

## Decisões não-óbvias pra manter
- **Nunca adicionar prova social fabricada** a esta página (número de usuários, depoimentos, logos de clientes) — ver PRODUCT.md.
- Qualquer dado de exemplo (ex: gráfico de volume) precisa continuar rotulado como "exemplo ilustrativo", nunca implícito como dado real.
- CTA principal sempre aponta pra `/login?tab=criar` (fluxo de cadastro real, não uma lista de espera).
- Eyebrow/kicker acima de heading é banido pelo craft-floor do próprio skill — não reintroduzir nas seções (`.landing-split-title` já assume esse peso sozinho).

## Em aberto
- Nenhuma imagem/asset gerado por IA foi usado (sem ferramenta de geração de imagem disponível nesta sessão) — toda a "imagem" do hero é o card de demo em HTML/CSS real, não uma ilustração.
- Página ainda não tem tradução EN (o resto do app tem seletor de idioma; esta rota pública ficou só em pt-BR por ora).
