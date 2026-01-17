import React, { useState, useMemo } from 'react';
import { type TripRecord } from '../types';
import { MaterialIcon } from './MaterialIcon';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: TripRecord[];
  onClear: () => void;
  onExport: () => void;
}

type SortField = 'date' | 'earnings' | 'distance';
type SortOrder = 'desc' | 'asc';

// Extracted SortBadge to top-level so it's not recreated during render
const SortBadge: React.FC<{
  field: SortField;
  label: string;
  isActive: boolean;
  sortOrder: SortOrder;
  onToggle: (field: SortField) => void;
}> = ({ field, label, isActive, sortOrder, onToggle }) => {
  return (
    <button
      onClick={() => onToggle(field)}
      className={`sort-badge ${isActive ? 'active' : 'inactive'}`}
    >
      {label}
      {isActive && (
        <span className={`sort-arrow ${sortOrder === 'asc' ? 'asc' : ''}`}>
          ▼
        </span>
      )}
    </button>
  );
};

export const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, history, onClear, onExport }) => {
    const [sortField, setSortField] = useState<SortField>('date');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

    // Toggle expand/collapse with content-driven height animation
    const toggleExpand = (el: HTMLElement) => {
        const COLLAPSED = 72;
        const isExpanded = el.classList.contains('expanded');

        if (!isExpanded) {
            // starting from collapsed height
            el.style.height = `${COLLAPSED}px`;
            // add expanded class so content becomes visible for measurement
            el.classList.add('expanded');
            // measure full height including content
            const full = el.scrollHeight;
            // force reflow
            void el.offsetHeight;
            // animate to full height
            el.style.height = `${full}px`;
            el.setAttribute('aria-expanded', 'true');
            const onEnd = () => {
                el.style.height = 'auto';
                el.removeEventListener('transitionend', onEnd);
            };
            el.addEventListener('transitionend', onEnd);
        } else {
            // collapse: from current (possibly auto) to fixed collapsed height
            const current = el.offsetHeight; // explicit pixel height
            el.style.height = `${current}px`;
            // force reflow
            void el.offsetHeight;
            // remove expanded class (changes visual but height still set)
            el.classList.remove('expanded');
            el.setAttribute('aria-expanded', 'false');
            // animate to collapsed height
            el.style.height = `${COLLAPSED}px`;
            const onEnd = () => {
                // clear inline height so layout can be dynamic
                el.style.height = '';
                el.removeEventListener('transitionend', onEnd);
            };
            el.addEventListener('transitionend', onEnd);
        }
    };

    const formatCurrency = (value: number) => {
        return value.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
        });
    };

    // Calculate aggregate stats for the header
    const stats = useMemo(() => {
        return history.reduce((acc, trip) => {
            acc.net += trip.results.netEarnings;
            acc.miles += parseFloat(trip.inputs.distance || '0');
            return acc;
        }, { net: 0, miles: 0 });
    }, [history]);

    const sortedHistory = useMemo(() => {
        return [...history].sort((a, b) => {
            let comparison = 0;
            if (sortField === 'date') {
                comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
            } else if (sortField === 'earnings') {
                comparison = a.results.netEarnings - b.results.netEarnings;
            } else if (sortField === 'distance') {
                comparison = parseFloat(a.inputs.distance || '0') - parseFloat(b.inputs.distance || '0');
            }
            return sortOrder === 'desc' ? -comparison : comparison;
        });
    }, [history, sortField, sortOrder]);

    const handleSortToggle = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
        } else {
            setSortField(field);
            setSortOrder('desc');
        }
    };

    // Move the early return here so hooks are always called in the same order
    if (!isOpen) return null;

    return (
        <div 
            className="modal-overlay"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div 
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <header className="modal-header">
                    <div className="modal-header-row">
                        <div className="modal-title-wrapper">
                            <h2 className="modal-title">Trip Ledger</h2>
                            <p className="modal-subtitle">Audit your performance</p>
                        </div>
                        <button 
                            onClick={onClose} 
                            className="modal-close-button"
                        >
                            <MaterialIcon icon="close" ariaLabel="Close history" />
                        </button>
                    </div>

                    {history.length > 0 && (
                        <div className="modal-header-stats">
                            {/* Summary Dashboard Inside Modal */}
                            <div className="stats-grid">
                                <div className="stat-card primary">
                                    <span className="stat-label primary">
                                        <MaterialIcon icon="attach_money" ariaLabel="Aggregate net" /> Aggregate Net
                                    </span>
                                    <span className={`stat-value ${stats.net >= 0 ? 'positive' : 'negative'}`}>
                                        {formatCurrency(stats.net)}
                                    </span>
                                </div>
                                <div className="stat-card neutral">
                                    <span className="stat-label neutral">
                                        <MaterialIcon icon="location_on" ariaLabel="Total mileage" /> Total Mileage
                                    </span>
                                    <span className="stat-value neutral">
                                        {stats.miles.toFixed(1)} <small className="stat-value-small">mi</small>
                                    </span>
                                </div>
                            </div>

                            <div className="sort-section">
                                <span className="sort-label">Sort:</span>
                                <SortBadge field="date" label="Date" isActive={sortField === 'date'} sortOrder={sortOrder} onToggle={handleSortToggle} />
                                <SortBadge field="earnings" label="Profit" isActive={sortField === 'earnings'} sortOrder={sortOrder} onToggle={handleSortToggle} />
                                <SortBadge field="distance" label="Miles" isActive={sortField === 'distance'} sortOrder={sortOrder} onToggle={handleSortToggle} />
                            </div>
                        </div>
                    )}
                </header>

                {/* Content */}
                <main className="modal-main">
                    {sortedHistory.length > 0 ? (
                        <div className="transaction-list">
                            {sortedHistory.map((trip) => (
                                <div
                                    key={trip.id}
                                    tabIndex={0}
                                    role="button"
                                    aria-expanded={false}
                                    className="transaction-item"
                                    onClick={(e) => toggleExpand(e.currentTarget as HTMLElement)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            toggleExpand(e.currentTarget as HTMLElement);
                                            e.preventDefault();
                                        }
                                    }}
                                >
                                    <div className="transaction-header">
                                        <div className="transaction-date-wrapper">
                                            <span className="transaction-date">
                                                {new Date(trip.timestamp).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                            </span>
                                            <span className="transaction-time">
                                                {new Date(trip.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className="transaction-earnings-wrapper">
                                            <div className={`transaction-earnings ${trip.results.netEarnings >= 0 ? 'positive' : 'negative'}`}>
                                                {formatCurrency(trip.results.netEarnings)}
                                            </div>
                                            <div className="transaction-earnings-label">Net Earnings</div>
                                        </div>
                                    </div>

                                    <div className="transaction-details">
                                         <div className="transaction-detail-item">
                                            <span className="transaction-detail-label">Payout</span>
                                            <span className="transaction-detail-value">{formatCurrency(parseFloat(trip.inputs.payment))}</span>
                                         </div>
                                        <div className="transaction-detail-item">
                                            <span className="transaction-detail-label">Gas Cost</span>
                                            <span className="transaction-detail-value cost">{formatCurrency(trip.results.totalGasCost)}</span>
                                        </div>
                                        <div className="transaction-detail-item right">
                                            <span className="transaction-detail-label">Efficiency</span>
                                            <span className="transaction-detail-value efficiency">{trip.results.earningsPerMile.toFixed(2)}/mi</span>
                                        </div>
                                    </div>
                                    
                                    <div className="transaction-progress">
                                        <div className="transaction-progress-bar">
                                            <div
                                                className="transaction-progress-fill"
                                                style={{ width: `${Math.min(100, (trip.results.netEarnings / (parseFloat(trip.inputs.payment) || 1)) * 100)}%` }}
                                            />
                                        </div>
                                        <span className="transaction-progress-label">
                                            {Math.round((trip.results.netEarnings / (parseFloat(trip.inputs.payment) || 1)) * 100)}% ROI
                                        </span>
                                    </div>

                                    <div className="expanded-content">
                                        {/* Expanded details */}
                                        <div className="expanded-details">
                                            <div>{`Gas Price: ${trip.inputs.gasPrice}`}</div>
                                            <div>{`MPG: ${trip.inputs.mpg}`}</div>
                                            <div>{`Saved at: ${new Date(trip.timestamp).toLocaleString()}`}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-records">
                            <div className="empty-icon-wrapper">
                                <MaterialIcon icon="history" ariaLabel="History" />
                            </div>
                            <h3 className="empty-title">No Records Found</h3>
                            <p className="empty-description">Start recording your delivery trips to see your earnings performance history here.</p>
                        </div>
                    )}
                </main>

                {/* Footer */}
                {history.length > 0 && (
                    <footer className="modal-footer">
                         <button
                            onClick={onExport}
                            className="modal-footer-button export"
                        >
                            <MaterialIcon icon="download" ariaLabel="Download CSV" />
                            Download CSV
                        </button>
                        <button 
                            onClick={onClear}
                            className="modal-footer-button clear"
                        >
                            <MaterialIcon icon="delete" ariaLabel="Wipe history" />
                            Wipe History
                        </button>
                     </footer>
                 )}
             </div>
        </div>
    );
};
