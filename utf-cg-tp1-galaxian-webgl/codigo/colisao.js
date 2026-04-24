/*
  Teste simples de colisão AABB entre dois retângulos.
  Retorna true se os dois objetos se sobrepõem.
*/
export function colidiu(objetoA, objetoB) {
  return (
    objetoA.x < objetoB.x + objetoB.largura &&
    objetoA.x + objetoA.largura > objetoB.x &&
    objetoA.y < objetoB.y + objetoB.altura &&
    objetoA.y + objetoA.altura > objetoB.y
  );
}
