import React, { useState, useRef } from 'react';
import { Package, TrendingUp, Eye } from 'lucide-react';
import { trData } from '../../lib/transliterator';

interface ProductCard3DProps {
  product: {
    id: string;
    name: string;
    currentStock: number;
    pricePerBag: number;
    bagType: string;
    image?: string;
  };
  onClick?: () => void;
}

export function ProductCard3D({ product, onClick }: ProductCard3DProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = (y - centerY) / 10;
    const rotateY = (centerX - x) / 10;
    
    setRotation({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setRotation({ x: 0, y: 0 });
    setIsHovered(false);
  };

  return (
    <div className="perspective-1000">
      <div
        ref={cardRef}
        className="relative w-full h-64 transition-all duration-300 transform-gpu cursor-pointer"
        style={{
          transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale(${isHovered ? 1.05 : 1})`,
          transformStyle: 'preserve-3d',
        }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        onClick={onClick}
      >
        {/* Front Face */}
        <div 
          className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-700 shadow-2xl p-6 text-white"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'translateZ(20px)',
          }}
        >
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <Package className="w-8 h-8 text-white/80" />
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                {trData(product.bagType)}
              </span>
            </div>

            <h3 className="text-lg font-bold mb-2 line-clamp-2">
              {trData(product.name)}
            </h3>
            
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-3xl font-bold mb-1">
                  {product.currentStock}
                </div>
                <div className="text-sm text-white/80">qop</div>
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-4">
              <div>
                <div className="text-xs text-white/60">Narx</div>
                <div className="text-lg font-semibold">
                  ${product.pricePerBag}
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-white/80">
                <Eye className="w-4 h-4" />
                Ko'rish
              </div>
            </div>
          </div>
        </div>

        {/* Back Face */}
        <div 
          className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-700 shadow-2xl p-6 text-white"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg) translateZ(20px)',
          }}
        >
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8 text-white/80" />
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                Statistika
              </span>
            </div>
            
            <div className="flex-1 space-y-4">
              <div className="bg-white/10 rounded-lg p-3">
                <div className="text-xs text-white/60 mb-1">Oylik sotuv</div>
                <div className="text-xl font-bold">+23%</div>
              </div>
              
              <div className="bg-white/10 rounded-lg p-3">
                <div className="text-xs text-white/60 mb-1">Zaxira status</div>
                <div className="text-sm font-semibold">
                  {product.currentStock > 50 ? 'Yaxshi' : 'Kam'}
                </div>
              </div>
              
              <div className="bg-white/10 rounded-lg p-3">
                <div className="text-xs text-white/60 mb-1">Daromad</div>
                <div className="text-lg font-bold">
                  ${(product.currentStock * product.pricePerBag).toLocaleString()}
                </div>
              </div>
            </div>
            
            <button className="w-full bg-white/20 hover:bg-white/30 transition-colors rounded-lg py-2 text-sm font-medium">
              Batafsil ma'lumot
            </button>
          </div>
        </div>

        {/* 3D Shadow */}
        <div 
          className="absolute inset-0 rounded-2xl bg-black/20 blur-xl"
          style={{
            transform: 'translateZ(-10px) scale(0.95)',
          }}
        />
      </div>
    </div>
  );
}
