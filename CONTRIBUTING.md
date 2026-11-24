# Contribuindo com o MapaMental Studio

Obrigado pelo interesse em melhorar o **MapaMental Studio**! O projeto foi feito para ser simples, leve e fácil de estender — sem necessidade de compilação ou ferramentas pesadas.

## 💡 Como Contribuir

1. **Reportando bugs ou sugerindo ideias**
   - Abra uma *Issue* descrevendo o comportamento esperado, o navegador utilizado e, se possível, um print ou arquivo `.json` de exemplo.

2. **Adicionando novos Temas Visuais**
   - Os temas ficam em `css/themes.css` (usando `body[data-theme="nome-do-tema"]`) e o mapeamento de exportação em `THEME_EXPORT_COLORS` dentro de `js/exporter.js`.
   - Adicione a opção correspondente no `<select id="select-theme">` em `index.html`.

3. **Adicionando novos Modelos Prontos**
   - Edite `js/templates.js` adicionando uma nova entrada em `TEMPLATES` e inclua o item no menu `#menu-templates` em `index.html`.

4. **Enviando um Pull Request**
   - Faça um fork do repositório.
   - Crie uma branch descritiva: `git checkout -b feat/meu-recurso`.
   - Teste abrindo em um servidor local (`python3 -m http.server 8080`) e garanta que não há erros no console do navegador.
   - Envie seu Pull Request explicando o que mudou e por quê.
