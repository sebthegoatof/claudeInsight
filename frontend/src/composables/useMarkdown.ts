import { ref } from 'vue';
import MarkdownIt from 'markdown-it';
import { createHighlighter, type Highlighter } from 'shiki';

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
});

let highlighter: Highlighter | null = null;
let highlighterPromise: Promise<Highlighter> | null = null;

// 支持的语言列表
const SUPPORTED_LANGS = [
  'javascript',
  'typescript',
  'vue',
  'html',
  'css',
  'scss',
  'json',
  'bash',
  'shell',
  'markdown',
  'python',
  'go',
  'rust',
  'sql',
  'yaml',
  'toml',
  'docker',
  'nginx',
  'xml',
  'java',
  'kotlin',
  'swift',
  'c',
  'cpp',
  'csharp',
  'php',
  'ruby',
  'lua',
  'perl',
];

export async function initHighlighter() {
  if (highlighter) return highlighter;
  if (highlighterPromise) return highlighterPromise;

  highlighterPromise = createHighlighter({
    themes: ['github-dark', 'github-light'],
    langs: SUPPORTED_LANGS,
  }).then((h) => {
    highlighter = h;
    return h;
  });

  return highlighterPromise;
}

export function useMarkdown() {
  const rendered = ref('');
  const loading = ref(false);

  async function render(content: string) {
    if (!content) {
      rendered.value = '';
      return;
    }

    loading.value = true;

    try {
      // 确保 highlighter 已初始化
      await initHighlighter();

      // 处理内容
      let processedContent = content;

      // 1. 首先处理 diff 代码块
      processedContent = processDiffBlocks(processedContent);

      // 2. 处理普通代码块（带语言标识）
      processedContent = processCodeBlocks(processedContent);

      // 3. 处理内联代码
      processedContent = processInlineCode(processedContent);

      // 4. 渲染 Markdown
      rendered.value = md.render(processedContent);
    } catch (error) {
      console.error('Markdown render error:', error);
      // 降级处理：直接渲染原始内容
      rendered.value = md.render(content);
    } finally {
      loading.value = false;
    }
  }

  function processDiffBlocks(content: string): string {
    return content.replace(
      /```diff\s*\n([\s\S]*?)```/g,
      (_match, code) => {
        const lines = code.split('\n');
        const processedLines = lines.map((line: string, index: number) => {
          const lineNum = index + 1;
          if (line.startsWith('+')) {
            return `<div class="diff-line diff-add"><span class="diff-line-num">${lineNum}</span><span class="diff-content">${escapeHtml(line)}</span></div>`;
          } else if (line.startsWith('-')) {
            return `<div class="diff-line diff-remove"><span class="diff-line-num">${lineNum}</span><span class="diff-content">${escapeHtml(line)}</span></div>`;
          } else if (line.startsWith('@@')) {
            return `<div class="diff-line diff-header"><span class="diff-line-num">${lineNum}</span><span class="diff-content">${escapeHtml(line)}</span></div>`;
          }
          return `<div class="diff-line diff-context"><span class="diff-line-num">${lineNum}</span><span class="diff-content">${escapeHtml(line)}</span></div>`;
        });

        return `<div class="diff-block"><pre><code>${processedLines.join('')}</code></pre></div>`;
      }
    );
  }

  function processCodeBlocks(content: string): string {
    return content.replace(
      /```(\w+)?(?:\s+([^\n]+))?\s*\n([\s\S]*?)```/g,
      (match, lang, filename, code) => {
        // 如果已经处理过（diff 块），跳过
        if (lang === 'diff' || match.includes('diff-block')) {
          return match;
        }

        const trimmedCode = code.trim();
        const langLower = lang?.toLowerCase() || 'text';
        const displayLang = lang || 'text';
        const displayFilename = filename || '';

        if (highlighter && lang && SUPPORTED_LANGS.includes(langLower)) {
          try {
            const html = highlighter.codeToHtml(trimmedCode, {
              lang: langLower,
              themes: {
                dark: 'github-dark',
                light: 'github-light',
              },
            });

            return `<div class="code-block-wrapper">
              <div class="code-block-header">
                <span class="code-block-lang">${displayLang}${displayFilename ? ` • ${displayFilename}` : ''}</span>
                <button class="code-block-copy" onclick="navigator.clipboard.writeText(decodeURIComponent('${encodeURIComponent(trimmedCode)}'))">
                  复制
                </button>
              </div>
              <div class="shiki">${html}</div>
            </div>`;
          } catch {
            // 如果高亮失败，返回普通代码块
          }
        }

        // 降级：返回普通代码块
        return `<div class="code-block-wrapper">
          <div class="code-block-header">
            <span class="code-block-lang">${displayLang}${displayFilename ? ` • ${displayFilename}` : ''}</span>
            <button class="code-block-copy" onclick="navigator.clipboard.writeText(decodeURIComponent('${encodeURIComponent(trimmedCode)}'))">
              复制
            </button>
          </div>
          <pre><code class="language-${displayLang}">${escapeHtml(trimmedCode)}</code></pre>
        </div>`;
      }
    );
  }

  function processInlineCode(content: string): string {
    // 处理行内代码（但不在代码块内的）
    // 这个由 markdown-it 自动处理，这里不需要额外处理
    return content;
  }

  function escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  return {
    rendered,
    loading,
    render,
  };
}

// 预加载 highlighter
if (typeof window !== 'undefined') {
  initHighlighter().catch(console.error);
}
