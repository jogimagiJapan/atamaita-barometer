import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, ChevronDown, Loader2 } from 'lucide-react';
import { searchCities, type CitySearchResult } from '../lib/weather-api';
import { LOCATION_PRESETS, type Place } from '../lib/places';

interface LocationSelectorProps {
    currentLocation: string;
    onLocationChange: (place: Place) => void;
    accent?: 'blue' | 'rose';
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
    currentLocation,
    onLocationChange,
    accent = 'blue',
}) => {
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<CitySearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const isBlue = accent === 'blue';

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
        const controller = new AbortController();
        const timer = setTimeout(async () => {
            if (searchQuery.length >= 2) {
                setIsLoading(true);
                const results = await searchCities(searchQuery, controller.signal);
                if (!controller.signal.aborted) {
                    setSuggestions(results);
                    setIsLoading(false);
                }
            } else {
                setSuggestions([]);
                setIsLoading(false);
            }
        }, 500);
        return () => {
            controller.abort();
            clearTimeout(timer);
        };
    }, [searchQuery]);

    const handleSelectCity = (city: CitySearchResult) => {
        onLocationChange({
            name: city.local_names?.ja || city.name,
            lat: city.lat,
            lon: city.lon,
        });
        setIsSearchOpen(false);
        setSearchQuery('');
    };

    const iconWrap = isBlue ? 'bg-blue-50 group-hover:bg-blue-100' : 'bg-rose-50 group-hover:bg-rose-100';
    const iconColor = isBlue ? 'text-blue-500' : 'text-rose-500';
    const focusRing = isBlue ? 'focus:ring-blue-500' : 'focus:ring-rose-500';
    const suggestionLabel = isBlue ? 'text-blue-500' : 'text-rose-500';
    const suggestionHover = isBlue ? 'hover:bg-blue-50' : 'hover:bg-rose-50';
    const selectedPreset = isBlue ? 'bg-blue-50 text-blue-600 font-bold' : 'bg-rose-50 text-rose-600 font-bold';

    return (
        <div className="relative" ref={wrapperRef}>
            <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="flex items-center gap-2 pl-2 pr-4 py-2 rounded-2xl bg-white ring-1 ring-black/5 hover:shadow-md transition-all group"
            >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${iconWrap}`}>
                    <MapPin className={`w-4 h-4 ${iconColor}`} />
                </div>
                <span className="text-sm font-bold text-slate-700 max-w-[100px] truncate">{currentLocation}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isSearchOpen ? 'rotate-180' : ''}`} />
            </button>

            {isSearchOpen && (
                <div className="absolute top-full right-0 mt-3 w-80 bg-white/95 backdrop-blur-xl ring-1 ring-black/10 rounded-3xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    <div className="p-4 border-b border-slate-100">
                        <div className="flex items-center gap-2 mb-2">
                            <Search className="w-4 h-4 text-slate-400" />
                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">地点を検索</span>
                        </div>
                        <div className="relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="例: 渋谷 (入力して検索)"
                                className={`w-full bg-slate-100 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 ${focusRing} outline-none placeholder:text-slate-400`}
                                autoFocus
                            />
                            {isLoading && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <Loader2 className={`w-4 h-4 ${iconColor} animate-spin`} />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto overscroll-contain">
                        {suggestions.length > 0 && (
                            <div className="p-2 border-b border-slate-100">
                                <p className={`px-4 py-2 text-xs font-bold uppercase tracking-wider ${suggestionLabel}`}>検索結果</p>
                                {suggestions.map((city, idx) => (
                                    <button
                                        key={`${city.lat}-${city.lon}-${idx}`}
                                        onClick={() => handleSelectCity(city)}
                                        className={`w-full text-left px-4 py-3 text-sm rounded-xl ${suggestionHover} text-slate-700 transition-colors flex flex-col`}
                                    >
                                        <span className="font-bold">{city.local_names?.ja || city.name}</span>
                                        <span className="text-xs text-slate-400">{city.state ? `${city.state}, ` : ''}{city.country}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="p-2">
                            <p className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">よく使う地点</p>
                            {LOCATION_PRESETS.map((city) => (
                                <button
                                    key={city.name}
                                    onClick={() => {
                                        onLocationChange(city);
                                        setIsSearchOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-3 text-sm rounded-xl transition-all ${currentLocation === city.name
                                        ? selectedPreset
                                        : 'text-slate-600 hover:bg-slate-50'
                                        }`}
                                >
                                    {city.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
