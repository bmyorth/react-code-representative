/** Une clases CSS ignorando valores falsy. */
export function cn(...classNames: (string | false | null | undefined)[]): string {
  return classNames.filter(Boolean).join(' ');
}
