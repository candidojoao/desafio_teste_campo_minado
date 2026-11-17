'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { CampoMinado, STATUS } = require('../src/index.js');

/**
 * Tabuleiro fixo usado na maioria dos testes (18 linhas x 14 colunas):
 * - linhas 15 e 16 inteiras com bombas (28)
 * - linha 17, colunas 0 a 11 com bombas (12)  -> total 40
 * Assim, as linhas 0..14 formam uma única região segura conectada e
 * as casas (17,12) e (17,13) ficam isoladas atrás das bombas.
 */
function minasPadrao() {
  const minas = [];
  for (let c = 0; c < 14; c++) minas.push([15, c], [16, c]);
  for (let c = 0; c < 12; c++) minas.push([17, c]);
  return minas;
}

const novoJogo = () => new CampoMinado({ minas: minasPadrao() });

function contarBombas(jogo) {
  return jogo.casas.flat().filter((casa) => casa.bomba).length;
}

describe('CM01 - criação do tabuleiro', () => {
  test('tabuleiro padrão tem 18 x 14, 40 bombas e 212 casas seguras', () => {
    const jogo = new CampoMinado({ minas: minasPadrao() });
    assert.equal(jogo.linhas, 18);
    assert.equal(jogo.colunas, 14);
    assert.equal(jogo.casas.length, 18);
    assert.ok(jogo.casas.every((linha) => linha.length === 14));
    assert.equal(contarBombas(jogo), 40);
    assert.equal(jogo.casasSeguras, 212);
    assert.equal(jogo.status, STATUS.JOGANDO);
    assert.equal(jogo.bandeirasRestantes, 40);
  });

  test('sorteio sempre gera 40 bombas distintas dentro do tabuleiro', () => {
    for (let i = 0; i < 25; i++) {
      const jogo = new CampoMinado();
      assert.equal(contarBombas(jogo), 40);
    }
  });

  test('o mesmo gerador produz o mesmo tabuleiro (sorteio reprodutível)', () => {
    const gerador = () => {
      let semente = 42;
      return () => {
        semente = (semente * 1103515245 + 12345) % 2 ** 31;
        return semente / 2 ** 31;
      };
    };
    const a = new CampoMinado({ aleatorio: gerador() });
    const b = new CampoMinado({ aleatorio: gerador() });
    const mapa = (jogo) => jogo.casas.flat().map((casa) => (casa.bomba ? 1 : 0)).join('');
    assert.equal(mapa(a), mapa(b));
  });
});

describe('CM02 - posições de bombas inválidas', () => {
  test('quantidade diferente de 40 é recusada', () => {
    assert.throws(() => new CampoMinado({ minas: minasPadrao().slice(1) }), RangeError);
  });

  test('bomba repetida é recusada', () => {
    const minas = minasPadrao();
    minas[39] = [0, 0];
    minas[38] = [0, 0];
    assert.throws(() => new CampoMinado({ minas }), /repetida/);
  });

  test('bomba fora do tabuleiro é recusada', () => {
    const minas = minasPadrao();
    minas[0] = [18, 0];
    assert.throws(() => new CampoMinado({ minas }), RangeError);
    minas[0] = [0, 14];
    assert.throws(() => new CampoMinado({ minas }), RangeError);
  });

  test('dimensões ou quantidade de bombas impossíveis são recusadas', () => {
    assert.throws(() => new CampoMinado({ linhas: 0 }), RangeError);
    assert.throws(() => new CampoMinado({ linhas: 2, colunas: 2, bombas: 4 }), RangeError);
  });
});

describe('CM03 - contagem de vizinhas', () => {
  test('conta bombas nas oito direções, respeitando bordas e cantos', () => {
    const jogo = novoJogo();
    const viz = (l, c) => jogo.casas[l][c].vizinhas;
    assert.equal(viz(0, 0), 0); // canto superior longe das bombas
    assert.equal(viz(14, 0), 2); // borda esquerda: (15,0) e (15,1)
    assert.equal(viz(14, 5), 3); // meio: (15,4), (15,5), (15,6)
    assert.equal(viz(17, 13), 2); // canto inferior direito: (16,12), (16,13)
    assert.equal(viz(17, 12), 4); // (16,11), (16,12), (16,13), (17,11)
  });

  test('bomba no centro gera 1 em todas as oito vizinhas', () => {
    const minas = minasPadrao();
    minas[0] = [7, 7]; // troca a bomba (15,0) por uma no centro
    const jogo = new CampoMinado({ minas });
    for (const [l, c] of [[6, 6], [6, 7], [6, 8], [7, 6], [7, 8], [8, 6], [8, 7], [8, 8]]) {
      assert.equal(jogo.casas[l][c].vizinhas, 1, `casa (${l}, ${c})`);
    }
  });
});

describe('CM04 - revelar casa numerada', () => {
  test('abre somente a casa escolhida', () => {
    const jogo = novoJogo();
    assert.equal(jogo.revelar(14, 5), 1);
    assert.deepEqual(jogo.consultar(14, 5), { aberta: true, bandeira: false, vizinhas: 3, bomba: false });
    assert.equal(jogo.consultar(14, 6).aberta, false);
    assert.equal(jogo.status, STATUS.JOGANDO);
  });

  test('revelar casa já aberta não altera nada', () => {
    const jogo = novoJogo();
    jogo.revelar(14, 5);
    assert.equal(jogo.revelar(14, 5), 0);
    assert.equal(jogo.abertas, 1);
  });
});

describe('CM05 - expansão de casas vazias', () => {
  test('revelar um zero abre a região segura e a borda numérica, sem abrir bombas', () => {
    const jogo = novoJogo();
    assert.equal(jogo.revelar(0, 0), 15 * 14); // linhas 0..14 inteiras
    assert.equal(jogo.consultar(14, 0).aberta, true);
    assert.equal(jogo.consultar(15, 0).aberta, false);
    assert.equal(jogo.consultar(17, 12).aberta, false); // isolada atrás das bombas
    assert.ok(jogo.casas.flat().every((casa) => !(casa.bomba && casa.aberta)));
  });
});

describe('CM06 - bandeiras', () => {
  test('bandeira alterna e impede a revelação da casa', () => {
    const jogo = novoJogo();
    assert.equal(jogo.alternarBandeira(3, 3), true);
    assert.equal(jogo.bandeirasRestantes, 39);
    assert.equal(jogo.revelar(3, 3), 0);
    assert.equal(jogo.consultar(3, 3).aberta, false);
    assert.equal(jogo.alternarBandeira(3, 3), false);
    assert.equal(jogo.bandeirasRestantes, 40);
  });

  test('a expansão não abre casas com bandeira', () => {
    const jogo = novoJogo();
    jogo.alternarBandeira(5, 5);
    assert.equal(jogo.revelar(0, 0), 15 * 14 - 1);
    assert.equal(jogo.consultar(5, 5).aberta, false);
    assert.equal(jogo.consultar(5, 5).bandeira, true);
  });

  test('não é possível marcar casa aberta nem passar de 40 bandeiras', () => {
    const jogo = novoJogo();
    jogo.revelar(14, 5);
    assert.throws(() => jogo.alternarBandeira(14, 5), /casa aberta/);

    let marcadas = 0;
    for (let l = 0; l < 3 && marcadas < 40; l++) {
      for (let c = 0; c < 14 && marcadas < 40; c++, marcadas++) jogo.alternarBandeira(l, c);
    }
    assert.equal(jogo.bandeirasRestantes, 0);
    assert.throws(() => jogo.alternarBandeira(10, 10), /limite/);
  });
});

describe('CM07 - derrota', () => {
  test('revelar bomba encerra em derrota e bloqueia novas ações', () => {
    const jogo = novoJogo();
    jogo.revelar(15, 3);
    assert.equal(jogo.status, STATUS.DERROTA);
    assert.throws(() => jogo.revelar(0, 0), /terminou/);
    assert.throws(() => jogo.alternarBandeira(0, 0), /terminou/);
    assert.equal(jogo.abertas, 0);
  });

  test('a primeira jogada não tem proteção: pode cair em bomba', () => {
    const jogo = novoJogo();
    jogo.revelar(17, 0);
    assert.equal(jogo.status, STATUS.DERROTA);
  });
});

describe('CM08 - vitória', () => {
  test('revelar todas as 212 casas seguras vence, mesmo sem bandeiras', () => {
    const jogo = novoJogo();
    jogo.revelar(0, 0);
    jogo.revelar(17, 12);
    assert.equal(jogo.status, STATUS.JOGANDO);
    jogo.revelar(17, 13);
    assert.equal(jogo.abertas, 212);
    assert.equal(jogo.status, STATUS.VITORIA);
    assert.throws(() => jogo.revelar(15, 0), /terminou/);
  });
});

describe('CM09 - coordenadas inválidas e visão do jogador', () => {
  test('jogadas e consultas fora do tabuleiro lançam RangeError', () => {
    const jogo = novoJogo();
    assert.throws(() => jogo.revelar(-1, 0), RangeError);
    assert.throws(() => jogo.revelar(18, 0), RangeError);
    assert.throws(() => jogo.alternarBandeira(0, 14), RangeError);
    assert.throws(() => jogo.consultar(1.5, 0), RangeError);
  });

  test('bombas ficam ocultas até o fim da partida', () => {
    const jogo = novoJogo();
    assert.deepEqual(jogo.consultar(15, 0), { aberta: false, bandeira: false, vizinhas: null, bomba: null });
    jogo.revelar(15, 0);
    assert.equal(jogo.consultar(16, 0).bomba, true);
    assert.equal(jogo.consultar(0, 0).bomba, false);
  });
});
