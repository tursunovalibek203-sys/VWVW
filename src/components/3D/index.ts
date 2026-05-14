// 3D Components Export
export { ProductCard3D } from './ProductCard3D';
export { 
  StatsCard3D,
  RevenueCard3D,
  SalesCard3D,
  ProductsCard3D,
  CustomersCard3D
} from './StatsCard3D';
export { Warehouse3D } from './Warehouse3D';

// Re-export commonly used 3D utilities
export const default3DProps = {
  perspective: 1000,
  transformStyle: 'preserve-3d' as const,
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
};

// 3D animation presets
export const animations3D = {
  float: 'animate-float-3d',
  rotate: 'animate-rotate-3d',
  pulse: 'animate-pulse-3d',
  spin: 'animate-pulse-3d',
};

// 3D color gradients
export const gradients3D = {
  blue: 'from-blue-600 to-cyan-600',
  green: 'from-green-600 to-emerald-600',
  purple: 'from-purple-600 to-pink-600',
  orange: 'from-orange-600 to-red-600',
  red: 'from-red-600 to-pink-600',
  gray: 'from-gray-600 to-gray-800',
};
