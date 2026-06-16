import { Search, ChevronDown, ChevronRight, Star } from 'lucide-react';
import { useState, useEffect } from 'react';
import { latinToCyrillic, trData } from '../lib/transliterator';


interface Product {
  id: string;
  name: string;
  pricePerBag: number;
  pricePerPiece?: number; // Yangi: Dona narxi
  currentStock?: number;
  optimalStock?: number;
  minStockLimit?: number;
  bagType?: string;
  cardType?: string;
  variants?: any[];
  isVariant?: boolean;
  parentId?: string;
  unitsPerBag?: number;
  warehouse?: string;
}

interface ProductSelectorProps {
  products: Product[];
  selectedId: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSelect: (id: string, name: string, pricePerBag: number, unitsPerBag?: number, cardType?: string, pricePerPiece?: number) => void;
  customerPrice?: number;
  favorites?: string[];
  onToggleFavorite?: (productId: string) => void;
  showFavoritesOnly?: boolean;
  onToggleFavorites?: () => void;
}

export default function ProductSelector({
  products,
  selectedId,
  searchValue,
  onSearchChange,
  onSelect,
  customerPrice,
  favorites = [],
  onToggleFavorite,
  showFavoritesOnly,
  onToggleFavorites,
}: ProductSelectorProps) {
  console.log('🔍 ProductSelector rendered with:', {
    productsCount: products.length,
    selectedId,
    searchValue
  });
  
  const [activeCategory, setActiveCategory] = useState<'preform' | 'krishka' | 'ruchka' | 'other'>('preform');
  const [expandedSize, setExpandedSize] = useState<string | null>(null);
  const [expandedProductVariants, setExpandedProductVariants] = useState<string | null>(null);

  // Qidiruv bo'lganda avtomat yoyish
  useEffect(() => {
    if (searchValue.trim()) {
      // Qidiruv bo'lganda hamma guruhlarni ko'rsatish mantiqi quyida getFilteredProducts da
    }
  }, [searchValue]);

  const getFilteredProducts = () => {
    let filtered = products;

    // 1. Kategoriya bo'yicha filtrlash
    filtered = filtered.filter(product => {
      if (product.warehouse === activeCategory) return true;
      const name = product.name.toLowerCase();
      if (activeCategory === 'preform') {
        return (name.includes('g') || name.includes('gr')) && !name.includes('krishka') && !name.includes('ruchka') && !name.includes('cap');
      }
      if (activeCategory === 'krishka') {
        return name.includes('krishka') || name.includes('cap');
      }
      if (activeCategory === 'ruchka') {
        return name.includes('ruchka') || name.includes('handle');
      }
      return activeCategory === 'other';
    });

    // 2. Qidiruv bo'yicha filtrlash
    if (searchValue.trim()) {
      const searchLower = searchValue.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchLower) || 
        (p.bagType && p.bagType.toLowerCase().includes(searchLower))
      );
    }

    // 3. Qidiruv bo'lmasa, mashhur mahsulotlarni yuqoriga chiqarish
    if (!searchValue.trim()) {
      const popularKeywords = ['15 gr', '15gr', '15g', 'gidro', 'pet', '10 gr', '10gr', '10g'];
      const popularProducts = filtered.filter(p => 
        popularKeywords.some(keyword => p.name.toLowerCase().includes(keyword))
      );
      const otherProducts = filtered.filter(p => 
        !popularKeywords.some(keyword => p.name.toLowerCase().includes(keyword))
      );
      return [...popularProducts, ...otherProducts];
    }

    return filtered;
  };

  const allFiltered = getFilteredProducts();
  
  // Faqat asosiy mahsulotlar (parentlar)
  const parentProducts = allFiltered.filter(p => !p.isVariant && !p.parentId);

  const groupProducts = (items: Product[]) => {
    const groups: { [key: string]: Product[] } = {};
    items.forEach(product => {
      let size = 'Boshqa';
      const name = product.name.toLowerCase();
      
      if (name.includes('krishka')) {
        const match = name.match(/(\d+)krishka/i);
        size = match ? `${match[1]}krishka` : 'Boshqa';
      } else if (name.includes('ruchka')) {
        const match = name.match(/(\d+)ruchka/i);
        size = match ? `${match[1]}ruchka` : 'Boshqa';
      } else if (name.includes('cap') || name.includes('qopqoq')) {
        // Qopqo'q mahsulotlarini o'lcham bo'yicha guruhlash
        const match = name.match(/(\d+)(l|liter|l)/i);
        if (match) {
          size = `${match[1]}L`;
        } else {
          // Agar o'lcham topilmasa, umumiy guruhga qo'shish
          size = 'Qopqoq';
        }
      } else {
        const match = name.match(/(\d+)gr/i) || name.match(/(\d+)g/i);
        size = match ? `${match[1]}gr` : 'Boshqa';
      }
      
      if (!groups[size]) groups[size] = [];
      groups[size].push(product);
    });
    return groups;
  };

  const groupedBySizes = groupProducts(parentProducts);
  
  const availableSizes = Object.keys(groupedBySizes).filter(size => groupedBySizes[size].length > 0).sort((a, b) => {
    // L (liter) > gr > krishka > ruchka tartibida
    if (a.includes('L') && !b.includes('L')) return -1;
    if (!a.includes('L') && b.includes('L')) return 1;
    
    if (a.includes('gr') && !b.includes('gr') && !b.includes('L')) return -1;
    if (!a.includes('gr') && b.includes('gr') && !a.includes('L')) return 1;
    
    if (a.includes('krishka') && !b.includes('krishka') && !b.includes('gr') && !b.includes('L')) return -1;
    if (!a.includes('krishka') && b.includes('krishka') && !a.includes('gr') && !a.includes('L')) return 1;
    
    // Raqamli bo'lsa, raqam bo'yicha tartiblash
    const aMatch = a.match(/(\d+)/);
    const bMatch = b.match(/(\d+)/);
    if (aMatch && bMatch) return parseInt(aMatch[1]) - parseInt(bMatch[1]);
    
    return a.localeCompare(b);
  });

  console.log('📊 Grouped products:', {
    totalFiltered: allFiltered.length,
    parentProducts: parentProducts.length,
    availableSizes: availableSizes.length,
    sizes: availableSizes
  });

  
  return (
    <div className="space-y-4">
      {/* Search and favorites */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder={latinToCyrillic("Маҳсулот номини киритинг...")}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-12 pr-14 py-4 text-lg font-semibold bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900 transition-all duration-200 shadow-sm"
        />
        {onToggleFavorites && (
          <button
            type="button"
            onClick={onToggleFavorites}
            className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-3 rounded-xl transition-all duration-200 ${
              showFavoritesOnly
                ? 'text-yellow-600 bg-yellow-100 hover:bg-yellow-200 shadow-md'
                : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50'
            }`}
            title={showFavoritesOnly ? latinToCyrillic('Барча маҳсулотлар') : latinToCyrillic('Фақат севимлилар')}
          >
            <Star className={`w-5 h-5 ${showFavoritesOnly ? 'fill-current' : ''}`} />
          </button>
        )}
      </div>

      {/* Categories */}
      <div className="flex flex-wrap p-2 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl w-full gap-2 shadow-inner">
        {[
          { id: 'preform', label: latinToCyrillic('Преформа'), icon: '', color: 'blue' },
          { id: 'krishka', label: latinToCyrillic('Қопқоқ'), icon: '', color: 'orange' },
          { id: 'ruchka', label: latinToCyrillic('Ручка'), icon: '', color: 'green' },
          { id: 'other', label: latinToCyrillic('Бошқа'), icon: '', color: 'gray' }
        ].map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => {
              setActiveCategory(cat.id as any);
              setExpandedSize(null);
              setExpandedProductVariants(null);
              onSelect('', '', 0);
            }}
            className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200 shadow-sm ${
              activeCategory === cat.id 
                ? `bg-${cat.color}-600 text-white shadow-lg transform scale-105 border-2 border-${cat.color}-700` 
                : 'text-gray-600 hover:text-gray-800 hover:bg-white hover:shadow-md border-2 border-transparent'
            }`}
          >
            <span className="text-lg">{cat.icon}</span> 
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Product hierarchy */}
      <div className="flex flex-col gap-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {availableSizes.map((size) => {
          const sizeProducts = groupedBySizes[size];
          const isExpanded = expandedSize === size || searchValue.trim().length > 0;
          const categoryColor = activeCategory === 'preform' ? 'blue' : 
                               activeCategory === 'krishka' ? 'orange' : 
                               activeCategory === 'ruchka' ? 'green' : 'gray';
          
          return (
            <div key={size} className="space-y-3 transition-all duration-300">
              <div
                onClick={() => setExpandedSize(isExpanded && !searchValue.trim() ? null : size)}
                className={`p-4 border-2 rounded-2xl cursor-pointer transition-all duration-200 flex items-center justify-between group shadow-sm ${
                  isExpanded 
                    ? `border-${categoryColor}-500 bg-${categoryColor}-50/80 shadow-lg` 
                    : 'border-gray-200 hover:border-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center text-white font-bold text-lg transition-all duration-300 shadow-md ${
                    isExpanded ? `scale-110 bg-${categoryColor}-600` : `bg-${categoryColor}-500`
                  }`}>
                    {activeCategory === 'preform' ? size.replace('gr', '').replace('g', '') : 
                     activeCategory === 'krishka' ? '⭕' :
                     activeCategory === 'ruchka' ? '🎗️' : '🛠️'}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-black text-gray-900 dark:text-white uppercase tracking-tight truncate text-sm">{size}</h4>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest truncate">{sizeProducts.length} {latinToCyrillic('тур')}</p>
                  </div>
                </div>
                <div className={`flex items-center gap-2 transition-all duration-200 ${
                  isExpanded ? `text-${categoryColor}-600` : 'text-gray-400 group-hover:text-gray-600'
                }`}>
                  <span className="text-sm font-bold">{sizeProducts.length}</span>
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                </div>
              </div>

              {/* Product list */}
              {isExpanded && (
                <div className="grid grid-cols-2 gap-3 p-2 animate-in slide-in-from-top-2 duration-300">
                  {sizeProducts.map((product) => {
                    const hasVariants = product.variants && product.variants.length > 0;
                    const isVariantsExpanded = expandedProductVariants === product.id;
                    const isSelected = selectedId === product.id;
                    const isFavorite = favorites.includes(product.id);
                    
                    return (
                      <div key={product.id} className={`space-y-3 ${isVariantsExpanded ? 'md:col-span-2' : ''}`}>
                        <div
                          onClick={() => {
                            console.log('🖱️ Mahsulot bosildi:', product.name);
                            onSelect(product.id, product.name, product.pricePerBag, product.unitsPerBag || 2000, product.cardType, product.pricePerPiece);
                          }}
                          className={`p-4 border-2 rounded-2xl cursor-pointer transition-all duration-200 flex items-center justify-between shadow-sm hover:shadow-md ${
                            isSelected
                              ? `border-${categoryColor}-500 bg-${categoryColor}-600 text-white shadow-lg`
                              : 'border-gray-200 bg-white dark:bg-gray-800 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                              isSelected ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-700'
                            }`}>
                              <span className="text-sm">
                                {product.warehouse === 'krishka' ? '⭕' : 
                                 product.warehouse === 'ruchka' ? '🎗️' : 
                                 product.warehouse === 'preform' ? '📦' : '🛠️'}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <h4 className={`font-black text-sm uppercase tracking-tight truncate ${
                                isSelected ? 'text-white' : 'text-gray-900 dark:text-white'
                              }`}>
                                {trData(product.name)}
                              </h4>
                              <div className="flex items-center gap-2">
                                <p className={`text-xs font-bold uppercase tracking-widest truncate ${
                                  isSelected ? 'text-white/70' : 'text-gray-500'
                                }`}>
                                  {product.currentStock || 0} {latinToCyrillic('қоп')}
                                </p>
                                {product.cardType && (
                                  <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold ${
                                    isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                                  }`}>
                                    {product.cardType}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                              <p className={`text-sm font-black ${
                                isSelected ? 'text-white' : 'text-emerald-600'
                              }`}>
                                ${product.pricePerBag.toFixed(2)}
                              </p>
                              {customerPrice && (
                                <p className={`text-xs ${
                                  isSelected ? 'text-white/80' : 'text-orange-600'
                                }`}>
                                  ${customerPrice.toFixed(2)}
                                </p>
                              )}
                            </div>
                            
                            {/* Favorite button */}
                            {onToggleFavorite && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleFavorite(product.id);
                                }}
                                className={`p-2 rounded-xl transition-all duration-200 ${
                                  isFavorite
                                    ? 'text-yellow-500 bg-yellow-100 hover:bg-yellow-200'
                                    : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50'
                                }`}
                                title={isFavorite ? latinToCyrillic('Севимлилардан олиш') : latinToCyrillic('Севимлиларга қўшиш')}
                              >
                                <Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                              </button>
                            )}
                            
                            {/* Variants button */}
                            {hasVariants && product.variants && product.variants.length > 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  setExpandedProductVariants(isVariantsExpanded ? null : product.id);
                                }}
                                className={`p-2 rounded-xl transition-all duration-200 ${
                                  isSelected 
                                    ? 'bg-white/20 hover:bg-white/40 text-white' 
                                    : 'bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200'
                                }`}
                                title={latinToCyrillic("Турларини кўриш")}
                              >
                                {isVariantsExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Mahsulot variantlari (Turlari va ranglari) */}
                        {isVariantsExpanded && hasVariants && (
                          <div className="col-span-2 grid grid-cols-2 gap-2 pl-4 border-l-2 border-blue-100 dark:border-blue-900/30 animate-in slide-in-from-left-2 duration-300 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 mt-2">
                            <p className="col-span-2 text-xs text-gray-500 font-bold mb-1">
                              📋 Турлар ва ранглар ({product.variants?.length || 0})
                            </p>
                            {product.variants && product.variants.length > 0 ? (
                              product.variants.map((variant: any) => {
                                // Rangni aniqlash
                                const getVariantColor = (variantName: string) => {
                                  const name = variantName.toLowerCase();
                                  if (name.includes('oq') || name.includes('white')) return 'bg-gray-100 text-gray-800 border-gray-300';
                                  if (name.includes('qora') || name.includes('black')) return 'bg-gray-800 text-white border-gray-900';
                                  if (name.includes('qizil') || name.includes('red')) return 'bg-red-100 text-red-800 border-red-300';
                                  if (name.includes('yashil') || name.includes('green')) return 'bg-green-100 text-green-800 border-green-300';
                                  if (name.includes('kok') || name.includes('blue')) return 'bg-blue-100 text-blue-800 border-blue-300';
                                  if (name.includes('sariq') || name.includes('yellow')) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
                                  if (name.includes('binafsha') || name.includes('transparent')) return 'bg-gray-50 text-gray-600 border-gray-200';
                                  return 'bg-purple-100 text-purple-800 border-purple-300';
                                };

                                const variantColorClass = getVariantColor(variant.variantName || '');

                                return (
                                  <div
                                    key={variant.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onSelect(variant.id, `${product.name} (${variant.variantName})`, variant.pricePerBag, product.unitsPerBag || 2000, variant.cardType, variant.pricePerPiece);
                                    }}
                                    className={`p-3 border-2 rounded-2xl cursor-pointer transition-all flex items-center justify-between shadow-sm ${
                                      selectedId === variant.id
                                        ? 'bg-blue-600 text-white shadow-lg border-blue-600'
                                        : `${variantColorClass} hover:border-blue-200`
                                    }`}
                                  >
                                    <div className="min-w-0">
                                      <h5 className={`font-black text-[10px] uppercase truncate ${selectedId === variant.id ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                                        {trData(variant.variantName)}
                                      </h5>
                                      <div className="flex items-center gap-1">
                                        <p className={`text-[8px] font-bold uppercase tracking-widest truncate ${selectedId === variant.id ? 'text-white/70' : 'text-gray-400'}`}>
                                          {variant.currentStock || 0} қоп
                                        </p>
                                        {variant.cardType && (
                                          <span className={`text-[6px] px-1 py-0.5 rounded-full font-bold ${
                                            selectedId === variant.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                                          }`}>
                                            {variant.cardType}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-right ml-2">
                                      <p className={`text-[11px] font-black ${selectedId === variant.id ? 'text-white' : 'text-blue-600'}`}>
                                        ${variant.pricePerBag.toFixed(2)}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <p className="text-xs text-red-500">Турлар топилмади</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {allFiltered.length === 0 && (
          <div className="p-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl text-center">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-gray-500 font-black uppercase tracking-widest text-sm">{latinToCyrillic('Mahsulotlar topilmadi')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
