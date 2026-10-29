# ButtonBar

Código: https://github.com/CarlosEmannoel16/buttonbar

Botões na barra de status do Cursor (e do VS Code). Você escolhe o texto, o lado da barra e o que acontece no clique: um comando no terminal, um comando do editor ou um link no navegador.

Quando você salva as configurações, os botões atualizam na hora. Não precisa recarregar a janela.

## Instalação

O pacote é o arquivo `buttonbar-0.0.1.vsix`.

1. Abra o Cursor.
2. Vá em **Extensions** (`Cmd+Shift+X`).
3. Clique nos `...` no topo do painel.
4. Escolha **Install from VSIX...** e selecione o arquivo.

Pelo terminal, na pasta onde está o arquivo:

```bash
cursor --install-extension buttonbar-0.0.1.vsix
```

Se o comando `cursor` não existir, abra a paleta (`Cmd+Shift+P`) e rode **Shell Command: Install 'cursor' command in PATH**. Feche e abra o terminal, e tente de novo.

Se os botões não aparecerem logo depois da instalação, rode **Developer: Reload Window** na paleta de comandos.

## Configuração

1. Abra a paleta de comandos (`Cmd+Shift+P`).
2. Rode **ButtonBar: Abrir configurações dos botões**.
3. Abra o `settings.json` (ícone de arquivo no canto da tela de configurações) e edite a lista `buttonbar.buttons`.

Dá para colocar a lista nas configurações do usuário ou no `.vscode/settings.json` do projeto. O editor completa os campos enquanto você digita.

Se a pasta ainda não for confiável, o Cursor ignora os botões definidos no projeto até você confiar nela. Os botões das configurações do usuário continuam valendo. Isso evita que um repositório desconhecido rode um comando sem a sua permissão.

Para ler a configuração de novo sem mudar nada, rode **ButtonBar: Recarregar botões**.

### Campos de cada botão

- `text` (obrigatório): o que aparece na barra. Aceita ícones do editor, por exemplo `$(play) Testes`. A [lista de ícones](https://code.visualstudio.com/api/references/icons-in-labels) mostra os nomes.
- `tooltip`: dica ao passar o mouse. Se faltar, usa o texto do botão.
- `color`: cor do texto. Pode ser hexadecimal (`#89d185`) ou uma cor do tema (`statusBarItem.warningForeground`).
- `alignment`: `left` ou `right`. O padrão é a esquerda.
- `priority`: número. Quanto maior, mais à esquerda o botão fica. O padrão é `0`. Se a ordem importar, use números diferentes.
- `confirm`: `true` pergunta antes de executar. Um texto vira a pergunta. Esse texto aceita as variáveis abaixo.
- `action` (obrigatório): o que o clique faz.

### Ação `terminal`

Roda um comando no terminal integrado.

- `command`: o comando de shell.
- `name`: nome do terminal. Se faltar, usa o texto do botão.
- `reuse`: `true` (padrão) manda o comando para um terminal já aberto com o mesmo nome. `false` abre um terminal novo.
- `cwd`: pasta onde o comando roda. O padrão é a pasta do projeto. Vale na hora em que o terminal é criado.
- `focus`: `true` (padrão) leva o foco para o terminal. `false` mostra o terminal e deixa o cursor no editor.

### Ação `command`

Executa um comando do Cursor ou do VS Code.

- `command`: o id, por exemplo `workbench.action.selectTheme`.
- `args`: lista de argumentos. Se o comando espera um objeto, coloque esse objeto como primeiro item da lista.

### Ação `url`

Abre um endereço `http` ou `https` no navegador.

- `url`: o endereço.

### Variáveis

Estas variáveis funcionam no comando, no nome do terminal, na pasta (`cwd`), na URL, nos argumentos e na pergunta de confirmação:

| Variável | Valor |
| --- | --- |
| `${workspaceFolder}` | Pasta do projeto |
| `${file}` | Caminho completo do arquivo aberto |
| `${fileBasename}` | Nome do arquivo aberto |
| `${relativeFile}` | Caminho do arquivo a partir da pasta do projeto |
| `${lineNumber}` | Linha do cursor, começando em 1 |
| `${selectedText}` | Texto selecionado |

Se não houver arquivo aberto, as variáveis de arquivo ficam vazias. Se o caminho tiver espaço, coloque a variável entre aspas no comando, por exemplo `node "${relativeFile}"`.

### Exemplo

```json
{
  "buttonbar.buttons": [
    {
      "text": "$(play) Run tests",
      "tooltip": "Roda npm test na pasta do projeto",
      "alignment": "left",
      "priority": 100,
      "action": {
        "type": "terminal",
        "command": "npm test",
        "name": "Testes",
        "reuse": true,
        "cwd": "${workspaceFolder}",
        "focus": true
      }
    },
    {
      "text": "$(server) Docker up",
      "tooltip": "Sobe os containers em segundo plano",
      "color": "#89d185",
      "priority": 90,
      "confirm": "Subir os containers com docker compose?",
      "action": {
        "type": "terminal",
        "command": "docker compose up -d",
        "name": "Docker"
      }
    },
    {
      "text": "$(beaker) Arquivo atual",
      "tooltip": "Roda o arquivo aberto com node",
      "priority": 80,
      "action": {
        "type": "terminal",
        "command": "node \"${relativeFile}\"",
        "name": "${fileBasename}",
        "cwd": "${workspaceFolder}"
      }
    },
    {
      "text": "$(symbol-color) Tema",
      "tooltip": "Abre o seletor de tema do Cursor",
      "alignment": "right",
      "priority": 50,
      "action": {
        "type": "command",
        "command": "workbench.action.selectTheme"
      }
    },
    {
      "text": "$(search) Buscar seleção",
      "tooltip": "Procura o texto selecionado no projeto",
      "alignment": "right",
      "priority": 40,
      "action": {
        "type": "command",
        "command": "workbench.action.findInFiles",
        "args": [
          {
            "query": "${selectedText}",
            "triggerSearch": true
          }
        ]
      }
    },
    {
      "text": "$(link-external) Node.js",
      "tooltip": "Abre a documentação do Node.js",
      "alignment": "right",
      "priority": 30,
      "action": {
        "type": "url",
        "url": "https://nodejs.org/docs/latest/api/"
      }
    }
  ]
}
```

## Comandos

- **ButtonBar: Abrir configurações dos botões** abre a configuração.
- **ButtonBar: Recarregar botões** lê a configuração de novo e recria os botões.

## Desenvolvimento

1. Instale as dependências com `npm install`.
2. Rode os testes com `npm test`.
3. Confira o lint com `npm run lint`.
4. Compile com `npm run compile`.
5. Gere o `.vsix` com `npm run package`.

Para experimentar no editor, abra esta pasta no Cursor e aperte F5. Isso abre uma janela com a extensão carregada.

## Licença

MIT
