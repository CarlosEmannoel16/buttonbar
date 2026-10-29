import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ButtonConfig } from '../src/config';
import { applyVariables, substituteValue, substituteVariables, type VariableContext } from '../src/variables';

const ctx: VariableContext = {
  workspaceFolder: '/proj',
  file: '/proj/src/app.ts',
  fileBasename: 'app.ts',
  relativeFile: 'src/app.ts',
  lineNumber: '12',
  selectedText: 'sum',
};

describe('substituteVariables', () => {
  it('substitui todas as variáveis conhecidas', () => {
    const input = [
      '${workspaceFolder}',
      '${file}',
      '${fileBasename}',
      '${relativeFile}',
      '${lineNumber}',
      '${selectedText}',
    ].join(' ');
    assert.equal(substituteVariables(input, ctx), '/proj /proj/src/app.ts app.ts src/app.ts 12 sum');
  });

  it('não confunde ${file} com ${fileBasename}', () => {
    assert.equal(substituteVariables('${fileBasename}', ctx), 'app.ts');
    assert.equal(substituteVariables('${file}', ctx), '/proj/src/app.ts');
    assert.equal(substituteVariables('${file} ${fileBasename}', ctx), '/proj/src/app.ts app.ts');
  });

  it('troca várias ocorrências da mesma variável', () => {
    assert.equal(substituteVariables('${fileBasename}-${fileBasename}', ctx), 'app.ts-app.ts');
  });

  it('deixa variáveis desconhecidas como estão', () => {
    assert.equal(substituteVariables('echo ${env:HOME} ${fileName}', ctx), 'echo ${env:HOME} ${fileName}');
  });

  it('usa texto vazio quando o valor não veio', () => {
    assert.equal(substituteVariables('node ${relativeFile}', {}), 'node ');
  });

  it('não reprocessa o valor inserido', () => {
    assert.equal(
      substituteVariables('${selectedText}', { selectedText: '${file}' }),
      '${file}',
    );
  });

  it('insere $ literalmente', () => {
    assert.equal(
      substituteVariables('say ${selectedText}', { selectedText: '$& cents' }),
      'say $& cents',
    );
  });

  it('preserva barras do valor', () => {
    assert.equal(
      substituteVariables('${relativeFile}', { relativeFile: 'src\\app.ts' }),
      'src\\app.ts',
    );
  });
});

describe('substituteValue', () => {
  it('percorre objetos e listas e mantém o resto', () => {
    const value = {
      query: 'line ${lineNumber}',
      flags: ['${fileBasename}', 1],
      enabled: true,
      empty: null,
    };
    assert.deepEqual(substituteValue(value, ctx), {
      query: 'line 12',
      flags: ['app.ts', 1],
      enabled: true,
      empty: null,
    });
  });
});

describe('applyVariables', () => {
  it('aplica variáveis no terminal, no comando e na url', () => {
    const terminal = applyVariables(button({
      action: {
        type: 'terminal',
        command: 'node "${relativeFile}"',
        name: '${fileBasename}',
        cwd: '${workspaceFolder}',
        reuse: true,
        focus: false,
      },
    }), ctx);
    assert.equal(terminal.action.type, 'terminal');
    if (terminal.action.type === 'terminal') {
      assert.equal(terminal.action.command, 'node "src/app.ts"');
      assert.equal(terminal.action.name, 'app.ts');
      assert.equal(terminal.action.cwd, '/proj');
      assert.equal(terminal.action.focus, false);
    }

    const command = applyVariables(button({
      confirm: 'Buscar ${selectedText} na linha ${lineNumber}?',
      action: {
        type: 'command',
        command: 'workbench.action.findInFiles',
        args: [{ query: '${selectedText}', nested: ['${fileBasename}'] }],
      },
    }), ctx);
    assert.equal(command.confirm, 'Buscar sum na linha 12?');
    assert.equal(command.action.type, 'command');
    if (command.action.type === 'command') {
      assert.deepEqual(command.action.args, [{ query: 'sum', nested: ['app.ts'] }]);
    }

    const url = applyVariables(button({
      action: { type: 'url', url: 'https://example.com/${relativeFile}' },
    }), ctx);
    assert.equal(url.action.type, 'url');
    if (url.action.type === 'url') {
      assert.equal(url.action.url, 'https://example.com/src/app.ts');
    }
  });

  it('não muda o texto do botão nem o original', () => {
    const original = button({
      text: '$(play) ${fileBasename}',
      confirm: 'Rodar ${fileBasename}?',
      action: { type: 'terminal', command: 'npm test', reuse: true, focus: true },
    });
    const snapshot = structuredClone(original);
    const resolved = applyVariables(original, ctx);
    assert.equal(resolved.text, '$(play) ${fileBasename}');
    assert.equal(resolved.confirm, 'Rodar app.ts?');
    assert.deepEqual(original, snapshot);
  });

  it('mantém confirm booleano', () => {
    const resolved = applyVariables(button({
      confirm: true,
      action: { type: 'url', url: 'https://example.com' },
    }), ctx);
    assert.equal(resolved.confirm, true);
  });
});

function button(overrides: Partial<ButtonConfig> & Pick<ButtonConfig, 'action'>): ButtonConfig {
  return {
    id: 'buttonbar-0',
    text: '$(play) Run',
    alignment: 'left',
    priority: 0,
    ...overrides,
  };
}
