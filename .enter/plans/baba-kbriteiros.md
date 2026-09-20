# BABA DOS KBRITEIROS — Plano de Implementação

## Contexto

Criar uma aplicação web completa, responsiva e funcional para sorteio de times de futebol ("baba"), em português do Brasil, com 5 telas (Cadastro, Elenco do Dia, Times, Configurações, Histórico). O projeto atual é o template Vite + React 19 + TypeScript + Tailwind + shadcn/ui, com apenas as páginas Index/NotFound.

Decisões:
- **Sem backend agora**: os dados persistem no `localStorage` via camada de serviços (repository), estruturada para futura migração ao Enter Cloud (Supabase) sem alterar a UI.
- **Idioma fixo pt-BR**: strings hardcoded em português; não usar i18n (não é app multilíngue).
- **Rota "/"** redireciona para `/times` (exibe o sorteio inicial exato, seção 11).
- **Algoritmo de sorteio real** isolado da UI em `src/algorithm/`, com pontuação de repetição baseada nos últimos `historyWindow` babas salvos.

## Arquitetura de arquivos

```
public/logo-kbriteiros.png          ← placeholder do logo (brasão circular com "K")
src/types/index.ts                  ← Player, Position, Settings, Draw, DrawTeam, DrawPlayer, CurrentDraw
src/data/initialData.ts             ← 46 jogadores iniciais, settings iniciais, sorteio inicial exato
src/lib/normalize.ts                ← normalizeName (trim/caixa), normalizePosition (aceita acentos), POSITION_ORDER, sortPlayers
src/lib/format.ts                   ← formatDateBR (dd/mm/aaaa), formatStars ("4 ★"), formatEsquema
src/lib/teamColors.ts               ← TEAM_COLORS (4 times: forte/médio/claro/texto)
src/services/storage.ts             ← wrapper localStorage (get/set JSON, keys namespaced, seed no primeiro acesso)
src/services/playerService.ts       ← CRUD players + validations + sort + reset
src/services/settingsService.ts     ← CRUD settings + defaults
src/services/drawService.ts         ← currentDraw + histórico (babaNumber sequencial, salvar/excluir baba)
src/algorithm/repetitionScore.ts    ← buildPairWeights + computeRepetitionScore
src/algorithm/drawAlgorithm.ts      ← performDraw (sorteio real + validações + diagnósticos)
src/context/AppContext.tsx          ← provider global (players, settings, currentDraw, history + ações) com persistência
src/components/logo.tsx             ← Logo com fallback "K" (onError)
src/components/layout.tsx           ← header verde + nav (tabs desktop / bottom bar mobile) + <Outlet/>
src/components/team-card.tsx        ← card de time (logo, cores, jogadores ordenados, total, esquema)
src/components/validation-panel.tsx ← painel VALIDAÇÃO (OK verde)
src/components/player-dialog.tsx    ← modal adicionar/editar jogador
src/components/confirm-dialog.tsx   ← AlertDialog reutilizável p/ ações destrutivas
src/pages/Cadastro.tsx, ElencoDoDia.tsx, Times.tsx, Configuracoes.tsx, Historico.tsx
src/router.tsx                      ← 5 rotas + redirect "/" → "/times" (Index substituído)
src/index.css                       ← tokens de design (verdes/bordas/background)
tailwind.config.ts                  ← cores team-1..4 + success
```

## Modelos de dados (types/index.ts)

```ts
type Position = "Atacante" | "Meia" | "Zagueiro" | "Goleiro";
interface Player { id: string; name: string; position: Position; stars: number; confirmed: boolean; }
interface Settings { numberOfTeams: 3|4; playersPerTeam: number; historyWindow: number; maxStarDifference: number; maxPositionDifference: number; maxAttempts: number; }
interface DrawPlayer { playerId: string; playerName: string; position: Position; stars: number; }
interface DrawTeam { teamNumber: number; players: DrawPlayer[]; }
interface Draw { id: string; babaNumber: number; date: string; /* dd/mm/aaaa */ historyWindow: number; teams: DrawTeam[]; repetitionScore: number; attempts: number; createdAt: string; }
interface CurrentDraw { id: string; babaNumber: number | null; date: string | null; teams: DrawTeam[]; repetitionScore: number; attempts: number; }
```

## Algoritmo de sorteio (algorithm/drawAlgorithm.ts)

Pré-validação (mensagens da seção 13):
1. `numberOfTeams` fora de {3,4} → "A quantidade de times deve ser 3 ou 4."
2. `confirmed.length !== numberOfTeams * playersPerTeam` → "Para X times são necessários Y confirmados. A lista possui Z."
3. goleiros confirmados > times → "Há mais goleiros confirmados do que times."

Distribuição por tentativa (até `maxAttempts`):
1. Goleiros distribuídos primeiro, um por time (ordem dos times sorteada).
2. Jogadores de linha: embaralhar e ordenar por estrelas desc.
3. Para cada jogador, times elegíveis = tamanho < playersPerTeam, contagem da posição < `ceil(totalPosição/times)`, soma de estrelas ≤ `ceil(totalEstrelas/times)`.
4. Escolher aleatoriamente um time de menor soma de estrelas entre os elegíveis.

Validação do resultado: 7 jogadores/time, ≤1 goleiro/time, `max soma − min soma ≤ maxStarDifference`, por posição `max − min ≤ maxPositionDifference`.

Loop: roda até `maxAttempts`; analisa no máx. 300 resultados válidos; guarda o de menor `repetitionScore`; encerra imediatamente se score = 0. Retorna `{ teams, repetitionScore, attempts, valid, diagnostico }` (diagnóstico com Times/Jogadores/Goleiros/Zagueiros/Meias/Atacantes/Total de estrelas/Intervalo desejado/Tentativas quando não encontra solução).

## Pontuação de repetição (algorithm/repetitionScore.ts)

- Só os últimos `historyWindow` babas salvos.
- Chave de dupla = nomes minúsculos ordenados + separador (ordem-independente).
- Peso de cada dupla = nº de babas em que apareceu junta.
- Score do sorteio = soma dos pesos das duplas de cada time.

## Dados iniciais (data/initialData.ts)

- 46 jogadores exatamente como informado (mantendo Ramilton no cadastro, confirmado).
- Settings: `{ numberOfTeams: 4, playersPerTeam: 7, historyWindow: 1, maxStarDifference: 1, maxPositionDifference: 1, maxAttempts: 500 }`.
- Sorteio atual inicial exato (Time 1..4 conforme seção 11: totais 21/20/21/20, esquemas 2-3-1×3 e 2-2-2, score 0, tentativas 5), `babaNumber: null`.
- Contagens esperadas validadas em tempo de implementação: 28 confirmados, 4 GKs, 8 ZAG, 11 MEI, 5 ATA, 82 estrelas, PRONTO.

## Telas

**Layout** — header `#243F35`, título "BABA DOS KBRITEIROS" centralizado e negrito, logo (imagem com fallback "K"). Nav desktop em tabs abaixo do header; mobile: bottom bar fixa com 5 itens (ícones lucide: Users, ClipboardList, Shuffle, Settings, History).

**Cadastro** — tabela Nome/Posição/Estrelas ("4 ★")/Confirmado (switch)/Ações (editar, excluir com confirmação); busca por nome, filtros por posição e confirmação; botão "ATUALIZAR LISTA" (valida duplicados case-insensitive → "Nome duplicado no Cadastro: NOME.", posição → "Posição inválida para NOME.", estrelas 1–5, ordena, persiste, toast "Lista atualizada e ordenada com sucesso." e situação "X confirmados. Elenco pronto para o sorteio." ou "X confirmados para uma meta de Y."); modal add/edit (Nome, Posição, Estrelas, Confirmado); resumo lateral (Confirmados, Meta atual = times×perTime, Faltam, Goleiros/Zagueiros/Meias/Atacantes + confirmados por estrelas 1–5).

**Elenco do Dia** — tabela só de confirmados (Nome/Posição/Estrelas) ordenada por posição+alfabética; resumo Total/Goleiros/Zagueiros/Meias/Atacantes/Total de estrelas/Situação ("PRONTO" | "FALTAM X" | "EXCEDENTE X").

**Times** — botão destacado "SORTEAR TIMES" (antes: atualiza elenco confirmado automaticamente, roda pré-validações); 4 cards lado a lado (desktop) / empilhados (mobile) com Logo, Time N nas cores da seção 1, jogadores ordenados A→M→Z→G e maior estrela primeiro, total de estrelas, esquema "zag-meia-ata"; painel VALIDAÇÃO (Times, 7 jogadores/time, Goleiros distribuídos, Diferença de estrelas ≤ 1, Diferença por posição ≤ 1, Pontos de repetição, Tentativas — aprovados com "OK" verde); botão "SALVAR BABA" → modal "Salvar este sorteio como o baba definitivo?" → grava no histórico (babaNumber sequencial, data dd/mm/aaaa, snapshot de nome/posição/estrelas) → toast "Baba X salvo no Histórico."; diagnóstico completo quando não há solução.

**Configurações** — form com os 6 campos (times 3/4 via select; demais numéricos, maxAttempts ≥ 500); regras e observação "Modo rápido: testa combinações válidas e escolhe a de menor repetição entre elas."; botão "Restaurar dados iniciais" com confirmação (zera players/settings/histórico/sorteio atual).

**Histórico** — totais (babas salvos, data do último, janela usada = historyWindow registrado em cada baba), filtro por data e número, lista com abertura (expansível/modal) mostrando times completos, excluir com confirmação; inicia vazio.

## Design system

`index.css` (apenas tema claro): `--primary: 158 17% 19%` (#243F35), `--primary-foreground: 0 0% 100%`, `--background: 150 7% 97%` (#F7F8F7), `--foreground: 158 12% 18%` (#243A32), `--success: 147 56% 24%` (#176238), `--success-light: 143 52% 89%` (#D7EDDF), `--border: 145 9% 85%` (#D4DDD8), `--card: 0 0% 100%`, fonte `'Aptos','Inter',system-ui,sans-serif`.

`tailwind.config.ts`: cores `success`, `successLight` e `team1..team4` com `{strong, medium, light, text}` (hexes da seção 1). Cards de time usam esses tokens; ícones e validação com lucide-react; toasts via sonner; confirmações via AlertDialog.

## Implementação checklist

- [ ] Criar `src/types/index.ts` com Player, Position, Settings, DrawTeam, DrawPlayer, Draw, CurrentDraw.
- [ ] Criar `src/lib/normalize.ts` (normalizeName/normalizePosition/ordem de posições/sortPlayers) e `src/lib/format.ts` (formatDateBR, formatStars, formatEsquema).
- [ ] Criar `src/lib/teamColors.ts` com os 4 esquemas de cores.
- [ ] Criar `public/logo-kbriteiros.png` (placeholder) e `src/components/logo.tsx` com fallback para brasão circular "K" via onError.
- [ ] Criar `src/services/storage.ts` (get/set JSON + seed do primeiro acesso) e os 3 services (players/settings/draw) com interface estável p/ futura troca por Enter Cloud.
- [ ] Criar `src/data/initialData.ts`: 46 jogadores (Ramilton incluso), settings iniciais, sorteio inicial exato (Time 1–4, totais 21/20/21/20, esquemas 2-3-1/2-3-1/2-3-1/2-2-2, score 0, tentativas 5).
- [ ] Criar `src/algorithm/repetitionScore.ts` e `src/algorithm/drawAlgorithm.ts` conforme seção 8/9 (pré-validações, distribuição real, validação, loop até 500 tentativas/300 válidos, parada em score 0).
- [ ] Criar `src/context/AppContext.tsx` com estado global persistido e ações (addPlayer, updatePlayer, deletePlayer, toggleConfirmed, updateList, saveSettings, draw, saveBaba, deleteBaba, resetAll).
- [ ] Criar `src/components/confirm-dialog.tsx`, `player-dialog.tsx`, `team-card.tsx`, `validation-panel.tsx`.
- [ ] Criar `src/components/layout.tsx` (header + nav desktop/mobile) e atualizar `src/router.tsx` (5 rotas + redirect "/"→"/times").
- [ ] Implementar `src/pages/Cadastro.tsx` (tabela, busca, filtros, modal, ATUALIZAR LISTA, resumo lateral com contagem por estrelas).
- [ ] Implementar `src/pages/ElencoDoDia.tsx` (confirmados + resumo + situação PRONTO/FALTAM/EXCEDENTE).
- [ ] Implementar `src/pages/Times.tsx` (SORTEAR TIMES, cards, VALIDAÇÃO com OK verde, SALVAR BABA com modal, diagnóstico de falha).
- [ ] Implementar `src/pages/Configuracoes.tsx` (form, regras/observação, restaurar dados iniciais com confirmação).
- [ ] Implementar `src/pages/Historico.tsx` (totais, filtros data/número, expandir baba, excluir com confirmação).
- [ ] Atualizar `src/index.css` e `tailwind.config.ts` com os tokens de design e cores dos times.
- [ ] Remover dependência de `useTranslation`/i18n das telas novas (conteúdo pt-BR hardcoded).

## Verification checklist

- [ ] `pnpm lint` e `pnpm exec tsc --noEmit` sem erros; `pnpm run build` (NODE_ENV=development) sem erros.
- [ ] Primeira carga mostra o sorteio inicial exato em `/times` (Time 1–4, totais 21/20/21/20, esquemas 2-3-1/2-3-1/2-3-1/2-2-2, pontos 0, tentativas 5) e reproduz 28 confirmados / 4 GKs / 8 ZAG / 11 MEI / 5 ATA / 82 estrelas / PRONTO no Elenco do Dia.
- [ ] Cadastro: adicionar/editar/excluir (com confirmação), alternar confirmação, busca e filtros funcionam; nomes duplicados ignorando maiúsc./minúsc. são bloqueados; posição com/sem acento é normalizada.
- [ ] ATUALIZAR LISTA ordena (A→M→Z→G, alfabético) e emite toasts de sucesso/aviso conforme seção 13.
- [ ] SORTEAR TIMES: com 28 confirmados gera 4 times válidos (7 jogadores, ≤1 GK/time, diff estrelas ≤1, diff posição ≤1) e painel de validação com OK verde.
- [ ] SALVAR BABA: modal de confirmação, mensagem "Baba X salvo no Histórico.", babaNumber sequencial a partir de 1, data dd/mm/aaaa.
- [ ] Repetição: salvar 2+ babas com historyWindow=1 e re-sortear considera apenas o último baba no score.
- [ ] Casos de erro: número de confirmados ≠ meta, mais goleiros que times, times ≠ 3/4 → mensagens exatas da seção 13 e diagnóstico quando não houver solução.
- [ ] Histórico: filtro por data/número, abertura de baba com times completos, exclusão com confirmação; inicia vazio.
- [ ] Configurações: maxAttempts não fica < 500; "Restaurar dados iniciais" reseta tudo após confirmação.
- [ ] Persistência: recarregar a página mantém cadastro, settings, sorteio atual e histórico (localStorage).
- [ ] Responsivo: capturas com `website_screenshot` em mobile_390 e desktop_1280 em `/times`, `/cadastro` e `/historico` (nav inferior no mobile, tabs no desktop).
