/*
  Shaders GLSL usados para renderizar sprites com WebGL.
  O vertex shader posiciona o objeto e o fragment shader aplica a textura.
*/
export const codigoVertexShader = `
attribute vec2 a_position;
attribute vec2 a_texcoord;
uniform vec2 u_translation;
uniform vec2 u_scale;
varying vec2 v_texcoord;

void main() {
  vec2 position = a_position * u_scale + u_translation;
  gl_Position = vec4(position, 0.0, 1.0);
  v_texcoord = a_texcoord;
}
`;

export const codigoFragmentShader = `
precision mediump float;
varying vec2 v_texcoord;
uniform sampler2D u_texture;
uniform vec4 u_tint;

void main() {
  vec4 color = texture2D(u_texture, v_texcoord);
  gl_FragColor = color * u_tint;
}
`;

export function compilarShader(gl, tipo, codigo) {
  const shader = gl.createShader(tipo);
  gl.shaderSource(shader, codigo);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader));
  }

  return shader;
}

export function criarPrograma(gl, codigoVertex, codigoFragment) {
  const shaderVertex = compilarShader(gl, gl.VERTEX_SHADER, codigoVertex);
  const shaderFragment = compilarShader(gl, gl.FRAGMENT_SHADER, codigoFragment);
  const programa = gl.createProgram();

  gl.attachShader(programa, shaderVertex);
  gl.attachShader(programa, shaderFragment);
  gl.linkProgram(programa);

  if (!gl.getProgramParameter(programa, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(programa));
  }

  return programa;
}
