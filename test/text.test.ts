import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { confirmationMessage, stripCodicons } from '../src/text';

describe('stripCodicons', () => {
  it('remove o ícone e deixa o texto', () => {
    assert.equal(stripCodicons('$(play) Run tests'), 'Run tests');
    assert.equal(stripCodicons('$(server) Docker up'), 'Docker up');
    assert.equal(stripCodicons('$(sync~spin) Sync'), 'Sync');
  });

  it('fica vazio quando só há ícone', () => {
    assert.equal(stripCodicons('$(play)'), '');
    assert.equal(stripCodicons('plain'), 'plain');
  });
});

describe('confirmationMessage', () => {
  it('não pergunta quando a confirmação está desligada', () => {
    assert.equal(confirmationMessage('$(play) Run tests', undefined), undefined);
    assert.equal(confirmationMessage('$(play) Run tests', false), undefined);
  });

  it('usa a pergunta padrão ou o texto informado', () => {
    assert.equal(confirmationMessage('$(play) Run tests', true), 'Executar "Run tests"?');
    assert.equal(confirmationMessage('$(play)', true), 'Executar "$(play)"?');
    assert.equal(confirmationMessage('Run', '  Subir os containers?  '), 'Subir os containers?');
    assert.equal(confirmationMessage('$(play) Run tests', '   '), 'Executar "Run tests"?');
  });

  it('encurta uma pergunta muito longa', () => {
    const message = confirmationMessage('Run', 'a'.repeat(600));
    assert.equal(message?.length, 501);
    assert.equal(message?.endsWith('…'), true);
  });
});
