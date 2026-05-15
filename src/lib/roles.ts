import { ShoppingBag, Store, Truck, Home } from 'lucide-react';

export const SYSTEM_ROLES = [
  { id: 'buyer', label: 'Buyer', icon: ShoppingBag, color: 'bg-blue-500', description: 'Shop and browse listings' },
  { id: 'seller', label: 'Seller', icon: Store, color: 'bg-emerald-500', description: 'Sell products on the marketplace' },
  { id: 'transporter', label: 'Transporter', icon: Truck, color: 'bg-orange-500', description: 'Deliver goods and manage logistics' },
  { id: 'property_owner', label: 'Property Owner', icon: Home, color: 'bg-purple-500', description: 'List and manage properties' }
] as const;
