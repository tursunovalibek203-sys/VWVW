import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './Tabs';
import { Progress } from './Progress';
import { trData } from '../lib/transliterator';
import { 
  ShoppingCart, 
  Wallet, 
  Gift, 
  User, 
  TrendingUp, 
  Package, 
  Trophy,
  CreditCard,
  HelpCircle,
  Settings,
  Bell,
  Download,
  Share2,
  Target,
  Zap,
  Shield,
  Headphones
} from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  email?: string;
  category: string;
  balance: number;
  debt: number;
  discountLimit: number;
  loyaltyPoints: number;
  createdAt: string;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
}

interface OrderItem {
  product: {
    name: string;
  };
  quantityBags: number;
  pricePerBag: number;
  subtotal: number;
}

interface Product {
  id: string;
  name: string;
  currentStock: number;
  pricePerBag: number;
  category: string;
}

export default function CustomerPortal() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomerData();
    loadProducts();
  }, []);

  const loadCustomerData = async () => {
    try {
      // Mock data - real API call would go here
      const mockCustomer: Customer = {
        id: '1',
        name: 'Ali Valiyev',
        phone: '+998 90 123-45-67',
        address: 'Toshkent, Chilonzor tumani',
        email: 'ali@example.com',
        category: 'VIP',
        balance: 500000,
        debt: 150000,
        discountLimit: 100000,
        loyaltyPoints: 2500,
        createdAt: '2024-01-15'
      };
      
      const mockOrders: Order[] = [
        {
          id: '1',
          orderNumber: 'ORD-001',
          status: 'DELIVERED',
          totalAmount: 250000,
          createdAt: '2024-03-10',
          items: [
            {
              product: { name: 'Plastik qop 5kg' },
              quantityBags: 5,
              pricePerBag: 50000,
              subtotal: 250000
            }
          ]
        }
      ];

      setCustomer(mockCustomer);
      setOrders(mockOrders);
    } catch (error) {
      console.error('Error loading customer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      // Mock products - real API call would go here
      const mockProducts: Product[] = [
        {
          id: '1',
          name: 'Plastik butilka',
          currentStock: 100,
          pricePerBag: 12000,
          category: 'Butilka'
        },
        {
          id: '2',
          name: 'Plastik qop 5kg',
          currentStock: 50,
          pricePerBag: 50000,
          category: 'Qop'
        },
        {
          id: '3',
          name: 'Plastik qop 10kg',
          currentStock: 30,
          pricePerBag: 80000,
          category: 'Qop'
        }
      ];
      setProducts(mockProducts);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const getCustomerLevel = (points: number) => {
    if (points >= 5000) return { name: 'VIP', emoji: 'ðŸ‘‘', color: 'bg-purple-500' };
    if (points >= 2000) return { name: 'Gold', emoji: 'ðŸ†', color: 'bg-yellow-500' };
    if (points >= 1000) return { name: 'Silver', emoji: 'â­', color: 'bg-gray-500' };
    return { name: 'Bronze', emoji: 'ðŸ¥‰', color: 'bg-orange-500' };
  };

  const addToCart = (product: Product, quantity: number) => {
    const existingItem = cart.find(item => item.productId === product.id);
    if (existingItem) {
      setCart(cart.map(item => 
        item.productId === product.id 
          ? { ...item, quantityBags: item.quantityBags + quantity }
          : item
      ));
    } else {
      setCart([...cart, {
        productId: product.id,
        productName: trData(product.name),
        quantityBags: quantity,
        pricePerBag: product.pricePerBag,
        subtotal: quantity * product.pricePerBag
      }]);
    }
  };

  const createOrder = async () => {
    if (cart.length === 0) return;
    
    try {
      // Create order API call would go here
      console.log('Creating order with cart:', cart);
      setCart([]);
      console.log('Buyurtma muvaffaqiyatli yaratildi!');
    } catch (error) {
      console.error('Error creating order:', error);
      console.log('Buyurtma yaratishda xatolik!');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const level = getCustomerLevel(customer?.loyaltyPoints || 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`w-16 h-16 ${level.color} rounded-full flex items-center justify-center text-white text-2xl font-bold`}>
                {level.emoji}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{trData(customer?.name)}</h1>
                <p className="text-gray-600">LUX PET PLAST - Premium Mijoz</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">ID: {customer?.id.slice(-8).toUpperCase()}</p>
              <Badge className={`${level.color} text-white`}>
                {level.emoji} {level.name}
              </Badge>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100">Balans</p>
                  <p className="text-2xl font-bold">{customer?.balance?.toLocaleString()} so'm</p>
                </div>
                <Wallet className="w-8 h-8 text-blue-100" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100">Qarz</p>
                  <p className="text-2xl font-bold">{customer?.debt?.toLocaleString()} so'm</p>
                </div>
                <CreditCard className="w-8 h-8 text-red-100" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100">Ballar</p>
                  <p className="text-2xl font-bold">{customer?.loyaltyPoints}</p>
                </div>
                <Trophy className="w-8 h-8 text-green-100" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100">Chegirma</p>
                  <p className="text-2xl font-bold">{customer?.discountLimit?.toLocaleString()} so'm</p>
                </div>
                <Gift className="w-8 h-8 text-purple-100" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="orders" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Buyurtmalar
            </TabsTrigger>
            <TabsTrigger value="shop" className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Do'kon
            </TabsTrigger>
            <TabsTrigger value="financial" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Moliyaviy
            </TabsTrigger>
            <TabsTrigger value="bonus" className="flex items-center gap-2">
              <Gift className="w-4 h-4" />
              Bonuslar
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Profil
            </TabsTrigger>
            <TabsTrigger value="help" className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              Yordam
            </TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Mening Buyurtmalarim
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold">{order.orderNumber}</h3>
                          <p className="text-sm text-gray-600">{order.createdAt}</p>
                        </div>
                        <Badge className={
                          order.status === 'DELIVERED' ? 'bg-green-500' :
                          order.status === 'PENDING' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }>
                          {order.status}
                        </Badge>
                      </div>
                      <p className="font-semibold">{order.totalAmount.toLocaleString()} so'm</p>
                      <div className="mt-2">
                        {order.items.map((item, index) => (
                          <div key={index} className="text-sm text-gray-600">
                            {trData(item.product.name)} - {item.quantityBags} qop
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Shop Tab */}
          <TabsContent value="shop">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5" />
                      Mahsulotlar
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {products.map((product) => (
                        <div key={product.id} className="border rounded-lg p-4">
                          <h3 className="font-semibold mb-2">{trData(product.name)}</h3>
                          <p className="text-sm text-gray-600 mb-2">Omborda: {product.currentStock} ta</p>
                          <p className="font-bold text-lg mb-3">{product.pricePerBag.toLocaleString()} so'm/qop</p>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              onClick={() => addToCart(product, 1)}
                              className="flex-1"
                            >
                              <ShoppingCart className="w-4 h-4 mr-1" />
                              Qo'shish
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => addToCart(product, 5)}
                            >
                              +5
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5" />
                      Savat
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {cart.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">Savat bo'sh</p>
                    ) : (
                      <div className="space-y-4">
                        {cart.map((item, index) => (
                          <div key={index} className="flex justify-between items-center">
                            <div>
                              <h4 className="font-semibold">{trData(item.productName)}</h4>
                              <p className="text-sm text-gray-600">{item.quantityBags} qop Ã— {item.pricePerBag.toLocaleString()}</p>
                            </div>
                            <p className="font-semibold">{item.subtotal.toLocaleString()} so'm</p>
                          </div>
                        ))}
                        <div className="border-t pt-4">
                          <div className="flex justify-between items-center mb-4">
                            <span className="font-semibold">Jami:</span>
                            <span className="font-bold text-lg">
                              {cart.reduce((sum, item) => sum + item.subtotal, 0).toLocaleString()} so'm
                            </span>
                          </div>
                          <Button onClick={createOrder} className="w-full">
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            Buyurtma Berish
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Moliyaviy Holat
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-4">Balans Ma'lumotlari</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Hozirgi balans:</span>
                        <span className="font-semibold">{customer?.balance?.toLocaleString()} so'm</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Qarz:</span>
                        <span className="font-semibold text-red-600">{customer?.debt?.toLocaleString()} so'm</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Chegirma limiti:</span>
                        <span className="font-semibold text-green-600">{customer?.discountLimit?.toLocaleString()} so'm</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-4">To'lov Rejasi</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Oylik to'lov:</span>
                        <span className="font-semibold">50,000 so'm</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Keyingi to'lov:</span>
                        <span className="font-semibold">15 Aprel</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Kredit liniyasi:</span>
                        <span className="font-semibold text-green-600">1,000,000 so'm</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6">
                  <h3 className="font-semibold mb-4">Hisobotlar</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      PDF
                    </Button>
                    <Button variant="outline" className="flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Excel
                    </Button>
                    <Button variant="outline" className="flex items-center gap-2">
                      <Share2 className="w-4 h-4" />
                      Ulashish
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bonus Tab */}
          <TabsContent value="bonus">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="w-5 h-5" />
                  Bonus Dasturi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-yellow-500" />
                      Sadoqat Ballari
                    </h3>
                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold">Hozirgi ballar:</span>
                        <span className="text-2xl font-bold text-orange-600">{customer?.loyaltyPoints}</span>
                      </div>
                      <div className="mb-2">
                        <Progress value={(customer?.loyaltyPoints || 0) / 100} className="h-2" />
                      </div>
                      <p className="text-sm text-gray-600">Keyingi darajagacha: {(5000 - (customer?.loyaltyPoints || 0))} ball</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Target className="w-5 h-5 text-blue-500" />
                      Referral Tizimi
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-blue-600">5</p>
                        <p className="text-sm text-gray-600">Taklif qilingan do'stlar</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-green-600">3</p>
                        <p className="text-sm text-gray-600">Qo'shilgan do'stlar</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-purple-600">1,500</p>
                        <p className="text-sm text-gray-600">Referral ballari</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-purple-500" />
                      Maxsus Aksiyalar
                    </h3>
                    <div className="space-y-3">
                      <div className="border rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-semibold">VIP Mijozlar uchun</h4>
                            <p className="text-sm text-gray-600">10% chegirma barcha mahsulotlarga</p>
                          </div>
                          <Badge className="bg-purple-500">Faol</Badge>
                        </div>
                      </div>
                      <div className="border rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-semibold">Ommaviy Buyurtma</h4>
                            <p className="text-sm text-gray-600">100+ qop = 15% chegirma</p>
                          </div>
                          <Badge className="bg-green-500">Doimiy</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Profil Ma'lumotlari
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-4">Shaxsiy Ma'lumotlar</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ism</label>
                        <p className="text-lg">{trData(customer?.name)}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                        <p className="text-lg">{customer?.phone}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <p className="text-lg">{customer?.email || 'Mavjud emas'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Manzil</label>
                        <p className="text-lg">{customer?.address}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-4">Hisob Ma'lumotlari</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ro'yxatdan o'tgan sana</label>
                        <p className="text-lg">{customer?.createdAt}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mijoz toifasi</label>
                        <p className="text-lg">{customer?.category}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-4">Sozlamalar</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4" />
                          <span>Bildirishnomalar</span>
                        </div>
                        <Button variant="outline" size="sm">
                          <Settings className="w-4 h-4 mr-1" />
                          Sozlash
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          <span>Xavfsizlik</span>
                        </div>
                        <Button variant="outline" size="sm">
                          <Settings className="w-4 h-4 mr-1" />
                          Sozlash
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Help Tab */}
          <TabsContent value="help">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5" />
                  Yordam Markazi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Headphones className="w-5 h-5" />
                      Tezkor Yordam
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button variant="outline" className="h-20 flex-col">
                        <Phone className="w-6 h-6 mb-2" />
                        <span>Telefon orqali</span>
                        <span className="text-sm text-gray-600">+998 XX XXX-XX-XX</span>
                      </Button>
                      <Button variant="outline" className="h-20 flex-col">
                        <MessageCircle className="w-6 h-6 mb-2" />
                        <span>Chat yordam</span>
                        <span className="text-sm text-gray-600">24/7 online</span>
                      </Button>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-4">Ko'p So'raladigan Savollar</h3>
                    <div className="space-y-3">
                      <div className="border rounded-lg p-4">
                        <h4 className="font-semibold mb-2">Qanday buyurtma berish mumkin?</h4>
                        <p className="text-gray-600">Do'kon bo'limidan mahsulotlarni tanlab, savatga qo'shing va buyurtma berish tugmasini bosing.</p>
                      </div>
                      <div className="border rounded-lg p-4">
                        <h4 className="font-semibold mb-2">To'lov qanday amalga oshiriladi?</h4>
                        <p className="text-gray-600">Naqd, karta, Click yoki kredit orqali to'lov qilishingiz mumkin.</p>
                      </div>
                      <div className="border rounded-lg p-4">
                        <h4 className="font-semibold mb-2">Yetkazib berish qancha vaqt oladi?</h4>
                        <p className="text-gray-600">Toshkent shahri ichida 2-4 soat, boshqa viloyatlarda 1-2 kun.</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-4">Video Darsliklar</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border rounded-lg p-4">
                        <h4 className="font-semibold mb-2">ðŸ“¹ Ro'yxatdan o'tish</h4>
                        <p className="text-sm text-gray-600">Tizimdan to'liq foydalanish uchun ro'yxatdan o'tish</p>
                      </div>
                      <div className="border rounded-lg p-4">
                        <h4 className="font-semibold mb-2">ðŸ“¹ Buyurtma berish</h4>
                        <p className="text-sm text-gray-600">Mahsulotlarni tanlash va buyurtma qilish</p>
                      </div>
                      <div className="border rounded-lg p-4">
                        <h4 className="font-semibold mb-2">ðŸ“¹ To'lov qilish</h4>
                        <p className="text-sm text-gray-600">Turli to'lov usullari bilan tanishish</p>
                      </div>
                      <div className="border rounded-lg p-4">
                        <h4 className="font-semibold mb-2">ðŸ“¹ Bonus to'plash</h4>
                        <p className="text-sm text-gray-600">Sadoqat dasturidan foydalanish</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Add missing imports
import { Phone, MessageCircle } from 'lucide-react';
