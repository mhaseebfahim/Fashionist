import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { catalogService } from '../services/index.js';

/** Runs an async service call and tracks {data, loading, error}. */
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const run = useCallback(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fn()
      .then((data) => alive && setState({ data, loading: false, error: null }))
      .catch((error) => alive && setState({ data: null, loading: false, error }));
    return () => (alive = false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(run, [run]);
  return { ...state, reload: run, setData: (data) => setState((s) => ({ ...s, data })) };
}

export function useDebounce(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function useScrolled(offset = 40) {
  const [s, setS] = useState(false);
  useEffect(() => {
    const on = () => setS(window.scrollY > offset);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, [offset]);
  return s;
}

let settingsCache;
export function useSettings() {
  const [s, setS] = useState(settingsCache);
  useEffect(() => {
    if (!settingsCache) catalogService.settings().then((r) => setS((settingsCache = r.settings)));
  }, []);
  return s;
}

export const useLang = () => useSelector((s) => s.ui.lang);

/** Web Speech API voice search; `supported` is false where the API is missing. */
export function useSpeech(onResult) {
  const lang = useLang();
  const Rec = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
  const [listening, setListening] = useState(false);
  const ref = useRef(null);
  const start = () => {
    if (!Rec) return;
    const r = new Rec();
    r.lang = lang === 'ur' ? 'ur-PK' : 'en-PK';
    r.interimResults = false;
    r.onresult = (e) => onResult(e.results[0][0].transcript);
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    ref.current = r;
    setListening(true);
    r.start();
  };
  const stop = () => ref.current?.stop();
  return { supported: !!Rec, listening, start, stop };
}
