'use strict';

/**
 * Campo minado 18 x 14 com 40 bombas.
 * Autor: João Paulo Candido da Costa (RA 24000797-2)
 */

const STATUS = Object.freeze({
  JOGANDO: 'jogando',
  VITORIA: 'vitoria',
  DERROTA: 'derrota',
});

const DIRECOES = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1],
];

class CampoMinado {
  /**
   * @param {object} [opcoes]
   * @param {number} [opcoes.linhas=18]
   * @param {number} [opcoes.colunas=14]
   * @param {number} [opcoes.bombas=40]
   * @param {Array<[number, number]>} [opcoes.minas] posições fixas das bombas (para testes)
   * @param {() => number} [opcoes.aleatorio] gerador em [0, 1) usado no sorteio
   */
  constructor({ linhas = 18, colunas = 14, bombas = 40, minas, aleatorio = Math.random } = {}) {
    if (!Number.isInteger(linhas) || !Number.isInteger(colunas) || linhas < 1 || colunas < 1) {
      throw new RangeError('dimensões do tabuleiro inválidas');
    }
    if (!Number.isInteger(bombas) || bombas < 1 || bombas >= linhas * colunas) {
      throw new RangeError('quantidade de bombas inválida');
    }

    this.linhas = linhas;
    this.colunas = colunas;
    this.totalBombas = bombas;
    this.status = STATUS.JOGANDO;
    this.abertas = 0;
    this.bandeiras = 0;
    this.casas = Array.from({ length: linhas }, () =>
      Array.from({ length: colunas }, () => ({ bomba: false, aberta: false, bandeira: false, vizinhas: 0 })),
    );

    const posicoes = minas === undefined ? this.#sortear(aleatorio) : minas;
    if (!Array.isArray(posicoes) || posicoes.length !== bombas) {
      throw new RangeError(`são necessárias exatamente ${bombas} posições de bomba`);
    }
    for (const posicao of posicoes) {
      if (!Array.isArray(posicao) || posicao.length !== 2) {
        throw new RangeError('posição de bomba deve ser [linha, coluna]');
      }
      const [l, c] = posicao;
      this.#validarCoordenada(l, c);
      if (this.casas[l][c].bomba) throw new RangeError(`bomba repetida em (${l}, ${c})`);
      this.casas[l][c].bomba = true;
    }

    for (let l = 0; l < linhas; l++) {
      for (let c = 0; c < colunas; c++) {
        let total = 0;
        for (const [vl, vc] of this.#vizinhos(l, c)) if (this.casas[vl][vc].bomba) total++;
        this.casas[l][c].vizinhas = total;
      }
    }
  }

  get casasSeguras() {
    return this.linhas * this.colunas - this.totalBombas;
  }

  get bandeirasRestantes() {
    return this.totalBombas - this.bandeiras;
  }

  /** Revela uma casa. Retorna quantas casas foram abertas nesta jogada. */
  revelar(linha, coluna) {
    this.#validarCoordenada(linha, coluna);
    this.#exigirPartidaEmAndamento();

    const casa = this.casas[linha][coluna];
    if (casa.aberta || casa.bandeira) return 0;

    if (casa.bomba) {
      casa.aberta = true;
      this.status = STATUS.DERROTA;
      return 0;
    }

    // Busca iterativa: casas com 0 vizinhas expandem para os vizinhos.
    let abertasAgora = 0;
    const pilha = [[linha, coluna]];
    while (pilha.length > 0) {
      const [l, c] = pilha.pop();
      const atual = this.casas[l][c];
      if (atual.aberta || atual.bandeira || atual.bomba) continue;
      atual.aberta = true;
      abertasAgora++;
      if (atual.vizinhas === 0) pilha.push(...this.#vizinhos(l, c));
    }

    this.abertas += abertasAgora;
    if (this.abertas === this.casasSeguras) this.status = STATUS.VITORIA;
    return abertasAgora;
  }

  /** Coloca ou retira a bandeira. Retorna o novo estado da bandeira. */
  alternarBandeira(linha, coluna) {
    this.#validarCoordenada(linha, coluna);
    this.#exigirPartidaEmAndamento();

    const casa = this.casas[linha][coluna];
    if (casa.aberta) throw new Error('não é possível marcar uma casa aberta');
    if (!casa.bandeira && this.bandeiras === this.totalBombas) {
      throw new Error('limite de bandeiras atingido');
    }
    casa.bandeira = !casa.bandeira;
    this.bandeiras += casa.bandeira ? 1 : -1;
    return casa.bandeira;
  }

  /** Visão do jogador: esconde informações de casas fechadas enquanto a partida não termina. */
  consultar(linha, coluna) {
    this.#validarCoordenada(linha, coluna);
    const casa = this.casas[linha][coluna];
    const visivel = casa.aberta || this.status !== STATUS.JOGANDO;
    return {
      aberta: casa.aberta,
      bandeira: casa.bandeira,
      vizinhas: casa.aberta && !casa.bomba ? casa.vizinhas : null,
      bomba: visivel ? casa.bomba : null,
    };
  }

  #sortear(aleatorio) {
    const total = this.linhas * this.colunas;
    const indices = Array.from({ length: total }, (_, i) => i);
    // Fisher-Yates parcial: as primeiras `totalBombas` posições viram bombas.
    for (let i = 0; i < this.totalBombas; i++) {
      const j = i + Math.floor(aleatorio() * (total - i));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices.slice(0, this.totalBombas).map((i) => [Math.floor(i / this.colunas), i % this.colunas]);
  }

  * #vizinhos(l, c) {
    for (const [dl, dc] of DIRECOES) {
      const nl = l + dl;
      const nc = c + dc;
      if (nl >= 0 && nl < this.linhas && nc >= 0 && nc < this.colunas) yield [nl, nc];
    }
  }

  #validarCoordenada(l, c) {
    if (!Number.isInteger(l) || !Number.isInteger(c) || l < 0 || l >= this.linhas || c < 0 || c >= this.colunas) {
      throw new RangeError(`coordenada fora do tabuleiro: (${l}, ${c})`);
    }
  }

  #exigirPartidaEmAndamento() {
    if (this.status !== STATUS.JOGANDO) throw new Error('a partida já terminou');
  }
}

module.exports = { CampoMinado, STATUS };
