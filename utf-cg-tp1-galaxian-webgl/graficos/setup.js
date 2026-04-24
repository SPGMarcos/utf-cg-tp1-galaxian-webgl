export function criarGeometriaBase(gl, programa) {
  const bufferPosicao = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bufferPosicao);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      -0.5, -0.5,
      0.5, -0.5,
      -0.5, 0.5,
      -0.5, 0.5,
      0.5, -0.5,
      0.5, 0.5
    ]),
    gl.STATIC_DRAW
  );

  const bufferCoordenadaTextura = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bufferCoordenadaTextura);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0]),
    gl.STATIC_DRAW
  );

  const atributos = {
    posicao: gl.getAttribLocation(programa, "a_position"),
    coordenadaTextura: gl.getAttribLocation(programa, "a_texcoord")
  };

  const uniformes = {
    translacao: gl.getUniformLocation(programa, "u_translation"),
    escala: gl.getUniformLocation(programa, "u_scale"),
    cor: gl.getUniformLocation(programa, "u_tint"),
    textura: gl.getUniformLocation(programa, "u_texture")
  };

  gl.enableVertexAttribArray(atributos.posicao);
  gl.bindBuffer(gl.ARRAY_BUFFER, bufferPosicao);
  gl.vertexAttribPointer(atributos.posicao, 2, gl.FLOAT, false, 0, 0);

  gl.enableVertexAttribArray(atributos.coordenadaTextura);
  gl.bindBuffer(gl.ARRAY_BUFFER, bufferCoordenadaTextura);
  gl.vertexAttribPointer(atributos.coordenadaTextura, 2, gl.FLOAT, false, 0, 0);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.uniform1i(uniformes.textura, 0);

  return {
    bufferPosicao,
    bufferCoordenadaTextura,
    atributos,
    uniformes
  };
}
