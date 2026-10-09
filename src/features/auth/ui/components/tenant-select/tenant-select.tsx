import { useQueryClient } from '@tanstack/react-query';
import { useId, useState } from 'react';

import { getTenantId, setTenantId, TENANTS } from '@/shared/api';

import styles from './tenant-select.module.css';

/**
 * Selector de tienda (tenant) para visitantes. Cada tienda tiene su propia lista de precios;
 * al cambiarla se descarta la caché para que catálogo y precios se vuelvan a pedir.
 */
export function TenantSelect() {
  const id = useId();
  const queryClient = useQueryClient();
  const [tenantId, setCurrent] = useState(getTenantId);

  return (
    <div className={styles.wrapper}>
      <label htmlFor={id} className={styles.label}>
        Tienda
      </label>
      <select
        id={id}
        className={styles.select}
        value={tenantId}
        onChange={(event) => {
          setTenantId(event.target.value);
          setCurrent(event.target.value);
          void queryClient.invalidateQueries();
        }}
      >
        {TENANTS.map((tenant) => (
          <option key={tenant.id} value={tenant.id}>
            {tenant.name}
          </option>
        ))}
      </select>
    </div>
  );
}
