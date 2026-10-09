import styles from './product-image.module.css';

interface ProductImageProps {
  readonly src: string;
  readonly alt: string;
  /** Las imágenes por encima del pliegue se cargan con prioridad (mejor LCP). */
  readonly priority?: boolean;
}

const SIZE = 600;

/** Imagen con dimensiones fijas (sin saltos de layout) y carga diferida por defecto. */
export function ProductImage({ src, alt, priority = false }: ProductImageProps) {
  return (
    <img
      className={styles.image}
      src={src}
      alt={alt}
      width={SIZE}
      height={SIZE}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : 'auto'}
    />
  );
}
