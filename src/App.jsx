
import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ClipboardList,
  Cloud,
  Coffee,
  Droplets,
  Package,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
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

const categoryIcons = {
  drinks: Droplets,
  food: Coffee,
  supplies: Package,
  misc: ClipboardList,
};

// Read locally saved statuses when Firebase is not connected.
function readLocalStatuses() {
  try {
    const raw = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || '{}'
    );

    if (
      !raw ||
      typeof raw !== 'object' ||
      Array.isArray(raw)
    ) {
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

// Individual Low Stock or Out of Stock checkbox.
function StatusChoice({
  type,
  selected,
  item,
  disabled,
  onChoose,
}) {
  const isLow = type === 'low';
  const text = isLow ? 'Low stock' : 'Out of stock';

  return (
    <label
      className={`choice ${
        isLow ? 'choice-low' : 'choice-out'
      } ${
        selected ? 'choice-selected' : ''
      } ${
        disabled ? 'choice-disabled' : ''
      }`}
    >
      <input
        type="checkbox"
        checked={selected}
        disabled={disabled}
        aria-label={`${item.label}: ${text}`}
        onChange={() => onChoose(item.id, type)}
      />

      <span>{text}</span>
    </label>
  );
}

// Confirmation popup for resetting every item.
function ConfirmReset({
  count,
  busy,
  onConfirm,
  onCancel,
}) {
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

        <h2 id="reset-title">
          Reset the entire list?
        </h2>

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

        <p className="modal-warning">
          This action cannot be undone.
        </p>

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

  const [collapsed, setCollapsed] = useState(
    () => new Set()
  );

  const [pending, setPending] = useState(
    () => new Set()
  );

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
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(statuses)
      );
    }
  }, [statuses]);

  // Calculate live summary counters.
  const counts = useMemo(() => {
    const data = {
      low: 0,
      out: 0,
    };

    for (const item of ALL_ITEMS) {
      if (statuses[item.id] === 'low') {
        data.low++;
      }

      if (statuses[item.id] === 'out') {
        data.out++;
      }
    }

    return data;
  }, [statuses]);

  // Search and filter inventory.
  const visibleCategories = useMemo(() => {
    const query = search.trim().toLowerCase();

    return INVENTORY.map((category) => ({
      ...category,

      groups: category.groups
        .map((group) => {
          const contextMatch =
            category.title.toLowerCase().includes(query) ||
            group.title.toLowerCase().includes(query);

          return {
            ...group,

            items: group.items.filter(
              (item) =>
                (
                  !query ||
                  contextMatch ||
                  item.label.toLowerCase().includes(query)
                ) &&
                (
                  filter === 'all' ||
                  statuses[item.id] === filter
                )
            ),
          };
        })
        .filter((group) => group.items.length > 0),
    })).filter(
      (category) => category.groups.length > 0
    );
  }, [search, filter, statuses]);

  const visibleCount = visibleCategories.reduce(
    (total, category) =>
      total +
      category.groups.reduce(
        (sum, group) => sum + group.items.length,
        0
      ),
    0
  );

  const markedCount = Object.keys(statuses).length;
  const flaggedCount = counts.low + counts.out;

  // Set or clear an item's stock status.
  async function chooseStatus(itemId, choice) {
    if (
      pending.has(itemId) ||
      resetting ||
      (firebaseConfigured && !ready)
    ) {
      return;
    }

    const newStatus =
      statuses[itemId] === choice ? null : choice;

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
    setPending(
      (previous) => new Set(previous).add(itemId)
    );

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
            batch.delete(
              doc(db, COLLECTION_NAME, id)
            );
          });

          await batch.commit();
        }
      } else {
        setStatuses({});
      }

      setShowReset(false);
    } catch {
      setSyncError(
        'The reset did not fully complete. Please try again.'
      );

      setShowReset(false);
    } finally {
      setResetting(false);
    }
  }

  // Expand or collapse a product group.
  function toggleGroup(groupId) {
    setCollapsed((previous) => {
      const next = new Set(previous);

      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }

      return next;
    });
  }

  return (
    <div className="app-shell">

      {/* TOP NAVIGATION */}
      <header className="topbar">
        <div className="topbar-inner">

          <div className="brand">
            <div className="logo-mark">W</div>

            <div className="brand-text">
              <strong>WINGS ARENA</strong>
              <span>INTERNAL OPERATIONS</span>
            </div>
          </div>

          <div className="topbar-right">
            <div
              className={`connection-badge ${
                firebaseConfigured
                  ? ready
                    ? 'connection-live'
                    : 'connection-wait'
                  : 'connection-local'
              }`}
            >
              {firebaseConfigured
                ? <Cloud size={15} />
                : <WifiOff size={15} />
              }

              <span>
                {firebaseConfigured
                  ? ready
                    ? 'Live sync enabled'
                    : 'Connecting…'
                  : 'Local preview'
                }
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="page-content">

        {/* PAGE HEADER */}
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              <span className="eyebrow-line" />
              STOCK MANAGEMENT / FRONT DESK
            </div>

            <h1>
              THE <span>86</span> LIST
              <span className="title-period">.</span>
            </h1>

            <p>
              Mark what's running low or out of stock.
              Keep every shift on the same page.
            </p>
          </div>

          <div className="heading-aside">
            <div className="heading-aside-icon">
              <ClipboardList size={22} />
            </div>

            <div>
              <strong>RESTOCKING BOARD</strong>
              <span>
                {ALL_ITEMS.length} items tracked across{' '}
                {INVENTORY.length} categories
              </span>
            </div>
          </div>
        </div>

        {/* LOCAL MODE NOTICE */}
        {!firebaseConfigured && (
          <div className="local-banner">
            <WifiOff size={19} />

            <div>
              <strong>Local preview mode</strong>
              <span>
                Changes are saved on this browser only.
                Add your Firebase settings in{' '}
                <code>.env</code> to sync across computers.
              </span>
            </div>
          </div>
        )}

        {syncError && (
          <div className="error-banner" role="alert">
            <AlertCircle size={19} />
            <span>{syncError}</span>
          </div>
        )}

        {/* SUMMARY COUNTERS */}
        <div className="stats-grid">

          <div className="stat-card stat-low">
            <div className="stat-top">
              <span>LOW STOCK</span>
              <span className="stat-icon stat-icon-low">
                <AlertCircle size={20} />
              </span>
            </div>

            <div className="stat-value">
              {counts.low.toString().padStart(2, '0')}
            </div>

            <div className="stat-foot">
              <span className="dot dot-low" />
              Needs replenishing
            </div>
          </div>

          <div className="stat-card stat-out">
            <div className="stat-top">
              <span>OUT OF STOCK</span>
              <span className="stat-icon stat-icon-out">
                <X size={20} />
              </span>
            </div>

            <div className="stat-value">
              {counts.out.toString().padStart(2, '0')}
            </div>

            <div className="stat-foot">
              <span className="dot dot-out" />
              Needs immediate attention
            </div>
          </div>

          <div className="stat-card stat-total">
            <div className="stat-top">
              <span>TOTAL FLAGGED</span>
              <span className="stat-icon stat-icon-total">
                <SlidersHorizontal size={20} />
              </span>
            </div>

            <div className="stat-value">
              {flaggedCount.toString().padStart(2, '0')}
            </div>

            <div className="stat-foot">
              <span className="dot dot-total" />
              Of {ALL_ITEMS.length} tracked items
            </div>
          </div>

        </div>

        {/* CHECKLIST HEADER */}
        <div className="list-topline">
          <div>
            <h2>Inventory checklist</h2>
            <p>
              Select one status per item.
              Click it again to clear.
            </p>
          </div>

          <button
            type="button"
            className="reset-button"
            disabled={
              markedCount === 0 ||
              !ready ||
              resetting
            }
            onClick={() => setShowReset(true)}
          >
            <RotateCcw size={17} />
            Reset all
          </button>
        </div>

        {/* SEARCH AND FILTERS */}
        <div className="toolbar">
          <div className="search-box">
            <Search size={20} />

            <input
              type="search"
              placeholder="Search items, flavors, or categories…"
              aria-label="Search inventory"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />

            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearch('')}
              >
                <X size={17} />
              </button>
            )}
          </div>

          <div
            className="filter-tabs"
            aria-label="Filter by status"
          >
            <button
              className={filter === 'all' ? 'active' : ''}
              onClick={() => setFilter('all')}
            >
              All items
            </button>

            <button
              className={filter === 'low' ? 'active' : ''}
              onClick={() => setFilter('low')}
            >
              Low <span>{counts.low}</span>
            </button>

            <button
              className={filter === 'out' ? 'active' : ''}
              onClick={() => setFilter('out')}
            >
              Out <span>{counts.out}</span>
            </button>
          </div>
        </div>

        <div className="results-note">
          Showing <strong>{visibleCount}</strong> of{' '}
          <strong>{ALL_ITEMS.length}</strong> inventory items
        </div>

        {/* INVENTORY CATEGORIES */}
        {!ready && firebaseConfigured ? (

          <div className="empty-state">
            <Cloud size={32} />
            <h3>Connecting to inventory</h3>
            <p>
              Stock statuses will appear when the database
              connection is ready.
            </p>
          </div>

        ) : visibleCategories.length === 0 ? (

          <div className="empty-state">
            <Search size={32} />
            <h3>No items found</h3>

            <p>
              Try another search or switch to "All items."
            </p>

            <button
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

          <div className="categories-list">
            {visibleCategories.map((category) => {
              const CategoryIcon =
                categoryIcons[category.id] || Package;

              const categoryItems = category.groups.flatMap(
                (group) => group.items
              );

              const categoryLow = categoryItems.filter(
                (item) => statuses[item.id] === 'low'
              ).length;

              const categoryOut = categoryItems.filter(
                (item) => statuses[item.id] === 'out'
              ).length;

              return (
                <section
                  className="category-card"
                  key={category.id}
                  aria-labelledby={`category-${category.id}`}
                >
                  <div className="category-header">
                    <div className="category-header-left">
                      <span
                        className={`category-icon category-icon-${category.id}`}
                      >
                        <CategoryIcon size={20} />
                      </span>

                      <div>
                        <h3 id={`category-${category.id}`}>
                          {category.title}
                        </h3>

                        <span>
                          {categoryItems.length}{' '}
                          {categoryItems.length === 1
                            ? 'item'
                            : 'items'
                          }
                        </span>
                      </div>
                    </div>

                    <div className="category-counts">
                      {categoryLow > 0 && (
                        <span className="mini-pill mini-low">
                          {categoryLow} low
                        </span>
                      )}

                      {categoryOut > 0 && (
                        <span className="mini-pill mini-out">
                          {categoryOut} out
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="category-body">
                    {category.groups.map((group) => {
                      const groupKey =
                        `${category.id}/${group.id}`;

                      const expanded =
                        Boolean(search.trim()) ||
                        !collapsed.has(groupKey);

                      return (
                        <div
                          className="product-group"
                          key={groupKey}
                        >
                          <button
                            className="group-title"
                            aria-expanded={expanded}
                            onClick={() =>
                              toggleGroup(groupKey)
                            }
                          >
                            <span>
                              <ChevronDown
                                className={
                                  expanded ? '' : 'rotated'
                                }
                                size={17}
                              />

                              {group.title}
                            </span>

                            <span className="group-items-count">
                              {group.items.length}{' '}
                              {group.items.length === 1
                                ? 'item'
                                : 'items'
                              }
                            </span>
                          </button>

                          {expanded && (
                            <div className="item-list">
                              {group.items.map((item) => {
                                const status =
                                  statuses[item.id];

                                const disabled =
                                  pending.has(item.id) ||
                                  resetting;

                                return (
                                  <div
                                    className={`item-row ${
                                      status
                                        ? `item-row-${status}`
                                        : ''
                                    }`}
                                    key={item.id}
                                  >
                                    <div className="item-name">
                                      <span className="item-indicator">
                                        {status
                                          ? <Check size={13} />
                                          : null
                                        }
                                      </span>

                                      <span>{item.label}</span>
                                    </div>

                                    <div className="choices">
                                      <StatusChoice
                                        item={item}
                                        type="low"
                                        selected={
                                          status === 'low'
                                        }
                                        disabled={disabled}
                                        onChoose={chooseStatus}
                                      />

                                      <StatusChoice
                                        item={item}
                                        type="out"
                                        selected={
                                          status === 'out'
                                        }
                                        disabled={disabled}
                                        onChoose={chooseStatus}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* FOOTER */}
        <footer className="footer">
          <span>
            WINGS ARENA
            <span className="footer-divider">/</span>
            86 LIST
          </span>

          <span>
            {firebaseConfigured
              ? 'Your changes sync automatically.'
              : 'Browser-only preview — Firebase not connected.'
            }
          </span>
        </footer>
      </main>

      {/* RESET CONFIRMATION */}
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
