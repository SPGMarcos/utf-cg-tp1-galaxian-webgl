/*
  Este módulo cria imagens e texturas usadas no jogo.
  Ele consegue:
  - gerar sprites de fallback com canvas quando o recurso não existe
  - remover fundos escuros para deixar transparências mais limpas
  - recortar spritesheets em quadros individuais
*/
function criarCanvasDeSprite(tamanho, funcaoDeDesenho) {
  const canvas = document.createElement("canvas");
  canvas.width = tamanho;
  canvas.height = tamanho;
  const contexto = canvas.getContext("2d");
  contexto.clearRect(0, 0, tamanho, tamanho);
  funcaoDeDesenho(contexto, tamanho);
  return canvas;
}

function criarTexturaAPartirDoCanvas(gl, canvas) {
  const textura = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, textura);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return textura;
}

// Remove pixels escuros do fundo e deixa a imagem transparente.
// Útil para transformar sprites com fundo ruim em texturas limpas.
function removerFundoEscuro(canvasOriginal) {
  const canvas = document.createElement("canvas");
  canvas.width = canvasOriginal.width;
  canvas.height = canvasOriginal.height;
  const contexto = canvas.getContext("2d");
  contexto.drawImage(canvasOriginal, 0, 0);

  const { width, height } = canvas;
  const imagem = contexto.getImageData(0, 0, width, height);
  const dados = imagem.data;

  const amostras = [
    0, 0,
    width - 1, 0,
    0, height - 1,
    width - 1, height - 1
  ];

  let fundoR = 0;
  let fundoG = 0;
  let fundoB = 0;

  for (let i = 0; i < amostras.length; i += 2) {
    const indice = (amostras[i + 1] * width + amostras[i]) * 4;
    fundoR += dados[indice];
    fundoG += dados[indice + 1];
    fundoB += dados[indice + 2];
  }

  fundoR /= 4;
  fundoG /= 4;
  fundoB /= 4;

  for (let i = 0; i < dados.length; i += 4) {
    const distancia =
      Math.abs(dados[i] - fundoR) +
      Math.abs(dados[i + 1] - fundoG) +
      Math.abs(dados[i + 2] - fundoB);

    if (distancia < 90) {
      dados[i + 3] = 0;
    }
  }

  contexto.putImageData(imagem, 0, 0);
  return canvas;
}

function recortarSpritesheetEmQuadros(imagem, colunas, linhas) {
  const larguraQuadro = Math.floor(imagem.width / colunas);
  const alturaQuadro = Math.floor(imagem.height / linhas);
  const quadros = [];

  for (let linha = 0; linha < linhas; linha += 1) {
    for (let coluna = 0; coluna < colunas; coluna += 1) {
      const canvasQuadro = document.createElement("canvas");
      canvasQuadro.width = larguraQuadro;
      canvasQuadro.height = alturaQuadro;
      const contexto = canvasQuadro.getContext("2d");
      contexto.drawImage(
        imagem,
        coluna * larguraQuadro,
        linha * alturaQuadro,
        larguraQuadro,
        alturaQuadro,
        0,
        0,
        larguraQuadro,
        alturaQuadro
      );

      quadros.push(removerFundoEscuro(canvasQuadro));
    }
  }

  return quadros;
}

function carregarImagem(url) {
  return new Promise((resolve, reject) => {
    const imagem = new Image();
    imagem.onload = () => resolve(imagem);
    imagem.onerror = () => reject(new Error(`Nao foi possivel carregar ${url}`));
    imagem.src = url;
  });
}

async function carregarRecursoOuFallback(url, criarFallback) {
  try {
    return await carregarImagem(url);
  } catch {
    return criarFallback();
  }
}

function criarSpriteJogador() {
  return criarCanvasDeSprite(64, (contexto, tamanho) => {
    contexto.fillStyle = "rgba(0, 0, 0, 0)";
    contexto.fillRect(0, 0, tamanho, tamanho);

    contexto.fillStyle = "#00d8c8";
    contexto.beginPath();
    contexto.moveTo(tamanho * 0.5, tamanho * 0.12);
    contexto.lineTo(tamanho * 0.18, tamanho * 0.84);
    contexto.lineTo(tamanho * 0.82, tamanho * 0.84);
    contexto.closePath();
    contexto.fill();

    contexto.fillStyle = "#9dfcff";
    contexto.fillRect(tamanho * 0.34, tamanho * 0.48, tamanho * 0.32, tamanho * 0.1);

    contexto.fillStyle = "#ffffff";
    contexto.fillRect(tamanho * 0.42, tamanho * 0.28, tamanho * 0.05, tamanho * 0.14);
    contexto.fillRect(tamanho * 0.53, tamanho * 0.28, tamanho * 0.05, tamanho * 0.14);
  });
}

function criarSpriteInimigo() {
  return criarCanvasDeSprite(64, (contexto, tamanho) => {
    contexto.fillStyle = "rgba(0, 0, 0, 0)";
    contexto.fillRect(0, 0, tamanho, tamanho);

    contexto.fillStyle = "#ffb703";
    contexto.fillRect(tamanho * 0.18, tamanho * 0.28, tamanho * 0.64, tamanho * 0.12);
    contexto.fillRect(tamanho * 0.14, tamanho * 0.5, tamanho * 0.72, tamanho * 0.16);
    contexto.fillRect(tamanho * 0.24, tamanho * 0.68, tamanho * 0.1, tamanho * 0.14);
    contexto.fillRect(tamanho * 0.66, tamanho * 0.68, tamanho * 0.1, tamanho * 0.14);

    contexto.fillStyle = "#ffffff";
    contexto.fillRect(tamanho * 0.26, tamanho * 0.4, tamanho * 0.1, tamanho * 0.1);
    contexto.fillRect(tamanho * 0.64, tamanho * 0.4, tamanho * 0.1, tamanho * 0.1);
  });
}

function criarSpriteTiroJogador() {
  return criarCanvasDeSprite(32, (contexto, tamanho) => {
    contexto.fillStyle = "rgba(0, 0, 0, 0)";
    contexto.fillRect(0, 0, tamanho, tamanho);
    contexto.fillStyle = "#f8ff80";
    contexto.fillRect(tamanho * 0.35, tamanho * 0.08, tamanho * 0.3, tamanho * 0.8);
  });
}

function criarSpriteTiroInimigo() {
  return criarCanvasDeSprite(32, (contexto, tamanho) => {
    contexto.fillStyle = "rgba(0, 0, 0, 0)";
    contexto.fillRect(0, 0, tamanho, tamanho);
    contexto.fillStyle = "#ff7033";
    contexto.beginPath();
    contexto.ellipse(tamanho * 0.5, tamanho * 0.5, tamanho * 0.14, tamanho * 0.34, 0, 0, Math.PI * 2);
    contexto.fill();
  });
}

function criarSpriteEstrela() {
  return criarCanvasDeSprite(16, (contexto, tamanho) => {
    const gradiente = contexto.createRadialGradient(
      tamanho * 0.5,
      tamanho * 0.5,
      0,
      tamanho * 0.5,
      tamanho * 0.5,
      tamanho * 0.5
    );
    gradiente.addColorStop(0, "rgba(255, 255, 255, 1)");
    gradiente.addColorStop(1, "rgba(255, 255, 255, 0)");
    contexto.fillStyle = gradiente;
    contexto.fillRect(0, 0, tamanho, tamanho);
  });
}

function criarImagemDeFundo() {
  return criarCanvasDeSprite(128, (contexto, tamanho) => {
    const gradiente = contexto.createLinearGradient(0, 0, 0, tamanho);
    gradiente.addColorStop(0, "#04182f");
    gradiente.addColorStop(1, "#01060c");
    contexto.fillStyle = gradiente;
    contexto.fillRect(0, 0, tamanho, tamanho);
  });
}

function obterUrlRecurso(caminhoRelativo) {
  return new URL(caminhoRelativo, import.meta.url).href;
}

// Tenta carregar a imagem do recurso e, ao falhar, gera um fallback de sprite.
async function carregarImagemDeRecursos(caminhoRelativo, criarFallback) {
  return carregarRecursoOuFallback(obterUrlRecurso(caminhoRelativo), criarFallback);
}

export async function carregarBancoDeTexturas(gl, usandoWebGL) {
  const spritesheetExplosao = await carregarImagemDeRecursos(
    "../recursos/sprites/explosao-inimigo.jpg",
    criarImagemDeFundo
  );
  const quadrosExplosao = recortarSpritesheetEmQuadros(spritesheetExplosao, 3, 3);

  const recursos = {
    fundoCor: await carregarImagemDeRecursos("../recursos/imagens/fundo-cor.png", criarImagemDeFundo),
    nebulosa: await carregarImagemDeRecursos("../recursos/imagens/nebulosa.png", criarImagemDeFundo),
    fundoEstrelas: await carregarImagemDeRecursos("../recursos/imagens/fundo-estrelas.png", criarImagemDeFundo),
    estrelaGrandeFundo: await carregarImagemDeRecursos("../recursos/imagens/estrela-grande.png", criarSpriteEstrela),
    estrelaPequenaFundo: await carregarImagemDeRecursos("../recursos/imagens/estrela-pequena.png", criarSpriteEstrela),
    linhasVelocidade: await carregarImagemDeRecursos("../recursos/imagens/linhas-velocidade.png", criarImagemDeFundo),
    jogador: await carregarImagemDeRecursos("../recursos/sprites/jogador.png", criarSpriteJogador),
    jogadorDireita: await carregarImagemDeRecursos("../recursos/sprites/jogador-direita.png", criarSpriteJogador),
    jogadorEsquerda: await carregarImagemDeRecursos("../recursos/sprites/jogador-esquerda.png", criarSpriteJogador),
    jogadorMorre: await carregarImagemDeRecursos("../recursos/sprites/jogador-morre.png", criarSpriteJogador),
    escudo: await carregarImagemDeRecursos("../recursos/sprites/escudo.png", criarSpriteEstrela),
    inimigoFase1: await carregarImagemDeRecursos("../recursos/sprites/inimigo-fase1.png", criarSpriteInimigo),
    inimigoFase2: await carregarImagemDeRecursos("../recursos/sprites/inimigo-fase2.png", criarSpriteInimigo),
    meteoroGrande: await carregarImagemDeRecursos("../recursos/sprites/meteorBig.png", criarSpriteInimigo),
    meteoroPequeno: await carregarImagemDeRecursos("../recursos/sprites/meteorSmall.png", criarSpriteInimigo),
    tiroJogador: await carregarImagemDeRecursos("../recursos/sprites/tiro-jogador.png", criarSpriteTiroJogador),
    tiroInimigo: await carregarImagemDeRecursos("../recursos/sprites/tiro-inimigo.png", criarSpriteTiroInimigo),
    impactoTiroJogador: await carregarImagemDeRecursos("../recursos/sprites/tiro-jogador-acertou.png", criarSpriteEstrela),
    impactoTiroInimigo: await carregarImagemDeRecursos("../recursos/sprites/tiro-inimigo-acertou.png", criarSpriteEstrela),
    vida: await carregarImagemDeRecursos("../recursos/sprites/vida.png", criarSpriteJogador),
    estrela: await carregarImagemDeRecursos("../recursos/sprites/estrela.png", criarSpriteEstrela),
    explosaoInimigo: quadrosExplosao
  };

  if (!usandoWebGL) {
    return recursos;
  }

  return {
    fundoCor: criarTexturaAPartirDoCanvas(gl, recursos.fundoCor),
    nebulosa: criarTexturaAPartirDoCanvas(gl, recursos.nebulosa),
    fundoEstrelas: criarTexturaAPartirDoCanvas(gl, recursos.fundoEstrelas),
    estrelaGrandeFundo: criarTexturaAPartirDoCanvas(gl, recursos.estrelaGrandeFundo),
    estrelaPequenaFundo: criarTexturaAPartirDoCanvas(gl, recursos.estrelaPequenaFundo),
    linhasVelocidade: criarTexturaAPartirDoCanvas(gl, recursos.linhasVelocidade),
    jogador: criarTexturaAPartirDoCanvas(gl, recursos.jogador),
    jogadorDireita: criarTexturaAPartirDoCanvas(gl, recursos.jogadorDireita),
    jogadorEsquerda: criarTexturaAPartirDoCanvas(gl, recursos.jogadorEsquerda),
    jogadorMorre: criarTexturaAPartirDoCanvas(gl, recursos.jogadorMorre),
    escudo: criarTexturaAPartirDoCanvas(gl, recursos.escudo),
    inimigoFase1: criarTexturaAPartirDoCanvas(gl, recursos.inimigoFase1),
    inimigoFase2: criarTexturaAPartirDoCanvas(gl, recursos.inimigoFase2),
    meteoroGrande: criarTexturaAPartirDoCanvas(gl, recursos.meteoroGrande),
    meteoroPequeno: criarTexturaAPartirDoCanvas(gl, recursos.meteoroPequeno),
    tiroJogador: criarTexturaAPartirDoCanvas(gl, recursos.tiroJogador),
    tiroInimigo: criarTexturaAPartirDoCanvas(gl, recursos.tiroInimigo),
    impactoTiroJogador: criarTexturaAPartirDoCanvas(gl, recursos.impactoTiroJogador),
    impactoTiroInimigo: criarTexturaAPartirDoCanvas(gl, recursos.impactoTiroInimigo),
    vida: criarTexturaAPartirDoCanvas(gl, recursos.vida),
    estrela: criarTexturaAPartirDoCanvas(gl, recursos.estrela),
    explosaoInimigo: recursos.explosaoInimigo.map((quadro) => criarTexturaAPartirDoCanvas(gl, quadro))
  };
}
