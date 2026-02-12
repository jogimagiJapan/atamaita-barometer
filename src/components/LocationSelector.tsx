import React, { useState } from 'react';
import { Search, MapPin, ChevronDown } from 'lucide-react';

interface LocationSelectorProps {
    currentLocation: string;
    onLocationChange: (loc: string) => void;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({ currentLocation, onLocationChange }) => {
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const cities = ['大阪市中央区', '東京都千代田区', '名古屋市中区', '福岡市中央区', '札幌市中央区'];

    return (
        <div className="relative">
            <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="flex items-center gap-2 pl-2 pr-4 py-2 rounded-2xl bg-white dark:bg-slate-900 ring-1 ring-black/5 dark:ring-white/10 hover:shadow-md transition-all group"
            >
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    <MapPin className="w-4 h-4 text-blue-500" />
                </div>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{currentLocation}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isSearchOpen ? 'rotate-180' : ''}`} />
            </button>

            {isSearchOpen && (
                <div className="absolute top-full right-0 mt-3 w-72 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 rounded-3xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                        <Search className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Select Location</span>
                    </div>
                    <div className="p-2">
                        {cities.map(city => (
                            <button
                                key={city}
                                onClick={() => {
                                    onLocationChange(city);
                                    setIsSearchOpen(false);
                                }}
                                className={`w-full text-left px-4 py-3 text-sm rounded-2xl transition-all ${currentLocation === city
                                        ? 'bg-blue-50 text-blue-600 font-bold dark:bg-blue-900/20'
                                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                    }`}
                            >
                                {city}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
