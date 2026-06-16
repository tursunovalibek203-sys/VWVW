import { useState } from 'react';
import { Printer, X, Package, User, Calendar, Barcode, Monitor, FileText } from 'lucide-react';
import { useToast } from '@/lib/toast';
import { 
  BagLabelData, 
  prepareBagLabels,
  printAndSaveBagLabels,
  printBagLabels80mm
} from '../lib/bagLabelPrinter';
import { trData } from '../lib/transliterator';

interface Product {
  id: string;
  name: string;
  bagType: string;
  unitsPerBag: number;
}

interface BagLabelPrinterProps {
  product: Product;
  productCode: string;
  typeCode: string;
  onClose: () => void;
}

export default function BagLabelPrinter({ 
  product, 
  productCode, 
  typeCode, 
  onClose 
}: BagLabelPrinterProps) {
  const [quantity, setQuantity] = useState(1);
  const [workerId, setWorkerId] = useState('');
  const [productionDate, setProductionDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [isPrinting, setIsPrinting] = useState(false);
  const [previewData, setPreviewData] = useState<BagLabelData[] | null>(null);
  const [printerType, setPrinterType] = useState<'a4' | '80mm'>('80mm');
  const [error, setError] = useState<string | null>(null);

  // Mahsulot nomini tozalash (15gr-Preform-QORA -> 15gr)
  const getProductName = () => {
    const parts = product.bagType.split('-');
    return parts[0] || product.name;
  };

  // Tur nomini olish (15gr-Preform-QORA -> QORA)
  const getProductType = () => {
    const parts = product.bagType.split('-');
    return parts[parts.length - 1] || 'N/A';
  };

  const handlePreview = () => {
    if (!workerId.trim()) {
      setError('Iltimos, ishchi raqamini kiriting!');
      return;
    }
    setError(null);

    const labels = prepareBagLabels(
      getProductName(),
      getProductType(),
      product.unitsPerBag,
      quantity,
      workerId,
      productCode,
      typeCode,
      new Date(productionDate)
    );

    setPreviewData(labels);
  };

  const handlePrint = async () => {
    if (!previewData) {
      handlePreview();
      return;
    }

    setIsPrinting(true);
    setError(null);
    
    // Printer turiga qarab chop etish
    if (printerType === '80mm') {
      printBagLabels80mm(previewData);
    } else {
      // A4 printer uchun avval chop etish, keyin saqlash
      const result = await printAndSaveBagLabels(previewData, product.id);
      
      if (result.success && !result.error) {
        console.log('Yorliqlar muvaffaqiyatli chop etildi va saqlandi');
      } else if (result.error) {
        setError(result.error);
      }
    }
    
    setIsPrinting(false);
  };

  // Format barcode for display (03 03 12 34 14 03)
  const formatBarcode = (barcode: string) => {
    return barcode.split('').join(' ');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Printer className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Qop Yorliqlari</h2>
              <p className="text-sm text-gray-500">{product.bagType}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left side - Form */}
          <div className="space-y-4">
            {/* Product Info */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Mahsulot ma'lumotlari
              </h3>
              <div className="space-y-1 text-sm">
                <p><span className="text-gray-600">Nomi:</span> {trData(getProductName())}</p>
                <p><span className="text-gray-600">Turi:</span> {getProductType()}</p>
                <p><span className="text-gray-600">Qopdagi dona:</span> {product.unitsPerBag} dona</p>
                <p><span className="text-gray-600">Kod:</span> {productCode}-{typeCode}</p>
              </div>
            </div>

            {/* Printer Type Selection */}
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-800 mb-3 flex items-center gap-2">
                <Monitor className="w-4 h-4" />
                Printer turini tanlang
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setPrinterType('80mm')}
                  className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all ${
                    printerType === '80mm' 
                      ? 'border-purple-600 bg-purple-100 text-purple-800' 
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <Printer className="w-5 h-5 mb-1" />
                    <span className="text-sm font-medium">80mm Thermal</span>
                    <span className="text-xs text-gray-500">Chek printer</span>
                  </div>
                </button>
                <button
                  onClick={() => setPrinterType('a4')}
                  className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all ${
                    printerType === 'a4' 
                      ? 'border-purple-600 bg-purple-100 text-purple-800' 
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <FileText className="w-5 h-5 mb-1" />
                    <span className="text-sm font-medium">A4 Printer</span>
                    <span className="text-xs text-gray-500">Oddiy printer</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Input Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Qop soni
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Maksimal 100 ta {printerType === 'a4' && '(8 tadan sahifalar)'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Ishchi raqami
                </label>
                <input
                  type="text"
                  value={workerId}
                  onChange={(e) => setWorkerId(e.target.value.replace(/\D/g, '').slice(0, 2))}
                  placeholder="Masalan: 14"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">2 ta raqam</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Ishlab chiqarilgan sana
                </label>
                <input
                  type="date"
                  value={productionDate}
                  onChange={(e) => setProductionDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={handlePreview}
                disabled={!workerId.trim()}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Ko'rish
              </button>
              <button
                onClick={handlePrint}
                disabled={!workerId.trim() || isPrinting}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isPrinting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-pulse" />
                    Chop etilmoqda...
                  </>
                ) : (
                  <>
                    <Printer className="w-4 h-4" />
                    Chop etish ({printerType === '80mm' ? '80mm' : 'A4'})
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right side - Preview */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Barcode className="w-4 h-4" />
              Oldindan ko'rish
            </h3>

            {previewData ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                <p className="text-sm text-gray-600">
                  {previewData.length} ta yorliq tayyorlandi
                </p>
                
                {previewData.slice(0, 5).map((label, index) => (
                  <div 
                    key={index}
                    className="bg-white border border-gray-200 rounded-lg p-3 text-sm"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold">{trData(label.productName)}</p>
                        <p className="text-gray-600">{label.productType}</p>
                      </div>
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                        #{label.bagNumber}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>{label.unitsPerBag} dona | {label.productionDate}</p>
                      <p className="font-mono bg-gray-100 px-2 py-1 rounded">
                        {formatBarcode(label.barcode)}
                      </p>
                    </div>
                  </div>
                ))}

                {previewData.length > 5 && (
                  <p className="text-center text-sm text-gray-500">
                    +{previewData.length - 5} ta yorliq
                  </p>
                )}

                {/* Barcode format info */}
                <div className="bg-blue-50 p-3 rounded-lg text-xs">
                  <p className="font-semibold text-blue-800 mb-1">Barkod formati:</p>
                  <div className="grid grid-cols-6 gap-1 text-center">
                    <div>
                      <div className="font-mono bg-white rounded px-1">DD</div>
                      <div className="text-gray-600">Kun</div>
                    </div>
                    <div>
                      <div className="font-mono bg-white rounded px-1">MM</div>
                      <div className="text-gray-600">Oy</div>
                    </div>
                    <div>
                      <div className="font-mono bg-white rounded px-1">PP</div>
                      <div className="text-gray-600">Maxsulot</div>
                    </div>
                    <div>
                      <div className="font-mono bg-white rounded px-1">TT</div>
                      <div className="text-gray-600">Tur</div>
                    </div>
                    <div>
                      <div className="font-mono bg-white rounded px-1">WW</div>
                      <div className="text-gray-600">Ishchi</div>
                    </div>
                    <div>
                      <div className="font-mono bg-white rounded px-1">BB</div>
                      <div className="text-gray-600">Qop</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                <Barcode className="w-12 h-12 mb-2" />
                <p className="text-sm">"Ko'rish" tugmasini bosing</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
