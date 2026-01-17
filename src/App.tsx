import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { InputField } from './components/InputField';
import { ResultCard } from './components/ResultCard';
import { type CalculationResults, type TripRecord } from './types';
import { MaterialIcon } from './components/MaterialIcon';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import Snackbar from './components/Snackbar';
import { RippleProvider } from './components/RippleProvider';
import { HistoryModal } from './components/HistoryModal';
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

    const watchId = useRef<number | null>(null);
    const lastPosition = useRef<{ lat: number; lon: number } | null>(null);
    const paymentRef = useRef<HTMLInputElement | null>(null);


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
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
                      <ThemeSwitcher />
                      <button
                         onClick={() => setIsHistoryOpen(true)}
                         aria-label="Open history"
                         className="icon-button"
                     >
                         <MaterialIcon icon="history" ariaLabel="History" />
                         {history.length > 0 && <span className="badge"></span>}
                      </button>
                    </div>
                </header>


                {gpsError && (
                    <div className="error-alert">
                        <span className="error-alert-icon">⚠️</span> {gpsError}
                    </div>
                )}

                {/* Offer Amount Card */}
                <div className="input-card">
                    <h2 className="input-card-title">Offer Amount</h2>
                    <div className="input-grid">
                        <InputField id="payment" label="Payment" value={payment} onChange={(e) => setPayment(e.target.value)} placeholder="0.00" unit="USD" icon={<MaterialIcon icon="attach_money" ariaLabel="Payment amount" />} />
                    </div>
                </div>

                {/* Trip Distance and GPS Card */}
                <div className="input-card">
                    <h2 className="input-card-title">Trip Distance</h2>
                    <div className="input-grid">
                        <div className="input-row">
                            <div className="input-row-item">
                                <InputField id="distance" label="Distance" value={distance} onChange={(e) => setDistance(e.target.value)} placeholder="0.0" unit="MI" icon={<MaterialIcon icon="straighten" ariaLabel="Distance in miles" />} />
                            </div>
                            <button onClick={toggleTracking} className={`gps-button ${isTracking ? 'active' : ''}`}>
                                {isTracking ? <MaterialIcon icon="stop" ariaLabel="Stop tracking" /> : <MaterialIcon icon="play_arrow" ariaLabel="Start tracking" />}
                                <span className="gps-button-label">{isTracking ? 'STOP' : 'LIVE'}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Fuel Settings Card */}
                <div className="input-card">
                    <h2 className="input-card-title">Fuel Settings</h2>
                    <div className="input-grid">
                        <InputField id="gasPrice" label="Gas Price" value={gasPrice} onChange={(e) => setGasPrice(e.target.value)} placeholder="3.50" unit="GAL" icon={<MaterialIcon icon="local_gas_station" ariaLabel="Gas price" />} />

                        <InputField id="mpg" label="Efficiency" value={mpg} onChange={(e) => setMpg(e.target.value)} placeholder="25" unit="MPG" icon={<MaterialIcon icon="speed" ariaLabel="Vehicle MPG" />} />
                    </div>
                </div>

                {/* Results Section */}
                <div className="results-grid">
                    <div className="results-grid-full">
                        <ResultCard title="Net Profit" value={`$${results.netEarnings.toFixed(2)}`} isPositive={results.netEarnings >= 0} description="After fuel estimated costs" large />
                    </div>
                    <ResultCard title="Fuel Cost" value={`$${results.totalGasCost.toFixed(2)}`} isPositive={false} description="Estimated expense" variant="neutral" />
                    <ResultCard title="ROI / Mile" value={`$${results.earningsPerMile.toFixed(2)}`} isPositive={results.earningsPerMile > 0} description="Efficiency metric" />
                </div>

                {/* AI Analysis Section */}
                <div className="ai-card-wrapper">
                    <div className={`ai-card-glow ${isAnalyzing ? 'analyzing' : ''}`}></div>
                    <div className="ai-card">
                        <div className="ai-card-header">
                            <div className="ai-card-title-wrapper">
                                <MaterialIcon icon="sparkles" ariaLabel="Sparkles" />
                                <h2 className="ai-card-title">AI Profitability Verdict</h2>
                            </div>
                            {!aiAnalysis && !isAnalyzing && (
                                <button
                                    onClick={analyzeProfitability}
                                    disabled={!payment || !distance}
                                    className="ai-analyze-button"
                                >
                                    Analyze
                                </button>
                            )}
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
                    </div>
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

                <div className="action-buttons">
                    <button onClick={handleSaveTrip} disabled={!payment || !distance} className="action-button primary">
                        Save Trip Record
                    </button>
                    <button onClick={exportTripData} disabled={history.length === 0} className="action-button secondary">
                        Export Trip Data
                    </button>
                </div>

                <Snackbar message={snack} onClose={() => setSnack(null)} />

                <HistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} history={history} onClear={() => { if (window.confirm('Clear history?')) setHistory([]); }} onExport={exportTripData} />

            </div>

        </div>
    );
};

export default App;
