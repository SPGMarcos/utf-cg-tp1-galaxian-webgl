/*
  Estado global do jogo.
  Mantém tudo que muda com o tempo: posição do jogador, inimigos,
  tiros, pontuação, tela ativa e animações.
*/
export const estado = {
  jogador: {
    x: 0,
    y: -0.82,
    largura: 0.08,
    altura: 0.08,
    velocidade: 0.8,
    vidas: 3,
    recarga: 0,
    invulnerabilidade: 0
  },

  inimigos: [],
  meteoros: [],
  explosoes: [],
  impactos: [],
  tirosJogador: [],
  tirosInimigos: [],
  estrelas: [],
  recordes: [],

  pontuacao: 0,
  pausado: false,
  venceu: false,
  motivoFimDeJogo: "",
  reinicioPendente: false,
  animacaoDerrotaTempo: 0,
  animacaoDerrotaOrigemX: 0,
  animacaoDerrotaOrigemY: 0,
  zoomCamera: 1,
  focoCameraX: 0,
  focoCameraY: 0,
  fatorVelocidadeFundo: 1,
  recargaRasante: 0,

  tela: "menu",
  nivel: 1,
  faseSelecionada: 1,
  tempo: 0,
  recargaTiroInimigo: 0,
  recargaMeteoro: 0
};
