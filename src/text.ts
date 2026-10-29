const CONFIRM_LIMIT = 500;

/** Removes codicons such as `$(play)` so dialogs and names stay readable. */
export function stripCodicons(text: string): string {
  return text.replace(/\$\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Returns the question to show, or undefined when the button should run immediately. */
export function confirmationMessage(
  buttonText: string,
  confirm: boolean | string | undefined,
): string | undefined {
  if (confirm === undefined || confirm === false) {
    return undefined;
  }

  const custom = typeof confirm === 'string' ? confirm.trim() : '';
  const raw = custom || `Executar "${stripCodicons(buttonText) || buttonText}"?`;
  return raw.length > CONFIRM_LIMIT ? `${raw.slice(0, CONFIRM_LIMIT)}…` : raw;
}
