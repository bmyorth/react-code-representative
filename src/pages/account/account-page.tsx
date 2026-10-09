import { AccountView } from '@/features/auth';

/** Página `/account`: perfil y control de sesiones por dispositivo. */
export function AccountPage() {
  return (
    <>
      <title>Mi cuenta · Tienda</title>
      <h1 className="page-title">Mi cuenta</h1>
      <AccountView />
    </>
  );
}
