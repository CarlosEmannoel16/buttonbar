import * as vscode from 'vscode';
import type { ButtonConfig, CommandAction, TerminalAction, UrlAction } from './config';
import { confirmationMessage, stripCodicons } from './text';
import { applyVariables, type VariableContext } from './variables';

export async function runButton(button: ButtonConfig, ctx: VariableContext): Promise<void> {
  const resolved = applyVariables(button, ctx);
  if (!(await askConfirmation(button.text, resolved.confirm))) {
    return;
  }

  if (resolved.action.type === 'terminal') {
    runInTerminal(resolved.action, button.text);
    return;
  }
  if (resolved.action.type === 'command') {
    await runEditorCommand(resolved.action);
    return;
  }
  if (resolved.action.type === 'url') {
    await openUrl(resolved.action);
    return;
  }

  const unexpected: never = resolved.action;
  throw new Error(`ButtonBar: ação desconhecida (${JSON.stringify(unexpected)}).`);
}

async function askConfirmation(buttonText: string, confirm: ButtonConfig['confirm']): Promise<boolean> {
  const message = confirmationMessage(buttonText, confirm);
  if (!message) {
    return true;
  }

  const choice = await vscode.window.showWarningMessage(message, { modal: true }, 'Executar', 'Cancelar');
  return choice === 'Executar';
}

function runInTerminal(action: TerminalAction, buttonText: string): void {
  const command = action.command.trim();
  if (!command) {
    void vscode.window.showErrorMessage('ButtonBar: o comando do terminal está vazio.');
    return;
  }

  const name = action.name?.trim() || stripCodicons(buttonText) || 'ButtonBar';
  let terminal = action.reuse ? findOpenTerminal(name) : undefined;
  if (!terminal) {
    const cwd = action.cwd?.trim() || workspaceFolderPath();
    try {
      terminal = vscode.window.createTerminal({
        name,
        cwd: cwd || undefined,
      });
    } catch (error) {
      void vscode.window.showErrorMessage(
        `ButtonBar: não foi possível abrir o terminal. ${errorMessage(error)}`,
      );
      return;
    }
  }

  // show(preserveFocus): true keeps the cursor in the editor.
  terminal.show(!action.focus);
  terminal.sendText(command, true);
}

function findOpenTerminal(name: string): vscode.Terminal | undefined {
  return vscode.window.terminals.find((terminal) => {
    return terminal.name === name && terminal.exitStatus === undefined;
  });
}

function workspaceFolderPath(): string | undefined {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    const folder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
    if (folder) {
      return folder.uri.fsPath;
    }
  }
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

async function runEditorCommand(action: CommandAction): Promise<void> {
  const command = action.command.trim();
  if (!command) {
    void vscode.window.showErrorMessage('ButtonBar: o id do comando está vazio.');
    return;
  }

  try {
    await vscode.commands.executeCommand(command, ...action.args);
  } catch (error) {
    void vscode.window.showErrorMessage(
      `ButtonBar: não foi possível executar "${command}". ${errorMessage(error)}`,
    );
  }
}

async function openUrl(action: UrlAction): Promise<void> {
  const url = action.url.trim();
  if (!url) {
    void vscode.window.showErrorMessage('ButtonBar: a URL está vazia.');
    return;
  }

  let parsed: vscode.Uri;
  try {
    parsed = vscode.Uri.parse(url, true);
  } catch (error) {
    void vscode.window.showErrorMessage(`ButtonBar: URL inválida. ${errorMessage(error)}`);
    return;
  }

  if (parsed.scheme !== 'http' && parsed.scheme !== 'https') {
    void vscode.window.showErrorMessage('ButtonBar: a URL precisa começar com http:// ou https://.');
    return;
  }

  const opened = await vscode.env.openExternal(parsed);
  if (!opened) {
    void vscode.window.showErrorMessage('ButtonBar: o navegador não abriu a URL.');
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
