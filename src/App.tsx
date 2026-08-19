import { useState, useEffect, useMemo } from 'react';
import { Info, Loader2 } from 'lucide-react';
import { analyzePressure, maxFallingLevel, summarizeConditionCorrelation } from './lib/pressure-analyzer';
import { PressureChart } from './components/PressureChart';
import { SummaryPanel } from './components/SummaryPanel';
import { ConditionSurvey, type SurveyType } from './components/ConditionSurvey';
import { LocationSelector } from './components/LocationSelector';
import { DEFAULT_PLACE, type Place } from './lib/places';
import { isSameDay, startOfToday } from 'date-fns';
import { fetchPressureSeries, getLocalPressureHistory, savePressureToHistory } from './lib/weather-api';
import { UserSelector, type UserType } from './components/UserSelector';
import type { AlertLevel, ConditionSurveyResult, PressureData } from './lib/data-generator';

const SURVEY_STORAGE_KEY = 'user_surveys';
const PLACE_STORAGE_KEY = 'selected_place';

function loadSavedPlace(): Place {
  try {
    const saved = localStorage.getItem(PLACE_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Place;
      if (typeof parsed.lat === 'number' && typeof parsed.lon === 'number' && parsed.name) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_PLACE;
}

function emptySurveys(): Record<UserType, ConditionSurveyResult[]> {
  return { me: [], wife: [] };
}

function App() {
  const [place, setPlace] = useState<Place>(loadSavedPlace);
  const [currentUser, setCurrentUser] = useState<UserType>('me');
  const [currentDate] = useState(() => new Date());
  const [surveysReady, setSurveysReady] = useState(false);
  const [surveyResults, setSurveyResults] = useState<Record<UserType, ConditionSurveyResult[]>>(emptySurveys);
  const [allData, setAllData] = useState<PressureData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isMe = currentUser === 'me';

  const theme = useMemo(() => {
    return isMe
      ? {
        bg: 'bg-slate-50',
        hex: '#3b82f6',
        accentBg: 'bg-blue-50',
        accentText: 'text-blue-500',
        accentBorder: 'border-blue-500',
        headerBg: 'bg-white/60'
      }
      : {
        bg: 'bg-[#fff5f6]',
        hex: '#f43f5e',
        accentBg: 'bg-rose-50',
        accentText: 'text-rose-500',
        accentBorder: 'border-rose-400',
        headerBg: 'bg-white/60'
      };
  }, [isMe]);

  useEffect(() => {
    const saved = localStorage.getItem(SURVEY_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Record<string, Array<Omit<ConditionSurveyResult, 'timestamp'> & { timestamp: string }>>;
        setSurveyResults({
          me: (parsed.me ?? []).map((r) => ({ ...r, timestamp: new Date(r.timestamp) })),
          wife: (parsed.wife ?? []).map((r) => ({ ...r, timestamp: new Date(r.timestamp) })),
        });
      } catch (e) {
        console.error('Failed to load surveys', e);
      }
    }
    setSurveysReady(true);
  }, []);

  useEffect(() => {
    if (!surveysReady) return;
    localStorage.setItem(SURVEY_STORAGE_KEY, JSON.stringify(surveyResults));
  }, [surveyResults, surveysReady]);

  useEffect(() => {
    localStorage.setItem(PLACE_STORAGE_KEY, JSON.stringify(place));
  }, [place]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadData() {
      setIsLoading(true);
      setError(null);
      try {
        const series = await fetchPressureSeries(place.lat, place.lon, controller.signal);
        if (controller.signal.aborted) return;
        savePressureToHistory(place.lat, place.lon, series);
        setAllData(getLocalPressureHistory(place.lat, place.lon));
      } catch (err) {
        if (controller.signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
          return;
        }
        console.error(err);
        const history = getLocalPressureHistory(place.lat, place.lon);
        if (history.length > 0) {
          setAllData(history);
          setError('最新データの取得に失敗しました。履歴を表示しています。');
        } else {
          setError('データの取得に失敗しました。APIキーまたはネットワークを確認してください。');
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadData();
    return () => controller.abort();
  }, [place.lat, place.lon]);

  const analyzedData = useMemo(() => analyzePressure(allData), [allData]);

  const todayData = useMemo(() => {
    const today = startOfToday();
    return analyzedData.filter(d => isSameDay(d.timestamp, today));
  }, [analyzedData]);

  const currentPoint = useMemo(() => {
    if (analyzedData.length === 0) return null;
    const now = Date.now() + 5 * 60 * 1000;
    const pastOrNow = analyzedData.filter((d) => d.timestamp.getTime() <= now);
    if (pastOrNow.length === 0) return analyzedData[0];
    return pastOrNow[pastOrNow.length - 1];
  }, [analyzedData]);

  const todayMaxLevel = useMemo((): AlertLevel => {
    const fallingPeak = maxFallingLevel(todayData);
    const hasRising = todayData.some((d) => d.level === 'rising');
    if (fallingPeak !== 'normal') return fallingPeak;
    return hasRising ? 'rising' : 'normal';
  }, [todayData]);

  const trend = useMemo(() => {
    if (!currentPoint) return 'steady';
    const idx = analyzedData.indexOf(currentPoint);
    if (idx < 1) return 'steady';
    const prev = analyzedData[idx - 1].pressure;
    if (currentPoint.pressure < prev) return 'falling';
    if (currentPoint.pressure > prev) return 'rising';
    return 'steady';
  }, [analyzedData, currentPoint]);

  const correlation = useMemo(
    () => summarizeConditionCorrelation(analyzedData, surveyResults[currentUser]),
    [analyzedData, surveyResults, currentUser],
  );

  const hasPastObservations = useMemo(
    () => allData.some((d) => d.timestamp.getTime() < Date.now() - 2 * 60 * 60 * 1000),
    [allData],
  );

  const handleAddSurveyResult = (type: SurveyType) => {
    const newResult = { timestamp: new Date(), type };
    setSurveyResults((prev) => ({
      ...prev,
      [currentUser]: [...prev[currentUser], newResult],
    }));
  };

  return (
    <div className={`min-h-screen pb-20 transition-all duration-700 ease-in-out ${theme.bg} text-slate-800 font-sans`}>
      <header className={`sticky top-0 z-40 w-full backdrop-blur-xl ${theme.headerBg} border-b border-black/5 transition-colors duration-500`}>
        <div className="max-w-4xl mx-auto px-6 h-auto min-h-[5rem] py-3 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
            <div className={`relative w-10 h-10 flex items-center justify-center`}>
              <div className={`absolute inset-0 border-2 ${theme.accentBorder} rounded-full opacity-20 animate-pulse`}></div>
              <div className={`w-6 h-6 border-4 ${theme.accentBorder} rounded-full flex items-center justify-center transition-colors duration-500`}>
                <div className={`w-1.5 h-1.5 ${isMe ? 'bg-blue-500' : 'bg-rose-500'} rounded-full transition-colors duration-500`}></div>
              </div>
            </div>
            <h1 className="text-xl font-bold tracking-[0.15em] leading-none uppercase text-slate-800 font-mono">
              ATAMAITA <span className="font-light opacity-50">Barometer</span>
            </h1>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div className="w-full sm:w-auto">
              <UserSelector currentUser={currentUser} onUserChange={setCurrentUser} />
            </div>
            <div className="hidden sm:block w-px h-6 bg-slate-200 mx-1"></div>
            <div className="w-full sm:w-auto relative z-50">
              <LocationSelector
                currentLocation={place.name}
                onLocationChange={setPlace}
                accent={isMe ? 'blue' : 'rose'}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {error && (
          <div className="mb-8 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-bold">
            <Info className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <section className="mb-12">
          <div className={`inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full ${theme.accentBg} ${theme.accentText} text-xs font-black uppercase tracking-wider mb-6 transition-all duration-500`}>
            <Info className="w-3.5 h-3.5" />
            <span>Health Advisory: Live Weather Source</span>
          </div>
          <h2 className="text-3xl font-black tracking-tight text-slate-800 mb-4">
            今の天気
          </h2>
        </section>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className={`w-10 h-10 ${isMe ? 'text-blue-500' : 'text-rose-500'} animate-spin transition-colors duration-500`} />
            <p className="text-slate-400 text-sm font-bold animate-pulse">気象データを同期中...</p>
          </div>
        ) : currentPoint ? (
          <>
            {!hasPastObservations && (
              <div className={`mb-8 p-4 ${theme.accentBg} border ${theme.accentBorder}/20 rounded-2xl flex items-center gap-3 text-xs font-bold transition-all duration-500`}>
                <Info className={`w-4 h-4 shrink-0 ${isMe ? 'text-blue-500' : 'text-rose-500'}`} />
                <p>データ蓄積中（この地点の過去観測がまだありません）。現在値と予報を表示しています。</p>
              </div>
            )}
            <SummaryPanel currentData={currentPoint} todayMaxLevel={todayMaxLevel} trend={trend} currentUser={currentUser} />

            <section className="mt-16">
              <h3 className="text-xl font-black text-slate-800 tracking-tight px-2">
                気圧推移・予想
              </h3>
              <PressureChart
                data={analyzedData}
                surveyResults={surveyResults[currentUser]}
                currentDate={currentDate}
                accentColor={theme.hex}
              />
            </section>

            <ConditionSurvey
              onAddResult={handleAddSurveyResult}
              currentUser={currentUser}
              correlation={correlation}
            />
          </>
        ) : (
          <div className="p-12 text-center card-tactile bg-white">
            <p className="text-slate-400 font-bold">データがありません</p>
          </div>
        )}

        <footer className="mt-24 border-t border-slate-100 pt-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2 text-slate-300">
              <Info className="w-4 h-4" />
              <p className="text-[10px] font-black uppercase tracking-[0.1em]">
                Data Source: OpenWeatherMap (Current + 5-Day / 3-Hour Forecast)
              </p>
            </div>
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
              © 2026 ATAMAITA Barometer
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default App;
