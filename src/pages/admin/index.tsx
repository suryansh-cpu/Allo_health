import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import styles from '../../styles/Admin.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface InventoryEntry {
  warehouseId: string;
  warehouseName?: string;
  warehouseLocation?: string;
  totalUnits: number;
  reservedUnits?: number;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number; // paise
  category: string;
  inventory: InventoryEntry[];
}

interface Warehouse {
  id: string;
  name: string;
  location: string;
  _count?: { inventory: number };
}

type Tab = 'products' | 'warehouses';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** rupees → paise (round to nearest) */
function toPaise(rupees: string | number) {
  return Math.round(Number(rupees) * 100);
}

/** paise → "₹X,XXX.XX" display string */
function toRupees(paise: number) {
  return (paise / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** paise → plain decimal string for <input> */
function toInputRupees(paise: number) {
  return (paise / 100).toFixed(2);
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ msg }: { msg: string }) {
  if (!msg) return null;
  return <div className={styles.toast}>{msg}</div>;
}

// ─── Login ────────────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: (pw: string) => void }) {
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/products', {
        headers: { 'x-admin-password': pw },
      });
      if (res.ok) {
        onLogin(pw);
      } else {
        setError('Wrong password. Try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.loginWrap}>
      <div className={styles.loginCard}>
        <div className={styles.loginIcon}>🔐</div>
        <h1 className={styles.loginTitle}>Allo Admin</h1>
        <p className={styles.loginSub}>Sign in to manage products and inventory</p>
        <form onSubmit={submit} className={styles.loginForm}>
          <input
            type="password"
            placeholder="Admin password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            className={styles.loginInput}
            autoFocus
          />
          {error && <p className={styles.loginError}>{error}</p>}
          <button type="submit" className={styles.loginBtn} disabled={loading}>
            {loading ? 'Checking…' : 'Sign in →'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Product Form (create / edit) ─────────────────────────────────────────────

interface ProductFormValues {
  name: string;
  description: string;
  price: string;
  category: string;
  inventory: { warehouseId: string; availableUnits: number }[];
}

function ProductForm({
  initial,
  warehouses,
  onSave,
  onCancel,
  password,
}: {
  initial?: Product;
  warehouses: Warehouse[];
  onSave: (p: Product) => void;
  onCancel: () => void;
  password: string;
}) {
  const [form, setForm] = useState<ProductFormValues>(() => ({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    price: initial ? toInputRupees(initial.price) : '',
    category: initial?.category ?? '',
    inventory: warehouses.map((wh) => {
      const inv = initial?.inventory.find((i) => i.warehouseId === wh.id);
      const total    = inv?.totalUnits    ?? 0;
      const reserved = inv?.reservedUnits ?? 0;
      return { warehouseId: wh.id, availableUnits: total - reserved };
    }),
  }));

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function setField(k: keyof ProductFormValues, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function setInvUnits(warehouseId: string, val: string) {
    const n = Math.max(0, parseInt(val) || 0);
    setForm((f) => ({
      ...f,
      inventory: f.inventory.map((i) =>
        i.warehouseId === warehouseId ? { ...i, availableUnits: n } : i
      ),
    }));
  }

  function getReserved(warehouseId: string) {
    return initial?.inventory.find((i) => i.warehouseId === warehouseId)?.reservedUnits ?? 0;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: toPaise(form.price),
        category: form.category.trim(),
        // Convert availableUnits → totalUnits for the API.
        // totalUnits = availableUnits + reservedUnits (reserved slots must stay in the total)
        inventory: form.inventory.map((i) => ({
          warehouseId: i.warehouseId,
          totalUnits: i.availableUnits + getReserved(i.warehouseId),
        })),
      };

      const url = initial ? `/api/admin/products/${initial.id}` : '/api/admin/products';
      const method = initial ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));
      onSave(data.product);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{initial ? 'Edit Product' : 'New Product'}</h2>
          <button className={styles.modalClose} onClick={onCancel}>✕</button>
        </div>

        <form onSubmit={save} className={styles.form}>
          <div className={styles.formGrid}>
            <label className={styles.label}>
              Product name
              <input
                className={styles.input}
                placeholder="e.g. Sony WH-1000XM5"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                required
              />
            </label>
            <label className={styles.label}>
              Category
              <input
                className={styles.input}
                placeholder="e.g. Audio"
                value={form.category}
                onChange={(e) => setField('category', e.target.value)}
                required
              />
            </label>
          </div>

          <label className={styles.label}>
            Price (₹)
            <div className={styles.priceWrap}>
              <span className={styles.pricePrefix}>₹</span>
              <input
                className={`${styles.input} ${styles.priceInput}`}
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.price}
                onChange={(e) => setField('price', e.target.value)}
                required
              />
            </div>
          </label>

          <label className={styles.label}>
            Description
            <textarea
              className={styles.textarea}
              placeholder="Short product description shown to customers"
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              rows={3}
              required
            />
          </label>

          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>📦 Stock per Warehouse</legend>
            {warehouses.length === 0 && (
              <p className={styles.noWh}>No warehouses yet — add warehouses first.</p>
            )}
            {form.inventory.map((inv) => {
              const wh = warehouses.find((w) => w.id === inv.warehouseId)!;
              return (
                <div key={inv.warehouseId} className={styles.invRow}>
                  <div className={styles.invInfo}>
                    <span className={styles.invName}>{wh.name}</span>
                    <span className={styles.invLoc}>{wh.location}</span>
                  </div>
                  <div className={styles.invControls}>
                    <input
                      type="number"
                      min={0}
                      className={styles.invInput}
                      value={inv.availableUnits}
                      onChange={(e) => setInvUnits(inv.warehouseId, e.target.value)}
                    />
                    <span className={styles.invUnitsLabel}>available units</span>
                  </div>
                </div>
              );
            })}
          </fieldset>

          {error && <div className={styles.formError}>{error}</div>}

          <div className={styles.formActions}>
            <button type="button" className={styles.btnGhost} onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className={styles.btnPrimary} disabled={saving}>
              {saving ? 'Saving…' : initial ? 'Save changes' : 'Create product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Warehouse Form ────────────────────────────────────────────────────────────

function WarehouseForm({
  onSave,
  onCancel,
  password,
}: {
  onSave: (w: Warehouse) => void;
  onCancel: () => void;
  password: string;
}) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [id, setId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
        body: JSON.stringify({ name: name.trim(), location: location.trim(), id: id.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));
      onSave(data.warehouse);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className={styles.modal} style={{ maxWidth: 440 }}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>New Warehouse</h2>
          <button className={styles.modalClose} onClick={onCancel}>✕</button>
        </div>
        <form onSubmit={save} className={styles.form}>
        <label className = {styles.label}>
            Id
            <input
              className={styles.input}
              placeholder="Auto-generated unique ID (optional)"
              value={id}
              onChange={(e) => setId(e.target.value)}
            />
          </label>
          <label className={styles.label}>
            Warehouse name
            <input
              className={styles.input}
              placeholder="e.g. Mumbai Hub"
              value={name}
              // onChange={(e) => setName(e.target.value)}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </label>
          <label className={styles.label}>
            Location
            <input
              className={styles.input}
              placeholder="e.g. Andheri East, Mumbai"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />
          </label>
          {error && <div className={styles.formError}>{error}</div>}
          <div className={styles.formActions}>
            <button type="button" className={styles.btnGhost} onClick={onCancel}>Cancel</button>
            <button type="submit" className={styles.btnPrimary} disabled={saving}>
              {saving ? 'Creating…' : 'Create warehouse'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Confirm Dialog ────────────────────────────────────────────────────────────

function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  danger = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className={styles.overlay}>
      <div className={styles.modal} style={{ maxWidth: 400 }}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{title}</h2>
        </div>
        <p className={styles.confirmMsg}>{message}</p>
        <div className={styles.formActions}>
          <button className={styles.btnGhost} onClick={onCancel}>Cancel</button>
          <button
            className={danger ? styles.btnDanger : styles.btnPrimary}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Stats bar ────────────────────────────────────────────────────────────────

function StatsBar({ products, warehouses }: { products: Product[]; warehouses: Warehouse[] }) {
  const totalStock = products.reduce(
    (s, p) => s + p.inventory.reduce((a, i) => a + i.totalUnits, 0),
    0
  );
  const totalReserved = products.reduce(
    (s, p) => s + p.inventory.reduce((a, i) => a + (i.reservedUnits ?? 0), 0),
    0
  );
  const outOfStock = products.filter(
    (p) => p.inventory.reduce((a, i) => a + i.totalUnits - (i.reservedUnits ?? 0), 0) === 0
  ).length;

  return (
    <div className={styles.statsBar}>
      <div className={styles.statCard}>
        <span className={styles.statNum}>{products.length}</span>
        <span className={styles.statLabel}>Products</span>
      </div>
      <div className={styles.statCard}>
        <span className={styles.statNum}>{warehouses.length}</span>
        <span className={styles.statLabel}>Warehouses</span>
      </div>
      <div className={styles.statCard}>
        <span className={styles.statNum}>{totalStock - totalReserved}</span>
        <span className={styles.statLabel}>Available units</span>
      </div>
      <div className={styles.statCard}>
        <span className={styles.statNum}>{totalReserved}</span>
        <span className={styles.statLabel}>Reserved</span>
      </div>
      {outOfStock > 0 && (
        <div className={`${styles.statCard} ${styles.statCardWarn}`}>
          <span className={styles.statNum}>{outOfStock}</span>
          <span className={styles.statLabel}>Out of stock</span>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [password, setPassword] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('products');

  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);

  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();
  const [showWarehouseForm, setShowWarehouseForm] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');

  function notify(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  const loadData = useCallback(async (pw: string) => {
    setLoading(true);
    try {
      const [pr, wr] = await Promise.all([
        fetch('/api/admin/products', { headers: { 'x-admin-password': pw } }).then((r) => r.json()),
        fetch('/api/admin/warehouses', { headers: { 'x-admin-password': pw } }).then((r) => r.json()),
      ]);
      setProducts(pr.products ?? []);
      setWarehouses(wr.warehouses ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (password) loadData(password);
  }, [password, loadData]);

  async function confirmDeleteProduct() {
    if (!password || !deletingProduct) return;
    const p = deletingProduct;
    setDeletingProduct(null);
    const res = await fetch(`/api/admin/products/${p.id}`, {
      method: 'DELETE',
      headers: { 'x-admin-password': password },
    });
    if (res.ok) {
      setProducts((prev) => prev.filter((x) => x.id !== p.id));
      notify(`"${p.name}" deleted`);
    } else {
      const data = await res.json();
      notify(`❌ ${data.error}`);
    }
  }

  // ── filtered product list ──
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  // ── not logged in ──
  if (!password) return <LoginScreen onLogin={setPassword} />;

  return (
    <>
      <Head>
        <title>Allo Admin</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <Toast msg={toast} />

      {showProductForm && (
        <ProductForm
          initial={editingProduct}
          warehouses={warehouses}
          password={password}
          onCancel={() => { setShowProductForm(false); setEditingProduct(undefined); }}
          onSave={(p) => {
            setProducts((prev) =>
              editingProduct
                ? prev.map((x) => (x.id === p.id ? p : x))
                : [...prev, p]
            );
            notify(editingProduct ? `"${p.name}" updated ✓` : `"${p.name}" created ✓`);
            setShowProductForm(false);
            setEditingProduct(undefined);
          }}
        />
      )}

      {showWarehouseForm && (
        <WarehouseForm
          password={password}
          onCancel={() => setShowWarehouseForm(false)}
          onSave={(w) => {
            setWarehouses((prev) => [...prev, w]);
            setShowWarehouseForm(false);
            notify(`"${w.name}" created ✓`);
          }}
        />
      )}

      {deletingProduct && (
        <ConfirmDialog
          title="Delete product"
          message={`Delete "${deletingProduct.name}"? This will remove all inventory records for this product. Reservations that are not PENDING will also be deleted.`}
          confirmLabel="Delete"
          danger
          onConfirm={confirmDeleteProduct}
          onCancel={() => setDeletingProduct(null)}
        />
      )}

      <div className={styles.page}>
        {/* ── Header ── */}
        <header className={styles.header}>
          <div className={styles.headerInner}>
            <span className={styles.logo}>
              <span className={styles.logoDot}>●</span> Allo Admin
            </span>
            <div className={styles.headerRight}>
              <span className={styles.headerUser}>Admin</span>
              <button className={styles.logoutBtn} onClick={() => setPassword(null)}>
                Sign out
              </button>
            </div>
          </div>
        </header>

        {/* ── Stats bar ── */}
        {!loading && <StatsBar products={products} warehouses={warehouses} />}

        {/* ── Tabs ── */}
        <div className={styles.tabsBar}>
          <div className={styles.tabs}>
            <button
              className={tab === 'products' ? styles.tabActive : styles.tab}
              onClick={() => setTab('products')}
            >
              Products
            </button>
            <button
              className={tab === 'warehouses' ? styles.tabActive : styles.tab}
              onClick={() => setTab('warehouses')}
            >
              Warehouses
            </button>
          </div>
        </div>

        <main className={styles.main}>
          {loading && (
            <div className={styles.loadingWrap}>
              <div className={styles.spinner} />
              <p>Loading…</p>
            </div>
          )}

          {/* ── Products ── */}
          {!loading && tab === 'products' && (
            <>
              <div className={styles.toolbar}>
                <input
                  className={styles.searchInput}
                  placeholder="Search by name or category…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button
                  className={styles.btnPrimary}
                  onClick={() => { setEditingProduct(undefined); setShowProductForm(true); }}
                >
                  + New product
                </button>
              </div>

              {filteredProducts.length === 0 ? (
                <div className={styles.empty}>
                  {search ? `No products matching "${search}"` : 'No products yet. Create your first one above.'}
                </div>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Inventory</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((p) => {
                        const totalUnits = p.inventory.reduce((s, i) => s + i.totalUnits, 0);
                        const reserved   = p.inventory.reduce((s, i) => s + (i.reservedUnits ?? 0), 0);
                        const available  = totalUnits - reserved;
                        return (
                          <tr key={p.id}>
                            <td>
                              <div className={styles.productName}>{p.name}</div>
                              <div className={styles.productDesc}>{p.description}</div>
                            </td>
                            <td><span className={styles.badge}>{p.category}</span></td>
                            <td className={styles.priceCell}>₹{toRupees(p.price)}</td>
                            <td>
                              <div className={styles.stockLine}>
                                <span className={available === 0 ? styles.stockNone : available <= 3 ? styles.stockLow : styles.stockOk}>
                                  {available === 0 ? 'Out of stock' : `${available} available`}
                                </span>
                                {reserved > 0 && (
                                  <span className={styles.stockReserved}>{reserved} reserved</span>
                                )}
                              </div>
                              <div className={styles.invChips}>
                                {p.inventory.map((inv) => (
                                  <span key={inv.warehouseId} className={styles.invChip}>
                                    {inv.warehouseName ?? inv.warehouseId}:&nbsp;
                                    {/* {inv.warehouseName ?? inv.warehouseId} */}
                                    {inv.totalUnits - (inv.reservedUnits ?? 0)}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td>
                              <div className={styles.rowActions}>
                                <button
                                  className={styles.btnRowEdit}
                                  onClick={() => { setEditingProduct(p); setShowProductForm(true); }}
                                >
                                  Edit
                                </button>
                                <button
                                  className={styles.btnRowDelete}
                                  onClick={() => setDeletingProduct(p)}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ── Warehouses ── */}
          {!loading && tab === 'warehouses' && (
            <>
              <div className={styles.toolbar}>
                <span className={styles.toolbarInfo}>
                  {warehouses.length} warehouse{warehouses.length !== 1 ? 's' : ''}
                </span>
                <button className={styles.btnPrimary} onClick={() => setShowWarehouseForm(true)}>
                  + New warehouse
                </button>
              </div>

              {warehouses.length === 0 ? (
                <div className={styles.empty}>No warehouses yet. Add one to start managing inventory.</div>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Location</th>
                        <th>SKUs tracked</th>
                        <th>Total units</th>
                      </tr>
                    </thead>
                    <tbody>
                      {warehouses.map((w) => {
                        const whUnits = products.reduce((sum, p) => {
                          const inv = p.inventory.find((i) => i.warehouseId === w.id);
                          return sum + (inv?.totalUnits ?? 0);
                        }, 0);
                        return (
                          <tr key={w.id}>
                            <td className={styles.productName}>{w.name}</td>
                            <td className={styles.locationCell}>{w.location}</td>
                            <td>{w._count?.inventory ?? 0}</td>
                            <td>{whUnits}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}