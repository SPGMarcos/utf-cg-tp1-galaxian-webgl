import { estado } from "./estado.js";

const INTERVALO_BASE_METEORO = 2600;

function obterIntervaloDeMeteoro() {
  return estado.faseSelecionada === 2 ? INTERVALO_BASE_METEORO * 0.72 : INTERVALO_BASE_METEORO;
}

// Cria um meteoro com tamanho, velocidade e direção variáveis.
function criarMeteoro() {
  const ehGrande = Math.random() > 0.45;
  const largura = ehGrande ? 0.11 : 0.075;
  const altura = largura;
  const xInicial = -0.95 + Math.random() * (1.9 - largura);
  const yInicial = 1.08;
  const centroJogador = estado.jogador.x + estado.jogador.largura / 2;
  const centroMeteoro = xInicial + largura / 2;
  const direcaoHorizontal = Math.max(-0.18, Math.min(0.18, (centroJogador - centroMeteoro) * 0.32));
  const velocidadeVertical = ehGrande ? 0.42 : 0.56;

  return {
    tipo: ehGrande ? "grande" : "pequeno",
    x: xInicial,
    y: yInicial,
    largura,
    altura,
    velocidadeX: direcaoHorizontal,
    velocidadeY: velocidadeVertical
  };
}

export function reiniciarRecargaDeMeteoro() {
  estado.recargaMeteoro = obterIntervaloDeMeteoro();
}

export function atualizarMeteoros(delta) {
  if (estado.tela !== "jogando") {
    return;
  }

  const passo = delta / 1000;

  estado.recargaMeteoro -= delta;
  if (estado.recargaMeteoro <= 0) {
    estado.meteoros.push(criarMeteoro());
    estado.recargaMeteoro = obterIntervaloDeMeteoro();
  }

  estado.meteoros.forEach((meteoro) => {
    meteoro.x += meteoro.velocidadeX * passo;
    meteoro.y -= meteoro.velocidadeY * passo;
  });

  estado.meteoros = estado.meteoros.filter(
    (meteoro) =>
      meteoro.y + meteoro.altura > -1.15 &&
      meteoro.x + meteoro.largura > -1.2 &&
      meteoro.x < 1.2
  );
}
