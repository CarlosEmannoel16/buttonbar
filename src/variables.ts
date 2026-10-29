import type { ActionConfig, ButtonConfig, TerminalAction } from './config';

export interface VariableContext {
  workspaceFolder?: string;
  file?: string;
  fileBasename?: string;
  relativeFile?: string;
  lineNumber?: string;
  selectedText?: string;
}

const VARIABLE =
  /\$\{(workspaceFolder|fileBasename|relativeFile|lineNumber|selectedText|file)\}/g;

const VALUES: Record<string, (ctx: VariableContext) => string> = {
  workspaceFolder: (ctx) => ctx.workspaceFolder ?? '',
  file: (ctx) => ctx.file ?? '',
  fileBasename: (ctx) => ctx.fileBasename ?? '',
  relativeFile: (ctx) => ctx.relativeFile ?? '',
  lineNumber: (ctx) => ctx.lineNumber ?? '',
  selectedText: (ctx) => ctx.selectedText ?? '',
};

export function substituteVariables(input: string, ctx: VariableContext): string {
  return input.replace(VARIABLE, (_match, name: string) => VALUES[name]?.(ctx) ?? '');
}

export function substituteValue(value: unknown, ctx: VariableContext): unknown {
  if (typeof value === 'string') {
    return substituteVariables(value, ctx);
  }
  if (Array.isArray(value)) {
    return value.map((item) => substituteValue(item, ctx));
  }
  if (isPlainObject(value)) {
    const copy: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      copy[key] = substituteValue(nested, ctx);
    }
    return copy;
  }
  return value;
}

export function applyVariables(button: ButtonConfig, ctx: VariableContext): ButtonConfig {
  const action = applyAction(button.action, ctx);
  if (typeof button.confirm !== 'string') {
    return { ...button, action };
  }
  return { ...button, action, confirm: substituteVariables(button.confirm, ctx) };
}

function applyAction(action: ActionConfig, ctx: VariableContext): ActionConfig {
  switch (action.type) {
    case 'terminal':
      return applyTerminal(action, ctx);
    case 'command':
      return {
        type: 'command',
        command: substituteVariables(action.command, ctx),
        args: action.args.map((arg) => substituteValue(arg, ctx)),
      };
    case 'url':
      return {
        type: 'url',
        url: substituteVariables(action.url, ctx),
      };
  }
}

function applyTerminal(action: TerminalAction, ctx: VariableContext): TerminalAction {
  const next: TerminalAction = {
    type: 'terminal',
    command: substituteVariables(action.command, ctx),
    reuse: action.reuse,
    focus: action.focus,
  };
  if (action.name !== undefined) {
    next.name = substituteVariables(action.name, ctx);
  }
  if (action.cwd !== undefined) {
    next.cwd = substituteVariables(action.cwd, ctx);
  }
  return next;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value) as unknown;
  return prototype === Object.prototype || prototype === null;
}
