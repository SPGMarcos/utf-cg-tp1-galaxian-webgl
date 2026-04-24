import { estado } from "./estado.js";
import { dispararFimDeJogo } from "./jogo.js";

const VELOCIDADE_BASE_INIMIGOS = 0.34;
const DISTANCIA_BASE_DESCIDA = 0.05;
const AMPLITUDE_LATERAL_MAXIMA_FASE_2 = 0.04;
const AMPLITUDE_FILEIRA_FASE_2 = 0.03;
const DURACAO_RASANTE_FASE_1 = 2400;
const DURACAO_RASANTE_FASE_2 = 1700;
const DURACAO_RETORNO_RASANTE = 1100;

let direcaoAtual = 1;

// Cálculo de curva suave para o movimento de rasante dos inimigos.
function interpolarCubicBezier(p0, p1, p2, p3, t) {
  const u = 1 - t;
  const uu = u * u;
  const uuu = uu * u;
  const tt = t * t;
  const ttt = tt * t;

  return {
    x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y
  };
}

function obterVelocidadeDosInimigos() {
  const multiplicadorDaFase = estado.faseSelecionada === 2 ? 1.3 : 1;
  const quantidadeInicial = estado.faseSelecionada === 2 ? 35 : 24;
  const multiplicadorRestante =
    estado.inimigos.length > 0 ? 1 + (quantidadeInicial - estado.inimigos.length) * 0.025 : 1;

  return VELOCIDADE_BASE_INIMIGOS * multiplicadorDaFase * multiplicadorRestante;
}

function obterDistanciaDeDescida() {
  return estado.faseSelecionada === 2 ? DISTANCIA_BASE_DESCIDA * 1.15 : DISTANCIA_BASE_DESCIDA;
}

export function reiniciarMovimentoDosInimigos() {
  direcaoAtual = 1;
}

function iniciarRasante(inimigo) {
  const fase2 = estado.faseSelecionada === 2;
  const alvoX = Math.max(-0.9, Math.min(0.9, estado.jogador.x + estado.jogador.largura / 2));
  const direcao = alvoX >= inimigo.x ? 1 : -1;
  const suavidade = fase2 ? 1 : 0.72;

  inimigo.modoMovimento = "rasante";
  inimigo.progressoRasante = 0;
  inimigo.duracaoRasante = fase2 ? DURACAO_RASANTE_FASE_2 : DURACAO_RASANTE_FASE_1;
  inimigo.pontoInicialRasante = { x: inimigo.x, y: inimigo.y };
  inimigo.controleRasante1 = {
    x: inimigo.x + 0.12 * direcao * suavidade,
    y: inimigo.y - 0.16 * suavidade
  };
  inimigo.controleRasante2 = {
    x: alvoX + 0.18 * direcao * suavidade,
    y: -0.28 - (fase2 ? 0.08 : 0)
  };
  inimigo.destinoRasante = {
    x: alvoX + 0.08 * direcao,
    y: -1.08
  };
}

function atualizarRasantes(delta) {
  estado.inimigos.forEach((inimigo) => {
    if (inimigo.modoMovimento === "rasante") {
      inimigo.progressoRasante += delta / inimigo.duracaoRasante;
      const t = Math.min(1, inimigo.progressoRasante);
      const ponto = interpolarCubicBezier(
        inimigo.pontoInicialRasante,
        inimigo.controleRasante1,
        inimigo.controleRasante2,
        inimigo.destinoRasante,
        t
      );

      inimigo.x = ponto.x;
      inimigo.y = ponto.y;

      if (t >= 1) {
        inimigo.modoMovimento = "retorno";
        inimigo.progressoRetorno = 0;
        inimigo.origemRetorno = {
          x: inimigo.destinoRasante.x,
          y: 1.06
        };
        inimigo.x = inimigo.origemRetorno.x;
        inimigo.y = inimigo.origemRetorno.y;
      }
      return;
    }

    if (inimigo.modoMovimento === "retorno") {
      inimigo.progressoRetorno += delta / DURACAO_RETORNO_RASANTE;
      const t = Math.min(1, inimigo.progressoRetorno);
      const suavizado = 1 - (1 - t) * (1 - t);
      const destinoX = (inimigo.xBase ?? inimigo.x) + (inimigo.xOffset ?? 0);
      const destinoY = inimigo.yBase ?? inimigo.y;

      inimigo.x = inimigo.origemRetorno.x + (destinoX - inimigo.origemRetorno.x) * suavizado;
      inimigo.y = inimigo.origemRetorno.y + (destinoY - inimigo.origemRetorno.y) * suavizado;

      if (t >= 1) {
        inimigo.modoMovimento = "formacao";
      }
    }
  });
}

function atualizarRecargaDeRasante(delta) {
  if (estado.faseSelecionada !== 1 && estado.faseSelecionada !== 2) {
    return;
  }

  estado.recargaRasante = Math.max(0, (estado.recargaRasante ?? 0) - delta);
  if (estado.recargaRasante > 0) {
    return;
  }

  const candidatos = estado.inimigos.filter((inimigo) => !inimigo.modoMovimento || inimigo.modoMovimento === "formacao");
  if (candidatos.length === 0) {
    return;
  }

  const quantidade = estado.faseSelecionada === 2 ? Math.min(2, candidatos.length) : 1;
  const selecionados = [];

  while (selecionados.length < quantidade && candidatos.length > 0) {
    const indice = Math.floor(Math.random() * candidatos.length);
    selecionados.push(candidatos.splice(indice, 1)[0]);
  }

  selecionados.forEach(iniciarRasante);
  estado.recargaRasante = estado.faseSelecionada === 2 ? 3600 : 6200;
}

// Move os inimigos em formação, ativa rasantes e detecta quando eles alcançam o jogador.
export function atualizarInimigos(delta) {
  if (estado.inimigos.length === 0) {
    return;
  }

  const passoDeMovimento = obterVelocidadeDosInimigos() * (delta / 1000) * direcaoAtual;
  const limiteEsquerdo = Math.min(...estado.inimigos.map((inimigo) => inimigo.xBase ?? inimigo.x));
  const limiteDireito = Math.max(...estado.inimigos.map((inimigo) => (inimigo.xBase ?? inimigo.x) + inimigo.largura));
  let passoAjustado = passoDeMovimento;

  if (limiteEsquerdo + passoDeMovimento < -0.96) {
    passoAjustado = -0.96 - limiteEsquerdo;
  } else if (limiteDireito + passoDeMovimento > 0.96) {
    passoAjustado = 0.96 - limiteDireito;
  }

  estado.inimigos.forEach((inimigo) => {
    inimigo.xBase = (inimigo.xBase ?? inimigo.x) + passoAjustado;
  });

  if (passoAjustado !== passoDeMovimento) {
    direcaoAtual *= -1;

    estado.inimigos.forEach((inimigo) => {
      inimigo.yBase = (inimigo.yBase ?? inimigo.y) - obterDistanciaDeDescida();
      if (!inimigo.modoMovimento || inimigo.modoMovimento === "formacao") {
        inimigo.y = inimigo.yBase;
      }
    });
  }

  atualizarRecargaDeRasante(delta);

  const tempoEmSegundos = estado.tempo / 1000;

  estado.inimigos.forEach((inimigo) => {
    if (estado.faseSelecionada === 2) {
      const amplitude = Math.min(inimigo.amplitudeLateral ?? 0, AMPLITUDE_LATERAL_MAXIMA_FASE_2);
      const frequencia = inimigo.frequenciaLateral ?? 1;
      const fase = inimigo.faseLateral ?? 0;
      const direcaoDaFileira = (inimigo.linhaFormacao ?? 0) % 2 === 0 ? 1 : -1;
      const oscilacaoDaFileira =
        Math.sin(tempoEmSegundos * 1.45 + (inimigo.linhaFormacao ?? 0) * 0.55) *
        AMPLITUDE_FILEIRA_FASE_2 *
        direcaoDaFileira;
      const oscilacaoIndividual = Math.sin(tempoEmSegundos * frequencia + fase) * amplitude;
      inimigo.xOffset = oscilacaoDaFileira + oscilacaoIndividual;
    } else {
      const amplitude = inimigo.amplitudeLateral ?? 0;
      const frequencia = inimigo.frequenciaLateral ?? 1;
      const fase = inimigo.faseLateral ?? 0;
      inimigo.xOffset = Math.sin(tempoEmSegundos * frequencia + fase) * amplitude;
    }

    if (!inimigo.modoMovimento || inimigo.modoMovimento === "formacao") {
      inimigo.x = (inimigo.xBase ?? inimigo.x) + (inimigo.xOffset ?? 0);
      inimigo.y = inimigo.yBase ?? inimigo.y;
    }
  });

  atualizarRasantes(delta);

  const alcancouOSolo = estado.inimigos.some(
    (inimigo) =>
      (!inimigo.modoMovimento || inimigo.modoMovimento === "formacao") &&
      inimigo.y <= estado.jogador.y + estado.jogador.altura * 0.35
  );

  if (alcancouOSolo) {
    dispararFimDeJogo(false, "Os alienigenas alcancaram o solo.");
  }
}
