import { useEffect, useState } from 'react';
import { Card, CardContent } from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Modal from '../components/Modal';
import api from '../lib/professionalApi';
import { formatDate } from '../lib/utils';
import { Truck, User, Package, MapPin, Clock, CheckCircle } from 'lucide-react';

export default function Logistics() {
  const [activeTab, setActiveTab] = useState<'deliveries' | 'vehicles' | 'drivers'>('deliveries');
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'vehicle' | 'driver' | 'delivery'>('vehicle');
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      const [statsRes, deliveriesRes, vehiclesRes, driversRes] = await Promise.all([
        api.get('/logistics/statistics'),
        api.get('/logistics/deliveries'),
        api.get('/logistics/vehicles'),
        api.get('/logistics/drivers')
      ]);
      setStats(statsRes.data);
      setDeliveries(deliveriesRes.data);
      setVehicles(vehiclesRes.data);
      setDrivers(driversRes.data);
    } catch (error) {
      console.error('Ma\'lumotlarni yuklashda xatolik');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (modalType === 'vehicle') {
        await api.post('/logistics/vehicles', form);
      } else if (modalType === 'driver') {
        await api.post('/logistics/drivers', form);
      }
      setShowModal(false);
      setForm({});
      loadData();
    } catch (error) {
      alert('Xatolik yuz berdi!');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      ASSIGNED: 'bg-blue-100 text-blue-800',
      IN_TRANSIT: 'bg-purple-100 text-purple-800',
      DELIVERED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
      AVAILABLE: 'bg-green-100 text-green-800',
      IN_USE: 'bg-blue-100 text-blue-800',
      ON_DUTY: 'bg-blue-100 text-blue-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <Truck className="w-6 h-6 sm:w-8 sm:h-8" />
          Logistika Tizimi
        </h1>
      </div>

      {/* Statistika */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Mashinalar</p>
                  <p className="text-2xl font-bold">{stats.vehicles.total}</p>
                  <p className="text-xs text-green-600">Bo'sh: {stats.vehicles.available}</p>
                </div>
                <Truck className="w-12 h-12 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Haydovchilar</p>
                  <p className="text-2xl font-bold">{stats.drivers.total}</p>
                  <p className="text-xs text-green-600">Bo'sh: {stats.drivers.available}</p>
                </div>
                <User className="w-12 h-12 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Yetkazib Berishlar</p>
                  <p className="text-2xl font-bold">{stats.deliveries.total}</p>
                  <p className="text-xs text-blue-600">Yo'lda: {stats.deliveries.inTransit}</p>
                </div>
                <Package className="w-12 h-12 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('deliveries')}
          className={`px-3 sm:px-4 py-2 font-medium text-sm sm:text-base whitespace-nowrap ${activeTab === 'deliveries' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
        >
          Yetkazib Berishlar
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('vehicles')}
          className={`px-3 sm:px-4 py-2 font-medium text-sm sm:text-base whitespace-nowrap ${activeTab === 'vehicles' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
        >
          Mashinalar
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('drivers')}
          className={`px-3 sm:px-4 py-2 font-medium text-sm sm:text-base whitespace-nowrap ${activeTab === 'drivers' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
        >
          Haydovchilar
        </button>
      </div>

      {/* Content */}
      {activeTab === 'deliveries' && (
        <div className="space-y-4">
          {deliveries.map((delivery) => (
            <Card key={delivery.id}>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Package className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="text-sm sm:text-base font-semibold">{delivery.sale?.customer?.name}</span>
                      <span className={`px-2 py-1 rounded text-xs ${getStatusColor(delivery.status)}`}>
                        {delivery.status}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="break-all">{delivery.toAddress}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                        {formatDate(delivery.scheduledDate)}
                      </div>
                    </div>
                    {delivery.driver && (
                      <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                        <User className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span>{delivery.driver.name}</span>
                        {delivery.vehicle && (
                          <>
                            <Truck className="w-3 h-3 sm:w-4 sm:h-4 ml-2" />
                            <span>{delivery.vehicle.plateNumber}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {delivery.status === 'DELIVERED' && (
                      <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'vehicles' && (
        <div>
          <Button onClick={() => { setModalType('vehicle'); setShowModal(true); }} className="mb-4 w-full sm:w-auto">
            Mashina Qo'shish
          </Button>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vehicles.map((vehicle) => (
              <Card key={vehicle.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Truck className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="text-sm sm:text-base font-semibold">{vehicle.plateNumber}</span>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">{vehicle.model}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">Sig'im: {vehicle.capacity} kg</p>
                      <span className={`inline-block mt-2 px-2 py-1 rounded text-xs ${getStatusColor(vehicle.status)}`}>
                        {vehicle.status}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'drivers' && (
        <div>
          <Button onClick={() => { setModalType('driver'); setShowModal(true); }} className="mb-4 w-full sm:w-auto">
            Haydovchi Qo'shish
          </Button>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {drivers.map((driver) => (
              <Card key={driver.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="text-sm sm:text-base font-semibold">{driver.name}</span>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">{driver.phone}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">Yetkazildi: {driver.totalDeliveries}</p>
                      <p className="text-xs sm:text-sm text-yellow-600">⭐ {driver.rating.toFixed(1)}</p>
                      <span className={`inline-block mt-2 px-2 py-1 rounded text-xs ${getStatusColor(driver.status)}`}>
                        {driver.status}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={modalType === 'vehicle' ? 'Yangi Mashina' : 'Yangi Haydovchi'}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {modalType === 'vehicle' ? (
              <>
                <Input label="Davlat Raqami" value={form.plateNumber || ''} onChange={(e) => setForm({ ...form, plateNumber: e.target.value })} required />
                <Input label="Model" value={form.model || ''} onChange={(e) => setForm({ ...form, model: e.target.value })} required />
                <Input label="Sig'im (kg)" type="number" value={form.capacity || ''} onChange={(e) => setForm({ ...form, capacity: parseFloat(e.target.value) })} required />
                <label htmlFor="vehicle-type" className="block text-sm font-medium text-gray-700 mb-1">Turi</label>
                <select id="vehicle-type" className="w-full px-3 py-2 border rounded" value={form.type || ''} onChange={(e) => setForm({ ...form, type: e.target.value })} required>
                  <option value="">Turi</option>
                  <option value="TRUCK">Yuk Mashinasi</option>
                  <option value="VAN">Furgon</option>
                  <option value="CAR">Avtomobil</option>
                </select>
              </>
            ) : (
              <>
                <Input label="Ism" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                <Input label="Telefon" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
                <Input label="Litsenziya Raqami" value={form.licenseNumber || ''} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} required />
                <Input label="Litsenziya Muddati" type="date" value={form.licenseExpiry || ''} onChange={(e) => setForm({ ...form, licenseExpiry: e.target.value })} required />
              </>
            )}
            <Button type="submit" className="w-full">Saqlash</Button>
          </form>
        </Modal>
      )}
    </div>
  );
}
