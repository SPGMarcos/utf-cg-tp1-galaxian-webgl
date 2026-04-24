/*
  Renderizador do jogo.
  Ele suporta WebGL quando disponível e fallback para 2D canvas
  caso o browser não ofereça suporte ao contexto WebGL.
*/
import { estado } from "./estado.js";
import { codigoVertexShader, codigoFragmentShader, criarPrograma } from "../graficos/shaders.js";
import { criarGeometriaBase } from "../graficos/setup.js";
import { carregarBancoDeTexturas } from "../graficos/textura.js";

let gl;
let contexto2d;
let usandoWebGL = false;
let programa;
let atributos = {};
let uniformes = {};
let texturas = {};
let elementoCanvas;
let estrelasPequenas = [];
let estrelasGrandes = [];
let linhasDeVelocidade = [];
let nebulosasEmTransito = [];

function criarGeradorDeterministico(sementeInicial) {
  let semente = sementeInicial >>> 0;
  return () => {
    semente = (semente * 1664525 + 1013904223) >>> 0;
    return semente / 4294967296;
  };
}

function preencherElementosDeFundo() {
  const aleatorio = criarGeradorDeterministico(28411);
  estrelasPequenas = Array.from({ length: 48 }, () => ({
    x: -1 + aleatorio() * 2,
    y: -1 + aleatorio() * 2,
    tamanho: 0.016 + aleatorio() * 0.02,
    alpha: 0.25 + aleatorio() * 0.35,
    velocidade: 0.08 + aleatorio() * 0.18
  }));

  estrelasGrandes = Array.from({ length: 16 }, () => ({
    x: -1 + aleatorio() * 2,
    y: -1 + aleatorio() * 2,
    tamanho: 0.03 + aleatorio() * 0.04,
    alpha: 0.2 + aleatorio() * 0.22,
    velocidade: 0.16 + aleatorio() * 0.16
  }));

  linhasDeVelocidade = Array.from({ length: 20 }, () => ({
    x: -1 + aleatorio() * 2,
    y: -1 + aleatorio() * 2,
    largura: 0.015 + aleatorio() * 0.018,
    altura: 0.1 + aleatorio() * 0.18,
    alpha: 0.05 + aleatorio() * 0.06,
    velocidade: 0.45 + aleatorio() * 0.45
  }));

  nebulosasEmTransito = Array.from({ length: 3 }, (_, indice) => ({
    deslocamentoFase: indice * 6.5,
    largura: 0.85 + aleatorio() * 0.28,
    altura: 0.7 + aleatorio() * 0.22,
    alpha: 0.045 + aleatorio() * 0.03
  }));
}

export async function iniciarRenderizador(canvas) {
  elementoCanvas = canvas;
  gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");

  if (gl) {
    usandoWebGL = true;
  } else {
    usandoWebGL = false;
    contexto2d = canvas.getContext("2d");
    if (!contexto2d) {
      throw new Error("Nao foi possivel obter o contexto de renderizacao.");
    }
  }

  if (usandoWebGL) {
    programa = criarPrograma(gl, codigoVertexShader, codigoFragmentShader);
    gl.useProgram(programa);

    const geometria = criarGeometriaBase(gl, programa);
    atributos = geometria.atributos;
    uniformes = geometria.uniformes;
  }

  texturas = await carregarBancoDeTexturas(gl, usandoWebGL);
  preencherElementosDeFundo();
}

export function redimensionarRenderizador(largura, altura) {
  if (usandoWebGL) {
    gl.viewport(0, 0, largura, altura);
  }

  if (contexto2d) {
    elementoCanvas.width = largura;
    elementoCanvas.height = altura;
  }
}

export function limparTela() {
  if (usandoWebGL) {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return;
  }

  contexto2d.fillStyle = "black";
  contexto2d.fillRect(0, 0, elementoCanvas.width, elementoCanvas.height);
}

function aplicarTransformacaoDeCamera(x, y, largura, altura) {
  const zoom = estado.zoomCamera ?? 1;

  if (zoom === 1) {
    return { x, y, largura, altura };
  }

  const focoX = estado.focoCameraX ?? 0;
  const focoY = estado.focoCameraY ?? 0;
  const centroX = x + largura / 2;
  const centroY = y + altura / 2;
  const novoCentroX = (centroX - focoX) * zoom;
  const novoCentroY = (centroY - focoY) * zoom;
  const novaLargura = largura * zoom;
  const novaAltura = altura * zoom;

  return {
    x: novoCentroX - novaLargura / 2,
    y: novoCentroY - novaAltura / 2,
    largura: novaLargura,
    altura: novaAltura
  };
}

// Desenha um sprite, aplicando transformação de câmera quando necessário.
function desenharTextura(textura, x, y, largura, altura, cor = [1, 1, 1, 1], usarCamera = true) {
  const dimensoes = usarCamera
    ? aplicarTransformacaoDeCamera(x, y, largura, altura)
    : { x, y, largura, altura };

  if (usandoWebGL) {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textura);
    gl.uniform2f(uniformes.escala, dimensoes.largura, dimensoes.altura);
    gl.uniform2f(uniformes.translacao, dimensoes.x + dimensoes.largura / 2, dimensoes.y + dimensoes.altura / 2);
    gl.uniform4fv(uniformes.cor, cor);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    return;
  }

  const xPx = ((dimensoes.x + 1) * elementoCanvas.width) / 2;
  const yPx = (1 - (dimensoes.y + 1) / 2) * elementoCanvas.height;
  const larguraPx = (dimensoes.largura * elementoCanvas.width) / 2;
  const alturaPx = (dimensoes.altura * elementoCanvas.height) / 2;

  contexto2d.save();
  contexto2d.globalAlpha = cor[3];
  contexto2d.drawImage(textura, xPx, yPx - alturaPx, larguraPx, alturaPx);
  contexto2d.restore();
}

function normalizarPosicaoVertical(valor) {
  let y = valor;
  while (y > 1.2) {
    y -= 2.4;
  }
  return y;
}

function desenharCamadasDeFundo() {
  const tempo = (estado.tempo / 1000) * (estado.fatorVelocidadeFundo ?? 1);

  desenharTextura(texturas.fundoCor, -1, -1, 2, 2, [0.06, 0.08, 0.13, 1], false);
  desenharTextura(texturas.fundoEstrelas, -1, -1, 2, 2, [0.12, 0.16, 0.24, 0.08], false);

  nebulosasEmTransito.forEach((nebulosa, indice) => {
    const ciclo = ((tempo * 0.028) + nebulosa.deslocamentoFase) % 3.4;
    const x = -1.9 + ciclo;
    const y = -0.75 + indice * 0.58 + Math.sin(tempo * 0.16 + indice) * 0.06;
    desenharTextura(texturas.nebulosa, x, y, nebulosa.largura, nebulosa.altura, [0.2, 0.26, 0.38, nebulosa.alpha], false);
  });

  estrelasPequenas.forEach((estrela, indice) => {
    const y = normalizarPosicaoVertical(estrela.y + tempo * estrela.velocidade);
    const oscilacaoX = Math.sin(tempo * 0.35 + indice) * 0.01;
    desenharTextura(
      texturas.estrelaPequenaFundo,
      estrela.x + oscilacaoX,
      y,
      estrela.tamanho,
      estrela.tamanho,
      [0.92, 0.96, 1, estrela.alpha],
      false
    );
  });

  estrelasGrandes.forEach((estrela, indice) => {
    const y = normalizarPosicaoVertical(estrela.y + tempo * estrela.velocidade);
    const brilho = 0.75 + Math.sin(tempo * 1.2 + indice * 0.8) * 0.18;
    desenharTextura(
      texturas.estrelaGrandeFundo,
      estrela.x,
      y,
      estrela.tamanho,
      estrela.tamanho,
      [0.9, 0.97, 1, estrela.alpha * brilho],
      false
    );
  });

  linhasDeVelocidade.forEach((linha, indice) => {
    const multiplicadorFase = estado.faseSelecionada === 2 ? 1.35 : 1;
    const y = normalizarPosicaoVertical(linha.y + tempo * linha.velocidade * multiplicadorFase);
    const pulso = 0.7 + Math.sin(tempo * 1.5 + indice) * 0.2;
    desenharTextura(
      texturas.linhasVelocidade,
      linha.x,
      y,
      linha.largura,
      linha.altura,
      [0.7, 0.82, 1, linha.alpha * pulso],
      false
    );
  });
}

export function desenharFundo() {
  if (usandoWebGL) {
    desenharCamadasDeFundo();
    return;
  }

  desenharCamadasDeFundo();
}

export function desenharJogador(jogador, visivel) {
  if (!visivel) {
    return;
  }

  const alpha = jogador.invulnerabilidade > 0 ? (Math.sin(estado.tempo / 70) > 0 ? 0.3 : 0.95) : 1;
  let textura = texturas.jogador;

  if (
    (estado.tela === "fim" || (estado.tela === "derrota-animacao" && jogador.invulnerabilidade <= 450)) &&
    !estado.venceu
  ) {
    textura = texturas.jogadorMorre ?? texturas.jogador;
  } else if (teclasGlobais.direita) {
    textura = texturas.jogadorDireita ?? texturas.jogador;
  } else if (teclasGlobais.esquerda) {
    textura = texturas.jogadorEsquerda ?? texturas.jogador;
  }

  desenharTextura(
    textura,
    jogador.x,
    jogador.y,
    jogador.largura,
    jogador.altura,
    [1, 1, 1, alpha]
  );

  if (jogador.invulnerabilidade > 0 && texturas.escudo) {
    const pulsacao = 0.88 + Math.sin(estado.tempo / 110) * 0.12;
    const larguraEscudo = jogador.largura * 1.8;
    const alturaEscudo = jogador.altura * 1.8;
    desenharTextura(
      texturas.escudo,
      jogador.x + jogador.largura / 2 - larguraEscudo / 2,
      jogador.y + jogador.altura / 2 - alturaEscudo / 2,
      larguraEscudo,
      alturaEscudo,
      [1, 1, 1, 0.62 * pulsacao]
    );
  }
}

export function desenharInimigo(inimigo) {
  const textura = estado.faseSelecionada === 2
    ? (texturas.inimigoFase2 ?? texturas.inimigoFase1)
    : (texturas.inimigoFase1 ?? texturas.inimigoFase2);
  desenharTextura(textura, inimigo.x, inimigo.y, inimigo.largura, inimigo.altura, [1, 1, 1, 1]);
}

export function desenharMeteoro(meteoro) {
  const textura = meteoro.tipo === "grande"
    ? (texturas.meteoroGrande ?? texturas.meteoroPequeno)
    : (texturas.meteoroPequeno ?? texturas.meteoroGrande);
  desenharTextura(textura, meteoro.x, meteoro.y, meteoro.largura, meteoro.altura, [1, 1, 1, 1]);
}

export function desenharTiroDoJogador(tiro) {
  desenharTextura(texturas.tiroJogador, tiro.x, tiro.y, tiro.largura, tiro.altura);
}

export function desenharTiroDoInimigo(tiro) {
  desenharTextura(texturas.tiroInimigo, tiro.x, tiro.y, tiro.largura, tiro.altura);
}

export function desenharExplosao(explosao) {
  const quadro = texturas.explosaoInimigo?.[explosao.indiceQuadro];
  if (!quadro) {
    return;
  }

  desenharTextura(quadro, explosao.x, explosao.y, explosao.largura, explosao.altura);
}

export function desenharImpacto(impacto) {
  const textura = impacto.tipo === "jogador"
    ? texturas.impactoTiroJogador
    : texturas.impactoTiroInimigo;

  if (!textura) {
    return;
  }

  desenharTextura(textura, impacto.x, impacto.y, impacto.largura, impacto.altura, [1, 1, 1, impacto.alpha]);
}

// Mantém um estado de tecla para desenhar o jogador virando para esquerda/direita.
let teclasGlobais = {
  esquerda: false,
  direita: false
};

export function atualizarEstadoVisualDoJogador(estadosTeclas) {
  teclasGlobais = estadosTeclas;
}

export function desenharCena() {
  limparTela();
  desenharFundo();
  estado.inimigos.forEach(desenharInimigo);
  estado.meteoros.forEach(desenharMeteoro);
  estado.explosoes.forEach(desenharExplosao);
  estado.impactos.forEach(desenharImpacto);
  estado.tirosJogador.forEach(desenharTiroDoJogador);
  estado.tirosInimigos.forEach(desenharTiroDoInimigo);
  desenharJogador(estado.jogador, true);
}

export function desenharVidasNoCanvas(quantidade) {
  if (!texturas.vida || quantidade <= 0) {
    return;
  }

  const larguraIcone = 0.045;
  const alturaIcone = 0.045;
  const espacamento = 0.01;
  const larguraTotal = quantidade * larguraIcone + (quantidade - 1) * espacamento;
  let xAtual = 0.92 - larguraTotal;
  const y = 0.6;

  for (let i = 0; i < quantidade; i += 1) {
    desenharTextura(texturas.vida, xAtual, y, larguraIcone, alturaIcone, [1, 1, 1, 1], false);
    xAtual += larguraIcone + espacamento;
  }
}
