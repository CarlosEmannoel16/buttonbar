import * as path from 'path';
import * as vscode from 'vscode';
import { runButton } from './actions';
import { parseButtons, type ButtonConfig } from './config';
import { stripCodicons } from './text';
import type { VariableContext } from './variables';

const SETTING = 'buttonbar.buttons';

let items: vscode.StatusBarItem[] = [];
let buttonsById = new Map<string, ButtonConfig>();
let lastErrorSignature = '';

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('buttonbar.openSettings', () => {
      return vscode.commands.executeCommand('workbench.action.openSettings', SETTING);
    }),
    vscode.commands.registerCommand('buttonbar.reload', () => {
      refresh(true);
    }),
    vscode.commands.registerCommand('buttonbar.run', (id: unknown) => {
      if (typeof id !== 'string') {
        return;
      }
      const button = buttonsById.get(id);
      if (!button) {
        return;
      }
      return runButton(button, buildVariableContext());
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(SETTING)) {
        refresh(false);
      }
    }),
  );

  refresh(false);
}

export function deactivate(): void {
  disposeItems();
}

function refresh(announceErrors: boolean): void {
  disposeItems();

  const raw: unknown = vscode.workspace.getConfiguration('buttonbar').get('buttons');
  const { buttons, errors } = parseButtons(raw);
  buttonsById = new Map(buttons.map((button) => [button.id, button]));
  reportErrors(errors, announceErrors);

  for (const button of buttons) {
    items.push(createItem(button));
  }
}

function reportErrors(errors: string[], announceErrors: boolean): void {
  const signature = errors.join('\n');
  if (errors.length === 0) {
    lastErrorSignature = '';
    return;
  }
  if (!announceErrors && signature === lastErrorSignature) {
    return;
  }

  const shown = errors.slice(0, 3).join(' ');
  const extra = errors.length > 3 ? ` (+${errors.length - 3})` : '';
  const label = errors.length === 1 ? '1 botão foi ignorado' : `${errors.length} botões foram ignorados`;
  void vscode.window.showWarningMessage(`ButtonBar: ${label}. ${shown}${extra}`);
  for (const error of errors) {
    console.warn(`ButtonBar: ${error}`);
  }
  lastErrorSignature = signature;
}

function createItem(button: ButtonConfig): vscode.StatusBarItem {
  const alignment = button.alignment === 'right'
    ? vscode.StatusBarAlignment.Right
    : vscode.StatusBarAlignment.Left;
  const item = vscode.window.createStatusBarItem(button.id, alignment, button.priority);
  const label = stripCodicons(button.text) || button.text;
  item.name = label;
  item.text = button.text;
  item.tooltip = button.tooltip ?? label;
  item.accessibilityInformation = { label, role: 'button' };
  if (button.color) {
    item.color = isThemeColor(button.color) ? new vscode.ThemeColor(button.color) : button.color;
  }
  item.command = {
    command: 'buttonbar.run',
    title: label,
    arguments: [button.id],
  };
  item.show();
  return item;
}

function isThemeColor(color: string): boolean {
  return color.includes('.') && !color.startsWith('#');
}

function disposeItems(): void {
  for (const item of items) {
    item.dispose();
  }
  items = [];
  buttonsById = new Map();
}

function buildVariableContext(): VariableContext {
  const editor = vscode.window.activeTextEditor;
  const document = editor?.document;
  const file = document?.uri.scheme === 'file' ? document.uri.fsPath : '';
  const folderFromFile = document
    ? vscode.workspace.getWorkspaceFolder(document.uri)?.uri.fsPath
    : undefined;
  const workspaceFolder = folderFromFile || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';

  let selectedText = '';
  let lineNumber = '';
  if (editor && document) {
    lineNumber = String(editor.selection.active.line + 1);
    if (!editor.selection.isEmpty) {
      selectedText = document.getText(editor.selection);
    }
  }

  return {
    workspaceFolder,
    file,
    fileBasename: file ? path.basename(file) : '',
    relativeFile: file && workspaceFolder ? path.relative(workspaceFolder, file) : '',
    lineNumber,
    selectedText,
  };
}
