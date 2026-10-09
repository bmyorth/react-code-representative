import { Link } from 'react-router';

import { buildPath } from '@/shared/config/routes';
import { StatusMessage } from '@/shared/ui';

export function NotFoundPage() {
  return (
    <>
      <title>Página no encontrada · Tienda</title>
      <StatusMessage
        title="Página no encontrada"
        description="La página que buscas no existe o se ha movido."
        action={<Link to={buildPath.catalog()}>Volver al catálogo</Link>}
      />
    </>
  );
}
