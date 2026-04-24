/*
  Lógica de tiros do jogo.
  Esse módulo controla disparos do jogador, inimigos e o tempo de recarga.
*/
import { estado } from "./estado.js";

const RECARGA_JOGADOR_MS = 220;
const VELOCIDADE_TIRO_JOGADOR = 2.8;
const VELOCIDADE_BASE_TIRO_INIMIGO = -1.1;
const INTERVALO_BASE_TIRO_INIMIGO_MS = 900;

function obterVelocidadeDoTiroInimigo() {
  return estado.faseSelecionada === 2
    ? VELOCIDADE_BASE_TIRO_INIMIGO * 1.15
    : VELOCIDADE_BASE_TIRO_INIMIGO;
}

function obterIntervaloDeTiroInimigo() {
  return estado.faseSelecionada === 2
    ? INTERVALO_BASE_TIRO_INIMIGO_MS * 0.75
    : INTERVALO_BASE_TIRO_INIMIGO_MS;
}

function obterInimigosDaLinhaDeFrente() {
  const inimigosPorColuna = new Map();

  estado.inimigos.forEach((inimigo) => {
    const chave = inimigo.x.toFixed(2);
    const inimigoAtual = inimigosPorColuna.get(chave);

    if (!inimigoAtual || inimigo.y < inimigoAtual.y) {
      inimigosPorColuna.set(chave, inimigo);
    }
  });

  return [...inimigosPorColuna.values()];
}

export function reiniciarRecargaDeTiroInimigo() {
  estado.recargaTiroInimigo = obterIntervaloDeTiroInimigo();
}

export function atirar() {
  if (estado.jogador.recarga > 0 || estado.tela !== "jogando") {
    return;
  }

  estado.tirosJogador.push({
    x: estado.jogador.x + estado.jogador.largura / 2 - 0.01,
    y: estado.jogador.y + estado.jogador.altura,
    largura: 0.015,
    altura: 0.045,
    velocidade: VELOCIDADE_TIRO_JOGADOR
  });

  estado.jogador.recarga = RECARGA_JOGADOR_MS;
}

export function inimigoAtira(delta) {
  if (estado.tela !== "jogando" || estado.inimigos.length === 0) {
    return;
  }

  estado.recargaTiroInimigo -= delta;
  if (estado.recargaTiroInimigo > 0) {
    return;
  }

  const inimigosDaFrente = obterInimigosDaLinhaDeFrente();
  const atirador = inimigosDaFrente[Math.floor(Math.random() * inimigosDaFrente.length)];

  estado.tirosInimigos.push({
    x: atirador.x + atirador.largura / 2 - 0.01,
    y: atirador.y - atirador.altura * 0.15,
    largura: 0.015,
    altura: 0.045,
    velocidade: obterVelocidadeDoTiroInimigo()
  });

  estado.recargaTiroInimigo = obterIntervaloDeTiroInimigo();
}

export function atualizarTiros(delta) {
  const passo = delta / 1000;

  estado.tirosJogador.forEach((tiro) => {
    tiro.y += tiro.velocidade * passo;
  });

  estado.tirosInimigos.forEach((tiro) => {
    tiro.y += tiro.velocidade * passo;
  });

  estado.tirosJogador = estado.tirosJogador.filter((tiro) => tiro.y < 1.05);
  estado.tirosInimigos = estado.tirosInimigos.filter((tiro) => tiro.y + tiro.altura > -1.05);
}
