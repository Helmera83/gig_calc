import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { InputField } from './components/InputField';
import { ResultCard } from './components/ResultCard';
import { type CalculationResults, type TripRecord } from './types';
import { MaterialIcon } from './components/MaterialIcon';
import Snackbar from './components/Snackbar';
import { RippleProvider } from './components/RippleProvider';
import { HistoryModal } from './components/HistoryModal';
import { SettingsModal } from './components/SettingsModal';
import './index.css';


const getDistanceFromLatLonInMiles = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3958.8;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const deg2rad = (deg: number): number => deg * (Math.PI / 180);

const App: React.FC = () => {
    const [payment, setPayment] = useState<string>('');
    const [distance, setDistance] = useState<string>('');
    const [gasPrice, setGasPrice] = useState<string>('');
    const [mpg, setMpg] = useState<string>('');
    const [results, setResults] = useState<CalculationResults>({
        totalGasCost: 0,
        netEarnings: 0,
        earningsPerMile: 0,
    });
    const [history, setHistory] = useState<TripRecord[]>([]);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isTracking, setIsTracking] = useState(false);
    const [gpsError, setGpsError] = useState<string | null>(null);
    const [snack, setSnack] = useState<string | null>(null);

    // AI State
    const [aiAnalysis, setAiAnalysis] = useState<{ verdict: string; reasoning: string } | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Settings State
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>(() => {
        const stored = localStorage.getItem('gigCalcTheme') as 'light' | 'dark' | 'auto' | null;
        return stored || 'auto';
    });
    const [contrast, setContrast] = useState<'medium' | 'high'>(() => {
        const stored = localStorage.getItem('gigCalcContrast');
        return (stored as never) || 'medium';
    });
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);

    const watchId = useRef<number | null>(null);
    const lastPosition = useRef<{ lat: number; lon: number } | null>(null);
    const paymentRef = useRef<HTMLInputElement | null>(null);
    const [primaryColor, setPrimaryColor] = useState<string>(() => {
        return localStorage.getItem('gigCalcPrimaryColor') || '#8B52E2';
    });


    useEffect(() => {
        const savedHistory = localStorage.getItem('gigCalcHistory');
        if (savedHistory) setHistory(JSON.parse(savedHistory));
        const savedGasPrice = localStorage.getItem('gigCalcGasPrice');
        if (savedGasPrice) setGasPrice(savedGasPrice);
        const savedMpg = localStorage.getItem('gigCalcMpg');
        if (savedMpg) setMpg(savedMpg);
    }, []);

    useEffect(() => {
        localStorage.setItem('gigCalcGasPrice', gasPrice);
        localStorage.setItem('gigCalcMpg', mpg);
    }, [gasPrice, mpg]);

    useEffect(() => {
        localStorage.setItem('gigCalcHistory', JSON.stringify(history));
    }, [history]);

    useEffect(() => {
        const pay = parseFloat(payment) || 0;
        const dist = parseFloat(distance) || 0;
        const price = parseFloat(gasPrice) || 0;
        const vehicleMpg = parseFloat(mpg) || 0;
        const totalGasCost = (dist > 0 && vehicleMpg > 0) ? (dist / vehicleMpg) * price : 0;
        const netEarnings = pay - totalGasCost;
        const earningsPerMile = dist > 0 ? netEarnings / dist : 0;
        setResults({ totalGasCost, netEarnings, earningsPerMile });
        // Reset AI analysis when data changes
        setAiAnalysis(null);
    }, [payment, distance, gasPrice, mpg]);

    useEffect(() => {
        const mq = window.matchMedia('(prefers-color-scheme: light)');
        const applyClass = (isLight: boolean) => {
            document.body.classList.remove('theme-light');
            if (theme === 'light' || (theme === 'auto' && isLight)) {
                document.body.classList.add('theme-light');
            }
            // Reapply primary color to update surface tints for new theme
            applyPrimaryColor(primaryColor);
        };
        applyClass(mq.matches);
        if (theme === 'auto') {
            const listener = (e: MediaQueryListEvent) => applyClass(e.matches);
            mq.addEventListener('change', listener);
            return () => mq.removeEventListener('change', listener);
        }
    }, [theme, primaryColor]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsMenuOpen(false); };
        const onClick = (e: MouseEvent) => {
            if (isMenuOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('keydown', onKey);
        document.addEventListener('mousedown', onClick);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('mousedown', onClick);
        };
    }, [isMenuOpen]);

    const setThemeAndPersist = (t: 'light' | 'dark' | 'auto') => {
        setTheme(t);
        localStorage.setItem('gigCalcTheme', t);
    };

    const applyPrimaryColor = (hex: string) => {
        const targets = [document.documentElement, document.body];

        // Calculate relative luminance for contrast determination
        const getLuminance = (h: string) => {
            const num = parseInt(h.replace('#',''), 16);
            const r = ((num >> 16) & 0xFF) / 255;
            const g = ((num >> 8) & 0xFF) / 255;
            const b = (num & 0xFF) / 255;
            const [rs, gs, bs] = [r, g, b].map(c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
            return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
        };

        // Get contrasting text color based on background luminance
        const getContrastColor = (bgHex: string) => getLuminance(bgHex) > 0.5 ? '#000000' : '#FFFFFF';

        const adjust = (h: string, amt: number) => {
            const num = parseInt(h.replace('#',''), 16);
            const r = Math.min(255, Math.max(0, (num >> 16) + amt));
            const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt));
            const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
            return `#${(b | (g << 8) | (r << 16)).toString(16).padStart(6,'0')}`;
        };

        // Blend primary color with base surface color for tinted surfaces
        const blendWithSurface = (primaryHex: string, baseHex: string, tintAmount: number) => {
            const pNum = parseInt(primaryHex.replace('#',''), 16);
            const bNum = parseInt(baseHex.replace('#',''), 16);
            const pr = (pNum >> 16) & 0xFF;
            const pg = (pNum >> 8) & 0xFF;
            const pb = pNum & 0xFF;
            const br = (bNum >> 16) & 0xFF;
            const bg = (bNum >> 8) & 0xFF;
            const bb = bNum & 0xFF;
            const r = Math.round(br + (pr - br) * tintAmount);
            const g = Math.round(bg + (pg - bg) * tintAmount);
            const b = Math.round(bb + (pb - bb) * tintAmount);
            return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
        };

        // Check if we're in light mode
        const isLightMode = document.body.classList.contains('theme-light');

        // Base surface colors
        const baseSurface = isLightMode ? '#FFFFFF' : '#18191F';
        const baseBackground = isLightMode ? '#F7F5FF' : '#121214';

        const primaryContainer = adjust(hex, 20);
        const secondary = adjust(hex, -15);
        const secondaryContainer = adjust(hex, 5);
        const tertiary = adjust(hex, 30);
        const tertiaryContainer = adjust(hex, 45);

        // Create tinted surface containers
        const surfaceContainerLowest = blendWithSurface(hex, baseSurface, isLightMode ? 0.02 : 0.01);
        const surfaceContainerLow = blendWithSurface(hex, baseSurface, isLightMode ? 0.04 : 0.02);
        const surfaceContainer = blendWithSurface(hex, baseSurface, isLightMode ? 0.08 : 0.04);
        const surfaceContainerHigh = blendWithSurface(hex, baseSurface, isLightMode ? 0.12 : 0.06);
        const surfaceContainerHighest = blendWithSurface(hex, baseSurface, isLightMode ? 0.16 : 0.08);

        targets.forEach((el) => {
            el.style.setProperty('--md-sys-color-primary', hex);
            el.style.setProperty('--md-sys-color-primary-container', primaryContainer);
            el.style.setProperty('--md-sys-color-on-primary', getContrastColor(hex));
            el.style.setProperty('--md-sys-color-on-primary-container', getContrastColor(primaryContainer));
            el.style.setProperty('--md-sys-color-secondary', secondary);
            el.style.setProperty('--md-sys-color-secondary-container', secondaryContainer);
            el.style.setProperty('--md-sys-color-on-secondary', getContrastColor(secondary));
            el.style.setProperty('--md-sys-color-on-secondary-container', getContrastColor(secondaryContainer));
            el.style.setProperty('--md-sys-color-tertiary', tertiary);
            el.style.setProperty('--md-sys-color-tertiary-container', tertiaryContainer);
            el.style.setProperty('--md-sys-color-on-tertiary', getContrastColor(tertiary));
            el.style.setProperty('--md-sys-color-on-tertiary-container', getContrastColor(tertiaryContainer));

            // Apply tinted surface colors
            el.style.setProperty('--md-sys-color-surface', blendWithSurface(hex, baseSurface, isLightMode ? 0.01 : 0.005));
            el.style.setProperty('--md-sys-color-surface-container-lowest', surfaceContainerLowest);
            el.style.setProperty('--md-sys-color-surface-container-low', surfaceContainerLow);
            el.style.setProperty('--md-sys-color-surface-container', surfaceContainer);
            el.style.setProperty('--md-sys-color-surface-container-high', surfaceContainerHigh);
            el.style.setProperty('--md-sys-color-surface-container-highest', surfaceContainerHighest);
            el.style.setProperty('--md-sys-color-background', blendWithSurface(hex, baseBackground, isLightMode ? 0.02 : 0.01));
        });
    };

    useEffect(() => {
        applyPrimaryColor(primaryColor);
    }, [primaryColor]);

    const handleSettingsSave = (next: { gasPrice: string; mpg: string; theme: 'light' | 'dark' | 'auto'; contrast: 'medium' | 'high'; primaryColor: string; }) => {
        setGasPrice(next.gasPrice);
        setMpg(next.mpg);
        setTheme(next.theme);
        setContrast(next.contrast);
        setPrimaryColor(next.primaryColor);
        localStorage.setItem('gigCalcGasPrice', next.gasPrice);
        localStorage.setItem('gigCalcMpg', next.mpg);
        localStorage.setItem('gigCalcTheme', next.theme);
        localStorage.setItem('gigCalcContrast', next.contrast);
        localStorage.setItem('gigCalcPrimaryColor', next.primaryColor);
    };

    const toggleTracking = () => {
        if (isTracking) {
            if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
            watchId.current = null;
            lastPosition.current = null;
            setIsTracking(false);
        } else {
            if (!navigator.geolocation) {
                setGpsError('Geolocation is not supported');
                return;
            }
            setGpsError(null);
            setIsTracking(true);
            watchId.current = navigator.geolocation.watchPosition((pos) => {
                const { latitude, longitude } = pos.coords;
                if (lastPosition.current) {
                    const distIncrement = getDistanceFromLatLonInMiles(lastPosition.current.lat, lastPosition.current.lon, latitude, longitude);
                    if (distIncrement > 0.005) {
                        setDistance((prev) => (parseFloat(prev || '0') + distIncrement).toFixed(2));
                        lastPosition.current = { lat: latitude, lon: longitude };
                    }
                } else {
                    lastPosition.current = { lat: latitude, lon: longitude };
                }
            }, (err) => {
                setGpsError(`GPS Error: ${err.message}`);
                setIsTracking(false);
            }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 });
        }
    };

    const analyzeProfitability = async () => {
        if (!payment || !distance) return;
        setIsAnalyzing(true);
        try {
            const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
            const prompt = `Analyze this delivery gig profitability:
      Offer: $${payment}
      Distance: ${distance} miles
      Fuel Cost: $${results.totalGasCost.toFixed(2)}
      Net Earnings: $${results.netEarnings.toFixed(2)}
      Earnings Per Mile: $${results.earningsPerMile.toFixed(2)}
      Gas Price: $${gasPrice}/gal
      Vehicle Efficiency: ${mpg} MPG

      Please provide a concise verdict (1-3 words like "Excellent Margin", "Low Profitability", or "Money Loser") and a one-sentence reasoning. Return the result in plain text formatted as "Verdict: [Verdict text] Reasoning: [Reasoning text]".`;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
            });

            const text = response.text || "";
            const verdictMatch = text.match(/Verdict:\s*(.*?)\s*Reasoning:/i);
            const reasoningMatch = text.match(/Reasoning:\s*(.*)/i);

            setAiAnalysis({
                verdict: verdictMatch ? verdictMatch[1] : "Calculated",
                reasoning: reasoningMatch ? reasoningMatch[1] : "Analysis complete based on your input metrics."
            });
        } catch (error) {
            console.error("AI Analysis Error:", error);
            setAiAnalysis({
                verdict: "Analysis Unavailable",
                reasoning: "Unable to connect to AI engine at this time."
            });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSaveTrip = () => {
        const newRecord: TripRecord = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), inputs: { payment, distance, gasPrice, mpg }, results };
        setHistory([newRecord, ...history]);
        setPayment('');
        setDistance('');
        setAiAnalysis(null);
        // return focus to payment field after save
        setTimeout(() => paymentRef.current?.focus(), 50);
        setSnack('Trip saved');
    };

    // Export history as CSV and trigger download
    const exportTripData = () => {
        if (!history || history.length === 0) return;
        const rows: Record<string, string>[] = history.map((t) => ({
            id: String(t.id),
            timestamp: String(t.timestamp),
            payment: String(t.inputs.payment),
            distance: String(t.inputs.distance),
            gasPrice: String(t.inputs.gasPrice),
            mpg: String(t.inputs.mpg),
            totalGasCost: t.results.totalGasCost.toFixed(2),
            netEarnings: t.results.netEarnings.toFixed(2),
            earningsPerMile: t.results.earningsPerMile.toFixed(4),
        }));

        const header = Object.keys(rows[0]);
        const csv = [
            header.join(','),
            ...rows.map(r => header.map(h => `"${(r[h] ?? '').replace(/"/g, '""')}"`).join(','))
        ].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gigcalc_history_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setSnack('CSV downloaded');
    };

    return (
        <div className="app-container">
            <RippleProvider />
            <div className="app-content">
                <header className="app-header">
                    <div className="app-title-container">
                        <h1 className="app-title">ProTrip</h1>
                        <p className="app-subtitle">Net Profit Analyzer</p>
                    </div>
                    <div className="header-actions">
                      <button
                         onClick={() => setIsHistoryOpen(true)}
                         aria-label="Open history"
                         className="icon-button"
                     >
                         <MaterialIcon icon="history" ariaLabel="History" />
                         {history.length > 0 && <span className="badge"></span>}
                      </button>

                      {/* Menu Toggle */}
                      <div className="menu-wrapper" ref={menuRef}>
                        <button
                          className="icon-button"
                          aria-haspopup="menu"
                          aria-expanded={isMenuOpen}
                          aria-label="Open menu"
                          onClick={() => setIsMenuOpen(!isMenuOpen)}
                        >
                          <span className="material-icons">more_vert</span>
                        </button>
                        {isMenuOpen && (
                          <div className="menu-dropdown" role="menu">
                            <button className="menu-item" role="menuitem" onClick={() => { setIsSettingsOpen(true); setIsMenuOpen(false); }}>
                              <span className="material-icons" aria-hidden>settings</span>
                              <span>Settings</span>
                            </button>
                            <button className="menu-item" role="menuitem" onClick={() => { setIsHistoryOpen(true); setIsMenuOpen(false); }}>
                              <span className="material-icons" aria-hidden>history</span>
                              <span>History</span>
                            </button>
                            <div className="menu-separator" aria-hidden></div>
                            <button className="menu-item" role="menuitem" onClick={() => { setThemeAndPersist('auto'); setIsMenuOpen(false); }}>
                              <span className="material-icons" aria-hidden>brightness_auto</span>
                              <span>Auto Theme</span>
                            </button>
                            <button className="menu-item" role="menuitem" onClick={() => { setThemeAndPersist('light'); setIsMenuOpen(false); }}>
                              <span className="material-icons" aria-hidden>light_mode</span>
                              <span>Light Theme</span>
                            </button>
                            <button className="menu-item" role="menuitem" onClick={() => { setThemeAndPersist('dark'); setIsMenuOpen(false); }}>
                              <span className="material-icons" aria-hidden>dark_mode</span>
                              <span>Dark Theme</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                </header>


                {/* Trip Details Card */}
                <div className="input-card">
                    <h2 className="input-card-title">Trip Details</h2>
                    <div className="input-grid">
                        <div className="input-section">
                            <div className="input-row-3">
                                <InputField id="payment" label="Payment" value={payment} onChange={(e) => setPayment(e.target.value)} placeholder="0.00" unit="USD" icon={<MaterialIcon icon="attach_money" ariaLabel="Payment amount" />} />
                                <div className="input-field-group">
                                    <InputField id="distance" label="Distance" value={distance} onChange={(e) => setDistance(e.target.value)} placeholder="0.0" unit="MI" icon={<MaterialIcon icon="straighten" ariaLabel="Distance in miles" />} />
                                    <button
                                        onClick={toggleTracking}
                                        className={`track-mileage-button ${isTracking ? 'active' : ''}`}
                                        aria-label={isTracking ? 'Stop tracking mileage' : 'Start tracking mileage'}
                                    >
                                        <MaterialIcon icon={isTracking ? 'stop' : 'my_location'} ariaLabel={isTracking ? 'Stop' : 'Track'} />
                                        <span>{isTracking ? 'Stop Tracking' : 'Track Mileage'}</span>
                                    </button>
                                    {gpsError && (
                                        <div className="error-alert">
                                            <span className="error-alert-icon">⚠️</span> {gpsError}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>


                {/* AI Analysis Section */}
                <div className="ai-card-wrapper">
                    <div className={`ai-card-glow ${isAnalyzing ? 'analyzing' : ''}`}></div>
                    <div className="ai-card">
                        <div className="ai-card-header">
                            <div className="ai-card-title-wrapper">
                                <h2 className="ai-card-title">Analysis</h2>
                            </div>
                        </div>

                        {isAnalyzing ? (
                            <div className="ai-loading">
                                <div className="ai-loading-line primary"></div>
                                <div className="ai-loading-line secondary"></div>
                            </div>
                        ) : aiAnalysis ? (
                            <div className="ai-result">
                                <p className={`ai-verdict ${
                                    aiAnalysis.verdict.toLowerCase().includes('excellent') || aiAnalysis.verdict.toLowerCase().includes('high') ? 'success' :
                                        aiAnalysis.verdict.toLowerCase().includes('low') || aiAnalysis.verdict.toLowerCase().includes('marginal') ? 'warning' :
                                            aiAnalysis.verdict.toLowerCase().includes('lose') || aiAnalysis.verdict.toLowerCase().includes('bad') ? 'error' : 'neutral'
                                }`}>
                                    {aiAnalysis.verdict}
                                </p>
                                <p className="ai-reasoning">
                                    {aiAnalysis.reasoning}
                                </p>
                            </div>
                        ) : (
                            <p className="ai-empty">
                                Input trip details to generate an AI efficiency report.
                            </p>
                        )}

                        {!aiAnalysis && !isAnalyzing && (
                            <button
                                onClick={analyzeProfitability}
                                disabled={!payment || !distance}
                                className="ai-analyze-button-bottom"
                            >
                                <MaterialIcon icon="auto_awesome" ariaLabel="Analyze" />
                                <span>Analyze Trip</span>
                            </button>
                        )}
                    </div>
                </div>

                <div className="action-buttons">
                    <button onClick={handleSaveTrip} disabled={!payment || !distance} className="action-button primary">
                        Save Trip Record
                    </button>
                    <button onClick={exportTripData} disabled={history.length === 0} className="action-button secondary">
                        Export Trip Data
                    </button>
                </div>

                <div className="results-grid">
                    <ResultCard title="Net Profit" value={`$${results.netEarnings.toFixed(2)}`} isPositive={results.netEarnings >= 0} large />
                    <ResultCard title="Fuel Cost" value={`$${results.totalGasCost.toFixed(2)}`} isPositive={false} large />
                </div>



                {/* Recent Activity Feed */}
                <section className="activity-section">
                    <div className="activity-header">
                        <h2 className="activity-title">Recent Activity</h2>
                        {history.length > 0 && (
                            <button
                                onClick={() => setIsHistoryOpen(true)}
                                className="view-all-button"
                            >
                                View All
                            </button>
                        )}
                    </div>
                    <div className="activity-feed">
                        {history.length > 0 ? (
                            history.slice(0, 10).map((trip) => (
                                <div
                                    key={trip.id}
                                    className="activity-card"
                                >
                                    <div className="activity-card-header">
                                        <span className="activity-date">
                                            {new Date(trip.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                        </span>
                                        <span className={`activity-earnings ${trip.results.netEarnings >= 0 ? 'positive' : 'negative'}`}>
                                            {trip.results.netEarnings >= 0 ? '+' : ''}${trip.results.netEarnings.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="activity-details">
                                        <MaterialIcon icon="location_on" ariaLabel="Distance" />
                                        <span className="activity-distance">{trip.inputs.distance} mi</span>
                                    </div>
                                    <div className="activity-time">
                                        {new Date(trip.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="empty-state">
                                <span>Your recent trips will appear here</span>
                            </div>
                        )}
                    </div>
                </section>



                <Snackbar message={snack} onClose={() => setSnack(null)} />

                <HistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} history={history} onClear={() => { if (window.confirm('Clear history?')) setHistory([]); }} onExport={exportTripData} />
                <SettingsModal
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    gasPrice={gasPrice}
                    mpg={mpg}
                    theme={theme}
                    contrast={contrast}
                    primaryColor={primaryColor}
                    onSave={handleSettingsSave}
                />
            </div>
        </div>
    );
};

export default App;
