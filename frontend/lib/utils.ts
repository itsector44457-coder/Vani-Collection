// Utility functions for the application

/**
 * Converts a product title to URL-friendly slug
 */
export function generateProductSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')  // Replace non-alphanumeric with hyphens
    .replace(/-+/g, '-')         // Replace multiple hyphens with single
    .replace(/^-|-$/g, '');      // Remove leading/trailing hyphens
}

/**
 * Formats price with Indian number formatting
 */
export function formatPrice(price: number): string {
  return `₹${price.toLocaleString('en-IN')}`;
}

/**
 * Calculate discount percentage
 */
export function calculateDiscount(originalPrice: number, salePrice: number): number {
  return Math.round(((originalPrice - salePrice) / originalPrice) * 100);
}

/**
 * Format date for Indian locale
 */
export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Generate breadcrumb items for product pages
 */
export interface BreadcrumbItem {
  label: string;
  href: string;
}

export function generateBreadcrumbs(product: { category: string; title: string }): BreadcrumbItem[] {
  const categoryLabel = product.category
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return [
    { label: "Home", href: "/" },
    { label: "Products", href: "/products" },
    {
      label: categoryLabel,
      href: `/products?category=${encodeURIComponent(product.category)}`,
    },
    { label: product.title, href: "" },
  ];
}

/**
 * Truncate text to specified length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

/**
 * Check if device is mobile
 */
export function isMobileDevice(): boolean {
  return typeof window !== 'undefined' && (
    window.innerWidth < 768 || 
    window.matchMedia("(hover: none)").matches
  );
}

/**
 * Generate star rating display
 */
export function generateStarRating(rating: number): { filled: number; half: boolean; empty: number } {
  const filled = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  const empty = 5 - filled - (half ? 1 : 0);
  
  return { filled, half, empty };
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format (Indian)
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[+]?[91]?[6-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * Generate random ID
 */
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

/**
 * Debounce function
 */
export function debounce<Args extends unknown[]>(
  func: (...args: Args) => void,
  wait: number
): (...args: Args) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Class name utility (simple version of clsx)
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}