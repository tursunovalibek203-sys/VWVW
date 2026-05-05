import { useState, useRef, useEffect } from 'react';
import { Plus, ChevronDown, Trash2 } from 'lucide-react';

interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  variants: string[];
  variantKey: string;
  type?: 'text' | 'number';
  inputMode?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search';
  step?: string;
  min?: string;
  max?: string;
  onDeleteVariant?: (variant: string) => void;
  onAddVariant?: (variant: string) => void;
  className?: string;
  containerClassName?: string;
}

export default function CustomDropdown({ 
  value, 
  onChange, 
  placeholder, 
  variants, 
  variantKey,
  type = 'text',
  inputMode,
  step,
  min,
  max,
  onDeleteVariant,
  onAddVariant,
  className,
  containerClassName
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filteredVariants, setFilteredVariants] = useState(variants);
  const [newVariant, setNewVariant] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // localStorage dan variantlarni yuklash va default variantlar bilan birlashtirish
  useEffect(() => {
    const savedVariants = localStorage.getItem(`${variantKey}Variants`);
    let allVariants = variants;
    
    if (savedVariants) {
      try {
        const saved = JSON.parse(savedVariants);
        // Saved variantlarni default variantlar bilan birlashtirish, dublikatlarni olib tashlash
        const combined = [...new Set([...variants, ...saved])];
        allVariants = combined;
      } catch (error) {
        console.error(`Error loading ${variantKey} variants:`, error);
      }
    }
    
    setFilteredVariants(allVariants);
  }, [variantKey, variants]);

  // Click outside dropdown ni yopish
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Inputga yozganda filter qilish
  const handleInternalInputChange = (inputValue: string) => {
    // Sanitization for numeric types if they are being passed as text now
    if (type === 'number' || inputMode === 'decimal' || inputMode === 'numeric') {
      const sanitized = inputValue.replace(',', '.');
      if (sanitized !== '' && isNaN(Number(sanitized)) && sanitized !== '.') return;
      onChange(sanitized);
    } else {
      onChange(inputValue);
    }
    
    // Barcha variantlarni olish (default + saved)
    const savedVariants = localStorage.getItem(`${variantKey}Variants`);
    let allVariants = variants;
    
    if (savedVariants) {
      try {
        const saved = JSON.parse(savedVariants);
        allVariants = [...new Set([...variants, ...saved])];
      } catch (error) {
        console.error(`Error loading ${variantKey} variants:`, error);
      }
    }
    
    if (inputValue) {
      const filtered = allVariants.filter(variant => 
        variant.toLowerCase().includes(inputValue.toLowerCase())
      );
      setFilteredVariants(filtered);
    } else {
      setFilteredVariants(allVariants);
    }
    setIsOpen(true);
  };

  // Variantni tanlash
  const handleVariantSelect = (variant: string) => {
    onChange(variant);
    setIsOpen(false);
  };

  // Yangi variant qo'shish
  const handleAddVariant = () => {
    if (newVariant.trim()) {
      // localStorage dan hozirgi variantlarni olish
      const savedVariants = localStorage.getItem(`${variantKey}Variants`);
      let currentVariants = variants;
      
      if (savedVariants) {
        try {
          const saved = JSON.parse(savedVariants);
          currentVariants = [...new Set([...variants, ...saved])];
        } catch (error) {
          console.error(`Error loading ${variantKey} variants:`, error);
        }
      }
      
      // Dublikatni tekshirish
      if (!currentVariants.includes(newVariant.trim())) {
        const updatedVariants = [...currentVariants, newVariant.trim()];
        
        // localStorage ga saqlash
        localStorage.setItem(`${variantKey}Variants`, JSON.stringify(updatedVariants));
        
        // Callbackni chaqirish
        if (onAddVariant) {
          onAddVariant(newVariant.trim());
        }
        
        // Variantlarni yangilash
        setFilteredVariants(updatedVariants);
        onChange(newVariant.trim());
        setNewVariant('');
        setShowAddModal(false);
        setIsOpen(false);
      } else {
        alert('Bu variant allaqachon mavjud!');
      }
    }
  };

  return (
    <div className={`relative ${containerClassName || ''}`} ref={dropdownRef}>
      {/* Input with dropdown */}
      <div className="relative group">
        <input
          type={type === 'number' ? 'text' : type}
          inputMode={inputMode || (type === 'number' ? 'decimal' : undefined)}
          value={value}
          onChange={(e) => handleInternalInputChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          step={step}
          min={min}
          max={max}
          className={`w-full px-4 py-2 pr-20 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all ${className || ''}`}
        />
        
        {/* Dropdown tugmasi */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 transition-transform group-focus-within:rotate-180"
          aria-label={isOpen ? 'Yopish' : 'Ochish'}
          title={isOpen ? 'Yopish' : 'Ochish'}
        >
          <ChevronDown className="w-4 h-4" />
        </button>

        {/* Plus tugmasi */}
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="absolute right-8 top-1/2 transform -translate-y-1/2 p-1 text-blue-500 hover:text-blue-700 hover:scale-110 transition-all"
          title="Yangi variant qo'shish"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Dropdown ro'yxati */}
      {isOpen && filteredVariants.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredVariants.map((variant, index) => (
            <div
              key={index}
              className="flex items-center justify-between px-4 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0 group"
            >
              <span
                onClick={() => handleVariantSelect(variant)}
                className="flex-1 cursor-pointer"
              >
                {variant}
              </span>
              {onDeleteVariant && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteVariant(variant);
                  }}
                  className="p-1 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Variantni o'chirish"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Yangi variant qo'shish modali */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Yangi variant qo'shish</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Variant nomi
                </label>
                <input
                  type="text"
                  value={newVariant}
                  onChange={(e) => setNewVariant(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Yangi variant kiriting"
                  autoFocus
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setNewVariant('');
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Bekor qilish
                </button>
                <button
                  type="button"
                  onClick={handleAddVariant}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Qo'shish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
