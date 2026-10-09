/**
 * "Base de datos" de la API simulada. Respeta el contrato de la API (DTO),
 * no el modelo de dominio: así el mapeo de infraestructura se ejercita de verdad.
 */
export interface ProductRecord {
  id: string;
  name: string;
  description: string;
  category: 'audio' | 'wearables' | 'home' | 'accessories';
  price: { amount: number; currency: 'EUR' };
  image: string;
  stock: number;
  rating: number;
}

/**
 * Fotos reales de cada producto (Wikimedia Commons, licencias libres). Se indexan por
 * clave para que el nombre del producto y su imagen no se desincronicen.
 */
const images = {
  headphones:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0a/Bose_QuietComfort_25_Acoustic_Noise_Cancelling_Headphones_with_Carry_Case.jpg/960px-Bose_QuietComfort_25_Acoustic_Noise_Cancelling_Headphones_with_Carry_Case.jpg',
  speaker:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a4/JBL_Pulse_5_Portable_Bluetooth_Speaker.jpg/960px-JBL_Pulse_5_Portable_Bluetooth_Speaker.jpg',
  earbuds:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9a/Sport_Wireless_Headphones_Toxxel.jpg/960px-Sport_Wireless_Headphones_Toxxel.jpg',
  smartwatch:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a2/Samsung_Gear_S3.jpg/960px-Samsung_Gear_S3.jpg',
  'fitness-band':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0b/Fitbit_Alta_HR.jpg/960px-Fitbit_Alta_HR.jpg',
  'desk-lamp':
    'https://upload.wikimedia.org/wikipedia/commons/7/71/Concise_bamboo_eye_protection_LED_desk_lamp.jpg',
  espresso:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9b/Espresso_machine_1.jpg/960px-Espresso_machine_1.jpg',
  diffuser:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b5/Aroma_Diffuser.jpg/960px-Aroma_Diffuser.jpg',
  backpack:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/78/Laptop_backpacks_from_Mr._DIY_at_Ayala_Center_Cebu_%282025-02-24%29.jpg/960px-Laptop_backpacks_from_Mr._DIY_at_Ayala_Center_Cebu_%282025-02-24%29.jpg',
  charger:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4a/Silicon_vs_GaN_30W_USB-C_chargers.jpg/960px-Silicon_vs_GaN_30W_USB-C_chargers.jpg',
  'tablet-case':
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/82/IPad_Mini_Smart_Case_3781.jpg/960px-IPad_Mini_Smart_Case_3781.jpg',
  keyboard:
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5a/Mechanical_Keyboard.jpg/960px-Mechanical_Keyboard.jpg',
} as const;

/** Productos de ejemplo que devuelve la API simulada. */
export const products: readonly ProductRecord[] = [
  {
    id: 'auriculares-inalambricos',
    name: 'Auriculares inalámbricos',
    description:
      'Cancelación activa de ruido, 30 horas de autonomía y carga rápida USB-C. Ligeros y plegables para viajar.',
    category: 'audio',
    price: { amount: 12999, currency: 'EUR' },
    image: images.headphones,
    stock: 14,
    rating: 4.6,
  },
  {
    id: 'altavoz-bluetooth',
    name: 'Altavoz Bluetooth',
    description: 'Sonido 360°, resistente al agua IP67 y 12 horas de reproducción continua.',
    category: 'audio',
    price: { amount: 5999, currency: 'EUR' },
    image: images.speaker,
    stock: 3,
    rating: 4.3,
  },
  {
    id: 'auriculares-deportivos',
    name: 'Auriculares deportivos',
    description: 'Ajuste seguro con ganchos, resistentes al sudor y con controles táctiles.',
    category: 'audio',
    price: { amount: 4999, currency: 'EUR' },
    image: images.earbuds,
    stock: 0,
    rating: 4.1,
  },
  {
    id: 'reloj-inteligente',
    name: 'Reloj inteligente',
    description:
      'Pantalla AMOLED, GPS integrado, medición de frecuencia cardiaca y sueño. Hasta 7 días de batería.',
    category: 'wearables',
    price: { amount: 19999, currency: 'EUR' },
    image: images.smartwatch,
    stock: 8,
    rating: 4.7,
  },
  {
    id: 'pulsera-actividad',
    name: 'Pulsera de actividad',
    description: 'Cuenta pasos, calorías y minutos activos. Sumergible hasta 50 metros.',
    category: 'wearables',
    price: { amount: 3999, currency: 'EUR' },
    image: images['fitness-band'],
    stock: 25,
    rating: 4.0,
  },
  {
    id: 'lampara-escritorio',
    name: 'Lámpara de escritorio LED',
    description: 'Temperatura de color regulable, brazo articulado y base de carga inalámbrica.',
    category: 'home',
    price: { amount: 4599, currency: 'EUR' },
    image: images['desk-lamp'],
    stock: 12,
    rating: 4.4,
  },
  {
    id: 'cafetera-espresso',
    name: 'Cafetera espresso',
    description: 'Bomba de 15 bares, vaporizador de leche y depósito extraíble de 1,2 litros.',
    category: 'home',
    price: { amount: 15999, currency: 'EUR' },
    image: images.espresso,
    stock: 5,
    rating: 4.5,
  },
  {
    id: 'difusor-aromas',
    name: 'Difusor de aromas',
    description: 'Ultrasónico y silencioso, con luz ambiental y apagado automático.',
    category: 'home',
    price: { amount: 2999, currency: 'EUR' },
    image: images.diffuser,
    stock: 18,
    rating: 3.9,
  },
  {
    id: 'mochila-portatil',
    name: 'Mochila para portátil',
    description: 'Compartimento acolchado de 15", tejido repelente al agua y bolsillo antirrobo.',
    category: 'accessories',
    price: { amount: 6999, currency: 'EUR' },
    image: images.backpack,
    stock: 9,
    rating: 4.6,
  },
  {
    id: 'cargador-multipuerto',
    name: 'Cargador multipuerto 65 W',
    description: 'Tres puertos (2 USB-C + 1 USB-A) con carga rápida para portátil, móvil y tablet.',
    category: 'accessories',
    price: { amount: 3499, currency: 'EUR' },
    image: images.charger,
    stock: 30,
    rating: 4.8,
  },
  {
    id: 'funda-tablet',
    name: 'Funda para tablet',
    description: 'Cierre magnético, soporte en dos ángulos y función de encendido automático.',
    category: 'accessories',
    price: { amount: 2499, currency: 'EUR' },
    image: images['tablet-case'],
    stock: 2,
    rating: 4.2,
  },
  {
    id: 'teclado-mecanico',
    name: 'Teclado mecánico',
    description: 'Interruptores intercambiables en caliente, retroiluminación y conexión triple.',
    category: 'accessories',
    price: { amount: 8999, currency: 'EUR' },
    image: images.keyboard,
    stock: 7,
    rating: 4.7,
  },
];
