import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Ban,
  Check,
  ChevronDown,
  Cloud,
  CupSoda,
  GlassWater,
  Layers,
  RotateCcw,
  Sandwich,
  Search,
  Tag,
  Trash2,
  TriangleAlert,
  WifiOff,
  X,
} from 'lucide-react';

import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';

import { ALL_ITEMS, INVENTORY } from './data/inventory';
import { db, firebaseConfigured } from './lib/firebase';

const STORAGE_KEY = 'wings-86-list-statuses-v1';
const COLLECTION_NAME = 'wings86Statuses';

const COLLAPSED_KEY = 'wings-86-list-collapsed-categories-v1';

function readCollapsedCategories() {
  try {
    const raw = JSON.parse(localStorage.getItem(COLLAPSED_KEY) || '[]');
    return new Set(Array.isArray(raw) ? raw : []);
  } catch {
    return new Set();
  }
}

// Every checkable item in each category (used for header badges).
const CATEGORY_ITEMS = Object.fromEntries(
  INVENTORY.map((category) => [
    category.id,
    category.items.flatMap((item) => item.variants ?? [item]),
  ])
);

// Full flavor list for each product (used for its low / out badges).
const GROUP_FLAVORS = Object.fromEntries(
  INVENTORY.flatMap((category) =>
    category.items
      .filter((item) => item.variants)
      .map((item) => [item.id, item.variants])
  )
);

const categoryIcons = {
  drinks: CupSoda,
  food: Sandwich,
  smoothies: GlassWater,
  supplies: Layers,
  misc: Tag,
};

// Read locally saved statuses when Firebase is not connected.
function readLocalStatuses() {
  try {
    const raw = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || '{}'
    );

    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(raw).filter(
        ([, value]) => value === 'low' || value === 'out'
      )
    );
  } catch {
    return {};
  }
}

// Product photo, falling back to an emoji when missing or broken.
function ItemIcon({ item, fallback }) {
  const [broken, setBroken] = useState(false);

  if (item.image && !broken) {
    return (
      <span className="item-icon item-photo" aria-hidden="true">
        <img
          src={`${import.meta.env.BASE_URL}${item.image}`}
          alt=""
          loading="lazy"
          onError={() => setBroken(true)}
        />
      </span>
    );
  }

  return (
    <span className="item-icon" aria-hidden="true">
      {item.icon || fallback}
    </span>
  );
}

// Low Stock or Out of Stock toggle.
function StatusChoice({ type, selected, item, disabled, onChoose }) {
  const text = type === 'low' ? 'Low Stock' : 'Out of Stock';

  return (
    <label
      className={`choice choice-${type} ${
        selected ? 'choice-selected' : ''
      } ${disabled ? 'choice-disabled' : ''}`}
    >
      <input
        type="checkbox"
        checked={selected}
        disabled={disabled}
        aria-label={`${item.fullLabel || item.label}: ${text}`}
        onChange={() => onChoose(item.id, type)}
      />

      <span className="choice-box" aria-hidden="true">
        {selected && <Check size={12} strokeWidth={3.5} />}
      </span>

      <span>{text}</span>
    </label>
  );
}

// Confirmation popup for resetting every item.
function ConfirmReset({ count, busy, onConfirm, onCancel }) {
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape' && !busy) {
        onCancel();
      }
    }

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [busy, onCancel]);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) {
          onCancel();
        }
      }}
    >
      <div
        className="confirm-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="reset-title"
        aria-describedby="reset-description"
      >
        <div className="modal-icon">
          <Trash2 size={22} />
        </div>

        <h2 id="reset-title">Reset the entire list?</h2>

        <p id="reset-description">
          This will clear{' '}
          <strong>
            all {count} marked {count === 1 ? 'item' : 'items'}
          </strong>
          , including items hidden by your current search or filter.
          {firebaseConfigured
            ? ' The reset will appear on every connected computer.'
            : ' This reset affects this browser only.'}
        </p>

        <p className="modal-warning">This action cannot be undone.</p>

        <div className="modal-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>

          <button
            type="button"
            className="danger-button"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Resetting…' : 'Yes, reset all'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Main application.
export default function App() {
  const [statuses, setStatuses] = useState(() =>
    firebaseConfigured ? {} : readLocalStatuses()
  );

  const [ready, setReady] = useState(!firebaseConfigured);
  const [syncError, setSyncError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [pending, setPending] = useState(() => new Set());
  const [expanded, setExpanded] = useState(() => new Set());
  const [collapsedCategories, setCollapsedCategories] = useState(
    readCollapsedCategories
  );

  // Remember which category cards this browser has collapsed.
  useEffect(() => {
    try {
      localStorage.setItem(
        COLLAPSED_KEY,
        JSON.stringify([...collapsedCategories])
      );
    } catch {
      // Storage unavailable (private mode, etc.) — ignore.
    }
  }, [collapsedCategories]);

  function toggleCategory(categoryId) {
    setCollapsedCategories((previous) => {
      const next = new Set(previous);

      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }

      return next;
    });
  }
  const [showReset, setShowReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Listen for stock updates.
  useEffect(() => {
    if (!firebaseConfigured) {
      const onStorage = (event) => {
        if (event.key === STORAGE_KEY) {
          setStatuses(readLocalStatuses());
        }
      };

      window.addEventListener('storage', onStorage);

      return () => {
        window.removeEventListener('storage', onStorage);
      };
    }

    const unsubscribe = onSnapshot(
      collection(db, COLLECTION_NAME),
      (snapshot) => {
        const next = {};

        snapshot.forEach((document) => {
          const status = document.data().status;

          if (status === 'low' || status === 'out') {
            next[document.id] = status;
          }
        });

        setStatuses(next);
        setReady(true);
        setSyncError('');
      },
      (error) => {
        setReady(false);

        setSyncError(
          error.code === 'permission-denied'
            ? 'Access denied. Check your Firestore Security Rules.'
            : 'Could not synchronize the list. Check your connection.'
        );
      }
    );

    return unsubscribe;
  }, []);

  // Save browser-only statuses in local preview mode.
  useEffect(() => {
    if (!firebaseConfigured) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(statuses));
    }
  }, [statuses]);

  // Live summary counters.
  const counts = useMemo(() => {
    const data = { low: 0, out: 0 };

    for (const item of ALL_ITEMS) {
      const status = statuses[item.id];

      if (status === 'low' || status === 'out') {
        data[status]++;
      }
    }

    return data;
  }, [statuses]);

  // Search and filter inventory (flavors are matched individually).
  const visibleCategories = useMemo(() => {
    const query = search.trim().toLowerCase();
    const has = (text) => (text || '').toLowerCase().includes(query);
    const statusOk = (item) =>
      filter === 'all' || statuses[item.id] === filter;

    const filterItems = (items, parentMatch) =>
      items.flatMap((item) => {
        const itemMatch =
          parentMatch || has(item.label) || has(item.note);

        if (item.variants) {
          const variants = item.variants.filter(
            (variant) =>
              (itemMatch || has(variant.label)) && statusOk(variant)
          );

          return variants.length ? [{ ...item, variants }] : [];
        }

        return itemMatch && statusOk(item) ? [item] : [];
      });

    return INVENTORY.map((category) => {
      const categoryMatch = !query || has(category.title);

      const sections = category.sections
        .map((section) => ({
          ...section,
          items: filterItems(
            section.items,
            categoryMatch || (section.title && has(section.title))
          ),
        }))
        .filter((section) => section.items.length > 0);

      return {
        ...category,
        sections,
        items: sections.flatMap((section) => section.items),
      };
    }).filter((category) => category.items.length > 0);
  }, [search, filter, statuses]);

  // Split cards into two balanced columns so opening a dropdown
  // never moves cards from one column to the other.
  const columns = useMemo(() => {
    const cols = [[], []];
    const heights = [0, 0];

    visibleCategories.forEach((category, index) => {
      const target = heights[0] <= heights[1] ? 0 : 1;
      cols[target].push({ category, index });
      heights[target] +=
        category.items.length + category.sections.length + 2;
    });

    return cols;
  }, [visibleCategories]);

  // Searching or filtering opens every dropdown with a match.
  const forceOpen = Boolean(search.trim()) || filter !== 'all';

  function toggleGroup(groupId) {
    setExpanded((previous) => {
      const next = new Set(previous);

      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }

      return next;
    });
  }

  // A row with its own Low / Out checkboxes.
  function renderCheckRow(item, fallback, extraClass = '') {
    const status = statuses[item.id];
    const disabled = pending.has(item.id) || resetting;

    return (
      <li
        className={`item-row ${extraClass} ${
          status ? `item-row-${status}` : ''
        }`}
        key={item.id}
      >
        <ItemIcon item={item} fallback={fallback} />

        <div className="item-name">
          <strong>{item.label}</strong>
          {item.note && <span>({item.note})</span>}
        </div>

        <div className="choices">
          <StatusChoice
            item={item}
            type="low"
            selected={status === 'low'}
            disabled={disabled}
            onChoose={chooseStatus}
          />

          <StatusChoice
            item={item}
            type="out"
            selected={status === 'out'}
            disabled={disabled}
            onChoose={chooseStatus}
          />
        </div>
      </li>
    );
  }

  // A product with a dropdown of flavors.
  function renderGroup(item, fallback, variantWord = 'flavors') {
    const open = forceOpen || expanded.has(item.id);
    const allFlavors = GROUP_FLAVORS[item.id];
    const low = allFlavors.filter((f) => statuses[f.id] === 'low').length;
    const out = allFlavors.filter((f) => statuses[f.id] === 'out').length;
    const panelId = `flavors-${item.id}`;

    return (
      <li
        className={`group-item ${open ? 'group-open' : ''}`}
        key={item.id}
      >
        <button
          type="button"
          className="item-row group-row"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => toggleGroup(item.id)}
        >
          <ItemIcon item={item} fallback={fallback} />

          <div className="item-name">
            <strong>{item.label}</strong>
            <span>
              {allFlavors.length} {variantWord}
              {item.note ? ` · ${item.note}` : ''}
            </span>
          </div>

          <div className="group-meta">
            {low > 0 && (
              <span className="mini-pill mini-low">{low} low</span>
            )}
            {out > 0 && (
              <span className="mini-pill mini-out">{out} out</span>
            )}
            <ChevronDown size={19} className="group-chevron" />
          </div>
        </button>

        {/* Always rendered so it can animate; inert while closed. */}
        <div className="variant-panel" id={panelId} inert={!open}>
          <div className="variant-panel-inner">
            <ul className="variant-list">
              {item.variants.map((variant) =>
                renderCheckRow(variant, fallback, 'variant-row')
              )}
            </ul>
          </div>
        </div>
      </li>
    );
  }

  function renderCategory(category, index) {
    const CategoryIcon = categoryIcons[category.id] || Tag;
    const open = forceOpen || !collapsedCategories.has(category.id);
    const panelId = `category-panel-${category.id}`;
    const allItems = CATEGORY_ITEMS[category.id];
    const low = allItems.filter((i) => statuses[i.id] === 'low').length;
    const out = allItems.filter((i) => statuses[i.id] === 'out').length;

    return (
      <section
        className={`category-card ${open ? '' : 'category-collapsed'}`}
        key={category.id}
        style={{ order: index }}
        aria-labelledby={`category-${category.id}`}
      >
        <h2 className="category-heading" id={`category-${category.id}`}>
          <button
            type="button"
            className="category-header"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => toggleCategory(category.id)}
          >
            <CategoryIcon size={24} strokeWidth={2.2} />
            <span className="category-title">{category.title}</span>

            <span className="category-meta">
              {low > 0 && (
                <span className="mini-pill mini-low">{low} low</span>
              )}
              {out > 0 && (
                <span className="mini-pill mini-out">{out} out</span>
              )}
              <span className="category-count">
                {category.items.length}
              </span>
              <ChevronDown size={20} className="category-chevron" />
            </span>
          </button>
        </h2>

        <div className="collapse-panel" id={panelId} inert={!open}>
          <div className="collapse-panel-inner">
            {category.sections.map((section) => (
              <div className="category-section" key={section.id}>
                {section.title && (
                  <h3 className="section-title">
                    {section.title}
                    <span>{section.items.length}</span>
                  </h3>
                )}

                <ul className="item-list">
                  {section.items.map((item) =>
                    item.variants
                      ? renderGroup(item, category.icon, category.variantWord)
                      : renderCheckRow(item, category.icon)
                  )}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const markedCount = Object.keys(statuses).length;

  function toggleFilter(type) {
    setFilter((current) => (current === type ? 'all' : type));
  }

  // Set or clear an item's stock status.
  async function chooseStatus(itemId, choice) {
    if (
      pending.has(itemId) ||
      resetting ||
      (firebaseConfigured && !ready)
    ) {
      return;
    }

    const newStatus = statuses[itemId] === choice ? null : choice;

    setSyncError('');

    // Browser-only mode.
    if (!firebaseConfigured) {
      setStatuses((previous) => {
        const next = { ...previous };

        if (newStatus) {
          next[itemId] = newStatus;
        } else {
          delete next[itemId];
        }

        return next;
      });

      return;
    }

    // Shared Firebase mode.
    setPending((previous) => new Set(previous).add(itemId));

    try {
      const ref = doc(db, COLLECTION_NAME, itemId);

      if (newStatus) {
        await setDoc(ref, {
          status: newStatus,
          updatedAt: serverTimestamp(),
        });
      } else {
        await deleteDoc(ref);
      }
    } catch {
      setSyncError(
        'Could not update that item. Try again or check your connection.'
      );
    } finally {
      setPending((previous) => {
        const next = new Set(previous);
        next.delete(itemId);
        return next;
      });
    }
  }

  // Clear every marked item after confirmation.
  async function resetAll() {
    setResetting(true);
    setSyncError('');

    try {
      if (firebaseConfigured) {
        const ids = Object.keys(statuses);

        // Delete in small Firestore batches.
        for (let i = 0; i < ids.length; i += 400) {
          const batch = writeBatch(db);

          ids.slice(i, i + 400).forEach((id) => {
            batch.delete(doc(db, COLLECTION_NAME, id));
          });

          await batch.commit();
        }
      } else {
        setStatuses({});
      }
    } catch {
      setSyncError('The reset did not fully complete. Please try again.');
    } finally {
      setShowReset(false);
      setResetting(false);
    }
  }

  return (
    <div className="app-shell">
      {/* TOP BAR */}
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <div className="logo-mark">W</div>

            <div className="brand-text">
              <strong>
                THE 86 LIST<span className="title-period">.</span>
              </strong>
              <span>WINGS ARENA · FRONT DESK</span>
            </div>
          </div>

          <div
            className={`connection-badge ${
              firebaseConfigured
                ? ready
                  ? 'connection-live'
                  : 'connection-wait'
                : 'connection-local'
            }`}
          >
            {firebaseConfigured ? <Cloud size={15} /> : <WifiOff size={15} />}

            <span>
              {firebaseConfigured
                ? ready
                  ? 'Live sync'
                  : 'Connecting…'
                : 'Local preview'}
            </span>
          </div>
        </div>
      </header>

      <main className="page-content">
        {/* LOCAL MODE NOTICE */}
        {!firebaseConfigured && (
          <div className="local-banner">
            <WifiOff size={18} />
            <span>
              <strong>Local preview mode.</strong> Changes are saved on
              this browser only. Add your Firebase settings in{' '}
              <code>.env</code> to sync across computers.
            </span>
          </div>
        )}

        {syncError && (
          <div className="error-banner" role="alert">
            <AlertCircle size={18} />
            <span>{syncError}</span>
          </div>
        )}

        {/* TOOLBAR */}
        <div className="toolbar">
          <div className="search-box">
            <Search size={19} />

            <input
              type="search"
              placeholder="Search items…"
              aria-label="Search inventory"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearch('')}
              >
                <X size={16} />
              </button>
            )}
          </div>

          <span className="toolbar-divider" aria-hidden="true" />

          <button
            type="button"
            className={`count-pill count-low ${
              filter === 'low' ? 'count-active' : ''
            }`}
            aria-pressed={filter === 'low'}
            title="Show only low stock items"
            onClick={() => toggleFilter('low')}
          >
            <TriangleAlert size={18} />
            <span>Low Stock</span>
            <strong>{counts.low}</strong>
          </button>

          <button
            type="button"
            className={`count-pill count-out ${
              filter === 'out' ? 'count-active' : ''
            }`}
            aria-pressed={filter === 'out'}
            title="Show only out of stock items"
            onClick={() => toggleFilter('out')}
          >
            <Ban size={18} />
            <span>Out of Stock</span>
            <strong>{counts.out}</strong>
          </button>

          <span className="toolbar-divider" aria-hidden="true" />

          <button
            type="button"
            className="reset-button"
            disabled={markedCount === 0 || !ready || resetting}
            onClick={() => setShowReset(true)}
          >
            <RotateCcw size={17} />
            Reset All
          </button>
        </div>

        {/* INVENTORY */}
        {!ready && firebaseConfigured ? (
          <div className="empty-state">
            <Cloud size={30} />
            <h3>Connecting to inventory</h3>
            <p>
              Stock statuses will appear when the database connection is
              ready.
            </p>
          </div>
        ) : visibleCategories.length === 0 ? (
          <div className="empty-state">
            <Search size={30} />
            <h3>No items found</h3>
            <p>Try another search or clear the filter.</p>

            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setSearch('');
                setFilter('all');
              }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="categories-grid">
            {columns.map((column, i) => (
              <div className="category-column" key={i}>
                {column.map(({ category, index }) =>
                  renderCategory(category, index)
                )}
              </div>
            ))}
          </div>
        )}

        <footer className="footer">
          <span>
            WINGS ARENA <span className="footer-divider">/</span> 86 LIST
          </span>

          <span>
            {firebaseConfigured
              ? 'Changes sync automatically.'
              : 'Browser-only preview — Firebase not connected.'}
          </span>

          <span className="footer-credit">
            Product photos:{' '}
            <a
              href="https://world.openfoodfacts.org"
              target="_blank"
              rel="noreferrer"
            >
              Open Food Facts
            </a>{' '}
            (
            <a
              href="https://creativecommons.org/licenses/by-sa/3.0/"
              target="_blank"
              rel="noreferrer"
            >
              CC BY-SA
            </a>
            )
          </span>
        </footer>
      </main>

      {showReset && (
        <ConfirmReset
          count={markedCount}
          busy={resetting}
          onConfirm={resetAll}
          onCancel={() => setShowReset(false)}
        />
      )}
    </div>
  );
}
