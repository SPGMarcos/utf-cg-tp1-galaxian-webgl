/*
  Entrada do aplicativo.
  Este arquivo só dispara a inicialização do input e do jogo,
  depois deixa o browser cuidar do loop de animação.
*/
import { iniciarJogo, loopDoJogo } from "./jogo.js";
import { iniciarEntrada } from "./entrada.js";

iniciarEntrada();
await iniciarJogo();

requestAnimationFrame(loopDoJogo);
