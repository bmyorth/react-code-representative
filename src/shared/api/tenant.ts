const STORAGE_KEY = 'tenant-id';

/** Tienda (tenant) por defecto cuando el usuario no ha elegido ninguna. */
export const DEFAULT_TENANT_ID = 'acme';

/** Tiendas disponibles en el backend local. En un producto real las devolvería la API. */
export const TENANTS = [
  { id: 'acme', name: 'Acme Store' },
  { id: 'globex', name: 'Globex Outlet' },
] as const;

/** Tenant activo. Viaja en la cabecera `X-Tenant-Id` de cada petición. */
export function getTenantId(): string {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return TENANTS.some((tenant) => tenant.id === stored) && stored ? stored : DEFAULT_TENANT_ID;
  } catch {
    // Almacenamiento bloqueado (modo privado, políticas del navegador): se usa el valor por defecto.
    return DEFAULT_TENANT_ID;
  }
}

/** Cambia el tenant activo. Quien lo llama debe invalidar la caché de datos. */
export function setTenantId(tenantId: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, tenantId);
  } catch {
    // Sin almacenamiento el cambio solo dura hasta recargar: no es un error de la aplicación.
  }
}
