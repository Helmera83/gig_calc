import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { InputField } from './components/InputField';
import { ResultCard } from './components/ResultCard';
import type {CalculationResults, TripRecord, GroundingLink} from './types.tsx';
import { DollarIcon } from './components/icons/DollarIcon';
import { RoadIcon } from './components/icons/RoadIcon';
import { FuelIcon } from './components/icons/FuelIcon';
import { GaugeIcon } from './components/icons/GaugeIcon';
import { HistoryIcon } from './components/icons/HistoryIcon';
import { HistoryModal } from './components/HistoryModal';
import { LocationMarkerIcon } from './components/icons/LocationMarkerIcon';
import { PlayIcon } from './components/icons/PlayIcon';
import { StopIcon } from './components/icons/StopIcon';
import { StoreIcon } from './components/icons/StoreIcon';
import { FlagIcon } from './components/icons/FlagIcon';
import { ClockIcon } from './components/icons/ClockIcon';

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
  const [storeLocation, setStoreLocation] = useState<string>('');
  const [dropoffLocation, setDropoffLocation] = useState<string>('');
  const [recentLocations, setRecentLocations] = useState<string[]>([]);
  const [showStoreSuggestions, setShowStoreSuggestions] = useState(false);
  const [showDropoffSuggestions, setShowDropoffSuggestions] = useState(false);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [groundingLinks, setGroundingLinks] = useState<GroundingLink[]>([]);
  const [results, setResults] = useState<CalculationResults>({
    totalGasCost: 0,
    netEarnings: 0,
    earningsPerMile: 0,
  });
  const [history, setHistory] = useState<TripRecord[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const watchId = useRef<number | null>(null);
  const lastPosition = useRef<{ lat: number; lon: number } | null>(null);
  const storeInputRef = useRef<HTMLDivElement>(null);
  const dropoffInputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem('gigCalcHistory');
    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory);
        if (Array.isArray(parsedHistory)) {
          setHistory(parsedHistory);
        }
      } catch (error) {
        console.error('Failed to parse gigCalcHistory from localStorage', error);
      }
    }
    const savedGasPrice = localStorage.getItem('gigCalcGasPrice');
    if (savedGasPrice) setGasPrice(savedGasPrice);
    const savedMpg = localStorage.getItem('gigCalcMpg');
    if (savedMpg) setMpg(savedMpg);
    const savedRecents = localStorage.getItem('gigCalcRecentLocations');
    if (savedRecents) {
      try {
        const parsedRecents = JSON.parse(savedRecents);
        if (Array.isArray(parsedRecents) && parsedRecents.every((item) => typeof item === 'string')) {
          setRecentLocations(parsedRecents);
        }
      } catch (error) {
        console.error('Failed to parse gigCalcRecentLocations from localStorage', error);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('gigCalcGasPrice', gasPrice);
    localStorage.setItem('gigCalcMpg', mpg);
  }, [gasPrice, mpg]);

  useEffect(() => {
    localStorage.setItem('gigCalcHistory', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('gigCalcRecentLocations', JSON.stringify(recentLocations));
  }, [recentLocations]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (storeInputRef.current && !storeInputRef.current.contains(event.target as Node)) setShowStoreSuggestions(false);
      if (dropoffInputRef.current && !dropoffInputRef.current.contains(event.target as Node)) setShowDropoffSuggestions(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const pay = parseFloat(payment) || 0;
    const dist = parseFloat(distance) || 0;
    const price = parseFloat(gasPrice) || 0;
    const vehicleMpg = parseFloat(mpg) || 0;
    const totalGasCost = (dist > 0 && vehicleMpg > 0) ? (dist / vehicleMpg) * price : 0;
    const netEarnings = pay - totalGasCost;
    const earningsPerMile = dist > 0 ? netEarnings / dist : 0;
    setResults({ totalGasCost, netEarnings, earningsPerMile });
  }, [payment, distance, gasPrice, mpg]);

  const addRecentLocation = (loc: string) => {
    if (!loc.trim()) return;
    setRecentLocations((prev) => {
      const filtered = prev.filter((item) => item.toLowerCase() !== loc.toLowerCase());
      return [loc, ...filtered].slice(0, 10);
    });
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

  const calculateRouteWithAI = async () => {
    if (!storeLocation || !dropoffLocation) {
        setGpsError("Missing locations.");
        return;
    }
    addRecentLocation(storeLocation);
    addRecentLocation(dropoffLocation);
    setIsCalculatingRoute(true);
    setGpsError(null);
    setGroundingLinks([]);
    try {
        const position = await new Promise<GeolocationPosition>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej));
        const { latitude: lat, longitude: lng } = position.coords;
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Distance in miles from my location (${lat}, ${lng}) to "${storeLocation}" then to "${dropoffLocation}". Just the number.`,
            config: {
                tools: [{ googleMaps: {} }],
                toolConfig: { retrievalConfig: { latLng: { latitude: lat, longitude: lng } } }
            },
        });
        const textOutput = response.text || "";
        const match = textOutput.match(/(\d+(\.\d+)?)/);
        if (match) setDistance(parseFloat(match[1]).toFixed(2));
        else setGpsError("Couldn't calculate distance precisely.");
        const chunks: unknown[] = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const links: GroundingLink[] = chunks.reduce<GroundingLink[]>((acc, c) => {
          if (typeof c !== 'object' || c === null) return acc;
          const obj = c as Record<string, unknown>;
          const maps = obj.maps as Record<string, unknown> | undefined;
          if (!maps || typeof maps.uri !== 'string') return acc;
          const title = typeof maps.title === 'string' && maps.title.length > 0 ? maps.title : 'Maps Link';
          acc.push({ title, uri: maps.uri });
          return acc;
        }, []);
        setGroundingLinks(links);
    } catch (error: unknown) {
        console.error("AI Route Error:", error);
        let msg = "";
        if (error instanceof Error) {
            const m = error.message;
            if (m.includes("404") || m.includes("not found") || m.includes("Requested entity was not found")) {
                msg = "Model access issue. Use a paid project API key.";
                if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
                    await window.aistudio.openSelectKey();
                }
            } else msg = m || "Calculation failed.";
        } else {
            msg = String(error) || "Route error.";
        }
        setGpsError(msg);
    } finally { setIsCalculatingRoute(false); }
  };

  const handleSaveTrip = () => {
    const newRecord: TripRecord = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), inputs: { payment, distance, gasPrice, mpg }, results };
    setHistory([newRecord, ...history]);
    setPayment(''); setDistance(''); setStoreLocation(''); setDropoffLocation(''); setGroundingLinks([]);
  };

  const LocationSuggestions = ({ items, onSelect, visible }: { items: string[], onSelect: (val: string) => void, visible: boolean }) => {
    if (!visible || items.length === 0) return null;
    return (
      <div className="absolute left-0 right-0 top-full mt-2 bg-surface-container-highest border border-outline-variant/50 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in border-t-0">
        <div className="max-h-48 overflow-y-auto">
          {items.map((loc, idx) => (
            <button key={idx} onMouseDown={(e) => { e.preventDefault(); onSelect(loc); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary/10 text-sm text-on-surface transition-colors border-b border-outline-variant/10 last:border-b-0 text-left">
              <ClockIcon /> <span className="truncate">{loc}</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background text-on-surface font-sans p-4 md:p-8 flex justify-center">
      <div className="w-full max-w-xl space-y-6 pb-16">
        
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-light tracking-tight text-on-surface">GigCalc</h1>
            <p className="text-on-surface-variant text-sm mt-1 uppercase tracking-widest font-bold opacity-60">Optimizer</p>
          </div>
          <button 
            onClick={() => setIsHistoryOpen(true)}
            className="w-14 h-14 rounded-full bg-surface-container-high text-on-surface-variant hover:bg-primary/20 hover:text-primary transition-all duration-300 flex items-center justify-center relative shadow-sm"
          >
            <HistoryIcon />
            {history.length > 0 && <span className="absolute top-3 right-3 h-3 w-3 rounded-full bg-error border-2 border-background"></span>}
          </button>
        </header>

        {/* History Feed - Replacing cumulative dashboard */}
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
                  className="min-w-[160px] snap-start bg-surface-container-high/60 border border-outline-variant/20 rounded-2xl p-4 flex flex-col justify-between hover:bg-surface-container-highest transition-colors"
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
                    <RoadIcon />
                    <span className="text-xs font-medium">{trip.inputs.distance} mi</span>
                  </div>
                  <div className="mt-1 text-[9px] text-on-surface-variant/50 uppercase tracking-tighter">
                    {new Date(trip.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            ) : (
              <div className="w-full flex items-center justify-center border-2 border-dashed border-outline-variant/20 rounded-2xl text-on-surface-variant/40 text-xs italic py-8">
                Your recent trips will appear here
              </div>
            )}
          </div>
        </section>

        {gpsError && (
          <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-2xl text-sm flex items-center animate-shake">
            <span className="mr-3 text-lg">⚠️</span> {gpsError}
          </div>
        )}

        {/* AI Route Planner Card */}
        <div className="bg-surface-container rounded-[32px] p-8 border border-outline-variant/20 shadow-sm space-y-6 relative overflow-hidden group/route">
            <div className="absolute top-0 right-0 p-8 opacity-5 transition-opacity group-hover/route:opacity-10 pointer-events-none">
                <LocationMarkerIcon />
            </div>
            
            <h2 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span> Route Intelligence
            </h2>

            <div className="grid gap-6">
                <div className="relative group" ref={storeInputRef}>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/60 ml-1">Store / Pickup</label>
                        <div className="flex items-center bg-background/50 border border-outline-variant/30 rounded-2xl px-4 h-14 group-focus-within:border-primary/50 transition-all">
                            <StoreIcon />
                            <input type="text" value={storeLocation} onChange={(e) => setStoreLocation(e.target.value)} onFocus={() => setShowStoreSuggestions(true)} placeholder="Name or address" className="ml-3 flex-grow bg-transparent focus:outline-none text-sm" />
                        </div>
                        <LocationSuggestions items={recentLocations.filter(loc => loc.toLowerCase().includes(storeLocation.toLowerCase()))} onSelect={(val) => { setStoreLocation(val); setShowStoreSuggestions(false); }} visible={showStoreSuggestions} />
                    </div>
                </div>

                <div className="relative group" ref={dropoffInputRef}>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/60 ml-1">Drop-off Destination</label>
                        <div className="flex items-center bg-background/50 border border-outline-variant/30 rounded-2xl px-4 h-14 group-focus-within:border-primary/50 transition-all">
                            <FlagIcon />
                            <input type="text" value={dropoffLocation} onChange={(e) => setDropoffLocation(e.target.value)} onFocus={() => setShowDropoffSuggestions(true)} placeholder="Destination address" className="ml-3 flex-grow bg-transparent focus:outline-none text-sm" />
                        </div>
                        <LocationSuggestions items={recentLocations.filter(loc => loc.toLowerCase().includes(dropoffLocation.toLowerCase()))} onSelect={(val) => { setDropoffLocation(val); setShowDropoffSuggestions(false); }} visible={showDropoffSuggestions} />
                    </div>
                </div>
            </div>

            <button onClick={calculateRouteWithAI} disabled={isCalculatingRoute || !storeLocation || !dropoffLocation} className="w-full bg-primary text-on-primary h-14 rounded-2xl font-bold hover:brightness-110 disabled:opacity-30 disabled:grayscale transition-all flex items-center justify-center gap-3 shadow-lg shadow-primary/10">
                {isCalculatingRoute ? <div className="animate-spin h-5 w-5 border-2 border-on-primary border-t-transparent rounded-full" /> : <>✨ Calculate AI Distance</>}
            </button>
            
            {groundingLinks.length > 0 && (
                <div className="flex flex-wrap gap-2 animate-fade-in">
                    {groundingLinks.map((link, i) => (
                        <a key={i} href={link.uri} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold bg-primary/10 text-primary px-3 py-1.5 rounded-full border border-primary/20 hover:bg-primary/20 transition-all">
                            🗺️ {link.title}
                        </a>
                    ))}
                </div>
            )}
        </div>

        {/* Financials and Distance Card */}
        <div className="bg-surface-container rounded-[32px] p-8 border border-outline-variant/20 shadow-sm space-y-8">
            <h2 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">Trip Economics</h2>
            
            <div className="grid gap-6">
                <InputField id="payment" label="Offer Amount" value={payment} onChange={(e) => setPayment(e.target.value)} placeholder="0.00" unit="USD" icon={<DollarIcon />} />
                
                <div className="flex gap-4">
                    <div className="flex-grow">
                        <InputField id="distance" label="Trip Distance" value={distance} onChange={(e) => setDistance(e.target.value)} placeholder="0.0" unit="MI" icon={<RoadIcon />} />
                    </div>
                    <button onClick={toggleTracking} className={`w-20 h-14 mt-6 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1 ${isTracking ? 'bg-error/20 border-error/50 text-error shadow-inner' : 'bg-surface-container-highest/50 border-outline-variant/30 text-on-surface-variant hover:border-primary/50 hover:text-primary'}`}>
                        {isTracking ? <StopIcon /> : <PlayIcon />}
                        <span className="text-[9px] font-bold uppercase">{isTracking ? 'STOP' : 'LIVE'}</span>
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <InputField id="gasPrice" label="Gas Price" value={gasPrice} onChange={(e) => setGasPrice(e.target.value)} placeholder="3.50" unit="GAL" icon={<FuelIcon />} />
                    <InputField id="mpg" label="Efficiency" value={mpg} onChange={(e) => setMpg(e.target.value)} placeholder="25" unit="MPG" icon={<GaugeIcon />} />
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

        <button onClick={handleSaveTrip} disabled={!payment || !distance} className="w-full h-18 bg-on-surface text-background rounded-[32px] font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-20 disabled:grayscale shadow-xl">
            Save Trip Record
        </button>

        <HistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} history={history} onClear={() => { if (window.confirm('Clear history?')) setHistory([]); }} onExport={() => {}} />

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
