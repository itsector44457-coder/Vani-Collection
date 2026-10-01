"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  addresses?: Address[];
  preferences?: UserPreferences;
  createdAt: string;
}

export interface Address {
  id: string;
  type: "home" | "work" | "other";
  fullName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  isDefault: boolean;
}

export interface UserPreferences {
  newsletter: boolean;
  smsUpdates: boolean;
  whatsappUpdates: boolean;
  preferredSize: string;
  favoriteCategories: string[];
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (userData: SignupData) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
  addAddress: (address: Omit<Address, 'id'>) => Promise<void>;
  updateAddress: (id: string, address: Partial<Address>) => Promise<void>;
  deleteAddress: (id: string) => Promise<void>;
  setDefaultAddress: (id: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
}

export interface SignupData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  newsletter?: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const initAuth = () => {
      try {
        const storedUser = localStorage.getItem('vani_user');
        const storedToken = localStorage.getItem('vani_token');
        
        if (storedUser && storedToken) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // Clear invalid data
        localStorage.removeItem('vani_user');
        localStorage.removeItem('vani_token');
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      // Simulate API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Demo user for testing
      if (email === "customer@vanicollection.com" && password === "customer123") {
        const demoUser: User = {
          id: "demo_user_1",
          email: "customer@vanicollection.com",
          firstName: "Priya",
          lastName: "Sharma",
          phone: "+91 98765 43210",
          addresses: [
            {
              id: "addr_1",
              type: "home",
              fullName: "Priya Sharma",
              phone: "+91 98765 43210",
              address: "123, Rose Garden Society, Malviya Nagar",
              city: "Jaipur",
              state: "Rajasthan",
              pincode: "302017",
              landmark: "Near City Mall",
              isDefault: true,
            }
          ],
          preferences: {
            newsletter: true,
            smsUpdates: true,
            whatsappUpdates: true,
            preferredSize: "M",
            favoriteCategories: ["mul-cotton", "festive"],
          },
          createdAt: "2023-06-15T10:30:00Z",
        };

        setUser(demoUser);
        localStorage.setItem('vani_user', JSON.stringify(demoUser));
        localStorage.setItem('vani_token', 'demo_token_123');
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (userData: SignupData): Promise<void> => {
    setIsLoading(true);
    try {
      // Simulate API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      const newUser: User = {
        id: `user_${Date.now()}`,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        addresses: [],
        preferences: {
          newsletter: userData.newsletter || false,
          smsUpdates: true,
          whatsappUpdates: true,
          preferredSize: "M",
          favoriteCategories: [],
        },
        createdAt: new Date().toISOString(),
      };

      setUser(newUser);
      localStorage.setItem('vani_user', JSON.stringify(newUser));
      localStorage.setItem('vani_token', `token_${Date.now()}`);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('vani_user');
    localStorage.removeItem('vani_token');
  };

  const updateProfile = async (data: Partial<User>): Promise<void> => {
    if (!user) throw new Error('Not authenticated');
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      localStorage.setItem('vani_user', JSON.stringify(updatedUser));
    } catch (error) {
      throw error;
    }
  };

  const addAddress = async (address: Omit<Address, 'id'>): Promise<void> => {
    if (!user) throw new Error('Not authenticated');
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const newAddress: Address = {
        ...address,
        id: `addr_${Date.now()}`,
      };

      // If this is the first address or marked as default, make it default
      if (!user.addresses?.length || address.isDefault) {
        // Unset other default addresses
        const updatedAddresses = (user.addresses || []).map(addr => ({
          ...addr,
          isDefault: false
        }));
        newAddress.isDefault = true;
        
        const updatedUser = {
          ...user,
          addresses: [...updatedAddresses, newAddress]
        };
        
        setUser(updatedUser);
        localStorage.setItem('vani_user', JSON.stringify(updatedUser));
      } else {
        const updatedUser = {
          ...user,
          addresses: [...(user.addresses || []), newAddress]
        };
        
        setUser(updatedUser);
        localStorage.setItem('vani_user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      throw error;
    }
  };

  const updateAddress = async (id: string, addressData: Partial<Address>): Promise<void> => {
    if (!user) throw new Error('Not authenticated');
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const updatedAddresses = (user.addresses || []).map(addr =>
        addr.id === id ? { ...addr, ...addressData } : addr
      );
      
      const updatedUser = {
        ...user,
        addresses: updatedAddresses
      };
      
      setUser(updatedUser);
      localStorage.setItem('vani_user', JSON.stringify(updatedUser));
    } catch (error) {
      throw error;
    }
  };

  const deleteAddress = async (id: string): Promise<void> => {
    if (!user) throw new Error('Not authenticated');
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const updatedAddresses = (user.addresses || []).filter(addr => addr.id !== id);
      
      const updatedUser = {
        ...user,
        addresses: updatedAddresses
      };
      
      setUser(updatedUser);
      localStorage.setItem('vani_user', JSON.stringify(updatedUser));
    } catch (error) {
      throw error;
    }
  };

  const setDefaultAddress = async (id: string): Promise<void> => {
    if (!user) throw new Error('Not authenticated');
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 400));
      
      const updatedAddresses = (user.addresses || []).map(addr => ({
        ...addr,
        isDefault: addr.id === id
      }));
      
      const updatedUser = {
        ...user,
        addresses: updatedAddresses
      };
      
      setUser(updatedUser);
      localStorage.setItem('vani_user', JSON.stringify(updatedUser));
    } catch (error) {
      throw error;
    }
  };

  const forgotPassword = async (email: string): Promise<void> => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real app, this would send a reset email
      console.log(`Password reset email sent to ${email}`);
    } catch (error) {
      throw error;
    }
  };

  const resetPassword = async (token: string, newPassword: string): Promise<void> => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // In a real app, this would validate the token and update password
      console.log(`Password reset successful for token: ${token}`);
    } catch (error) {
      throw error;
    }
  };

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    signup,
    logout,
    updateProfile,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    forgotPassword,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}