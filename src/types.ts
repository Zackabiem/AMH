export type Role = "buyer" | "seller" | "transporter" | "property_owner";

export interface User {
  id: number;
  email: string;
  role: Role;
  name: string;
}

export interface Product {
  id: number;
  seller_id: number;
  title: string;
  description: string;
  price: number;
  images: string[];
}

export interface TransportJob {
  id: number;
  transporter_id: number;
  origin: string;
  destination: string;
  status: string;
}

export interface Property {
  id: number;
  owner_id: number;
  title: string;
  location: string;
  price: number;
}
