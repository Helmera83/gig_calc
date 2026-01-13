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

    // AI State
    const [aiAnalysis, setAiAnalysis] = useState<{ verdict: string; reasoning: string } | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const watchId = useRef<number | null>(null);
    const lastPosition = useRef<{ lat: number; lon: number } | null>(null);
    const paymentRef = useRef<HTMLInputElement | null>(null);

    const [snack, setSnack] = useState<string | null>(null);

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
        <div className="min-h-screen bg-background text-on-surface font-sans p-4 md:p-8 flex justify-center items-center">
            <RippleProvider />
            <div className="w-full max-w-xl space-y-6 pb-16">

                <header className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-light tracking-tight text-on-surface">GigCalc</h1>
                        <p className="text-on-surface-variant text-sm mt-1 uppercase tracking-widest font-bold opacity-60">Optimizer</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <ThemeSwitcher />
                      <button
                         onClick={() => setIsHistoryOpen(true)}
                         aria-label="Open history"
                         className="w-14 h-14 rounded-full bg-surface-container-high text-on-surface-variant hover:bg-primary-20 hover:text-primary transition-all duration-300 flex items-center justify-center relative shadow-sm"
                     >
                         <MaterialIcon icon="history" className="text-on-surface-variant" ariaLabel="History" />
                         {history.length > 0 && <span className="absolute top-3 right-3 h-3 w-3 rounded-full bg-error-10 border-2 border-background"></span>}
                      </button>
                    </div>
                </header>

                {/* Recent Activity Feed */}
                <section className="space-y-3">
                    <div className="flex items-baseline justify-between px-1">
                        <h2 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">Recent Activity</h2>
                        {history.length > 0 && (
                            <button
                                onClick={() => setIsHistoryOpen(true)}
                                className="text-[11px] font-bold text-primary uppercase tracking-wider hover:opacity-70 transition-opacity"
                            >
                                View All
                            </button>
                        )}
                    </div>

                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x h-28">
                        {history.length > 0 ? (
                            history.slice(0, 10).map((trip) => (
                                <div
                                    key={trip.id}
                                    className="min-w-[160px] snap-start bg-surface-container-high-50 border border-outline-variant-20 rounded-2xl p-4 flex flex-col justify-between hover:bg-surface-container-highest transition-colors"
                                >
                                    <div className="flex justify-between items-start">
                    <span className="text-[10px] font-medium text-on-surface-variant">
                      {new Date(trip.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                                        <span className={`text-xs font-bold ${trip.results.netEarnings >= 0 ? 'text-primary' : 'text-error'}`}>
                      {trip.results.netEarnings >= 0 ? '+' : ''}${trip.results.netEarnings.toFixed(2)}
                    </span>
                                    </div>
                                    <div className="mt-2 flex items-center gap-1.5 opacity-60">
                                        <MaterialIcon icon="location_on" ariaLabel="Distance" className="text-[16px]" />
                                        <span className="text-xs font-medium">{trip.inputs.distance} mi</span>
                                    </div>
                                    <div className="mt-1 text-[9px] text-on-surface-variant/50 uppercase tracking-tighter">
                                        {new Date(trip.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="w-full flex items-center justify-center border-2 border-dashed border-outline-variant/20 rounded-2xl text-on-surface-variant/40 text-xs italic py-8">
                                <span className="truncate">Your recent trips will appear here</span>
                            </div>
                        )}
                    </div>
                </section>

                {gpsError && (
                    <div className="bg-error-10 border border-error-20 text-error px-4 py-3 rounded-2xl text-sm flex items-center animate-shake">
                        <span className="mr-3 text-lg">⚠️</span> {gpsError}
                    </div>
                )}

                {/* Financials and Distance Card */}
                <div className="bg-surface-container rounded-m3-xl p-8 border border-outline/5 space-y-8">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/40">Trip Economics</h2>

                    <div className="grid gap-6">
                        <InputField id="payment" label="Offer Amount" value={payment} onChange={(e) => setPayment(e.target.value)} placeholder="0.00" unit="USD" icon={<MaterialIcon icon="attach_money" ariaLabel="Payment amount" className="text-[18px]" />} />

                        <div className="flex gap-4">
                            <div className="flex-grow">
                                <InputField id="distance" label="Trip Distance" value={distance} onChange={(e) => setDistance(e.target.value)} placeholder="0.0" unit="MI" icon={<MaterialIcon icon="straighten" ariaLabel="Distance in miles" className="text-[18px]" />} />
                            </div>
                            <button onClick={toggleTracking} className={`w-20 h-14 mt-6 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1 ${isTracking ? 'bg-error-10 border-error-20 text-on-surface-variant shadow-inner' : 'bg-surface-container-highest-30 border-outline-variant-20 text-on-surface-variant hover:border-primary/30 hover:text-on-surface-variant'}`}>
                                {isTracking ? <MaterialIcon icon="stop" ariaLabel="Stop tracking" className="text-[18px]" /> : <MaterialIcon icon="play_arrow" ariaLabel="Start tracking" className="text-[18px]" />}
                                <span className="text-[9px] font-bold uppercase">{isTracking ? 'STOP' : 'LIVE'}</span>
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <InputField id="gasPrice" label="Gas Price" value={gasPrice} onChange={(e) => setGasPrice(e.target.value)} placeholder="3.50" unit="GAL" icon={<MaterialIcon icon="local_gas_station" ariaLabel="Gas price" className="text-[16px]" />} />
                            <InputField id="mpg" label="Efficiency" value={mpg} onChange={(e) => setMpg(e.target.value)} placeholder="25" unit="MPG" icon={<MaterialIcon icon="speed" ariaLabel="Vehicle MPG" className="text-[16px]" />} />
                        </div>
                    </div>
                </div>

                {/* Results Section */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <ResultCard title="Net Profit" value={`$${results.netEarnings.toFixed(2)}`} isPositive={results.netEarnings >= 0} description="After fuel estimated costs" large />
                    </div>
                    <ResultCard title="Fuel Cost" value={`$${results.totalGasCost.toFixed(2)}`} isPositive={false} description="Estimated expense" variant="neutral" />
                    <ResultCard title="ROI / Mile" value={`$${results.earningsPerMile.toFixed(2)}`} isPositive={results.earningsPerMile > 0} description="Efficiency metric" />
                </div>

                {/* AI Analysis Section */}
                <div className="relative group">
                    <div className={`absolute -inset-0.5 bg-gradient-to-r from-primary via-tertiary to-primary rounded-[34px] opacity-20 blur group-hover:opacity-40 transition duration-1000 group-hover:duration-200 ${isAnalyzing ? 'animate-pulse' : ''}`}></div>
                    <div className="relative bg-surface-container-high rounded-[32px] p-6 border border-primary-10 shadow-xl overflow-hidden">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <MaterialIcon icon="sparkles" className="text-primary" ariaLabel="Sparkles" />
                                <h2 className="text-xs font-bold uppercase tracking-widest text-primary">AI Profitability Verdict</h2>
                            </div>
                            {!aiAnalysis && !isAnalyzing && (
                                <button
                                    onClick={analyzeProfitability}
                                    disabled={!payment || !distance}
                                    className="text-[10px] font-bold uppercase tracking-widest bg-primary-20 text-primary px-3 py-1.5 rounded-full hover:bg-primary-30 transition-all disabled:opacity-20"
                                >
                                    Analyze
                                </button>
                            )}
                        </div>

                        {isAnalyzing ? (
                            <div className="py-4 space-y-3">
                                <div className="h-4 bg-primary-10 rounded-full w-2/3 animate-pulse"></div>
                                <div className="h-3 bg-on-surface-5 rounded-full w-full animate-pulse"></div>
                            </div>
                        ) : aiAnalysis ? (
                            <div className="animate-fade-in">
                                <p className={`text-xl font-medium tracking-tight mb-2 ${
                                    aiAnalysis.verdict.toLowerCase().includes('excellent') || aiAnalysis.verdict.toLowerCase().includes('high') ? 'text-success' :
                                        aiAnalysis.verdict.toLowerCase().includes('low') || aiAnalysis.verdict.toLowerCase().includes('marginal') ? 'text-warning' :
                                            aiAnalysis.verdict.toLowerCase().includes('lose') || aiAnalysis.verdict.toLowerCase().includes('bad') ? 'text-error' : 'text-on-surface'
                                }`}>
                                    {aiAnalysis.verdict}
                                </p>
                                <p className="text-sm text-on-surface-variant leading-relaxed">
                                    {aiAnalysis.reasoning}
                                </p>
                            </div>
                        ) : (
                            <p className="text-sm text-on-surface-variant/40 italic py-2">
                                Input trip details to generate an AI efficiency report.
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex gap-4">
                    <button onClick={handleSaveTrip} disabled={!payment || !distance} className="flex-1 h-14 bg-on-surface text-background rounded-[20px] font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-20 disabled:grayscale shadow-xl">
                        Save Trip Record
                    </button>
                    <button onClick={exportTripData} disabled={history.length === 0} className="flex-1 h-14 bg-surface-container-high text-on-surface font-bold rounded-[20px] hover:brightness-105 transition-all disabled:opacity-30 border border-outline-variant-20">
                        Export Trip Data
                    </button>
                </div>

                <Snackbar message={snack} onClose={() => setSnack(null)} />

                <HistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} history={history} onClear={() => { if (window.confirm('Clear history?')) setHistory([]); }} onExport={exportTripData} />

            </div>
            <style>{`
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
        </div>
    );
};

export default App;
