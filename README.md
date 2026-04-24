# Galaxian WebGL

Jogo inspirado no clássico Galaxian, desenvolvido com WebGL e JavaScript.

## 🎮 Controles

- **← →** : Mover nave
- **Espaço** : Atirar
- **ESC** : Pausar/Continuar
- **R** : Reiniciar (com confirmação Y/N)
- **ENTER** : Reiniciar no Game Over

## 🎯 Jogabilidade

- Inimigos se movem em bloco lateralmente
- Ao atingir a borda, descem e invertem direção
- Inimigos atiram aleatoriamente
- Colisões: tiros x inimigos, tiros inimigos x jogador
- Vitória: eliminar todos inimigos
- Derrota: jogador atingido ou inimigos chegam ao solo

## 🎨 Características

- Renderização WebGL com fallback 2D
- Texturas procedurais
- Layout fullscreen (ocupa toda a tela)
- Interface moderna com HUD, menu e botões
- Sistema de telas: Menu → Jogo → Pause/Game Over
- Botão "Voltar ao Menu" em pause e game over
- Canvas ocupa 100% da viewport

## 🚀 Como Jogar

1. Abra `index.html` no navegador
2. Clique em "Iniciar Jogo" ou pressione ENTER
3. Use as setas para mover, espaço para atirar
4. ESC para pausar, R para reiniciar

## 📁 Estrutura do Código

- `codigo/estado.js` - Estado global do jogo
- `codigo/jogo.js` - Loop principal e lógica
- `codigo/entrada.js` - Controles de teclado
- `codigo/renderer.js` - Renderização WebGL/2D
- `codigo/inimigos.js` - Movimento dos inimigos
- `codigo/tiros.js` - Sistema de tiros
- `codigo/colisao.js` - Detecção de colisões
- `codigo/main.js` - Inicialização

## 🔧 Tecnologias

- WebGL puro (com shaders GLSL)
- JavaScript ES6 Modules
- Canvas 2D (fallback)
- CSS moderno com posicionamento absoluto
