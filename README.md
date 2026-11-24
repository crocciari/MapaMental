# 🧠 MapaMental Studio

Um aplicativo web em **JavaScript puro (ES Modules)** para criar **mapas mentais visualmente bonitos e cinematográficos**, pensado especialmente para quem grava **vídeos no YouTube, aulas, tutoriais e Shorts/Reels**.

Sem build, sem `npm install` e sem dependências externas: abra no navegador e comece a criar.

---

## ✨ Principais Recursos

### 🎥 Feito para Vídeos no YouTube
- **Modo Estúdio / Apresentação (`P`):** oculta barras e botões da tela, deixando apenas o mapa mental limpo para gravação.
- **Câmera Suave Automática (`C`):** ao avançar pelos tópicos, a câmera desliza com zoom e movimento suave até o nó atual.
- **Revelação Progressiva (`R`):** comece pelo tema central e revele cada tópico um a um durante a explicação, com animação das linhas sendo desenhadas na tela.
- **Modo Spotlight (`S`):** escurece suavemente o restante do mapa para destacar apenas o ramo que você está explicando.
- **Guias de Enquadramento:** visualize margens seguras em **16:9 (YouTube)** ou **9:16 (Shorts / Reels / TikTok)**.
- **5 Temas Visuais Prontos:**
  - **Dark Studio** (visual moderno de estúdio escuro)
  - **Neon Tech** (linhas luminosas e alto contraste)
  - **Clean Editorial** (fundo claro elegante)
  - **Quadro Negro** (estilo aula)
  - **Chroma Key (OBS)** (fundo verde puro `#00FF00` sem grade, com cartões opacos para recorte limpo)

### ⚡ Edição Rápida e Intuitiva
- **Atalhos produtivos:** `Tab` cria filho, `Enter` cria irmão, `Duplo clique` ou `F2` edita direto no cartão.
- **Arrastar e Reanexar:** mova nós livremente pelo canvas ou solte um cartão sobre outro para trocar de ramo.
- **3 Layouts Automáticos:** Bilateral (clássico), Árvore para a direita e Vertical (organograma), com cálculo automático sem sobreposição.
- **Meus Mapas (`M`):** biblioteca integrada no navegador para salvar, buscar, renomear, duplicar e alternar entre vários mapas mentais automaticamente via `localStorage`.
- **Formatação rápida nos cartões:** use `**texto**` para **negrito**, `__texto__` para *itálico*, `==texto==` para destaque com cor invertida do ramo e `--texto--` para texto menor.
- **Imagens nos Nós (`.webp`, PNG, JPG, SVG):** anexe imagens pelo Inspetor, arraste direto sobre um cartão ou cole prints com `Ctrl + V`. Arquivos são armazenados em `IndexedDB` e otimizados automaticamente para `.webp` (mantendo `.webp` originais intactos e suportando ampliação em tela cheia no clique da lupa).
- **Exportação Profissional:**
  - **PNG em Alta Resolução (4K)**
  - **PNG com Fundo Transparente** (ideal para jogar direto por cima do vídeo no editor)
  - **SVG Vetorial**
  - **Salvar / Abrir Projeto (`.json`)** para backup e compartilhamento entre dispositivos.

---

## 🚀 Como Usar Localmente

### Opção 1: Servidor Local (ex.: Docker / Apache / Nginx)
Se você já serve a pasta `MapaMental` no seu ambiente local, basta acessar:

```text
https://www.localhost/MapaMental/
```

### Opção 2: Com Python (em 1 comando)
```bash
git clone https://github.com/crocciari/MapaMental.git
cd MapaMental
python3 -m http.server 8080
```
Depois abra `http://localhost:8080` no navegador.

> **Importante:** como o projeto utiliza ES Modules (`<script type="module">`), abra via servidor HTTP/HTTPS (`localhost`), e não diretamente com `file://`.

### Opção 3: Publicar no GitHub Pages
1. No repositório do GitHub, vá em **Settings → Pages**.
2. Em **Source**, escolha **Deploy from a branch** (`main`, pasta `/ (root)`).
3. Salve e acesse o link gerado pelo GitHub Pages!

---

## 🎬 Guia Rápido para Gravar no OBS / YouTube

1. Escolha um **Modelo Pronto** (como *Roteiro de Vídeo YouTube*) ou crie o seu mapa.
2. Se quiser sobrepor o mapa na sua webcam/edição, selecione o tema **Chroma Key (OBS)** (ou use **Dark Studio** / **Neon Tech** em tela cheia).
3. Ative a guia **16:9 YouTube** (ou **9:16 Shorts**) para conferir o enquadramento.
4. Pressione **`P`** para entrar no **Modo Apresentação**.
5. Ative **`R`** (*Revelação Progressiva*) e **`S`** (*Spotlight*) se quiser revelar tópico por tópico.
6. Pressione **`H`** para esconder totalmente os botões de controle da tela.
7. Grave no OBS avançando pelos tópicos com **`→`** ou **`Espaço`**, e aperte **`A`** no final para mostrar uma visão geral completa do mapa!

---

## ⌨️ Tabela de Atalhos

### Edição
| Atalho | Ação |
| :--- | :--- |
| `Tab` | Criar subtópico (filho) |
| `Enter` | Criar tópico no mesmo nível (irmão) |
| `Duplo clique` / `F2` | Editar texto do nó |
| `Arrastar nó` | Reposicionar manualmente (ou soltar em outro nó para reanexar) |
| `Espaço` | Recolher / expandir ramo |
| `Del` / `Backspace` | Excluir nó selecionado |
| `Alt + ↑` / `Alt + ↓` | Mover tópico para aparecer antes ou depois na apresentação |
| `Ctrl + Z` / `Ctrl + Y` | Desfazer / Refazer |
| `Arrastar fundo` | Mover câmera (Pan) |
| `Scroll do mouse` | Zoom |
| `F` | Enquadrar o mapa inteiro na tela |
| `M` | Abrir biblioteca Meus Mapas |
| `Ctrl + V` | Colar imagem no nó selecionado |
| `?` | Abrir ajuda e dicas |

### Apresentação / Vídeo
| Atalho | Ação |
| :--- | :--- |
| `P` | Entrar no Modo Apresentação |
| `→` / `Espaço` | Avançar para o próximo tópico |
| `←` | Voltar para o tópico anterior |
| `R` | Ligar/desligar Revelação Progressiva |
| `S` | Ligar/desligar Modo Spotlight |
| `C` | Ligar/desligar Câmera Automática |
| `A` | Mostrar mapa inteiro (visão geral) |
| `G` | Ocultar/mostrar linhas da guia (16:9 / 9:16) |
| `H` | Ocultar/mostrar barra de apresentação e guia |
| `Esc` | Sair do Modo Apresentação |

---

## 🗂️ Estrutura do Projeto

```text
MapaMental/
├── index.html           # Estrutura da interface e painéis
├── css/
│   ├── themes.css       # Variáveis visuais dos 5 temas
│   └── style.css        # Estilos do canvas, nós, animações e HUD
├── js/
│   ├── app.js           # Inicialização, eventos, atalhos e drag & drop
│   ├── state.js         # Estado da árvore, histórico Undo/Redo e localStorage
│   ├── media.js         # Armazenamento de imagens em IndexedDB e conversão WebP
│   ├── layout.js        # Algoritmos de layout (Bilateral, Árvore, Vertical)
│   ├── camera.js        # Câmera 2D com zoom e animações suaves
│   ├── renderer.js      # Renderização híbrida (cartões HTML + curvas SVG)
│   ├── presentation.js  # Modo Estúdio, Revelação Progressiva e Spotlight
│   ├── exporter.js      # Exportação PNG 4K, PNG Transparente, SVG e JSON
│   └── templates.js     # Paleta de cores, emojis e mapas de exemplo
├── CONTRIBUTING.md      # Guia de contribuição
└── LICENSE              # Licença MIT
```

---

## 🤝 Contribuindo

Contribuições são muito bem-vindas! Veja o arquivo [CONTRIBUTING.md](CONTRIBUTING.md) para saber como sugerir ideias, criar novos temas ou enviar Pull Requests.

## 📄 Licença

Distribuído sob a licença **MIT**. Veja [LICENSE](LICENSE) para mais detalhes.
