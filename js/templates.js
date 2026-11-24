/**
 * Paleta de cores otimizada para leitura em vídeos e modelos prontos (PT-BR).
 */

export const BRANCH_PALETTE = [
  '#38BDF8', // Azul Céu
  '#A78BFA', // Roxo Violeta
  '#34D399', // Verde Esmeralda
  '#FBBF24', // Amarelo Âmbar
  '#FB7185', // Rosa Coral
  '#818CF8', // Índigo
  '#FB923C', // Laranja
  '#2DD4BF', // Turquesa
];

export const EMOJI_PRESETS = [
  '🎬', '💡', '🚀', '🎯', '🧠', '⚡',
  '🔥', '📌', '✅', '⚠️', '📊', '🎨',
  '🛠️', '📚', '💰', '🎥', '✨', '🔍',
  '🧩', '📈', '💬', '⭐', '🏆', '🎙️',
];

function node(id, parentId, text, opts = {}) {
  return {
    id,
    parentId,
    text,
    subtitle: opts.subtitle || '',
    icon: opts.icon || '',
    color: opts.color ?? null,
    style: opts.style || 'default',
    size: opts.size || 'md',
    side: opts.side || 'right',
    collapsed: false,
    offsetX: 0,
    offsetY: 0,
    children: opts.children || [],
  };
}

export const TEMPLATES = {
  'youtube-video': {
    id: 'youtube-video',
    name: 'Roteiro de Vídeo YouTube',
    create() {
      return {
        title: 'Como Criar Vídeos Incríveis',
        theme: 'dark-studio',
        layout: 'bilateral',
        frameGuide: 'none',
        rootId: 'root',
        nodes: {
          root: node('root', null, 'Como Criar Vídeos Incríveis', {
            icon: '🎬',
            subtitle: 'Estrutura visual de alta retenção',
            color: '#38BDF8',
            size: 'lg',
            children: ['b1', 'b2', 'b3', 'b4'],
          }),

          b1: node('b1', 'root', 'Gancho Inicial', {
            icon: '🎯',
            subtitle: 'Primeiros 15 segundos',
            color: '#38BDF8',
            side: 'right',
            children: ['b1a', 'b1b', 'b1c'],
          }),
          b1a: node('b1a', 'b1', 'Promessa clara logo no início', { icon: '⚡' }),
          b1b: node('b1b', 'b1', 'Quebra de padrão visual', { icon: '✨' }),
          b1c: node('b1c', 'b1', 'Evite introduções longas', { icon: '⚠️' }),

          b2: node('b2', 'root', 'Roteiro Visual', {
            icon: '🧠',
            subtitle: 'Clareza acima de tudo',
            color: '#A78BFA',
            side: 'right',
            children: ['b2a', 'b2b', 'b2c'],
          }),
          b2a: node('b2a', 'b2', '1 ideia por ramo do mapa', { icon: '🧩' }),
          b2b: node('b2b', 'b2', 'Use exemplos práticos', { icon: '💡' }),
          b2c: node('b2c', 'b2', 'Revele tópicos aos poucos', { icon: '🔥' }),

          b3: node('b3', 'root', 'Gravação & Ritmo', {
            icon: '🎥',
            subtitle: 'Estética profissional',
            color: '#34D399',
            side: 'left',
            children: ['b3a', 'b3b', 'b3c'],
          }),
          b3a: node('b3a', 'b3', 'Áudio limpo vale mais que 4K', { icon: '🎙️' }),
          b3b: node('b3b', 'b3', 'Câmera suave entre tópicos', { icon: '🚀' }),
          b3c: node('b3c', 'b3', 'Use Spotlight para foco total', { icon: '📌' }),

          b4: node('b4', 'root', 'Publicação & Retenção', {
            icon: '📈',
            subtitle: 'Do clique ao final',
            color: '#FBBF24',
            side: 'left',
            children: ['b4a', 'b4b'],
          }),
          b4a: node('b4a', 'b4', 'Título + Thumbnail complementares', { icon: '🎨' }),
          b4b: node('b4b', 'b4', 'CTA natural conectado ao tema', { icon: '✅' }),
        },
      };
    },
  },

  estudos: {
    id: 'estudos',
    name: 'Mapa de Estudos Ativo',
    create() {
      return {
        title: 'Método de Estudo Ativo',
        theme: 'dark-studio',
        layout: 'bilateral',
        frameGuide: 'none',
        rootId: 'root',
        nodes: {
          root: node('root', null, 'Método de Estudo Ativo', {
            icon: '📚',
            subtitle: 'Aprenda mais em menos tempo',
            color: '#A78BFA',
            size: 'lg',
            children: ['e1', 'e2', 'e3', 'e4'],
          }),
          e1: node('e1', 'root', 'Compreensão', {
            icon: '🔍',
            color: '#38BDF8',
            side: 'right',
            children: ['e1a', 'e1b'],
          }),
          e1a: node('e1a', 'e1', 'Visão geral antes dos detalhes', { icon: '🧩' }),
          e1b: node('e1b', 'e1', 'Conecte com o que já sabe', { icon: '💡' }),

          e2: node('e2', 'root', 'Prática Deliberada', {
            icon: '🛠️',
            color: '#34D399',
            side: 'right',
            children: ['e2a', 'e2b'],
          }),
          e2a: node('e2a', 'e2', 'Resolva problemas reais', { icon: '⚡' }),
          e2b: node('e2b', 'e2', 'Técnica Feynman: explique simples', { icon: '💬' }),

          e3: node('e3', 'root', 'Revisão Espaçada', {
            icon: '📈',
            color: '#FBBF24',
            side: 'left',
            children: ['e3a', 'e3b'],
          }),
          e3a: node('e3a', 'e3', 'Revisar em 1, 7 e 30 dias', { icon: '📌' }),
          e3b: node('e3b', 'e3', 'Teste ativo sem consultar', { icon: '✅' }),

          e4: node('e4', 'root', 'Ambiente & Foco', {
            icon: '🎯',
            color: '#FB7185',
            side: 'left',
            children: ['e4a', 'e4b'],
          }),
          e4a: node('e4a', 'e4', 'Blocos de 50 min sem celular', { icon: '🔥' }),
          e4b: node('e4b', 'e4', 'Sono consolida a memória', { icon: '🧠' }),
        },
      };
    },
  },

  projeto: {
    id: 'projeto',
    name: 'Lançamento de Projeto',
    create() {
      return {
        title: 'Lançamento de Projeto',
        theme: 'neon',
        layout: 'bilateral',
        frameGuide: 'none',
        rootId: 'root',
        nodes: {
          root: node('root', null, 'Lançamento de Projeto', {
            icon: '🚀',
            subtitle: 'Do zero ao ar com clareza',
            color: '#34D399',
            size: 'lg',
            children: ['p1', 'p2', 'p3', 'p4'],
          }),
          p1: node('p1', 'root', 'Descoberta', {
            icon: '🔍',
            color: '#38BDF8',
            side: 'right',
            children: ['p1a', 'p1b'],
          }),
          p1a: node('p1a', 'p1', 'Dor real do público', { icon: '💬' }),
          p1b: node('p1b', 'p1', 'Escopo enxuto (MVP)', { icon: '🎯' }),

          p2: node('p2', 'root', 'Construção', {
            icon: '🛠️',
            color: '#A78BFA',
            side: 'right',
            children: ['p2a', 'p2b'],
          }),
          p2a: node('p2a', 'p2', 'Protótipo navegável rápido', { icon: '🎨' }),
          p2b: node('p2b', 'p2', 'Testes com usuários reais', { icon: '✅' }),

          p3: node('p3', 'root', 'Distribuição', {
            icon: '🎬',
            color: '#FB923C',
            side: 'left',
            children: ['p3a', 'p3b'],
          }),
          p3a: node('p3a', 'p3', 'Vídeo de demonstração curto', { icon: '🎥' }),
          p3b: node('p3b', 'p3', 'Documentação simples no GitHub', { icon: '📚' }),

          p4: node('p4', 'root', 'Métricas', {
            icon: '📊',
            color: '#FBBF24',
            side: 'left',
            children: ['p4a', 'p4b'],
          }),
          p4a: node('p4a', 'p4', 'Feedback nos primeiros 7 dias', { icon: '⭐' }),
          p4b: node('p4b', 'p4', 'Iterar melhorias semanais', { icon: '🏆' }),
        },
      };
    },
  },

  blank: {
    id: 'blank',
    name: 'Mapa em Branco',
    create() {
      return {
        title: 'Novo Mapa Mental',
        theme: 'dark-studio',
        layout: 'bilateral',
        frameGuide: 'none',
        rootId: 'root',
        nodes: {
          root: node('root', null, 'Ideia Central', {
            icon: '💡',
            color: '#38BDF8',
            size: 'lg',
            children: ['n1', 'n2'],
          }),
          n1: node('n1', 'root', 'Primeiro Tópico', {
            icon: '🎯',
            color: '#38BDF8',
            side: 'right',
          }),
          n2: node('n2', 'root', 'Segundo Tópico', {
            icon: '🚀',
            color: '#A78BFA',
            side: 'left',
          }),
        },
      };
    },
  },
};
