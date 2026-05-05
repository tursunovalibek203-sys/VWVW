import { useEffect, useState } from 'react';
import { Card, CardContent } from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Modal from '../components/Modal';
import Badge, { type BadgeVariant } from '../components/Badge';
import api from '../lib/professionalApi';
import { Users as UsersIcon, Shield, Edit, Trash2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

import type { User } from '../types';

export default function Users() {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState({
    name: '',
    login: '',
    password: '',
    role: 'SELLER',
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data } = await api.get('/users');
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, form);
      } else {
        await api.post('/auth/register', form);
      }
      setShowModal(false);
      setEditingUser(null);
      setForm({ name: '', login: '', password: '', role: 'SELLER' });
      loadUsers();
    } catch (error) {
      alert('Xatolik yuz berdi');
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setForm({ name: user.name, login: user.login || '', password: '', role: user.role });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Rostdan ham o\'chirmoqchimisiz?')) return;
    try {
      await api.delete(`/users/${id}`);
      loadUsers();
    } catch (error) {
      alert('O\'chirib bo\'lmadi');
    }
  };

  const getRoleBadge = (role: string): BadgeVariant => {
    const variants: Record<string, BadgeVariant> = {
      ADMIN: 'danger',
      SELLER: 'info',
      WAREHOUSE_MANAGER: 'warning',
      ACCOUNTANT: 'success',
      CASHIER: 'primary',
    };
    return variants[role] || 'default';
  };

  const getRoleLabel = (role: string): string => {
    const labels: Record<string, string> = {
      ADMIN: 'Administrator',
      SELLER: 'Sotuvchi',
      WAREHOUSE_MANAGER: 'Ombor Menejeri',
      ACCOUNTANT: 'Buxgalter',
      CASHIER: 'Kassir',
    };
    return labels[role] || role;
  };

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Ruxsat yo'q</h2>
          <p className="text-muted-foreground">Faqat administratorlar foydalanuvchilarni boshqarishi mumkin</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Foydalanuvchilar</h1>
        <Button onClick={() => { setEditingUser(null); setShowModal(true); }} className="w-full sm:w-auto">
          Foydalanuvchi Qo'shish
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {users.map((user) => (
          <Card key={user.id}>
            <CardContent>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold truncate">{user.name}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">{user.email}</p>
                  <Badge variant={getRoleBadge(user.role)} className="mt-2">
                    <span className="text-xs">{getRoleLabel(user.role)}</span>
                  </Badge>
                </div>
                <UsersIcon className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1 text-xs sm:text-sm"
                  onClick={() => handleEdit(user)}
                >
                  <Edit className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  Tahrirlash
                </Button>
                {user.id !== currentUser?.id && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(user.id)}
                    aria-label="Foydalanuvchini o'chirish"
                  >
                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingUser ? 'Foydalanuvchini Tahrirlash' : 'Yangi Foydalanuvchi'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Ism"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Input
            label="Login (foydalanuvchi nomi)"
            type="text"
            value={form.login}
            onChange={(e) => setForm({ ...form, login: e.target.value })}
            placeholder="admin123"
            required
          />
          <Input
            label={editingUser ? 'Yangi Parol (bo\'sh qoldiring o\'zgarmasa)' : 'Parol'}
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required={!editingUser}
          />
          <div>
            <label htmlFor="user-role" className="text-sm font-medium">Rol</label>
            <select
              id="user-role"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="SELLER">Sotuvchi</option>
              <option value="WAREHOUSE_MANAGER">Ombor Menejeri</option>
              <option value="ACCOUNTANT">Buxgalter</option>
              <option value="CASHIER">Kassir</option>
              <option value="ADMIN">Administrator</option>
            </select>
          </div>
          <Button type="submit" className="w-full">
            {editingUser ? 'Saqlash' : 'Yaratish'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
