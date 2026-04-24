/*
  Controlador principal do jogo.
  Este módulo inicializa a UI, faz o loop principal e atualiza o estado
  a cada frame, incluindo lógica de colissões e vitória/derrota.
*/
import { estado } from "./estado.js";
import { teclas } from "./entrada.js";
import { atualizarTiros, inimigoAtira, reiniciarRecargaDeTiroInimigo } from "./tiros.js";
import { atualizarInimigos, reiniciarMovimentoDosInimigos } from "./inimigos.js";
import { atualizarMeteoros, reiniciarRecargaDeMeteoro } from "./meteoros.js";
import { colidiu } from "./colisao.js";
import * as renderizador from "./renderer.js";

let canvas;
let areaDoJogo;
let hudPontuacao;
let hudVidas;
let painelMensagem;
let telaMenu;
let painelBotoes;
let botaoMenu;
let botaoProximaFase;
let botaoReiniciar;
let botaoContinuar;
let botaoConfirmarReinicio;
let botaoCancelarReinicio;
let botaoFase1;
let botaoFase2;
let listaDeRecordes;
let ultimoTempo = 0;

const PROPORCAO_ALVO = 16 / 9;
const MARGEM_MINIMA = 16;

const modeloJogador = {
  x: 0,
  y: -0.82,
  largura: 0.08,
  altura: 0.08,
  velocidade: 0.8,
  vidas: 3,
  recarga: 0,
  invulnerabilidade: 0
};

const configuracoesDasFases = {
  1: {
    linhas: 4,
    colunas: 6,
    espacamentoX: 0.22,
    espacamentoY: 0.18,
    inicioX: -0.68,
    inicioY: 0.64,
    larguraInimigo: 0.08,
    alturaInimigo: 0.08
  },
  2: {
    linhas: 5,
    colunas: 7,
    espacamentoX: 0.18,
    espacamentoY: 0.16,
    inicioX: -0.68,
    inicioY: 0.68,
    larguraInimigo: 0.07,
    alturaInimigo: 0.07
  }
};

const CHAVE_RECORDES = "galaxian-highscores";
const DURACAO_QUADRO_EXPLOSAO = 60;
const DURACAO_IMPACTO = 120;
const DURACAO_ANIMACAO_DERROTA = 3600;

function normalizarRecordeBruto(entrada) {
  if (!entrada || typeof entrada !== "object") {
    return null;
  }

  const pontosBrutos = entrada.pontos ?? entrada.score ?? entrada.pontuacao ?? entrada.points;
  const faseBruta = entrada.fase ?? entrada.phase ?? entrada.faseSelecionada ?? entrada.level;
  const resultadoBruto = entrada.resultado ?? entrada.result ?? entrada.status ?? entrada.outcome;

  const pontos = Number.parseInt(pontosBrutos, 10);
  const fase = Number.parseInt(faseBruta, 10);

  if (!Number.isFinite(pontos) || !Number.isFinite(fase)) {
    return null;
  }

  let resultado = typeof resultadoBruto === "string" ? resultadoBruto.trim() : "";
  const resultadoMinusculo = resultado.toLowerCase();

  if (resultadoMinusculo === "victory" || resultadoMinusculo === "win" || resultadoMinusculo === "won") {
    resultado = "Vitória";
  } else if (resultadoMinusculo === "defeat" || resultadoMinusculo === "loss" || resultadoMinusculo === "lose") {
    resultado = "Derrota";
  } else if (!resultado) {
    resultado = "Derrota";
  }

  return { pontos, fase, resultado };
}

export async function iniciarJogo() {
  areaDoJogo = document.getElementById("gameWrapper");
  canvas = document.getElementById("glCanvas");
  hudPontuacao = document.getElementById("hud-score");
  hudVidas = document.getElementById("hud-lives");
  painelMensagem = document.getElementById("message");
  telaMenu = document.getElementById("menu-screen");
  painelBotoes = document.getElementById("panel-buttons");
  botaoMenu = document.getElementById("btn-menu");
  botaoProximaFase = document.getElementById("btn-next-phase");
  botaoReiniciar = document.getElementById("btn-restart");
  botaoContinuar = document.getElementById("btn-resume");
  botaoConfirmarReinicio = document.getElementById("btn-confirm-restart");
  botaoCancelarReinicio = document.getElementById("btn-cancel-restart");
  botaoFase1 = document.getElementById("btn-fase1");
  botaoFase2 = document.getElementById("btn-fase2");
  listaDeRecordes = document.getElementById("highscore-list");

  ajustarTamanhoDoCanvas();
  carregarRecordes();

  try {
    await renderizador.iniciarRenderizador(canvas);
    renderizador.redimensionarRenderizador(canvas.width, canvas.height);
  } catch (erro) {
    painelMensagem.textContent = `Erro ao inicializar renderização: ${erro.message}`;
    painelMensagem.classList.remove("hidden");
    painelMensagem.style.whiteSpace = "pre-wrap";
    return;
  }

  botaoFase1.addEventListener("click", () => iniciarFase(1));
  botaoFase2.addEventListener("click", () => iniciarFase(2));
  botaoProximaFase.addEventListener("click", () => iniciarFase(2));
  botaoReiniciar.addEventListener("click", () => reiniciarJogo());
  botaoContinuar.addEventListener("click", () => retomarJogo());
  botaoConfirmarReinicio.addEventListener("click", () => reiniciarJogo());
  botaoCancelarReinicio.addEventListener("click", () => retomarJogo());
  botaoMenu.addEventListener("click", () => voltarAoMenu());

  reiniciarEstadoDoJogo();
  atualizarInterfaceDeTela();

  window.addEventListener("resize", () => {
    ajustarTamanhoDoCanvas();
    renderizador.redimensionarRenderizador(canvas.width, canvas.height);
  });
}

function iniciarFase(numeroDaFase) {
  estado.faseSelecionada = numeroDaFase;
  reiniciarEstadoDaFase();
  atualizarInterfaceDeTela();
}

function retomarJogo() {
  estado.tela = "jogando";
  estado.pausado = false;
  atualizarInterfaceDeTela();
}

function ajustarTamanhoDoCanvas() {
  const proporcaoDoDispositivo = window.devicePixelRatio || 1;
  const larguraMaxima = Math.max(320, window.innerWidth - MARGEM_MINIMA * 2);
  const alturaMaxima = Math.max(320, window.innerHeight - MARGEM_MINIMA * 2);

  let larguraDaArea = larguraMaxima;
  let alturaDaArea = larguraDaArea / PROPORCAO_ALVO;

  if (alturaDaArea > alturaMaxima) {
    alturaDaArea = alturaMaxima;
    larguraDaArea = alturaDaArea * PROPORCAO_ALVO;
  }

  const larguraArredondada = Math.round(larguraDaArea);
  const alturaArredondada = Math.round(alturaDaArea);

  canvas.style.width = `${larguraArredondada}px`;
  canvas.style.height = `${alturaArredondada}px`;
  canvas.width = Math.round(larguraArredondada * proporcaoDoDispositivo);
  canvas.height = Math.round(alturaArredondada * proporcaoDoDispositivo);

  if (areaDoJogo) {
    areaDoJogo.style.width = `${larguraArredondada}px`;
    areaDoJogo.style.height = `${alturaArredondada}px`;
  }
}

function carregarRecordes() {
  try {
    const textoSalvo = window.localStorage.getItem(CHAVE_RECORDES);
    const dadosSalvos = textoSalvo ? JSON.parse(textoSalvo) : [];
    estado.recordes = Array.isArray(dadosSalvos)
      ? dadosSalvos.map(normalizarRecordeBruto).filter(Boolean)
      : [];
  } catch {
    estado.recordes = [];
  }
}

function salvarRecordes() {
  try {
    window.localStorage.setItem(CHAVE_RECORDES, JSON.stringify(estado.recordes));
  } catch (erro) {
    console.warn("Não foi possível salvar o ranking local.", erro);
  }
}

function atualizarListaDeRecordes() {
  if (!listaDeRecordes) {
    return;
  }

  if (estado.recordes.length === 0) {
    listaDeRecordes.innerHTML = "<li>Nenhuma pontuação salva ainda.</li>";
    return;
  }

  listaDeRecordes.innerHTML = estado.recordes
    .map((entrada) => `<li>Fase ${entrada.fase} · ${entrada.pontos} pts · ${entrada.resultado}</li>`)
    .join("");
}

function registrarRecorde(venceu) {
  estado.recordes.push({
    pontos: estado.pontuacao,
    fase: estado.faseSelecionada,
    resultado: venceu ? "Vitória" : "Derrota"
  });

  estado.recordes = estado.recordes
    .map(normalizarRecordeBruto)
    .filter(Boolean)
    .sort((a, b) => b.pontos - a.pontos)
    .slice(0, 5);

  salvarRecordes();
  atualizarListaDeRecordes();
}

function limparEstadoDaFase() {
  estado.inimigos = [];
  estado.meteoros = [];
  estado.explosoes = [];
  estado.impactos = [];
  estado.tirosJogador = [];
  estado.tirosInimigos = [];
  estado.pontuacao = 0;
  estado.pausado = false;
  estado.venceu = false;
  estado.motivoFimDeJogo = "";
  estado.reinicioPendente = false;
  estado.animacaoDerrotaTempo = 0;
  estado.animacaoDerrotaOrigemX = modeloJogador.x;
  estado.animacaoDerrotaOrigemY = modeloJogador.y;
  estado.zoomCamera = 1;
  estado.focoCameraX = 0;
  estado.focoCameraY = 0;
  estado.fatorVelocidadeFundo = 1;
  estado.recargaRasante = 1200;
  estado.nivel = 1;
  estado.tempo = 0;

  estado.jogador.vidas = modeloJogador.vidas;
  estado.jogador.recarga = 0;
  estado.jogador.invulnerabilidade = 0;
  estado.jogador.x = modeloJogador.x;
  estado.jogador.y = modeloJogador.y;
}

function reiniciarEstadoDoJogo() {
  limparEstadoDaFase();
  estado.tela = "menu";

  criarInimigos();
  reiniciarMovimentoDosInimigos();
  reiniciarRecargaDeTiroInimigo();
  reiniciarRecargaDeMeteoro();
  atualizarListaDeRecordes();
}

function reiniciarEstadoDaFase() {
  limparEstadoDaFase();
  estado.tela = "jogando";

  criarInimigos();
  reiniciarMovimentoDosInimigos();
  reiniciarRecargaDeTiroInimigo();
  reiniciarRecargaDeMeteoro();
}

// Loop principal do jogo, acionado por requestAnimationFrame.
export function loopDoJogo(tempoAtual) {
  const delta = ultimoTempo ? tempoAtual - ultimoTempo : 16;
  ultimoTempo = tempoAtual;

  if (estado.tela === "jogando" && !estado.pausado) {
    atualizarJogo(delta);
  } else if (estado.tela === "derrota-animacao") {
    atualizarAnimacaoDeDerrota(delta);
  }

  renderizarJogo();
  requestAnimationFrame(loopDoJogo);
}

// Atualiza a lógica de jogo em cada frame quando o jogador está ativo.
function atualizarJogo(delta) {
  const jogador = estado.jogador;
  const passo = delta / 1000;

  estado.tempo += delta;

  if (teclas.ArrowLeft) {
    jogador.x -= jogador.velocidade * passo;
  }

  if (teclas.ArrowRight) {
    jogador.x += jogador.velocidade * passo;
  }

  renderizador.atualizarEstadoVisualDoJogador({
    esquerda: Boolean(teclas.ArrowLeft && !teclas.ArrowRight),
    direita: Boolean(teclas.ArrowRight && !teclas.ArrowLeft)
  });

  jogador.x = Math.max(-1, Math.min(1 - jogador.largura, jogador.x));

  if (jogador.recarga > 0) {
    jogador.recarga = Math.max(0, jogador.recarga - delta);
  }

  if (jogador.invulnerabilidade > 0) {
    jogador.invulnerabilidade = Math.max(0, jogador.invulnerabilidade - delta);
  }

  atualizarTiros(delta);
  atualizarInimigos(delta);
  atualizarMeteoros(delta);
  inimigoAtira(delta);
  atualizarExplosoes(delta);
  atualizarImpactos(delta);

  verificarColisoes();
  verificarVitoria();
}

function atualizarAnimacaoDeDerrota(delta) {
  estado.tempo += delta;
  estado.animacaoDerrotaTempo += delta;
  atualizarImpactos(delta);
  atualizarExplosoes(delta);
  estado.jogador.invulnerabilidade = Math.max(0, estado.jogador.invulnerabilidade - delta);

  const progresso = Math.min(1, estado.animacaoDerrotaTempo / DURACAO_ANIMACAO_DERROTA);
  const progressoSuave = 1 - Math.pow(1 - progresso, 2);
  const alvoX = -estado.jogador.largura / 2;
  const alvoY = -estado.jogador.altura / 2 + 0.02;

  estado.jogador.x =
    estado.animacaoDerrotaOrigemX + (alvoX - estado.animacaoDerrotaOrigemX) * progressoSuave;
  estado.jogador.y =
    estado.animacaoDerrotaOrigemY + (alvoY - estado.animacaoDerrotaOrigemY) * progressoSuave;
  estado.focoCameraX = estado.jogador.x + estado.jogador.largura / 2;
  estado.focoCameraY = estado.jogador.y + estado.jogador.altura / 2;
  estado.zoomCamera = 1 + progressoSuave * 0.1;
  estado.fatorVelocidadeFundo = Math.max(0.015, 1 - progressoSuave * 0.985);

  if (progresso >= 1) {
    dispararFimDeJogo(false, estado.motivoFimDeJogo || "Sua nave foi destruída.");
  }
}

function atualizarExplosoes(delta) {
  estado.explosoes = estado.explosoes
    .map((explosao) => {
      const tempoAtualizado = explosao.tempo + delta;
      const indiceQuadro = Math.floor(tempoAtualizado / DURACAO_QUADRO_EXPLOSAO);

      return {
        ...explosao,
        tempo: tempoAtualizado,
        indiceQuadro
      };
    })
    .filter((explosao) => explosao.indiceQuadro < 9);
}

function atualizarImpactos(delta) {
  estado.impactos = estado.impactos
    .map((impacto) => {
      const tempo = impacto.tempo + delta;
      return {
        ...impacto,
        tempo,
        alpha: Math.max(0, 1 - tempo / DURACAO_IMPACTO)
      };
    })
    .filter((impacto) => impacto.tempo < DURACAO_IMPACTO);
}

function criarExplosaoDoInimigo(inimigo) {
  const escala = 1.8;
  const largura = inimigo.largura * escala;
  const altura = inimigo.altura * escala;

  estado.explosoes.push({
    x: inimigo.x + inimigo.largura / 2 - largura / 2,
    y: inimigo.y + inimigo.altura / 2 - altura / 2,
    largura,
    altura,
    tempo: 0,
    indiceQuadro: 0
  });
}

function criarImpacto(tipo, x, y, tamanho) {
  estado.impactos.push({
    tipo,
    x: x - tamanho / 2,
    y: y - tamanho / 2,
    largura: tamanho,
    altura: tamanho,
    tempo: 0,
    alpha: 1
  });
}

export function reiniciarJogo() {
  reiniciarEstadoDaFase();
  atualizarInterfaceDeTela();
}

export function voltarAoMenu() {
  reiniciarEstadoDoJogo();
  atualizarInterfaceDeTela();
}

export function dispararFimDeJogo(venceu, motivo = "") {
  if (estado.tela === "fim") {
    return;
  }

  estado.tela = "fim";
  estado.venceu = venceu;
  estado.pausado = false;
  estado.motivoFimDeJogo = motivo;
  estado.zoomCamera = 1;
  estado.focoCameraX = 0;
  estado.focoCameraY = 0;
  estado.fatorVelocidadeFundo = 1;
  registrarRecorde(venceu);
}

function iniciarAnimacaoDeDerrota(motivo) {
  if (estado.tela === "derrota-animacao" || estado.tela === "fim") {
    return;
  }

  estado.tela = "derrota-animacao";
  estado.venceu = false;
  estado.pausado = false;
  estado.motivoFimDeJogo = motivo;
  estado.animacaoDerrotaTempo = 0;
  estado.animacaoDerrotaOrigemX = estado.jogador.x;
  estado.animacaoDerrotaOrigemY = estado.jogador.y;
  estado.inimigos = [];
  estado.meteoros = [];
  estado.tirosJogador = [];
  estado.tirosInimigos = [];
}

function criarInimigos() {
  const configuracao = configuracoesDasFases[estado.faseSelecionada] || configuracoesDasFases[1];

  for (let linha = 0; linha < configuracao.linhas; linha += 1) {
    for (let coluna = 0; coluna < configuracao.colunas; coluna += 1) {
      const xInicial = configuracao.inicioX + coluna * configuracao.espacamentoX;
      const indiceUnico = linha * configuracao.colunas + coluna;
      estado.inimigos.push({
        x: xInicial,
        y: configuracao.inicioY - linha * configuracao.espacamentoY,
        largura: configuracao.larguraInimigo,
        altura: configuracao.alturaInimigo,
        linhaFormacao: linha,
        xBase: xInicial,
        yBase: configuracao.inicioY - linha * configuracao.espacamentoY,
        xOffset: 0,
        amplitudeLateral:
          estado.faseSelecionada === 2 ? 0.016 + (indiceUnico % 5) * 0.005 : 0.008 + (indiceUnico % 3) * 0.002,
        frequenciaLateral:
          estado.faseSelecionada === 2 ? 1.1 + (indiceUnico % 4) * 0.22 : 0.7 + (indiceUnico % 3) * 0.14,
        faseLateral: indiceUnico * 0.6,
        modoMovimento: "formacao"
      });
    }
  }
}

// Verifica todas as colisões do frame: tiros contra inimigos, inimigos contra jogador, meteoros.
function verificarColisoes() {
  for (let i = estado.tirosJogador.length - 1; i >= 0; i -= 1) {
    const tiro = estado.tirosJogador[i];

    for (let j = estado.inimigos.length - 1; j >= 0; j -= 1) {
      if (colidiu(tiro, estado.inimigos[j])) {
        criarExplosaoDoInimigo(estado.inimigos[j]);
        criarImpacto("jogador", tiro.x + tiro.largura / 2, tiro.y + tiro.altura / 2, 0.09);
        estado.inimigos.splice(j, 1);
        estado.tirosJogador.splice(i, 1);
        estado.pontuacao += 10;
        break;
      }
    }
  }

  for (let i = estado.tirosInimigos.length - 1; i >= 0; i -= 1) {
    const tiro = estado.tirosInimigos[i];

    if (estado.jogador.invulnerabilidade <= 0 && colidiu(tiro, estado.jogador)) {
      criarImpacto("inimigo", tiro.x + tiro.largura / 2, tiro.y + tiro.altura / 2, 0.11);
      estado.tirosInimigos.splice(i, 1);
      estado.jogador.vidas -= 1;
      estado.jogador.invulnerabilidade = 1200;
      estado.tirosInimigos = [];
      estado.tirosJogador = [];

      if (estado.jogador.vidas <= 0) {
        iniciarAnimacaoDeDerrota("Sua nave foi destruída.");
      }
      return;
    }
  }

  for (let i = estado.meteoros.length - 1; i >= 0; i -= 1) {
    const meteoro = estado.meteoros[i];

    if (estado.jogador.invulnerabilidade <= 0 && colidiu(meteoro, estado.jogador)) {
      criarImpacto("inimigo", meteoro.x + meteoro.largura / 2, meteoro.y + meteoro.altura / 2, 0.14);
      estado.meteoros.splice(i, 1);
      estado.jogador.vidas -= 1;
      estado.jogador.invulnerabilidade = 1200;
      estado.tirosInimigos = [];
      estado.tirosJogador = [];

      if (estado.jogador.vidas <= 0) {
        iniciarAnimacaoDeDerrota("Sua nave foi destruída.");
      }
      return;
    }
  }
}

function verificarVitoria() {
  if (estado.inimigos.length === 0 && estado.tela === "jogando") {
    dispararFimDeJogo(true, "Todos os alienígenas foram destruídos.");
  }
}

function renderizarJogo() {
  if (estado.tela === "menu") {
    renderizador.limparTela();
    renderizador.desenharFundo();
  } else {
    renderizador.desenharCena();
    renderizador.desenharVidasNoCanvas(estado.jogador.vidas);
  }

  atualizarHud();
  atualizarMensagem();
  atualizarInterfaceDeTela();
}

function atualizarHud() {
  const melhorPontuacao = estado.recordes[0]?.pontos ?? 0;

  if (estado.tela === "menu") {
    hudPontuacao.textContent = `Recorde: ${melhorPontuacao}`;
    hudVidas.textContent = "Escolha uma fase para começar";
    return;
  }

  hudPontuacao.textContent = `Pontos: ${estado.pontuacao} · Recorde: ${melhorPontuacao}`;
  hudVidas.textContent = `Fase: ${estado.faseSelecionada}`;
}

function atualizarMensagem() {
  let texto = "";

  if (estado.tela === "menu" || estado.tela === "derrota-animacao") {
    painelMensagem.classList.add("hidden");
    return;
  }

  if (estado.tela === "confirmar-reinicio") {
    texto = "REINICIAR O JOGO?";
  } else if (estado.tela === "pausa") {
    texto = "JOGO PAUSADO";
  } else if (estado.tela === "fim") {
    if (estado.venceu && estado.faseSelecionada === 1) {
      texto = "FASE 1 CONCLUÍDA!";
    } else if (estado.venceu) {
      texto = "MISSÃO CUMPRIDA!";
    } else {
      texto = "FIM DE JOGO\nVOCÊ PERDEU!";
    }
  }

  if (!texto) {
    painelMensagem.classList.add("hidden");
    return;
  }

  painelMensagem.textContent = texto;
  painelMensagem.classList.remove("hidden");
}

// Controla a visibilidade do menu, botões e mensagens de acordo com o estado atual.
function atualizarInterfaceDeTela() {
  const estaNoMenu = estado.tela === "menu";
  const estaEmPausa = estado.tela === "pausa";
  const estaConfirmandoReinicio = estado.tela === "confirmar-reinicio";
  const estaEmAnimacaoDeDerrota = estado.tela === "derrota-animacao";
  const estaNoFim = estado.tela === "fim";
  const mostrarBotaoDeProximaFase = Boolean(estaNoFim && estado.venceu && estado.faseSelecionada === 1);
  const mostrarBotaoDeReiniciar = Boolean((estaEmPausa || estaNoFim) && !estaConfirmandoReinicio);
  const mostrarBotaoContinuar = Boolean(estaEmPausa);
  const mostrarConfirmarReinicio = Boolean(estaConfirmandoReinicio);
  const mostrarCancelarReinicio = Boolean(estaConfirmandoReinicio);
  const mostrarPainelDeBotoes = Boolean(estaEmPausa || estaConfirmandoReinicio || estaNoFim);

  hudPontuacao.parentElement.classList.toggle("hidden", estaNoMenu);
  telaMenu.classList.toggle("hidden", !estaNoMenu);
  painelBotoes.classList.toggle("hidden", !mostrarPainelDeBotoes);
  botaoProximaFase.classList.toggle("hidden", !mostrarBotaoDeProximaFase);
  botaoReiniciar.classList.toggle("hidden", !mostrarBotaoDeReiniciar);
  botaoContinuar.classList.toggle("hidden", !mostrarBotaoContinuar);
  botaoConfirmarReinicio.classList.toggle("hidden", !mostrarConfirmarReinicio);
  botaoCancelarReinicio.classList.toggle("hidden", !mostrarCancelarReinicio);

  if (estaNoMenu || estaEmAnimacaoDeDerrota) {
    painelMensagem.classList.add("hidden");
  }
}
