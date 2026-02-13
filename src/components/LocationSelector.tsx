import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, ChevronDown, Loader2 } from 'lucide-react';
import { searchCities, type CitySearchResult } from '../lib/weather-api';

interface LocationSelectorProps {
    currentLocation: string;
    onLocationChange: (city: string, lat?: number, lon?: number) => void;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({ currentLocation, onLocationChange }) => {
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<CitySearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const presets = ['大阪市中央区', '東京都千代田区', '名古屋市中区', '福岡市中央区', '札幌市中央区'];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsSearchOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.length >= 2) {
                setIsLoading(true);
                const results = await searchCities(searchQuery);
                setSuggestions(results);
                setIsLoading(false);
            } else {
                setSuggestions([]);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleSelectCity = (city: CitySearchResult) => {
        // Pass the API-friendly name to ensure forecast lookup works 
        onLocationChange(`${city.name},${city.country}`, city.lat, city.lon);
        setIsSearchOpen(false);
        setSearchQuery('');
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="flex items-center gap-2 pl-2 pr-4 py-2 rounded-2xl bg-white ring-1 ring-black/5 hover:shadow-md transition-all group"
            >
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    <MapPin className="w-4 h-4 text-blue-500" />
                </div>
                <span className="text-sm font-bold text-slate-700 max-w-[100px] truncate">{currentLocation}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isSearchOpen ? 'rotate-180' : ''}`} />
            </button>

            {isSearchOpen && (
                <div className="absolute top-full right-0 mt-3 w-80 bg-white/95 backdrop-blur-xl ring-1 ring-black/10 rounded-3xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    <div className="p-4 border-b border-slate-100">
                        <div className="flex items-center gap-2 mb-2">
                            <Search className="w-4 h-4 text-slate-400" />
                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Type to Search</span>
                        </div>
                        <div className="relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="例: 渋谷 (入力して検索)"
                                className="w-full bg-slate-100 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400"
                                autoFocus
                            />
                            {isLoading && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto overscroll-contain">
                        {suggestions.length > 0 && (
                            <div className="p-2 border-b border-slate-100">
                                <p className="px-4 py-2 text-xs font-bold text-blue-500 uppercase tracking-wider">Suggestions</p>
                                {suggestions.map((city, idx) => (
                                    <button
                                        key={`${city.lat}-${city.lon}-${idx}`}
                                        onClick={() => handleSelectCity(city)}
                                        className="w-full text-left px-4 py-3 text-sm rounded-xl hover:bg-blue-50 text-slate-700 transition-colors flex flex-col"
                                    >
                                        <span className="font-bold">{city.local_names?.ja || city.name}</span>
                                        <span className="text-xs text-slate-400">{city.state ? `${city.state}, ` : ''}{city.country}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="p-2">
                            <p className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Presets</p>
                            {presets.map(city => (
                                <button
                                    key={city}
                                    onClick={() => {
                                        onLocationChange(city);
                                        setIsSearchOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-3 text-sm rounded-xl transition-all ${currentLocation === city
                                        ? 'bg-blue-50 text-blue-600 font-bold'
                                        : 'text-slate-600 hover:bg-slate-50'
                                        }`}
                                >
                                    {city}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
