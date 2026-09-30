/** Lightweight IntelliSense / snippet completions for Monaco (no full LSP server). */
import type { languages, IDisposable } from 'monaco-editor'

const SNIPPETS: Record<string, { label: string; insert: string; detail: string }[]> = {
  typescript: [
    { label: 'log', insert: 'console.log($1)', detail: 'console.log' },
    { label: 'fn', insert: 'function ${1:name}($2) {\n  $3\n}', detail: 'function' },
    { label: 'afn', insert: 'const ${1:name} = ($2) => {\n  $3\n}', detail: 'arrow function' },
    { label: 'useState', insert: 'const [${1:state}, set${2:State}] = useState($3)', detail: 'React useState' },
    { label: 'useEffect', insert: 'useEffect(() => {\n  $1\n  return () => {\n    $2\n  }\n}, [$3])', detail: 'React useEffect' },
    { label: 'interface', insert: 'interface ${1:Name} {\n  $2\n}', detail: 'interface' },
  ],
  javascript: [
    { label: 'log', insert: 'console.log($1)', detail: 'console.log' },
    { label: 'fn', insert: 'function ${1:name}($2) {\n  $3\n}', detail: 'function' },
    { label: 'afn', insert: 'const ${1:name} = ($2) => {\n  $3\n}', detail: 'arrow function' },
  ],
  html: [
    { label: 'html5', insert: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <title>$1</title>\n</head>\n<body>\n  $2\n</body>\n</html>', detail: 'HTML5 document' },
    { label: 'div', insert: '<div class="$1">$2</div>', detail: 'div' },
  ],
  css: [
    { label: 'flex', insert: 'display: flex;\nalign-items: center;\njustify-content: center;', detail: 'flex center' },
    { label: 'keyframes', insert: '@keyframes ${1:name} {\n  from { $2 }\n  to { $3 }\n}', detail: '@keyframes' },
  ],
  python: [
    { label: 'main', insert: 'def main():\n    $1\n\nif __name__ == "__main__":\n    main()', detail: 'main guard' },
    { label: 'def', insert: 'def ${1:name}($2):\n    $3', detail: 'function' },
  ],
  dart: [
    { label: 'stless', insert: 'class ${1:Name} extends StatelessWidget {\n  const ${1:Name}({super.key});\n  @override\n  Widget build(BuildContext context) {\n    return $2;\n  }\n}', detail: 'StatelessWidget' },
  ],
  markdown: [
    { label: 'img', insert: '![${1:alt}](${2:path})', detail: 'image' },
  ],
}

export function registerNoderCompletions(monaco: typeof import('monaco-editor')): IDisposable[] {
  const disposables: IDisposable[] = []
  for (const lang of Object.keys(SNIPPETS)) {
    const items = SNIPPETS[lang]
    disposables.push(
      monaco.languages.registerCompletionItemProvider(lang, {
        triggerCharacters: ['.', '<', '"', "'", '/'],
        provideCompletionItems(model, position) {
          const word = model.getWordUntilPosition(position)
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          }
          const suggestions: languages.CompletionItem[] = items.map((s, i) => ({
            label: s.label,
            kind: monaco.languages.CompletionItemKind.Snippet,
            documentation: s.detail,
            insertText: s.insert,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
            sortText: `0${i}`,
          }))
          return { suggestions }
        },
      })
    )
  }
  return disposables
}
