const DEFAULT_NAVIGATION_MENUS = [
  {
    key: 'lookbook',
    label: 'Lookbook',
    position: 1,
    isActive: true,
    columns: [
      { title: 'Latest Edits', items: [
        { label: 'Spring Collection', href: '/products?sort=new' },
        { label: 'Summer Breeze', href: '/products' },
        { label: 'Festive Luxe', categorySlug: 'festive' },
        { label: 'Wedding Season', categorySlug: 'festive' },
      ] },
      { title: 'Inspiration', items: [
        { label: 'Celebrity Picks', href: '/products?sort=featured' },
        { label: 'Stylist Favorites', href: '/products?sort=featured' },
        { label: 'Best Sellers', href: '/products?sort=featured' },
        { label: 'New Arrivals', href: '/products?sort=new' },
      ] },
    ],
  },
  {
    key: 'shop-by-price',
    label: 'Shop by Price',
    position: 2,
    isActive: true,
    columns: [
      { title: 'Budget Friendly', items: [
        { label: 'Under ₹1,499', href: '/products?price=Under+%E2%82%B91%2C499' },
        { label: '₹1,500 – ₹1,999', href: '/products?price=%E2%82%B91%2C500+%E2%80%93+%E2%82%B91%2C999' },
        { label: '₹2,000 – ₹2,999', href: '/products?price=%E2%82%B92%2C000+%E2%80%93+%E2%82%B92%2C999' },
      ] },
      { title: 'Premium Range', items: [
        { label: '₹3,000 - ₹5,000', href: '/products?price=%E2%82%B93%2C000+%26+Above' },
        { label: 'Premium Collection', href: '/products?price=%E2%82%B93%2C000+%26+Above' },
        { label: 'Luxury Collection', href: '/products?sort=price-high' },
      ] },
    ],
  },
];

function mergeNavigationMenus(savedMenus) {
  const savedByKey = new Map(savedMenus.map((menu) => [menu.key, menu]));
  return DEFAULT_NAVIGATION_MENUS.map((menu) => ({
    ...menu,
    ...(savedByKey.get(menu.key) || {}),
    columns: savedByKey.get(menu.key)?.columns || menu.columns,
  }));
}

module.exports = { DEFAULT_NAVIGATION_MENUS, mergeNavigationMenus };
