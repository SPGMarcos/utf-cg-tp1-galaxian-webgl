/*
  Camada de entrada do jogador.
  Aqui a lógica trata teclado e mouse, mantendo o estado das teclas.
*/
import { estado } from "./estado.js";
import { atirar } from "./tiros.js";
export const teclas = {};

// Normaliza teclas de letra para facilitar comparações.
function normalizarTecla(tecla) {
  return typeof tecla === "string" ? tecla.toLowerCase() : "";
}

export function iniciarEntrada() {
  const canvas = document.getElementById("glCanvas");

  // Todas as teclas pressionadas ficam registradas para o loop do jogo ler depois.
  document.addEventListener("keydown", (evento) => {
    const teclaNormalizada = normalizarTecla(evento.key);
    teclas[evento.key] = true;

    if (evento.key === " " || evento.key === "ArrowLeft" || evento.key === "ArrowRight") {
      evento.preventDefault();
    }

    if (estado.tela === "menu") {
      return;
    }

    if (estado.tela === "fim" || estado.tela === "confirmar-reinicio") {
      return;
    }

    if (estado.tela === "pausa") {
      if (evento.key === "Escape") {
        estado.tela = "jogando";
        estado.pausado = false;
      }
      return;
    }

    if (estado.tela === "jogando") {
      if (evento.key === "Escape") {
        estado.tela = "pausa";
        estado.pausado = true;
      }

      if (evento.key === " ") {
        atirar();
      }

      if (teclaNormalizada === "r") {
        estado.tela = "confirmar-reinicio";
        estado.pausado = true;
      }
    }
  });

  document.addEventListener("keyup", (evento) => {
    teclas[evento.key] = false;
  });

  if (!canvas) {
    return;
  }

  canvas.addEventListener("mousemove", (evento) => {
    if (estado.tela !== "jogando" || estado.pausado) {
      return;
    }

    const limites = canvas.getBoundingClientRect();
    const proporcaoX = (evento.clientX - limites.left) / limites.width;
    const xNormalizado = -1 + proporcaoX * 2;
    estado.jogador.x = Math.max(
      -1,
      Math.min(1 - estado.jogador.largura, xNormalizado - estado.jogador.largura / 2)
    );
  });

  canvas.addEventListener("mousedown", (evento) => {
    if (evento.button !== 0) {
      return;
    }

    if (estado.tela === "jogando" && !estado.pausado) {
      evento.preventDefault();
      atirar();
    }
  });
}
