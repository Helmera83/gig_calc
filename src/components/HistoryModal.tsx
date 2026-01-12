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
      className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 border
          ${isActive
            ? 'bg-primary text-on-primary border-transparent shadow-md shadow-primary/20'
            : 'bg-surface-container-highest/30 text-on-surface-variant border-outline-variant/30 hover:bg-surface-container-highest/60'
          }`}
    >
      {label}
      {isActive && (
        <span className={`text-[10px] transition-transform duration-300 ${sortOrder === 'asc' ? 'rotate-180' : ''}`}>
          ▼
        </span>
      )}
    </button>
  );
};

export const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, history, onClear, onExport }) => {
    const [sortField, setSortField] = useState<SortField>('date');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

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
            className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-0 sm:p-4"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div 
                className="bg-surface-container-high w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-[40px] flex flex-col shadow-2xl animate-fade-in-up border border-outline-variant/10 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <header className="p-8 pb-4 shrink-0 bg-surface-container-high/50 backdrop-blur-xl border-b border-outline-variant/10">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-3xl font-light text-on-surface tracking-tight">Trip Ledger</h2>
                            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/50 mt-1">Audit your performance</p>
                        </div>
                        <button 
                            onClick={onClose} 
                            className="w-12 h-12 flex items-center justify-center rounded-full bg-surface-container-highest/50 hover:bg-surface-container-highest text-on-surface-variant transition-all active:scale-90"
                        >
                            <MaterialIcon icon="close" ariaLabel="Close history" className="text-[18px]" />
                        </button>
                    </div>

                    {history.length > 0 && (
                        <div className="space-y-6">
                            {/* Summary Dashboard Inside Modal */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-primary/10 rounded-3xl p-4 border border-primary/10">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary/70 flex items-center gap-1.5 mb-1">
                                        <MaterialIcon icon="attach_money" ariaLabel="Aggregate net" className="text-[14px] mr-1" /> Aggregate Net
                                    </span>
                                    <span className={`text-2xl font-medium ${stats.net >= 0 ? 'text-primary' : 'text-error'}`}>
                                        {formatCurrency(stats.net)}
                                    </span>
                                </div>
                                <div className="bg-surface-container-highest/40 rounded-3xl p-4 border border-outline-variant/10">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70 flex items-center gap-1.5 mb-1">
                                        <MaterialIcon icon="location_on" ariaLabel="Total mileage" className="text-[14px] mr-1" /> Total Mileage
                                    </span>
                                    <span className="text-2xl font-medium text-on-surface">
                                        {stats.miles.toFixed(1)} <small className="text-xs uppercase opacity-40">mi</small>
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
                                <span className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest mr-1">Sort:</span>
                                <SortBadge field="date" label="Date" isActive={sortField === 'date'} sortOrder={sortOrder} onToggle={handleSortToggle} />
                                <SortBadge field="earnings" label="Profit" isActive={sortField === 'earnings'} sortOrder={sortOrder} onToggle={handleSortToggle} />
                                <SortBadge field="distance" label="Miles" isActive={sortField === 'distance'} sortOrder={sortOrder} onToggle={handleSortToggle} />
                            </div>
                        </div>
                    )}
                </header>

                {/* Content */}
                <main className="flex-grow overflow-y-auto px-4 sm:px-8 py-6 custom-scrollbar bg-surface-container-high">
                    {sortedHistory.length > 0 ? (
                        <div className="grid gap-3">
                            {sortedHistory.map((trip) => (
                                <div key={trip.id} className="group relative bg-surface-container-highest/30 rounded-[24px] p-5 flex flex-col border border-outline-variant/10 hover:border-primary/30 hover:bg-surface-container-highest/60 transition-all duration-300">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">
                                                {new Date(trip.timestamp).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                            </span>
                                            <span className="text-xs text-on-surface-variant/40 font-medium">
                                                {new Date(trip.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <div className={`text-2xl font-medium tracking-tight ${trip.results.netEarnings >= 0 ? 'text-primary' : 'text-error'}`}>
                                                {formatCurrency(trip.results.netEarnings)}
                                            </div>
                                            <div className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-tighter">Net Earnings</div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-outline-variant/5">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-widest">Payout</span>
                                            <span className="text-xs font-medium text-on-surface-variant">{formatCurrency(parseFloat(trip.inputs.payment))}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-widest">Gas Cost</span>
                                            <span className="text-xs font-medium text-error/70">{formatCurrency(trip.results.totalGasCost)}</span>
                                        </div>
                                        <div className="flex flex-col text-right">
                                            <span className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-widest">Efficiency</span>
                                            <span className="text-xs font-medium text-primary/80">{trip.results.earningsPerMile.toFixed(2)}/mi</span>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-3 flex items-center gap-2">
                                        <div className="h-1 flex-grow bg-outline-variant/10 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-primary/40" 
                                                style={{ width: `${Math.min(100, (trip.results.netEarnings / (parseFloat(trip.inputs.payment) || 1)) * 100)}%` }}
                                            />
                                        </div>
                                        <span className="text-[9px] font-bold text-on-surface-variant/30 uppercase tracking-widest">
                                            {Math.round((trip.results.netEarnings / (parseFloat(trip.inputs.payment) || 1)) * 100)}% ROI
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant text-center">
                            <div className="w-20 h-20 bg-surface-container-highest rounded-full flex items-center justify-center mb-6 opacity-40">
                                <MaterialIcon icon="history" ariaLabel="History" className="text-[28px]" />
                            </div>
                            <h3 className="text-xl font-medium text-on-surface mb-2">No Records Found</h3>
                            <p className="text-sm text-on-surface-variant/60 max-w-xs">Start recording your delivery trips to see your earnings performance history here.</p>
                        </div>
                    )}
                </main>

                {/* Footer */}
                {history.length > 0 && (
                    <footer className="p-8 pt-4 shrink-0 flex flex-col sm:flex-row gap-3 bg-surface-container-high/50 backdrop-blur-xl border-t border-outline-variant/10">
                         <button 
                            onClick={onExport}
                            className="flex-grow flex items-center justify-center gap-3 h-14 rounded-2xl bg-surface-container-highest text-on-surface font-bold text-sm hover:brightness-110 transition-all border border-outline-variant/20 active:scale-95"
                        >
                            <MaterialIcon icon="download" ariaLabel="Download CSV" className="text-[16px]" />
                            Download CSV
                        </button>
                        <button 
                            onClick={onClear}
                            className="flex-grow flex items-center justify-center gap-3 h-14 rounded-2xl bg-error/10 text-error hover:bg-error/20 transition-all font-bold text-sm active:scale-95"
                        >
                            <MaterialIcon icon="delete" ariaLabel="Wipe history" className="text-[16px]" />
                            Wipe History
                        </button>
                     </footer>
                 )}
             </div>
              <style>{`
                @keyframes fadeInUp {
                  from { opacity: 0; transform: translateY(40px) scale(0.98); }
                  to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .animate-fade-in-up { animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                
                .custom-scrollbar::-webkit-scrollbar {
                  width: 5px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                  background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                  background-color: rgba(255, 255, 255, 0.05);
                  border-radius: 20px;
                }
                .scrollbar-none::-webkit-scrollbar {
                  display: none;
                }
                .scrollbar-none {
                  -ms-overflow-style: none;
                  scrollbar-width: none;
                }
            `}</style>
        </div>
    );
};
