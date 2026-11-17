# desafio_teste_campo_minado

Casos de teste em **JavaScript** para um **Campo Minado de tabuleiro 18 x 14 com 40 bombas**, implementado também em JavaScript.

## Colaborador

| Nome | RA |
| --- | --- |
| João Paulo Candido da Costa | 24000797-2 |

## Especificação do desafio

Enunciado (Laura): *"casos de teste para testar campo minado de tabuleiro 18 x 14 com 40 bombas; casos de teste em Javascript para testar Javascript"*.

Regras adotadas na implementação (`src/index.js`):

- Tabuleiro de **18 linhas x 14 colunas** (252 casas), com **40 bombas** e **212 casas seguras**. Coordenadas `(linha, coluna)` começam em 0.
- As bombas são sorteadas sem repetição (Fisher-Yates). Para os testes serem reproduzíveis, o construtor aceita as posições fixas em `minas` ou um gerador `aleatorio`.
- Cada casa segura mostra quantas bombas existem nas **8 casas vizinhas** (menos nas bordas e cantos).
- Revelar uma casa com **0 vizinhas** abre a região vazia automaticamente, incluindo a borda numérica, sem abrir bombas nem casas com bandeira.
- Revelar uma **bomba** encerra a partida em **derrota**. A primeira jogada não tem proteção especial, porque o enunciado não define isso.
- Revelar **todas as 212 casas seguras** dá a **vitória**. Não é preciso marcar as bombas.
- **Bandeiras**: ligam e desligam numa casa fechada, até o limite de 40. Uma casa com bandeira não pode ser revelada. Não é possível marcar casa aberta.
- Depois da vitória ou derrota, qualquer jogada lança `Error`. Coordenadas fora do tabuleiro lançam `RangeError`.
- `consultar(l, c)` mostra só o que o jogador pode ver: o conteúdo das casas fechadas fica oculto (`null`) até o fim da partida.

### API

```js
const { CampoMinado, STATUS } = require('./src/index.js');
const jogo = new CampoMinado();          // ou new CampoMinado({ minas: [[l, c], ...] })
jogo.revelar(0, 0);                      // retorna quantas casas abriu
jogo.alternarBandeira(5, 5);             // retorna true/false
jogo.consultar(5, 5);                    // { aberta, bandeira, vizinhas, bomba }
jogo.status;                             // 'jogando' | 'vitoria' | 'derrota'
```

## Casos de teste

Os testes ficam em `tests/campo_minado.test.js` e usam apenas os módulos nativos `node:test` e `node:assert/strict`, sem dependências externas.

Quase todos usam um **tabuleiro fixo**: linhas 15 e 16 cheias de bombas, mais a linha 17 nas colunas 0 a 11, totalizando 40. Assim o resultado de cada jogada é conhecido de antemão. As linhas 0 a 14 formam uma região vazia conectada, e as casas (17,12) e (17,13) ficam isoladas atrás das bombas.

| ID | O que é verificado |
| --- | --- |
| CM01 | Tabuleiro 18 x 14 com 40 bombas, 212 casas seguras e status inicial `jogando`. O sorteio sempre gera 40 bombas, e o mesmo gerador produz o mesmo tabuleiro. |
| CM02 | Quantidade errada, bomba repetida, bomba fora do tabuleiro e dimensões impossíveis lançam erro. |
| CM03 | Contagem de vizinhas nas 8 direções, em bordas e cantos. Uma bomba no centro gera 1 em todas as vizinhas. |
| CM04 | Revelar uma casa numerada abre só ela. Revelar de novo não muda nada. |
| CM05 | Revelar um zero abre as 210 casas da região sem abrir bombas nem a área isolada. |
| CM06 | Bandeira liga e desliga, impede revelar, é respeitada pela expansão, tem limite de 40 e não vai em casa aberta. |
| CM07 | Revelar bomba causa derrota e bloqueia novas jogadas. A primeira jogada pode ser bomba. |
| CM08 | Revelar as 212 casas seguras dá vitória, mesmo sem nenhuma bandeira. |
| CM09 | Coordenadas inválidas lançam `RangeError`. Bombas ficam ocultas até o fim da partida. |

## Como executar

Requisito: **Node.js 20 ou superior**. Não há dependências, então não é preciso rodar `npm install`.

```bash
npm test            # executa os testes
npm run coverage    # executa com relatório de cobertura
```

Resultado: **20 testes, 20 aprovados.**
