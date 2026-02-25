import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { apiFetch } from '../lib/api';

export default function SearchModal({ onClose }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const data = await apiFetch('/search?q=' + encodeURIComponent(query.trim()));
      setResults(data?.results || []);
      setLoading(false);
    }, 300);
  }, [query]);

  function go(id) {
    onClose();
    router.push('/guide/' + id);
  }

  return (
    <div className="search-overlay" onClick={onClose}>
      <div className="search-modal" onClick={e => e.stopPropagation()}>
        <div className="search-input-row">
          <span className="search-icon">&#128269;</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search study guides..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        <div className="search-results">
          {loading && <div className="search-empty">Searching...</div>}
          {!loading && query && results.length === 0 && (
            <div className="search-empty">No results found</div>
          )}
          {results.map(r => (
            <div key={r.id} className="search-result-item" onClick={() => go(r.id)}>
              <div className="search-result-title">{r.title}</div>
              {r.snippet && <div className="search-result-snippet">{r.snippet}</div>}
            </div>
          ))}
        </div>

        {!query && <div className="search-hint">Type to search across all your study materials</div>}
      </div>
    </div>
  );
}
