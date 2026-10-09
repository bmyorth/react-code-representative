/**
 * Lee un campo de texto de un `FormData`. `FormData.get` puede devolver un `File`;
 * en los formularios de texto un valor que no sea cadena se trata como vacío.
 */
export function formString(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === 'string' ? value : '';
}
