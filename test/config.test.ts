import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { join } from 'node:path';
import { parseButtons } from '../src/config';

describe('parseButtons', () => {
  it('trata ausência como lista vazia', () => {
    assert.deepEqual(parseButtons(undefined), { buttons: [], errors: [] });
    assert.deepEqual(parseButtons([]), { buttons: [], errors: [] });
  });

  it('recusa o que não for lista', () => {
    for (const value of [null, {}, 'npm test', 1]) {
      const result = parseButtons(value);
      assert.deepEqual(result.buttons, []);
      assert.deepEqual(result.errors, ['buttonbar.buttons precisa ser uma lista.']);
    }
  });

  it('preenche os padrões de um botão de terminal', () => {
    const result = parseButtons([
      { text: '  $(play) Run tests  ', action: { type: ' Terminal ', command: '  npm test  ' } },
    ]);
    assert.deepEqual(result.errors, []);
    assert.equal(result.buttons.length, 1);
    const button = result.buttons[0];
    assert.ok(button);
    assert.equal(button.id, 'buttonbar-0');
    assert.equal(button.text, '$(play) Run tests');
    assert.equal(button.alignment, 'left');
    assert.equal(button.priority, 0);
    assert.equal(button.confirm, undefined);
    assert.deepEqual(button.action, {
      type: 'terminal',
      command: 'npm test',
      reuse: true,
      focus: true,
    });

    const explicit = parseButtons([
      {
        text: 'Docker',
        confirm: false,
        action: { type: 'terminal', command: 'docker compose up -d', reuse: false, focus: false, name: 'Docker' },
      },
    ]);
    assert.deepEqual(explicit.errors, []);
    assert.equal(explicit.buttons[0]?.confirm, false);
    assert.deepEqual(explicit.buttons[0]?.action, {
      type: 'terminal',
      command: 'docker compose up -d',
      name: 'Docker',
      reuse: false,
      focus: false,
    });
  });

  it('lê command e url com os campos opcionais', () => {
    const result = parseButtons([
      {
        text: 'Tema',
        tooltip: '  Abre o tema  ',
        color: ' #89d185 ',
        alignment: 'Right',
        priority: 50,
        confirm: true,
        extra: 'ignorado',
        action: {
          type: 'command',
          command: 'workbench.action.selectTheme',
          unused: true,
        },
      },
      {
        text: 'Docs',
        alignment: 'right',
        priority: -1,
        confirm: '  Abrir a documentação? ',
        action: { type: 'URL', url: ' https://nodejs.org ' },
      },
    ]);

    assert.deepEqual(result.errors, []);
    assert.equal(result.buttons[0]?.tooltip, 'Abre o tema');
    assert.equal(result.buttons[0]?.color, '#89d185');
    assert.equal(result.buttons[0]?.alignment, 'right');
    assert.equal(result.buttons[0]?.priority, 50);
    assert.equal(result.buttons[0]?.confirm, true);
    assert.deepEqual(result.buttons[0]?.action, {
      type: 'command',
      command: 'workbench.action.selectTheme',
      args: [],
    });
    assert.equal(result.buttons[1]?.confirm, 'Abrir a documentação?');
    assert.equal(result.buttons[1]?.priority, -1);
    assert.deepEqual(result.buttons[1]?.action, {
      type: 'url',
      url: 'https://nodejs.org',
    });
  });

  it('copia os argumentos para não alterar a configuração original', () => {
    const args = ['a'];
    const result = parseButtons([
      { text: 'A', action: { type: 'command', command: 'x', args } },
    ]);
    const button = result.buttons[0];
    assert.ok(button && button.action.type === 'command');
    if (button?.action.type === 'command') {
      button.action.args.push('b');
    }
    assert.deepEqual(args, ['a']);
  });

  it('mantém os botões válidos e aponta o índice do inválido', () => {
    const result = parseButtons([
      { text: 'Ok', action: { type: 'url', url: 'https://example.com' } },
      { text: '   ' },
      'botão',
      { text: 'Outro', action: { type: 'command', command: 'workbench.action.selectTheme' } },
    ]);
    assert.deepEqual(result.buttons.map((button) => button.id), ['buttonbar-0', 'buttonbar-3']);
    assert.equal(result.errors.length, 2);
    assert.match(result.errors[0] ?? '', /^Botão 2:/);
    assert.match(result.errors[1] ?? '', /^Botão 3:/);
  });

  it('explica campos obrigatórios e tipos errados', () => {
    const result = parseButtons([
      { action: { type: 'terminal', command: 'npm test' } },
      { text: 'Sem ação' },
      { text: 'Tipo', action: { type: 'shell', command: 'npm test' } },
      { text: 'Terminal', action: { type: 'terminal' } },
      { text: 'Comando', action: { type: 'command' } },
      { text: 'Args', action: { type: 'command', command: 'x', args: 'nope' } },
      { text: 'Link', action: { type: 'url', url: '   ' } },
      { text: 'Lado', alignment: 'top', action: { type: 'url', url: 'https://example.com' } },
      { text: 'Prioridade', priority: 'alta', action: { type: 'url', url: 'https://example.com' } },
      { text: 'Confirma', confirm: '', action: { type: 'url', url: 'https://example.com' } },
      { text: 'Reuse', action: { type: 'terminal', command: 'npm test', reuse: 'yes' } },
      { text: 'Cor', color: 1, action: { type: 'url', url: 'https://example.com' } },
    ]);

    assert.equal(result.buttons.length, 0);
    assert.equal(result.errors.length, 12);
    assert.match(result.errors[0] ?? '', /"text"/);
    assert.match(result.errors[1] ?? '', /"action"/);
    assert.match(result.errors[2] ?? '', /action\.type/);
    assert.match(result.errors[3] ?? '', /action\.command/);
    assert.match(result.errors[4] ?? '', /action\.command/);
    assert.match(result.errors[5] ?? '', /action\.args/);
    assert.match(result.errors[6] ?? '', /action\.url/);
    assert.match(result.errors[7] ?? '', /alignment/);
    assert.match(result.errors[8] ?? '', /priority/);
    assert.match(result.errors[9] ?? '', /confirm/);
    assert.match(result.errors[10] ?? '', /action\.reuse/);
    assert.match(result.errors[11] ?? '', /color/);
  });

  it('aceita os exemplos do README', () => {
    const readme = readFileSync(join(process.cwd(), 'README.md'), 'utf8');
    const blocks = [...readme.matchAll(/```json\r?\n([\s\S]*?)```/g)];
    assert.ok(blocks.length > 0, 'o README precisa ter um exemplo JSON');

    for (const block of blocks) {
      const parsed = JSON.parse(block[1] ?? '') as { 'buttonbar.buttons'?: unknown };
      const result = parseButtons(parsed['buttonbar.buttons']);
      assert.deepEqual(result.errors, []);
      assert.ok(result.buttons.length >= 4);

      const commands = result.buttons.map((button) => {
        if (button.action.type === 'url') {
          return button.action.url;
        }
        return button.action.command;
      });
      assert.ok(commands.includes('npm test'));
      assert.ok(commands.includes('docker compose up -d'));
      assert.ok(commands.includes('workbench.action.selectTheme'));
      assert.ok(commands.some((command) => command.startsWith('https://')));

      const docker = result.buttons.find((button) => button.text.includes('Docker'));
      assert.ok(docker);
      assert.equal(docker.action.type, 'terminal');
      if (docker.action.type === 'terminal') {
        assert.equal(docker.action.reuse, true);
        assert.equal(docker.action.focus, true);
      }
      assert.equal(typeof docker.confirm, 'string');
    }
  });
});
