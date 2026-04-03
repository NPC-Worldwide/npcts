import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// ---- Types ----

export interface RepeaterResult {
    callsign: string;
    frequency: string;
    offset: string;
    tone: string;
    mode: string;
    city: string;
    state: string;
    county: string;
    lat: number;
    lng: number;
    use: string;
    operational_status: string;
    distance?: number;
}

export interface APRSStation {
    name: string;
    lat: number;
    lng: number;
    lasttime: number;
    symbol: string;
    comment: string;
    speed?: number;
    course?: number;
    altitude?: number;
    path?: string;
}

export interface QSOEntry {
    id: string;
    callsign: string;
    frequency: string;
    mode: string;
    rstSent: string;
    rstRcvd: string;
    date: string;
    time: string;
    notes: string;
    band: string;
}

export interface SolarData {
    sfi: string;
    sunspots: string;
    aindex: string;
    kindex: string;
    xray: string;
    heliumline: string;
    protonflux: string;
    electonflux: string;
    aurora: string;
    normalization: string;
    latdegree: string;
    solarwind: string;
    magneticfield: string;
    updated: string;
    conditions: { band: string; day: string; night: string }[];
}

export type RadioTab = 'repeaters' | 'aprs' | 'propagation' | 'log' | 'frequencies' | 'connect' | 'tools';

// ---- Band data ----

export const HAM_BANDS = [
    { name: '160m', startMHz: 1.8, endMHz: 2.0, service: 'HF — Night DX', color: '#ef4444' },
    { name: '80m', startMHz: 3.5, endMHz: 4.0, service: 'HF — Regional night', color: '#f59e0b' },
    { name: '40m', startMHz: 7.0, endMHz: 7.3, service: 'HF — Day/night, DX', color: '#84cc16' },
    { name: '20m', startMHz: 14.0, endMHz: 14.35, service: 'HF — Primary DX', color: '#06b6d4' },
    { name: '15m', startMHz: 21.0, endMHz: 21.45, service: 'HF — Solar dependent', color: '#8b5cf6' },
    { name: '10m', startMHz: 28.0, endMHz: 29.7, service: 'HF — DX/local', color: '#d946ef' },
    { name: '6m', startMHz: 50.0, endMHz: 54.0, service: 'VHF — Magic band', color: '#ec4899' },
    { name: '2m', startMHz: 144.0, endMHz: 148.0, service: 'VHF — Local/repeater', color: '#f43f5e' },
    { name: '70cm', startMHz: 420.0, endMHz: 450.0, service: 'UHF — Digital/repeater', color: '#38bdf8' },
    { name: '23cm', startMHz: 1240.0, endMHz: 1300.0, service: 'UHF — Satellite/mesh', color: '#c084fc' },
];

export const EMERGENCY_FREQS = [
    { freq: 121.5, name: 'Aviation Distress', mode: 'AM' },
    { freq: 156.8, name: 'Marine Ch.16', mode: 'FM' },
    { freq: 146.52, name: '2m Simplex Call', mode: 'FM' },
    { freq: 446.0, name: '70cm Simplex Call', mode: 'FM' },
    { freq: 14.3, name: 'SHARES HF', mode: 'USB' },
    { freq: 7.24, name: 'ARES 40m', mode: 'LSB' },
    { freq: 3.9935, name: 'ARES 80m', mode: 'LSB' },
    { freq: 27.065, name: 'CB Ch.9 Emergency', mode: 'AM' },
    { freq: 27.185, name: 'CB Ch.19 Highway', mode: 'AM' },
    { freq: 151.82, name: 'MURS 1', mode: 'FM' },
    { freq: 462.5625, name: 'GMRS Ch.1', mode: 'FM' },
    { freq: 462.675, name: 'FRS/GMRS Ch.7', mode: 'FM' },
];

export const DIGITAL_MODES = [
    { name: 'Meshtastic', desc: 'LoRa mesh, 915MHz ISM, no license', use: 'Off-grid text + GPS', connect: 'USB serial or Bluetooth', url: 'https://meshtastic.org', webApp: 'https://client.meshtastic.org' },
    { name: 'Winlink', desc: 'Email over HF/VHF', use: 'Email without internet', connect: 'VARA modem + radio', url: 'https://winlink.org', webApp: 'https://cms.winlink.org' },
    { name: 'JS8Call', desc: 'HF weak-signal keyboard chat', use: 'Store-and-forward messaging', connect: 'Sound card + HF radio', url: 'http://js8call.com' },
    { name: 'APRS', desc: '144.39 MHz packet', use: 'Position, messaging, weather', connect: 'TNC or Direwolf sound modem', url: 'https://aprs.fi', webApp: 'https://aprs.fi' },
    { name: 'DMR', desc: 'Digital voice, talkgroups', use: 'Worldwide repeater linking', connect: 'DMR radio + hotspot', url: 'https://brandmeister.network', webApp: 'https://hose.brandmeister.network' },
    { name: 'AREDN', desc: '5GHz mesh network', use: 'High-bandwidth emergency data', connect: 'Modified WiFi hardware', url: 'https://www.arednmesh.org' },
    { name: 'FT8', desc: 'Weak signal 15s cycles', use: 'DX with low power', connect: 'WSJT-X + sound card', url: 'https://wsjt.sourceforge.io/wsjtx.html', webApp: 'https://pskreporter.info/pskmap.html' },
    { name: 'VARA FM', desc: 'VHF data modem', use: 'High-speed Winlink', connect: 'Sound card + FM radio', url: 'https://rosmodem.wordpress.com' },
    { name: 'Packet/AX.25', desc: 'Classic digital packet', use: 'BBS, nodes, digipeating', connect: 'TNC or Direwolf', url: 'https://github.com/wb2osz/direwolf' },
    { name: 'FreeDV', desc: 'Open-source digital voice', use: 'HF digital voice', connect: 'Sound card + HF radio', url: 'https://freedv.org' },
    { name: 'WebSDR', desc: 'Listen to HF/VHF online', use: 'Monitor bands without hardware', connect: 'Web browser only', url: 'http://websdr.org', webApp: 'http://websdr.ewi.utwente.nl:8901' },
    { name: 'KiwiSDR', desc: 'Web-based SDR receivers worldwide', use: 'Remote HF listening + WSPR', connect: 'Web browser only', url: 'http://kiwisdr.com/public/', webApp: 'http://kiwisdr.com/public/' },
];

// ---- Props ----

export interface RadioPaneProps {
    className?: string;
    onClose?: () => void;
    /** Proxy fetch that bypasses CORS — (url, options?) => Promise<{ ok, status, data }> */
    fetchFn?: (url: string, options?: any) => Promise<{ ok: boolean; status: number; data: any; error?: string }>;
    /** List available serial ports */
    listPortsFn?: () => Promise<{ path: string; manufacturer?: string }[]>;
}

// ---- Component ----

export const RadioPane: React.FC<RadioPaneProps> = ({ className, onClose, fetchFn, listPortsFn }) => {
    // Use proxy fetch if provided, fall back to browser fetch with JSON parse
    const doFetch = useCallback(async (url: string, options?: any): Promise<{ ok: boolean; status: number; data: any; error?: string }> => {
        if (fetchFn) return fetchFn(url, options);
        try {
            const resp = await fetch(url, options);
            const ct = resp.headers.get('content-type') || '';
            const data = ct.includes('json') ? await resp.json() : await resp.text();
            return { ok: resp.ok, status: resp.status, data };
        } catch (err: any) {
            return { ok: false, status: 0, data: null, error: err.message };
        }
    }, [fetchFn]);
    const [activeTab, setActiveTab] = useState<RadioTab>('repeaters');
    const [searchQuery, setSearchQuery] = useState('');

    // Repeater state
    const [repeaterSearch, setRepeaterSearch] = useState({ lat: '', lng: '', distance: '25', band: '' });
    const [repeaterResults, setRepeaterResults] = useState<RepeaterResult[]>([]);
    const [repeaterLoading, setRepeaterLoading] = useState(false);
    const [repeaterError, setRepeaterError] = useState('');
    const [useCurrentLocation, setUseCurrentLocation] = useState(false);

    // APRS state
    const [aprsCallsign, setAprsCallsign] = useState('');
    const [aprsResults, setAprsResults] = useState<APRSStation[]>([]);
    const [aprsLoading, setAprsLoading] = useState(false);
    const [aprsTracking, setAprsTracking] = useState<string[]>([]);
    const aprsInterval = useRef<any>(null);

    // Propagation state
    const [solarData, setSolarData] = useState<SolarData | null>(null);
    const [solarLoading, setSolarLoading] = useState(false);

    // QSO Log state
    const [qsoLog, setQsoLog] = useState<QSOEntry[]>(() => {
        try { return JSON.parse(localStorage.getItem('cartoglyph_qso_log') || '[]'); } catch { return []; }
    });
    const [newQso, setNewQso] = useState<Partial<QSOEntry>>({ mode: 'SSB', rstSent: '59', rstRcvd: '59' });

    // Connection state
    const [serialPorts, setSerialPorts] = useState<string[]>([]);
    const [selectedPort, setSelectedPort] = useState('');
    const [baudRate, setBaudRate] = useState('9600');
    const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
    const [rigType, setRigType] = useState('none');
    const [rigFrequency, setRigFrequency] = useState('');
    const [rigMode, setRigMode] = useState('');

    // Save QSO log to localStorage
    useEffect(() => {
        localStorage.setItem('cartoglyph_qso_log', JSON.stringify(qsoLog));
    }, [qsoLog]);

    // ---- Repeater search via RepeaterBook API ----
    const searchRepeaters = useCallback(async () => {
        const lat = repeaterSearch.lat || '0';
        const lng = repeaterSearch.lng || '0';
        if (!lat || !lng) { setRepeaterError('Enter coordinates or use current location'); return; }
        setRepeaterLoading(true);
        setRepeaterError('');
        try {
            // RepeaterBook API (proxied or direct)
            const url = `https://www.repeaterbook.com/api/export.php?lat=${lat}&lng=${lng}&distance=${repeaterSearch.distance}&band=${repeaterSearch.band}`;
            const resp = await doFetch(url);
            if (!resp.ok) throw new Error(resp.error || `API returned ${resp.status}`);
            const data = typeof resp.data === 'string' ? JSON.parse(resp.data) : resp.data;
            const results = (data.results || data || []).map((r: any) => ({
                callsign: r.Callsign || r.callsign || '',
                frequency: r.Frequency || r.frequency || '',
                offset: r.Input_Freq || r.offset || '',
                tone: r.PL || r.tone || '',
                mode: r.FM_Analog || r.mode || 'FM',
                city: r.Nearest_City || r.city || '',
                state: r.State || r.state || '',
                county: r.County || r.county || '',
                lat: parseFloat(r.Lat || r.lat || 0),
                lng: parseFloat(r.Long || r.lng || 0),
                use: r.Use || r.use || 'OPEN',
                operational_status: r.Operational_Status || r.status || '',
                distance: r.Distance ? parseFloat(r.Distance) : undefined,
            }));
            setRepeaterResults(results);
            if (results.length === 0) setRepeaterError('No repeaters found in range');
        } catch (err: any) {
            setRepeaterError(`Search failed: ${err.message}. Try a CORS proxy or check the API.`);
        } finally {
            setRepeaterLoading(false);
        }
    }, [repeaterSearch]);

    const getLocation = useCallback(() => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(pos => {
            setRepeaterSearch(prev => ({ ...prev, lat: pos.coords.latitude.toFixed(4), lng: pos.coords.longitude.toFixed(4) }));
            setUseCurrentLocation(true);
        });
    }, []);

    // ---- APRS tracking via aprs.fi ----
    const searchAPRS = useCallback(async (callsign?: string) => {
        const cs = callsign || aprsCallsign;
        if (!cs.trim()) return;
        setAprsLoading(true);
        try {
            // aprs.fi API (needs API key in production — using public endpoint)
            const resp = await doFetch(`https://api.aprs.fi/api/get?name=${encodeURIComponent(cs)}&what=loc&apikey=0&format=json`);
            const data = typeof resp.data === 'string' ? JSON.parse(resp.data) : resp.data;
            if (data?.entries) {
                setAprsResults(prev => {
                    const existing = new Map(prev.map(s => [s.name, s]));
                    data.entries.forEach((e: any) => {
                        existing.set(e.name, {
                            name: e.name,
                            lat: parseFloat(e.lat),
                            lng: parseFloat(e.lng),
                            lasttime: parseInt(e.lasttime),
                            symbol: e.symbol || '',
                            comment: e.comment || '',
                            speed: e.speed ? parseFloat(e.speed) : undefined,
                            course: e.course ? parseFloat(e.course) : undefined,
                            altitude: e.altitude ? parseFloat(e.altitude) : undefined,
                            path: e.path || '',
                        });
                    });
                    return Array.from(existing.values());
                });
            }
        } catch (err) {
            console.error('APRS fetch error:', err);
        } finally {
            setAprsLoading(false);
        }
    }, [aprsCallsign]);

    const toggleTracking = useCallback((callsign: string) => {
        setAprsTracking(prev => {
            if (prev.includes(callsign)) {
                return prev.filter(c => c !== callsign);
            } else {
                return [...prev, callsign];
            }
        });
    }, []);

    // Auto-refresh tracked stations
    useEffect(() => {
        if (aprsTracking.length === 0) {
            if (aprsInterval.current) clearInterval(aprsInterval.current);
            return;
        }
        aprsInterval.current = setInterval(() => {
            aprsTracking.forEach(cs => searchAPRS(cs));
        }, 60000); // Every 60s
        return () => { if (aprsInterval.current) clearInterval(aprsInterval.current); };
    }, [aprsTracking, searchAPRS]);

    // ---- Live propagation data ----
    const fetchPropagation = useCallback(async () => {
        setSolarLoading(true);
        try {
            const resp = await doFetch('https://www.hamqsl.com/solarxml.php');
            if (!resp.ok) throw new Error(resp.error || `HTTP ${resp.status}`);
            const text = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data);
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/xml');
            const solar = doc.querySelector('solardata');
            if (solar) {
                const get = (tag: string) => solar.querySelector(tag)?.textContent || '';
                const bands: { band: string; day: string; night: string }[] = [];
                solar.querySelectorAll('calculatedconditions band').forEach(b => {
                    bands.push({
                        band: b.getAttribute('name') || '',
                        day: b.getAttribute('time') === 'day' ? (b.textContent || '') : bands.find(x => x.band === b.getAttribute('name'))?.day || '',
                        night: b.getAttribute('time') === 'night' ? (b.textContent || '') : '',
                    });
                });
                // Merge day/night for same band
                const merged: Record<string, { band: string; day: string; night: string }> = {};
                solar.querySelectorAll('calculatedconditions band').forEach(b => {
                    const name = b.getAttribute('name') || '';
                    const time = b.getAttribute('time') || '';
                    if (!merged[name]) merged[name] = { band: name, day: '', night: '' };
                    if (time === 'day') merged[name].day = b.textContent || '';
                    else merged[name].night = b.textContent || '';
                });

                setSolarData({
                    sfi: get('solarflux'), sunspots: get('sunspots'), aindex: get('aindex'), kindex: get('kindex'),
                    xray: get('xray'), heliumline: get('heliumline'), protonflux: get('protonflux'),
                    electonflux: get('electonflux'), aurora: get('aurora'), normalization: get('normalization'),
                    latdegree: get('latdegree'), solarwind: get('solarwind'), magneticfield: get('magneticfield'),
                    updated: get('updated'),
                    conditions: Object.values(merged),
                });
            }
        } catch (err) {
            console.error('Propagation fetch error:', err);
        } finally {
            setSolarLoading(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'propagation' && !solarData) fetchPropagation();
    }, [activeTab, solarData, fetchPropagation]);

    // ---- QSO Logging ----
    const addQso = useCallback(() => {
        if (!newQso.callsign?.trim()) return;
        const entry: QSOEntry = {
            id: `qso_${Date.now()}`,
            callsign: newQso.callsign?.toUpperCase() || '',
            frequency: newQso.frequency || rigFrequency || '',
            mode: newQso.mode || rigMode || 'SSB',
            rstSent: newQso.rstSent || '59',
            rstRcvd: newQso.rstRcvd || '59',
            date: new Date().toISOString().split('T')[0],
            time: new Date().toISOString().split('T')[1].substring(0, 5),
            notes: newQso.notes || '',
            band: newQso.band || '',
        };
        setQsoLog(prev => [entry, ...prev]);
        setNewQso({ mode: newQso.mode, rstSent: '59', rstRcvd: '59' });
    }, [newQso, rigFrequency, rigMode]);

    const exportADIF = useCallback(() => {
        let adif = 'ADIF Export from Incognide Radio\n<EOH>\n\n';
        qsoLog.forEach(q => {
            adif += `<CALL:${q.callsign.length}>${q.callsign}`;
            adif += `<QSO_DATE:8>${q.date.replace(/-/g, '')}`;
            adif += `<TIME_ON:4>${q.time.replace(':', '')}`;
            adif += `<FREQ:${q.frequency.length}>${q.frequency}`;
            adif += `<MODE:${q.mode.length}>${q.mode}`;
            adif += `<RST_SENT:${q.rstSent.length}>${q.rstSent}`;
            adif += `<RST_RCVD:${q.rstRcvd.length}>${q.rstRcvd}`;
            if (q.band) adif += `<BAND:${q.band.length}>${q.band}`;
            if (q.notes) adif += `<COMMENT:${q.notes.length}>${q.notes}`;
            adif += '<EOR>\n\n';
        });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([adif], { type: 'text/plain' }));
        a.download = `qso_log_${new Date().toISOString().split('T')[0]}.adi`;
        a.click();
    }, [qsoLog]);

    // ---- Serial port listing (Electron) ----
    const listPorts = useCallback(async () => {
        try {
            const ports = listPortsFn ? await listPortsFn() : await (window as any).api?.listSerialPorts?.();
            if (Array.isArray(ports)) setSerialPorts(ports.map((p: any) => p.path || p));
        } catch { /* serial not available */ }
    }, []);

    useEffect(() => {
        if (activeTab === 'connect') listPorts();
    }, [activeTab, listPorts]);

    const connectRig = useCallback(async () => {
        if (!selectedPort) return;
        setConnectionStatus('connecting');
        try {
            const result = await (window as any).api?.connectRadio?.({ port: selectedPort, baudRate: parseInt(baudRate), rigType });
            if (result?.success) {
                setConnectionStatus('connected');
                setRigFrequency(result.frequency || '');
                setRigMode(result.mode || '');
            } else {
                setConnectionStatus('disconnected');
            }
        } catch {
            setConnectionStatus('disconnected');
        }
    }, [selectedPort, baudRate, rigType]);

    // ---- Helpers ----
    const condColor = (c: string) => {
        const l = c.toLowerCase();
        return l.includes('good') ? '#10b981' : l.includes('fair') ? '#eab308' : '#ef4444';
    };

    const s = (css: Record<string, any>) => css as React.CSSProperties;

    return (
        <div className={className} style={s({ display: 'flex', flexDirection: 'column', height: '100%', background: '#0f172a', color: '#e2e8f0', fontSize: '0.8rem' })}>
            {/* Tabs */}
            <div style={s({ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '4px 8px', gap: 2, background: '#1e293b', flexWrap: 'wrap' })}>
                {([
                    ['repeaters', 'Repeaters'], ['aprs', 'APRS'], ['propagation', 'Propagation'],
                    ['log', 'QSO Log'], ['frequencies', 'Frequencies'], ['connect', 'Connect'], ['tools', 'Digital Modes'],
                ] as [RadioTab, string][]).map(([tab, label]) => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                        style={s({ padding: '5px 10px', borderRadius: 4, fontSize: '0.7rem', border: 'none', cursor: 'pointer',
                            background: activeTab === tab ? '#059669' : 'transparent', color: activeTab === tab ? '#fff' : '#94a3b8' })}>
                        {label}
                    </button>
                ))}
                {connectionStatus === 'connected' && (
                    <span style={s({ marginLeft: 'auto', fontSize: '0.65rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 })}>
                        ● Connected {rigFrequency && `— ${rigFrequency} MHz ${rigMode}`}
                    </span>
                )}
            </div>

            <div style={s({ flex: 1, overflow: 'auto', padding: 12 })}>

                {/* ===== REPEATERS ===== */}
                {activeTab === 'repeaters' && (
                    <div>
                        <div style={s({ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 12, flexWrap: 'wrap' })}>
                            <div>
                                <label style={s({ fontSize: '0.65rem', color: '#64748b', display: 'block', marginBottom: 2 })}>Latitude</label>
                                <input value={repeaterSearch.lat} onChange={e => setRepeaterSearch(p => ({ ...p, lat: e.target.value }))}
                                    placeholder="40.7128" style={s({ padding: '4px 8px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0', fontSize: '0.75rem', width: 90 })} />
                            </div>
                            <div>
                                <label style={s({ fontSize: '0.65rem', color: '#64748b', display: 'block', marginBottom: 2 })}>Longitude</label>
                                <input value={repeaterSearch.lng} onChange={e => setRepeaterSearch(p => ({ ...p, lng: e.target.value }))}
                                    placeholder="-74.006" style={s({ padding: '4px 8px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0', fontSize: '0.75rem', width: 90 })} />
                            </div>
                            <div>
                                <label style={s({ fontSize: '0.65rem', color: '#64748b', display: 'block', marginBottom: 2 })}>Range (mi)</label>
                                <input value={repeaterSearch.distance} onChange={e => setRepeaterSearch(p => ({ ...p, distance: e.target.value }))}
                                    style={s({ padding: '4px 8px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0', fontSize: '0.75rem', width: 50 })} />
                            </div>
                            <div>
                                <label style={s({ fontSize: '0.65rem', color: '#64748b', display: 'block', marginBottom: 2 })}>Band</label>
                                <select value={repeaterSearch.band} onChange={e => setRepeaterSearch(p => ({ ...p, band: e.target.value }))}
                                    style={s({ padding: '4px 8px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0', fontSize: '0.75rem' })}>
                                    <option value="">All</option>
                                    <option value="29">29 MHz</option>
                                    <option value="50">6m</option>
                                    <option value="144">2m</option>
                                    <option value="222">1.25m</option>
                                    <option value="440">70cm</option>
                                    <option value="902">33cm</option>
                                    <option value="1240">23cm</option>
                                </select>
                            </div>
                            <button onClick={getLocation} style={s({ padding: '4px 10px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#06b6d4', fontSize: '0.7rem', cursor: 'pointer' })}>
                                📍 My Location
                            </button>
                            <button onClick={searchRepeaters} disabled={repeaterLoading}
                                style={s({ padding: '5px 14px', borderRadius: 4, border: 'none', background: '#059669', color: '#fff', fontSize: '0.75rem', cursor: 'pointer', opacity: repeaterLoading ? 0.5 : 1 })}>
                                {repeaterLoading ? 'Searching...' : 'Search'}
                            </button>
                        </div>
                        {repeaterError && <div style={s({ color: '#f59e0b', fontSize: '0.7rem', marginBottom: 8 })}>{repeaterError}</div>}
                        {repeaterResults.length > 0 && (
                            <table style={s({ width: '100%', fontSize: '0.7rem', borderCollapse: 'collapse' })}>
                                <thead><tr style={s({ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#64748b' })}>
                                    <th style={s({ textAlign: 'left', padding: '4px 6px' })}>Callsign</th>
                                    <th style={s({ textAlign: 'left', padding: '4px 6px' })}>Freq</th>
                                    <th style={s({ textAlign: 'left', padding: '4px 6px' })}>Offset</th>
                                    <th style={s({ textAlign: 'left', padding: '4px 6px' })}>Tone</th>
                                    <th style={s({ textAlign: 'left', padding: '4px 6px' })}>City</th>
                                    <th style={s({ textAlign: 'left', padding: '4px 6px' })}>Use</th>
                                    <th style={s({ textAlign: 'right', padding: '4px 6px' })}>Dist</th>
                                </tr></thead>
                                <tbody>
                                    {repeaterResults.map((r, i) => (
                                        <tr key={i} style={s({ borderBottom: '1px solid rgba(255,255,255,0.04)' })}>
                                            <td style={s({ padding: '4px 6px', fontWeight: 600, color: '#06b6d4' })}>{r.callsign}</td>
                                            <td style={s({ padding: '4px 6px', fontFamily: 'monospace' })}>{r.frequency}</td>
                                            <td style={s({ padding: '4px 6px', fontFamily: 'monospace', color: '#94a3b8' })}>{r.offset}</td>
                                            <td style={s({ padding: '4px 6px', color: '#94a3b8' })}>{r.tone}</td>
                                            <td style={s({ padding: '4px 6px' })}>{r.city}, {r.state}</td>
                                            <td style={s({ padding: '4px 6px', color: r.use === 'OPEN' ? '#10b981' : '#f59e0b' })}>{r.use}</td>
                                            <td style={s({ padding: '4px 6px', textAlign: 'right', color: '#94a3b8' })}>{r.distance?.toFixed(1)} mi</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                        {repeaterResults.length === 0 && !repeaterLoading && !repeaterError && (
                            <div style={s({ color: '#64748b', textAlign: 'center', marginTop: 40 })}>
                                Enter coordinates and search to find nearby repeaters via RepeaterBook
                            </div>
                        )}
                    </div>
                )}

                {/* ===== APRS ===== */}
                {activeTab === 'aprs' && (
                    <div>
                        <div style={s({ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'flex-end' })}>
                            <div style={s({ flex: 1 })}>
                                <label style={s({ fontSize: '0.65rem', color: '#64748b', display: 'block', marginBottom: 2 })}>Callsign / SSID</label>
                                <input value={aprsCallsign} onChange={e => setAprsCallsign(e.target.value.toUpperCase())}
                                    onKeyDown={e => e.key === 'Enter' && searchAPRS()}
                                    placeholder="W1AW-9" style={s({ width: '100%', padding: '4px 8px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0', fontSize: '0.75rem' })} />
                            </div>
                            <button onClick={() => searchAPRS()} disabled={aprsLoading}
                                style={s({ padding: '5px 14px', borderRadius: 4, border: 'none', background: '#059669', color: '#fff', fontSize: '0.75rem', cursor: 'pointer' })}>
                                {aprsLoading ? '...' : 'Lookup'}
                            </button>
                        </div>
                        {aprsTracking.length > 0 && (
                            <div style={s({ marginBottom: 8, fontSize: '0.65rem', color: '#10b981' })}>
                                Tracking: {aprsTracking.join(', ')} (auto-refresh 60s)
                            </div>
                        )}
                        {aprsResults.length > 0 && (
                            <div style={s({ display: 'flex', flexDirection: 'column', gap: 4 })}>
                                {aprsResults.map((st, i) => (
                                    <div key={i} style={s({ padding: '8px 12px', borderRadius: 6, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' })}>
                                        <div style={s({ display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}>
                                            <span style={s({ fontWeight: 600, color: '#06b6d4' })}>{st.name}</span>
                                            <div style={s({ display: 'flex', gap: 4 })}>
                                                <button onClick={() => toggleTracking(st.name)}
                                                    style={s({ padding: '2px 8px', borderRadius: 4, border: 'none', fontSize: '0.65rem', cursor: 'pointer',
                                                        background: aprsTracking.includes(st.name) ? '#059669' : 'rgba(255,255,255,0.1)', color: '#fff' })}>
                                                    {aprsTracking.includes(st.name) ? 'Tracking' : 'Track'}
                                                </button>
                                            </div>
                                        </div>
                                        <div style={s({ fontSize: '0.7rem', color: '#94a3b8', marginTop: 4 })}>
                                            <span style={s({ fontFamily: 'monospace' })}>{st.lat.toFixed(4)}, {st.lng.toFixed(4)}</span>
                                            {st.speed != null && st.speed > 0 && <span> · {st.speed} km/h</span>}
                                            {st.altitude != null && <span> · {st.altitude}m alt</span>}
                                        </div>
                                        {st.comment && <div style={s({ fontSize: '0.7rem', color: '#64748b', marginTop: 2 })}>{st.comment}</div>}
                                        <div style={s({ fontSize: '0.6rem', color: '#475569', marginTop: 2 })}>
                                            Last heard: {new Date(st.lasttime * 1000).toLocaleString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {aprsResults.length === 0 && !aprsLoading && (
                            <div style={s({ color: '#64748b', textAlign: 'center', marginTop: 40 })}>
                                Search for a callsign to see APRS position data from aprs.fi
                            </div>
                        )}
                    </div>
                )}

                {/* ===== PROPAGATION ===== */}
                {activeTab === 'propagation' && (
                    <div>
                        <div style={s({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 })}>
                            <span style={s({ fontWeight: 600, color: '#f59e0b' })}>Live HF Propagation</span>
                            <button onClick={fetchPropagation} disabled={solarLoading}
                                style={s({ padding: '3px 10px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', fontSize: '0.7rem', cursor: 'pointer' })}>
                                {solarLoading ? 'Loading...' : 'Refresh'}
                            </button>
                        </div>
                        {solarData && (
                            <>
                                <div style={s({ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 6, marginBottom: 16 })}>
                                    {[
                                        ['SFI', solarData.sfi], ['Sunspots', solarData.sunspots], ['A-Index', solarData.aindex],
                                        ['K-Index', solarData.kindex], ['X-Ray', solarData.xray], ['Solar Wind', solarData.solarwind],
                                        ['Bz', solarData.magneticfield], ['Aurora', solarData.aurora],
                                    ].map(([label, val]) => (
                                        <div key={label as string} style={s({ padding: '6px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' })}>
                                            <div style={s({ fontSize: '0.6rem', color: '#64748b' })}>{label}</div>
                                            <div style={s({ fontSize: '0.9rem', fontWeight: 700, fontFamily: 'monospace' })}>{val || '—'}</div>
                                        </div>
                                    ))}
                                </div>
                                {solarData.conditions.length > 0 && (
                                    <table style={s({ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' })}>
                                        <thead><tr style={s({ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#64748b' })}>
                                            <th style={s({ textAlign: 'left', padding: '4px 8px' })}>Band</th>
                                            <th style={s({ textAlign: 'center', padding: '4px 8px' })}>Day</th>
                                            <th style={s({ textAlign: 'center', padding: '4px 8px' })}>Night</th>
                                        </tr></thead>
                                        <tbody>
                                            {solarData.conditions.map(c => (
                                                <tr key={c.band} style={s({ borderBottom: '1px solid rgba(255,255,255,0.04)' })}>
                                                    <td style={s({ padding: '4px 8px', fontFamily: 'monospace', fontWeight: 600 })}>{c.band}</td>
                                                    <td style={s({ padding: '4px 8px', textAlign: 'center', color: condColor(c.day) })}>{c.day || '—'}</td>
                                                    <td style={s({ padding: '4px 8px', textAlign: 'center', color: condColor(c.night) })}>{c.night || '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                                {solarData.updated && <div style={s({ fontSize: '0.6rem', color: '#475569', marginTop: 8 })}>Updated: {solarData.updated}</div>}
                            </>
                        )}
                        {!solarData && !solarLoading && <div style={s({ color: '#64748b', textAlign: 'center', marginTop: 40 })}>Loading propagation data...</div>}
                    </div>
                )}

                {/* ===== QSO LOG ===== */}
                {activeTab === 'log' && (
                    <div>
                        <div style={s({ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'flex-end' })}>
                            <div>
                                <label style={s({ fontSize: '0.6rem', color: '#64748b', display: 'block' })}>Callsign</label>
                                <input value={newQso.callsign || ''} onChange={e => setNewQso(p => ({ ...p, callsign: e.target.value.toUpperCase() }))}
                                    onKeyDown={e => e.key === 'Enter' && addQso()} placeholder="W1AW"
                                    style={s({ padding: '4px 6px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0', fontSize: '0.75rem', width: 80 })} />
                            </div>
                            <div>
                                <label style={s({ fontSize: '0.6rem', color: '#64748b', display: 'block' })}>Freq (MHz)</label>
                                <input value={newQso.frequency || ''} onChange={e => setNewQso(p => ({ ...p, frequency: e.target.value }))}
                                    placeholder={rigFrequency || '14.250'} style={s({ padding: '4px 6px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0', fontSize: '0.75rem', width: 70 })} />
                            </div>
                            <div>
                                <label style={s({ fontSize: '0.6rem', color: '#64748b', display: 'block' })}>Mode</label>
                                <select value={newQso.mode || 'SSB'} onChange={e => setNewQso(p => ({ ...p, mode: e.target.value }))}
                                    style={s({ padding: '4px 6px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0', fontSize: '0.75rem' })}>
                                    {['SSB', 'CW', 'FM', 'AM', 'FT8', 'FT4', 'JS8', 'RTTY', 'PSK31', 'DMR', 'D-STAR', 'C4FM'].map(m => <option key={m}>{m}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={s({ fontSize: '0.6rem', color: '#64748b', display: 'block' })}>RST S/R</label>
                                <div style={s({ display: 'flex', gap: 2 })}>
                                    <input value={newQso.rstSent || '59'} onChange={e => setNewQso(p => ({ ...p, rstSent: e.target.value }))}
                                        style={s({ padding: '4px 4px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0', fontSize: '0.75rem', width: 30, textAlign: 'center' })} />
                                    <input value={newQso.rstRcvd || '59'} onChange={e => setNewQso(p => ({ ...p, rstRcvd: e.target.value }))}
                                        style={s({ padding: '4px 4px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0', fontSize: '0.75rem', width: 30, textAlign: 'center' })} />
                                </div>
                            </div>
                            <div>
                                <label style={s({ fontSize: '0.6rem', color: '#64748b', display: 'block' })}>Notes</label>
                                <input value={newQso.notes || ''} onChange={e => setNewQso(p => ({ ...p, notes: e.target.value }))}
                                    style={s({ padding: '4px 6px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0', fontSize: '0.75rem', width: 120 })} />
                            </div>
                            <button onClick={addQso} style={s({ padding: '5px 14px', borderRadius: 4, border: 'none', background: '#059669', color: '#fff', fontSize: '0.75rem', cursor: 'pointer' })}>Log QSO</button>
                            {qsoLog.length > 0 && <button onClick={exportADIF} style={s({ padding: '5px 10px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', fontSize: '0.7rem', cursor: 'pointer' })}>Export ADIF</button>}
                        </div>
                        {qsoLog.length > 0 ? (
                            <table style={s({ width: '100%', fontSize: '0.7rem', borderCollapse: 'collapse' })}>
                                <thead><tr style={s({ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#64748b' })}>
                                    <th style={s({ textAlign: 'left', padding: '4px 6px' })}>Date/Time</th>
                                    <th style={s({ textAlign: 'left', padding: '4px 6px' })}>Call</th>
                                    <th style={s({ textAlign: 'left', padding: '4px 6px' })}>Freq</th>
                                    <th style={s({ textAlign: 'left', padding: '4px 6px' })}>Mode</th>
                                    <th style={s({ textAlign: 'center', padding: '4px 6px' })}>RST</th>
                                    <th style={s({ textAlign: 'left', padding: '4px 6px' })}>Notes</th>
                                    <th></th>
                                </tr></thead>
                                <tbody>
                                    {qsoLog.map(q => (
                                        <tr key={q.id} style={s({ borderBottom: '1px solid rgba(255,255,255,0.04)' })}>
                                            <td style={s({ padding: '4px 6px', color: '#94a3b8', fontFamily: 'monospace', fontSize: '0.65rem' })}>{q.date} {q.time}z</td>
                                            <td style={s({ padding: '4px 6px', fontWeight: 600, color: '#06b6d4' })}>{q.callsign}</td>
                                            <td style={s({ padding: '4px 6px', fontFamily: 'monospace' })}>{q.frequency}</td>
                                            <td style={s({ padding: '4px 6px' })}>{q.mode}</td>
                                            <td style={s({ padding: '4px 6px', textAlign: 'center', fontFamily: 'monospace' })}>{q.rstSent}/{q.rstRcvd}</td>
                                            <td style={s({ padding: '4px 6px', color: '#64748b' })}>{q.notes}</td>
                                            <td><button onClick={() => setQsoLog(prev => prev.filter(x => x.id !== q.id))} style={s({ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: '0.7rem' })}>×</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div style={s({ color: '#64748b', textAlign: 'center', marginTop: 40 })}>No QSOs logged yet. Use the form above to log contacts.</div>
                        )}
                    </div>
                )}

                {/* ===== FREQUENCIES ===== */}
                {activeTab === 'frequencies' && (
                    <div>
                        <div style={s({ fontWeight: 600, color: '#10b981', marginBottom: 8 })}>Emergency & Calling Frequencies</div>
                        <table style={s({ width: '100%', fontSize: '0.7rem', borderCollapse: 'collapse', marginBottom: 16 })}>
                            <thead><tr style={s({ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#64748b' })}>
                                <th style={s({ textAlign: 'left', padding: '4px 8px' })}>MHz</th>
                                <th style={s({ textAlign: 'left', padding: '4px 8px' })}>Name</th>
                                <th style={s({ textAlign: 'left', padding: '4px 8px' })}>Mode</th>
                            </tr></thead>
                            <tbody>{EMERGENCY_FREQS.map((f, i) => (
                                <tr key={i} style={s({ borderBottom: '1px solid rgba(255,255,255,0.04)' })}>
                                    <td style={s({ padding: '4px 8px', fontFamily: 'monospace', color: '#06b6d4' })}>{f.freq}</td>
                                    <td style={s({ padding: '4px 8px' })}>{f.name}</td>
                                    <td style={s({ padding: '4px 8px', color: '#94a3b8' })}>{f.mode}</td>
                                </tr>
                            ))}</tbody>
                        </table>
                        <div style={s({ fontWeight: 600, color: '#3b82f6', marginBottom: 8 })}>Ham Band Plan</div>
                        <div style={s({ display: 'flex', flexDirection: 'column', gap: 2 })}>
                            {HAM_BANDS.map(b => (
                                <div key={b.name} style={s({ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.02)' })}>
                                    <span style={s({ width: 8, height: 8, borderRadius: '50%', background: b.color })} />
                                    <span style={s({ fontFamily: 'monospace', fontWeight: 600, width: 40, color: b.color })}>{b.name}</span>
                                    <span style={s({ fontFamily: 'monospace', color: '#94a3b8', width: 130, fontSize: '0.7rem' })}>{b.startMHz}–{b.endMHz}</span>
                                    <span style={s({ color: '#64748b', fontSize: '0.7rem' })}>{b.service}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ===== CONNECT ===== */}
                {activeTab === 'connect' && (
                    <div>
                        <div style={s({ fontWeight: 600, color: '#06b6d4', marginBottom: 12 })}>Radio / TNC / Modem Connection</div>
                        <div style={s({ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' })}>
                            <div>
                                <label style={s({ fontSize: '0.65rem', color: '#64748b', display: 'block', marginBottom: 2 })}>Serial Port</label>
                                <select value={selectedPort} onChange={e => setSelectedPort(e.target.value)}
                                    style={s({ padding: '4px 8px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0', fontSize: '0.75rem', minWidth: 150 })}>
                                    <option value="">Select port...</option>
                                    {serialPorts.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                            <button onClick={listPorts} style={s({ padding: '4px 10px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', fontSize: '0.7rem', cursor: 'pointer' })}>Refresh</button>
                            <div>
                                <label style={s({ fontSize: '0.65rem', color: '#64748b', display: 'block', marginBottom: 2 })}>Baud Rate</label>
                                <select value={baudRate} onChange={e => setBaudRate(e.target.value)}
                                    style={s({ padding: '4px 8px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0', fontSize: '0.75rem' })}>
                                    {['4800', '9600', '19200', '38400', '57600', '115200'].map(b => <option key={b}>{b}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={s({ fontSize: '0.65rem', color: '#64748b', display: 'block', marginBottom: 2 })}>Rig Type</label>
                                <select value={rigType} onChange={e => setRigType(e.target.value)}
                                    style={s({ padding: '4px 8px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0', fontSize: '0.75rem' })}>
                                    <option value="none">None (raw serial)</option>
                                    <option value="cat">CAT Control (Yaesu/Icom/Kenwood)</option>
                                    <option value="hamlib">Hamlib/rigctl</option>
                                    <option value="tnc">TNC (KISS)</option>
                                    <option value="meshtastic">Meshtastic</option>
                                    <option value="rtlsdr">RTL-SDR (rtl_tcp)</option>
                                </select>
                            </div>
                            <button onClick={connectRig} disabled={!selectedPort || connectionStatus === 'connecting'}
                                style={s({ padding: '5px 14px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: '0.75rem',
                                    background: connectionStatus === 'connected' ? '#ef4444' : '#059669', color: '#fff' })}>
                                {connectionStatus === 'connected' ? 'Disconnect' : connectionStatus === 'connecting' ? 'Connecting...' : 'Connect'}
                            </button>
                        </div>
                        <div style={s({ color: '#64748b', fontSize: '0.7rem', lineHeight: 1.6 })}>
                            <div style={s({ fontWeight: 600, color: '#94a3b8', marginBottom: 4 })}>Supported connections:</div>
                            <div>• <strong>CAT Control</strong> — read/set frequency and mode on Yaesu, Icom, Kenwood, Elecraft rigs via serial</div>
                            <div>• <strong>Hamlib</strong> — use rigctl daemon for broader rig support (must have rigctld running)</div>
                            <div>• <strong>TNC (KISS)</strong> — connect to a packet TNC for APRS/AX.25</div>
                            <div>• <strong>Meshtastic</strong> — connect to Meshtastic device for LoRa mesh messaging</div>
                            <div>• <strong>RTL-SDR</strong> — connect to rtl_tcp server for SDR receive</div>
                            <div style={s({ marginTop: 8, color: '#475569' })}>
                                Note: Serial port access requires the Electron backend to expose serial APIs. Some connections may need external software (rigctld, Direwolf, rtl_tcp) running first.
                            </div>
                        </div>
                    </div>
                )}

                {/* ===== DIGITAL MODES ===== */}
                {activeTab === 'tools' && (
                    <div>
                        <div style={s({ fontWeight: 600, color: '#ec4899', marginBottom: 8 })}>Digital Modes & Mesh Networking</div>
                        <div style={s({ display: 'flex', flexDirection: 'column', gap: 4 })}>
                            {DIGITAL_MODES.map((mode: any, i) => (
                                <div key={i} style={s({ padding: '8px 12px', borderRadius: 6, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' })}>
                                    <div style={s({ display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}>
                                        <span style={s({ fontWeight: 600 })}>{mode.name}</span>
                                        <span style={s({ fontSize: '0.6rem', color: '#94a3b8' })}>{mode.connect}</span>
                                    </div>
                                    <div style={s({ fontSize: '0.7rem', color: '#94a3b8', marginTop: 2 })}>{mode.desc}</div>
                                    <div style={s({ fontSize: '0.7rem', color: '#10b981', marginTop: 2 })}>→ {mode.use}</div>
                                    <div style={s({ display: 'flex', gap: 4, marginTop: 6 })}>
                                        {mode.url && (
                                            <button onClick={() => window.open(mode.url, '_blank')}
                                                style={s({ padding: '3px 10px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(59,130,246,0.15)', color: '#3b82f6', fontSize: '0.65rem', cursor: 'pointer' })}>
                                                Website
                                            </button>
                                        )}
                                        {mode.webApp && (
                                            <button onClick={() => window.open(mode.webApp, '_blank')}
                                                style={s({ padding: '3px 10px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(16,185,129,0.15)', color: '#10b981', fontSize: '0.65rem', cursor: 'pointer' })}>
                                                Open Web App
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
