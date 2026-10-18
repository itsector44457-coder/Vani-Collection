"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Alert, ButtonGhost, ButtonPrimary, Card } from "@/lib/admin-ui";
import MediaUploadField from "@/components/admin/MediaUploadField";
import {
  api,
  ApiError,
  isApiConfigured,
  type NavigationMenu,
  type NavigationSettings,
  type StoreCategory,
} from "@/lib/api-client";

const inputClass = "w-full rounded-xl border border-[#e5ded5] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#881337] focus:ring-2 focus:ring-[#881337]/10";
const secondaryClass = "rounded-xl border border-[#e5ded5] bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:border-[#881337]/40";
const NAV_THEME_PRESETS = {
  atelier: { announcementBg: "#1c1917", announcementText: "#dfc28c", announcementBorder: "#2d2520", headerBg: "#faf7f2", headerText: "#292524", accent: "#881337", mobileDrawerBg: "#faf7f2", mobileBottomBg: "#faf7f2" },
  midnight: { announcementBg: "#111827", announcementText: "#f8fafc", announcementBorder: "#334155", headerBg: "#1f2937", headerText: "#f8fafc", accent: "#38bdf8", mobileDrawerBg: "#111827", mobileBottomBg: "#1f2937" },
  forest: { announcementBg: "#052e2b", announcementText: "#d1fae5", announcementBorder: "#14532d", headerBg: "#ecfdf5", headerText: "#064e3b", accent: "#047857", mobileDrawerBg: "#ecfdf5", mobileBottomBg: "#d1fae5" },
} satisfies Record<Exclude<NavigationSettings["theme"], "custom">, NavigationSettings["colors"]>;

const DEFAULT_NAV_SETTINGS: NavigationSettings = {
  theme: "atelier",
  brandName: "Vani Collection",
  brandTagline: "Speciality in Fancy Kurties & Party Wear Dresses",
  logoUrl: "",
  collectionLabel: "Collections",
  announcements: [
    "✦ Speciality in Fancy Kurties & Party Wear Dresses",
    "✦ Free Express Shipping Across India Above ₹1,999",
    "✦ 100% Certified Pure Handcrafted Ensembles · Guna",
  ],
  links: [
    { label: "Stories", href: "/#stories", isActive: true },
    { label: "Reels", href: "/reels", isActive: true },
    { label: "Living Looks", href: "/#products", isActive: true },
  ],
  colors: NAV_THEME_PRESETS.atelier,
};

const blankCategory = () => ({
  name: "",
  slug: "",
  description: "",
  navigationGroup: "Collections",
  position: 0,
  isActive: true,
});

const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [menus, setMenus] = useState<NavigationMenu[]>([]);
  const [navSettings, setNavSettings] = useState<NavigationSettings>(DEFAULT_NAV_SETTINGS);
  const [form, setForm] = useState(blankCategory);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"categories" | "menus" | "appearance">("categories");
  const [loading, setLoading] = useState(isApiConfigured());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = async (signal?: AbortSignal) => {
    const [categoryResult, menuResult, settingsResult] = await Promise.all([
      api.managedCategories(signal),
      api.navigationMenus(signal),
      api.navigationSettings(signal),
    ]);
    return { categories: categoryResult.data, menus: menuResult.data, settings: settingsResult.data };
  };

  useEffect(() => {
    if (!isApiConfigured()) return;
    const controller = new AbortController();
    void load(controller.signal)
      .then(({ categories: loadedCategories, menus: loadedMenus, settings: loadedSettings }) => {
        if (controller.signal.aborted) return;
        setCategories(loadedCategories);
        setMenus(loadedMenus);
        setNavSettings(loadedSettings);
      })
      .catch((cause: unknown) => {
        if ((cause as Error)?.name !== "AbortError") setError(errorMessage(cause, "Could not load categories and navigation."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const resetForm = () => {
    setForm(blankCategory());
    setEditingId(null);
    setError(null);
    setNotice(null);
  };

  const saveCategory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const slug = editingId ? undefined : slugify(form.slug || form.name);
    if (!form.name.trim() || (!editingId && !slug)) {
      setError("Enter a category name that can be converted into a URL slug.");
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      if (editingId) {
        await api.updateCategory(editingId, {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          navigationGroup: form.navigationGroup.trim(),
          position: Number(form.position) || 0,
          isActive: form.isActive,
        });
      } else {
        await api.createCategory({
          ...form,
          name: form.name.trim(),
          slug: slug!,
          description: form.description.trim() || undefined,
          navigationGroup: form.navigationGroup.trim(),
          position: Number(form.position) || 0,
        });
      }
      const refreshed = await load();
      setCategories(refreshed.categories);
      setMenus(refreshed.menus);
      setNavSettings(refreshed.settings);
      resetForm();
      setNotice(editingId ? "Category updated." : "Category created and available in product forms.");
    } catch (cause) {
      setError(errorMessage(cause, "Could not save this category."));
    } finally {
      setSaving(false);
    }
  };

  const editCategory = (category: StoreCategory) => {
    if (!category._id) return;
    setEditingId(category._id);
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      navigationGroup: category.navigationGroup,
      position: category.position,
      isActive: category.isActive,
    });
    setError(null);
    setNotice(null);
    setActiveTab("categories");
  };

  const deleteCategory = async (category: StoreCategory) => {
    if (!category._id || !window.confirm(`Permanently delete category "${category.name}"?\n\n⚠️ WARNING: All products belonging to this category will also be AUTOMATICALLY DELETED from the catalogue and inventory!`)) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await api.deleteCategory(category._id);
      const refreshed = await load();
      setCategories(refreshed.categories);
      setMenus(refreshed.menus);
      setNavSettings(refreshed.settings);
      if (editingId === category._id) resetForm();
      setNotice(`Category "${category.name}" and all associated products were permanently deleted.`);
    } catch (cause) {
      setError(errorMessage(cause, "Could not delete this category."));
    } finally {
      setSaving(false);
    }
  };

  const saveMenu = async (menu: NavigationMenu) => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const { key, ...body } = menu;
      await api.saveNavigationMenu(key, body);
      const result = await load();
      setCategories(result.categories);
      setMenus(result.menus);
      setNavSettings(result.settings);
      setNotice(`${menu.label} dropdown saved.`);
    } catch (cause) {
      setError(errorMessage(cause, `Could not save the ${menu.label} dropdown.`));
    } finally {
      setSaving(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const result = await api.saveNavigationSettings(navSettings);
      setNavSettings(result.data);
      setNotice("Navbar appearance and content saved.");
    } catch (cause) {
      setError(errorMessage(cause, "Could not save navbar settings."));
    } finally {
      setSaving(false);
    }
  };

  const updateNavLink = (index: number, changes: Partial<NavigationSettings["links"][number]>) => {
    setNavSettings((current) => ({
      ...current,
      links: current.links.map((link, itemIndex) => itemIndex === index ? { ...link, ...changes } : link),
    }));
  };

  const activeCategories = useMemo(() => categories.filter((category) => category.isActive), [categories]);

  const updateMenu = (key: NavigationMenu["key"], update: (menu: NavigationMenu) => NavigationMenu) => {
    setMenus((current) => current.map((menu) => menu.key === key ? update(menu) : menu));
  };

  if (!isApiConfigured()) {
    return <div className="space-y-4"><h1 className="font-serif text-2xl font-semibold">Categories & navigation</h1><Alert tone="warning">Configure the API before editing live catalogue categories.</Alert></div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-400">Storefront setup</p>
          <h1 className="mt-1 font-serif text-[26px] font-semibold tracking-tight">Categories & navigation</h1>
          <p className="mt-1 text-[13px] text-stone-500">Manage product categories, collection groups, and the storefront dropdown menus.</p>
        </div>
        <Link href="/admin/products/new" className="text-sm font-semibold text-[#881337] hover:underline">Add a product →</Link>
      </div>

      <div className="flex gap-2 border-b border-[#e8e0d6]">
        {(["categories", "menus", "appearance"] as const).map((tab) => (
          <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`border-b-2 px-3 py-2 text-sm font-semibold capitalize ${activeTab === tab ? "border-[#881337] text-[#881337]" : "border-transparent text-stone-500"}`}>
            {tab === "menus" ? "Navbar dropdowns" : tab === "appearance" ? "Navbar content & theme" : "Categories"}
          </button>
        ))}
      </div>

      {error && <Alert>{error}</Alert>}
      {notice && <p role="status" className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-[12.5px] text-emerald-700 ring-1 ring-emerald-200">{notice}</p>}
      {loading ? <p className="py-8 text-center text-sm text-stone-500">Loading categories and menus…</p> : activeTab === "categories" ? (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Card title={`Categories (${categories.length})`}>
            <div className="space-y-2">
              {categories.map((category) => (
                <div key={category._id || category.slug} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#eee8df] px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-sm text-stone-900">{category.name}</strong>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${category.isActive ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>{category.isActive ? "Active" : "Hidden"}</span>
                    </div>
                    <p className="mt-1 text-xs text-stone-500">{category.slug} · {category.navigationGroup}</p>
                    {category.description && <p className="mt-1 text-xs text-stone-400">{category.description}</p>}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" onClick={() => editCategory(category)} className={secondaryClass}>Edit</button>
                    <button type="button" disabled={saving} onClick={() => void deleteCategory(category)} className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">Delete</button>
                  </div>
                </div>
              ))}
              {!categories.length && <p className="py-6 text-center text-sm text-stone-500">No categories exist yet.</p>}
            </div>
          </Card>

          <Card title={editingId ? "Edit category" : "Create category"}>
            <form className="space-y-4" onSubmit={saveCategory}>
              <label className="block text-xs font-semibold text-stone-600">Category name
                <input required minLength={2} maxLength={80} className={`${inputClass} mt-1.5`} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value, slug: editingId ? current.slug : slugify(event.target.value) }))} />
              </label>
              <label className="block text-xs font-semibold text-stone-600">URL slug
                <input required disabled={Boolean(editingId)} pattern="[a-z0-9]+(-[a-z0-9]+)*" className={`${inputClass} mt-1.5 disabled:bg-stone-50 disabled:text-stone-400`} value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: slugify(event.target.value) }))} />
                <span className="mt-1 block font-normal text-stone-400">{editingId ? "Slug is fixed to keep product and category URLs stable." : "Generated from the name; it becomes the product/category filter key."}</span>
              </label>
              <label className="block text-xs font-semibold text-stone-600">Collections dropdown group
                <input required maxLength={60} className={`${inputClass} mt-1.5`} value={form.navigationGroup} onChange={(event) => setForm((current) => ({ ...current, navigationGroup: event.target.value }))} placeholder="By Fabric, By Occasion…" />
              </label>
              <label className="block text-xs font-semibold text-stone-600">Description
                <textarea rows={3} maxLength={500} className={`${inputClass} mt-1.5 resize-y`} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
              </label>
              <label className="block text-xs font-semibold text-stone-600">Display order
                <input type="number" min={0} max={10000} className={`${inputClass} mt-1.5`} value={form.position} onChange={(event) => setForm((current) => ({ ...current, position: Number(event.target.value) }))} />
              </label>
              {editingId && <label className="flex items-center gap-2 text-sm text-stone-600"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} /> Show this category in storefront filters and navigation</label>}
              <div className="flex justify-end gap-2">
                {editingId && <ButtonGhost type="button" onClick={resetForm}>Cancel</ButtonGhost>}
                <ButtonPrimary type="submit" disabled={saving}>{saving ? "Saving…" : editingId ? "Save category" : "Create category"}</ButtonPrimary>
              </div>
            </form>
          </Card>
        </div>
      ) : activeTab === "menus" ? (
        <div className="space-y-5">
          <p className="text-sm text-stone-500">The Collections dropdown uses active categories and their group above. Edit the additional mega-menu dropdowns here. Changes publish as soon as saved.</p>
          {menus.map((menu) => (
            <Card key={menu.key} title={`${menu.label} dropdown`} action={<ButtonPrimary type="button" disabled={saving} onClick={() => void saveMenu(menu)}>{saving ? "Saving…" : "Save dropdown"}</ButtonPrimary>}>
              <div className="mb-4 grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-stone-600">Navbar label<input className={`${inputClass} mt-1.5`} value={menu.label} onChange={(event) => updateMenu(menu.key, (current) => ({ ...current, label: event.target.value }))} /></label>
                <label className="block text-xs font-semibold text-stone-600">Menu order<input type="number" min={0} className={`${inputClass} mt-1.5`} value={menu.position} onChange={(event) => updateMenu(menu.key, (current) => ({ ...current, position: Number(event.target.value) }))} /></label>
              </div>
              <label className="mb-4 flex items-center gap-2 text-sm text-stone-600"><input type="checkbox" checked={menu.isActive} onChange={(event) => updateMenu(menu.key, (current) => ({ ...current, isActive: event.target.checked }))} /> Show this dropdown in the navbar</label>
              <div className="grid gap-4 lg:grid-cols-2">
                {menu.columns.map((column, columnIndex) => (
                  <div key={`${menu.key}-${columnIndex}`} className="rounded-xl border border-[#eee8df] p-3">
                    <div className="flex gap-2">
                      <input aria-label="Dropdown column heading" className={inputClass} value={column.title} onChange={(event) => updateMenu(menu.key, (current) => ({ ...current, columns: current.columns.map((entry, index) => index === columnIndex ? { ...entry, title: event.target.value } : entry) }))} />
                      <button type="button" className={secondaryClass} onClick={() => updateMenu(menu.key, (current) => ({ ...current, columns: current.columns.filter((_entry, index) => index !== columnIndex) }))}>Remove</button>
                    </div>
                    <div className="mt-3 space-y-3">
                      {column.items.map((item, itemIndex) => (
                        <div key={`${menu.key}-${columnIndex}-${itemIndex}`} className="grid gap-2 rounded-lg bg-stone-50 p-3">
                          <div className="flex gap-2">
                            <input aria-label="Dropdown link label" className={inputClass} value={item.label} onChange={(event) => updateMenu(menu.key, (current) => ({ ...current, columns: current.columns.map((entry, colIndex) => colIndex === columnIndex ? { ...entry, items: entry.items.map((link, linkIndex) => linkIndex === itemIndex ? { ...link, label: event.target.value } : link) } : entry) }))} />
                            <button type="button" className={secondaryClass} onClick={() => updateMenu(menu.key, (current) => ({ ...current, columns: current.columns.map((entry, colIndex) => colIndex === columnIndex ? { ...entry, items: entry.items.filter((_link, linkIndex) => linkIndex !== itemIndex) } : entry) }))}>Remove</button>
                          </div>
                          <select aria-label="Dropdown link destination type" className={inputClass} value={item.categorySlug ? `category:${item.categorySlug}` : "url"} onChange={(event) => {
                            const value = event.target.value;
                            const category = activeCategories.find((entry) => `category:${entry.slug}` === value);
                            updateMenu(menu.key, (current) => ({ ...current, columns: current.columns.map((entry, colIndex) => colIndex === columnIndex ? { ...entry, items: entry.items.map((link, linkIndex) => linkIndex === itemIndex ? category ? { ...link, categorySlug: category.slug, href: undefined } : { ...link, categorySlug: undefined, href: link.href || "/products" } : link) } : entry) }));
                          }}>
                            <option value="url">Custom storefront URL</option>
                            {item.categorySlug && !activeCategories.some((category) => category.slug === item.categorySlug) && <option value={`category:${item.categorySlug}`}>Unavailable category: {item.categorySlug}</option>}
                            {activeCategories.map((category) => <option key={category.slug} value={`category:${category.slug}`}>Category: {category.name}</option>)}
                          </select>
                          {item.categorySlug ? <p className="text-[11px] text-stone-500">Links to /products?category={item.categorySlug}</p> : <input aria-label="Custom storefront URL" className={inputClass} value={item.href || ""} onChange={(event) => updateMenu(menu.key, (current) => ({ ...current, columns: current.columns.map((entry, colIndex) => colIndex === columnIndex ? { ...entry, items: entry.items.map((link, linkIndex) => linkIndex === itemIndex ? { ...link, href: event.target.value } : link) } : entry) }))} placeholder="/products?sort=featured" />}
                        </div>
                      ))}
                    </div>
                    <button type="button" className={`${secondaryClass} mt-3`} onClick={() => updateMenu(menu.key, (current) => ({ ...current, columns: current.columns.map((entry, index) => index === columnIndex ? { ...entry, items: [...entry.items, { label: "New link", href: "/products" }] } : entry) }))}>Add link</button>
                  </div>
                ))}
              </div>
              <button type="button" className={`${secondaryClass} mt-4`} onClick={() => updateMenu(menu.key, (current) => ({ ...current, columns: [...current.columns, { title: "New column", items: [] }] }))}>Add dropdown column</button>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          <Card title="Built-in navbar themes">
            <p className="mb-4 text-sm text-stone-500">Choose one of the built-in palettes, then customize every color below if needed.</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {([
                ["atelier", "Atelier Burgundy", NAV_THEME_PRESETS.atelier],
                ["midnight", "Midnight Blue", NAV_THEME_PRESETS.midnight],
                ["forest", "Forest Green", NAV_THEME_PRESETS.forest],
              ] as const).map(([theme, label, colors]) => (
                <button key={theme} type="button" onClick={() => setNavSettings((current) => ({ ...current, theme, colors }))} className={`rounded-xl border p-3 text-left ${navSettings.theme === theme ? "border-[#881337] ring-2 ring-[#881337]/15" : "border-[#eee8df]"}`}>
                  <span className="mb-2 flex h-8 overflow-hidden rounded-lg">
                    <span className="w-1/3" style={{ background: colors.announcementBg }} />
                    <span className="w-1/3" style={{ background: colors.headerBg }} />
                    <span className="w-1/3" style={{ background: colors.accent }} />
                  </span>
                  <span className="text-sm font-semibold text-stone-800">{label}</span>
                </button>
              ))}
            </div>
          </Card>
          <Card title="Branding and navbar labels" action={<ButtonPrimary type="button" disabled={saving} onClick={() => void saveSettings()}>{saving ? "Saving…" : "Save navbar"}</ButtonPrimary>}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-xs font-semibold text-stone-600">Brand name<input maxLength={80} className={`${inputClass} mt-1.5`} value={navSettings.brandName} onChange={(event) => setNavSettings((current) => ({ ...current, brandName: event.target.value }))} /></label>
              <label className="block text-xs font-semibold text-stone-600">Brand tagline<input maxLength={100} className={`${inputClass} mt-1.5`} value={navSettings.brandTagline} onChange={(event) => setNavSettings((current) => ({ ...current, brandTagline: event.target.value }))} /></label>
              <label className="block text-xs font-semibold text-stone-600">Collections menu label<input maxLength={60} className={`${inputClass} mt-1.5`} value={navSettings.collectionLabel} onChange={(event) => setNavSettings((current) => ({ ...current, collectionLabel: event.target.value }))} /></label>
              <label className="block text-xs font-semibold text-stone-600">Logo image URL<input maxLength={500} className={`${inputClass} mt-1.5`} value={navSettings.logoUrl} onChange={(event) => setNavSettings((current) => ({ ...current, logoUrl: event.target.value }))} placeholder="Optional — upload or paste logo URL" /></label>
            </div>
            <div className="mt-2"><MediaUploadField type="image" multiple={false} onUploaded={(urls) => setNavSettings((current) => ({ ...current, logoUrl: urls[0] ?? current.logoUrl }))} disabled={saving} /></div>
          </Card>
          <Card title="Announcement bar" action={<ButtonGhost type="button" disabled={navSettings.announcements.length >= 8} onClick={() => setNavSettings((current) => ({ ...current, announcements: [...current.announcements, "New announcement"] }))}>Add message</ButtonGhost>}>
            <p className="mb-3 text-xs text-stone-500">One message per row; the bar cycles through them.</p>
            <div className="space-y-2">
              {navSettings.announcements.map((message, index) => (
                <div key={`announcement-${index}`} className="flex gap-2">
                  <input className={inputClass} value={message} maxLength={180} onChange={(event) => setNavSettings((current) => ({ ...current, announcements: current.announcements.map((item, itemIndex) => itemIndex === index ? event.target.value : item) }))} />
                  <button type="button" className={secondaryClass} onClick={() => setNavSettings((current) => ({ ...current, announcements: current.announcements.filter((_item, itemIndex) => itemIndex !== index) }))}>Remove</button>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Desktop and drawer links" action={<ButtonGhost type="button" disabled={navSettings.links.length >= 8} onClick={() => setNavSettings((current) => ({ ...current, links: [...current.links, { label: "New link", href: "/products", isActive: true }] }))}>Add link</ButtonGhost>}>
            <p className="mb-3 text-xs text-stone-500">Collections is controlled by categories; these links appear beside it in desktop navigation and the mobile drawer.</p>
            <div className="space-y-3">
              {navSettings.links.map((link, index) => (
                <div key={`nav-link-${index}`} className="grid gap-2 rounded-xl border border-[#eee8df] p-3 sm:grid-cols-[1fr_2fr_auto_auto]">
                  <input aria-label="Navbar link label" className={inputClass} value={link.label} maxLength={60} onChange={(event) => updateNavLink(index, { label: event.target.value })} />
                  <input aria-label="Navbar link URL" className={inputClass} value={link.href} maxLength={300} onChange={(event) => updateNavLink(index, { href: event.target.value })} placeholder="/reels" />
                  <label className="flex items-center gap-2 text-xs text-stone-600"><input type="checkbox" checked={link.isActive} onChange={(event) => updateNavLink(index, { isActive: event.target.checked })} /> Show</label>
                  <button type="button" className={secondaryClass} onClick={() => setNavSettings((current) => ({ ...current, links: current.links.filter((_item, itemIndex) => itemIndex !== index) }))}>Remove</button>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Navbar colors">
            <p className="mb-4 text-xs text-stone-500">Customizing a color switches the selected theme to Custom.</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {([
                ["announcementBg", "Announcement background"],
                ["announcementText", "Announcement text"],
                ["announcementBorder", "Announcement border"],
                ["headerBg", "Header background"],
                ["headerText", "Header and link text"],
                ["accent", "Accent, badges and active links"],
                ["mobileDrawerBg", "Mobile menu background"],
                ["mobileBottomBg", "Mobile bottom bar background"],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex items-center gap-3 rounded-xl border border-[#eee8df] p-3 text-xs font-semibold text-stone-700">
                  <input type="color" aria-label={label} value={navSettings.colors[key]} onChange={(event) => setNavSettings((current) => ({ ...current, theme: "custom", colors: { ...current.colors, [key]: event.target.value } }))} className="h-9 w-11 cursor-pointer rounded border-0 bg-transparent p-0" />
                  <span>{label}<small className="mt-1 block font-mono font-normal text-stone-500">{navSettings.colors[key]}</small></span>
                </label>
              ))}
            </div>
          </Card>
          <div className="flex justify-end"><ButtonPrimary type="button" disabled={saving} onClick={() => void saveSettings()}>{saving ? "Saving…" : "Save navbar settings"}</ButtonPrimary></div>
        </div>
      )}
    </div>
  );
}
