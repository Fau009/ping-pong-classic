# 🏓 Ping Pong Classic

Jogo de ping pong retrô, jogável direto do navegador — sem login, sem instalação.

**Jogar agora:** https://fau009.github.io/ping-pong-classic/

## Como jogar

Ao abrir o jogo, escolha o modo:

- **1 Jogador** — você contra a máquina. Escolha a dificuldade (Fácil / Médio / Difícil) antes de começar. Conforme você marca pontos, o nível sobe e o jogo fica mais rápido e mais difícil.
- **2 Jogadores** — dois jogadores no mesmo teclado. Cada um escolhe seu nome.

### Controles

| Jogador | Cima | Baixo |
|---|---|---|
| Jogador 1 | `W` | `S` |
| Jogador 2 (ou observar a CPU) | `↑` | `↓` |

`ESC` pausa a partida e permite voltar ao menu.

Vence quem chegar primeiro a **7 pontos**.

## Stack

HTML, CSS e JavaScript puro (sem frameworks, sem build, sem backend) — desenhado em `<canvas>`. Isso torna o jogo 100% compatível com GitHub Pages como hospedagem estática.

## Rodar localmente

Basta abrir o `index.html` em qualquer navegador moderno, ou subir um servidor estático simples:

```bash
npx serve .
# ou
python -m http.server 8000
```

## Estrutura

```
index.html   # marcação e telas (menu, setup, jogo, fim de jogo)
style.css    # visual retrô
game.js      # lógica do jogo, física da bola, IA da CPU, controles
```

## Licença

MIT — veja [LICENSE](./LICENSE).
