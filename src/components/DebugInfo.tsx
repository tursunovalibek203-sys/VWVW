import { useEffect, useState } from 'react';
import api from '../lib/api';

export default function DebugInfo() {
  const [products, setProducts] = useState<any[]>([]);
  const [authToken, setAuthToken] = useState<string>('');

  useEffect(() => {
    // Check auth token
    const token = localStorage.getItem('auth-storage');
    if (token) {
      const { state } = JSON.parse(token);
      setAuthToken(state.token || 'No token');
    } else {
      setAuthToken('No auth-storage found');
    }

    // Check products
    api.get('/products').then(response => {
      // ✅ Handle new API response format
      setProducts(response.data?.data || response.data);
    }).catch(error => {
      console.error('Products error:', error);
    });

    // Load products
  }, [products.length]);

  return (
    <div className="p-4 bg-gray-100 rounded-lg mb-4">
      <h3 className="font-bold mb-2">Debug Info:</h3>
      <div className="text-sm space-y-1">
        <p>Auth Token: {authToken.substring(0, 20)}...</p>
        <p>Products Count: {products.length}</p>
        <p>API Base URL: {api.defaults.baseURL}</p>
      </div>
      
      {products.length > 0 && (
        <div className="mt-2">
          <p className="font-semibold">First Product:</p>
          <p className="text-sm">{products[0]?.name}</p>
        </div>
      )}
    </div>
  );
}
