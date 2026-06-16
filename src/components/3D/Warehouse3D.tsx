import React, { useState, useRef, useMemo } from 'react';
import { Package, AlertTriangle, CheckCircle, ArrowUpDown } from 'lucide-react';
import { trData } from '../../lib/transliterator';

interface WarehouseItem3DProps {
  product: {
    id: string;
    name: string;
    currentStock: number;
    maxCapacity: number;
    category: string;
  };
  position: { x: number; y: number; z: number };
  onClick?: (product: any) => void;
}

function WarehouseItem3D({ product, position, onClick }: WarehouseItem3DProps) {
  const [isHovered, setIsHovered] = useState(false);
  const stockPercentage = (product.currentStock / product.maxCapacity) * 100;
  const statusColor = stockPercentage > 50 ? 'green' : stockPercentage > 20 ? 'yellow' : 'red';

  const getStatusColor = () => {
    switch (statusColor) {
      case 'green': return 'from-green-500 to-emerald-600';
      case 'yellow': return 'from-yellow-500 to-orange-600';
      case 'red': return 'from-red-500 to-pink-600';
    }
  };

  return (
    <div
      className="absolute transition-all duration-300 cursor-pointer"
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, ${position.z}px) scale(${isHovered ? 1.1 : 1})`,
        transformStyle: 'preserve-3d',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick?.(product)}
    >
      {/* 3D Box */}
      <div className="relative w-16 h-16" style={{ transformStyle: 'preserve-3d' }}>
        {/* Front */}
        <div 
          className={`absolute inset-0 bg-gradient-to-br ${getStatusColor()} rounded-lg shadow-lg flex items-center justify-center`}
          style={{ transform: 'translateZ(8px)' }}
        >
          <Package className="w-6 h-6 text-white" />
        </div>
        
        {/* Back */}
        <div 
          className={`absolute inset-0 bg-gradient-to-br ${getStatusColor()} rounded-lg opacity-80`}
          style={{ transform: 'rotateY(180deg) translateZ(8px)' }}
        />
        
        {/* Top */}
        <div 
          className={`absolute inset-0 bg-gradient-to-br ${getStatusColor()} rounded-lg opacity-90`}
          style={{ transform: 'rotateX(90deg) translateZ(8px)' }}
        />
        
        {/* Bottom */}
        <div 
          className={`absolute inset-0 bg-gradient-to-br ${getStatusColor()} rounded-lg opacity-70`}
          style={{ transform: 'rotateX(-90deg) translateZ(8px)' }}
        />
        
        {/* Left */}
        <div 
          className={`absolute inset-0 bg-gradient-to-br ${getStatusColor()} rounded-lg opacity-80`}
          style={{ transform: 'rotateY(-90deg) translateZ(8px)' }}
        />
        
        {/* Right */}
        <div 
          className={`absolute inset-0 bg-gradient-to-br ${getStatusColor()} rounded-lg opacity-80`}
          style={{ transform: 'rotateY(90deg) translateZ(8px)' }}
        />
      </div>

      {/* Label */}
      <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs whitespace-nowrap">
        <div className="bg-black/80 text-white px-2 py-1 rounded text-center">
          <div className="font-semibold truncate max-w-20">{trData(product.name)}</div>
          <div className="text-xs opacity-80">{product.currentStock}/{product.maxCapacity}</div>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="absolute -top-2 -right-2">
        {stockPercentage > 50 ? (
          <CheckCircle className="w-4 h-4 text-green-500" />
        ) : stockPercentage > 20 ? (
          <AlertTriangle className="w-4 h-4 text-yellow-500" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-red-500" />
        )}
      </div>

      {/* Hover Effect */}
      {isHovered && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/90 text-white px-3 py-2 rounded-lg text-xs whitespace-nowrap z-50">
          <div className="font-semibold">{trData(product.name)}</div>
          <div>Zaxira: {stockPercentage.toFixed(1)}%</div>
          <div>Kategoriya: {trData(product.category)}</div>
        </div>
      )}
    </div>
  );
}

interface Warehouse3DProps {
  products: Array<{
    id: string;
    name: string;
    currentStock: number;
    maxCapacity: number;
    category: string;
  }>;
  onProductClick?: (product: any) => void;
}

export function Warehouse3D({ products, onProductClick }: Warehouse3DProps) {
  const [rotation, setRotation] = useState({ x: -20, y: 45 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const productPositions = useMemo(() => {
    const positions = [];
    const gridSize = Math.ceil(Math.sqrt(products.length));
    
    products.forEach((product, index) => {
      const row = Math.floor(index / gridSize);
      const col = index % gridSize;
      
      positions.push({
        ...product,
        position: {
          x: (col - gridSize / 2) * 80,
          y: (row - gridSize / 2) * 80,
          z: 0,
        },
      });
    });
    
    return positions;
  }, [products]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    setRotation({
      x: rotation.x + deltaY * 0.5,
      y: rotation.y + deltaX * 0.5,
    });
    
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="w-full h-96 bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Package className="w-6 h-6" />
          3D Ombor Vizualizatsiyasi
        </h3>
        <div className="flex items-center gap-2 text-white/60 text-sm">
          <ArrowUpDown className="w-4 h-4" />
          Sural
        </div>
      </div>

      <div 
        ref={containerRef}
        className="relative w-full h-80 flex items-center justify-center"
        style={{ perspective: '1000px' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="relative transition-transform duration-100"
          style={{
            transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Warehouse Floor */}
          <div 
            className="absolute w-96 h-96 bg-gradient-to-br from-gray-700 to-gray-600 rounded-xl opacity-30"
            style={{
              transform: 'rotateX(90deg) translateZ(-40px)',
              left: '-192px',
              top: '-192px',
            }}
          />

          {/* Grid Lines */}
          <div className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }}>
            {[-160, -80, 0, 80, 160].map((x, i) => (
              <div
                key={`v-${i}`}
                className="absolute w-px h-80 bg-white/10"
                style={{
                  left: `${x}px`,
                  top: '-160px',
                  transform: 'rotateX(90deg)',
                }}
              />
            ))}
            {[-160, -80, 0, 80, 160].map((y, i) => (
              <div
                key={`h-${i}`}
                className="absolute h-px w-80 bg-white/10"
                style={{
                  top: `${y}px`,
                  left: '-160px',
                  transform: 'rotateX(90deg)',
                }}
              />
            ))}
          </div>

          {/* Products */}
          {productPositions.map((item, index) => (
            <WarehouseItem3D
              key={item.id}
              product={item}
              position={item.position}
              onClick={onProductClick}
            />
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 text-xs text-white/60">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span>To'liq</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-500 rounded"></div>
          <span>O'rta</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span>Bo'sh</span>
        </div>
      </div>
    </div>
  );
}
