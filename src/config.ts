export interface TerminalAction {
  type: 'terminal';
  command: string;
  name?: string;
  reuse: boolean;
  cwd?: string;
  focus: boolean;
}

export interface CommandAction {
  type: 'command';
  command: string;
  args: unknown[];
}

export interface UrlAction {
  type: 'url';
  url: string;
}

export type ActionConfig = TerminalAction | CommandAction | UrlAction;

export interface ButtonConfig {
  id: string;
  text: string;
  tooltip?: string;
  color?: string;
  alignment: 'left' | 'right';
  priority: number;
  confirm?: boolean | string;
  action: ActionConfig;
}

export interface ParseResult {
  buttons: ButtonConfig[];
  errors: string[];
}

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export function parseButtons(input: unknown): ParseResult {
  if (input === undefined) {
    return { buttons: [], errors: [] };
  }
  if (!Array.isArray(input)) {
    return {
      buttons: [],
      errors: ['buttonbar.buttons precisa ser uma lista.'],
    };
  }

  const buttons: ButtonConfig[] = [];
  const errors: string[] = [];
  input.forEach((entry, index) => {
    const parsed = parseButton(entry, index);
    if (parsed.ok) {
      buttons.push(parsed.value);
    } else {
      errors.push(`Botão ${index + 1}: ${parsed.error}`);
    }
  });
  return { buttons, errors };
}

function parseButton(entry: unknown, index: number): Result<ButtonConfig> {
  if (!isRecord(entry)) {
    return fail('cada botão precisa ser um objeto.');
  }

  const text = readRequiredString(entry.text, 'text');
  if (!text.ok) {
    return text;
  }

  const tooltip = readOptionalString(entry.tooltip, 'tooltip');
  if (!tooltip.ok) {
    return tooltip;
  }

  const color = readOptionalString(entry.color, 'color');
  if (!color.ok) {
    return color;
  }

  const alignment = readAlignment(entry.alignment);
  if (!alignment.ok) {
    return alignment;
  }

  const priority = readPriority(entry.priority);
  if (!priority.ok) {
    return priority;
  }

  const confirm = readConfirm(entry.confirm);
  if (!confirm.ok) {
    return confirm;
  }

  const action = parseAction(entry.action);
  if (!action.ok) {
    return action;
  }

  const button: ButtonConfig = {
    id: `buttonbar-${index}`,
    text: text.value,
    alignment: alignment.value,
    priority: priority.value,
    action: action.value,
  };
  if (tooltip.value) {
    button.tooltip = tooltip.value;
  }
  if (color.value) {
    button.color = color.value;
  }
  if (confirm.value !== undefined) {
    button.confirm = confirm.value;
  }
  return { ok: true, value: button };
}

function parseAction(value: unknown): Result<ActionConfig> {
  if (!isRecord(value)) {
    return fail('o campo "action" precisa ser um objeto.');
  }

  const type = typeof value.type === 'string' ? value.type.trim().toLowerCase() : '';
  if (type === 'terminal') {
    return parseTerminalAction(value);
  }
  if (type === 'command') {
    return parseCommandAction(value);
  }
  if (type === 'url') {
    return parseUrlAction(value);
  }
  return fail('o campo "action.type" precisa ser "terminal", "command" ou "url".');
}

function parseTerminalAction(value: Record<string, unknown>): Result<TerminalAction> {
  const command = readRequiredString(value.command, 'action.command');
  if (!command.ok) {
    return command;
  }
  const name = readOptionalString(value.name, 'action.name');
  if (!name.ok) {
    return name;
  }
  const cwd = readOptionalString(value.cwd, 'action.cwd');
  if (!cwd.ok) {
    return cwd;
  }
  const reuse = readBoolean(value.reuse, 'action.reuse', true);
  if (!reuse.ok) {
    return reuse;
  }
  const focus = readBoolean(value.focus, 'action.focus', true);
  if (!focus.ok) {
    return focus;
  }

  const action: TerminalAction = {
    type: 'terminal',
    command: command.value,
    reuse: reuse.value,
    focus: focus.value,
  };
  if (name.value) {
    action.name = name.value;
  }
  if (cwd.value) {
    action.cwd = cwd.value;
  }
  return { ok: true, value: action };
}

function parseCommandAction(value: Record<string, unknown>): Result<CommandAction> {
  const command = readRequiredString(value.command, 'action.command');
  if (!command.ok) {
    return command;
  }
  if (value.args === undefined) {
    return { ok: true, value: { type: 'command', command: command.value, args: [] } };
  }
  if (!Array.isArray(value.args)) {
    return fail('o campo "action.args" precisa ser uma lista.');
  }
  return {
    ok: true,
    value: { type: 'command', command: command.value, args: [...value.args] },
  };
}

function parseUrlAction(value: Record<string, unknown>): Result<UrlAction> {
  const url = readRequiredString(value.url, 'action.url');
  if (!url.ok) {
    return url;
  }
  return { ok: true, value: { type: 'url', url: url.value } };
}

function readRequiredString(value: unknown, field: string): Result<string> {
  if (typeof value !== 'string' || value.trim() === '') {
    return fail(`o campo "${field}" precisa ser um texto.`);
  }
  return { ok: true, value: value.trim() };
}

function readOptionalString(value: unknown, field: string): Result<string | undefined> {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }
  if (typeof value !== 'string') {
    return fail(`o campo "${field}" precisa ser um texto.`);
  }
  const trimmed = value.trim();
  return { ok: true, value: trimmed || undefined };
}

function readAlignment(value: unknown): Result<'left' | 'right'> {
  if (value === undefined) {
    return { ok: true, value: 'left' };
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'left' || normalized === 'right') {
      return { ok: true, value: normalized };
    }
  }
  return fail('o campo "alignment" precisa ser "left" ou "right".');
}

function readPriority(value: unknown): Result<number> {
  if (value === undefined) {
    return { ok: true, value: 0 };
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fail('o campo "priority" precisa ser um número.');
  }
  return { ok: true, value };
}

function readConfirm(value: unknown): Result<boolean | string | undefined> {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }
  if (typeof value === 'boolean') {
    return { ok: true, value };
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return { ok: true, value: value.trim() };
  }
  return fail('o campo "confirm" precisa ser true, false ou um texto.');
}

function readBoolean(value: unknown, field: string, fallback: boolean): Result<boolean> {
  if (value === undefined) {
    return { ok: true, value: fallback };
  }
  if (typeof value !== 'boolean') {
    return fail(`o campo "${field}" precisa ser true ou false.`);
  }
  return { ok: true, value };
}

function fail(error: string): Result<never> {
  return { ok: false, error };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
