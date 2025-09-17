// components/ReleaseTable.js
import { useEffect, useMemo, useState } from 'react';
import lunr from 'lunr';

export default function ReleaseTable({ data }) {
  const [filter, setFilter] = useState('All Releases');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(Array.isArray(data?.items) ? data.items : []);

  // Field helpers
  const getVersion = item => item.version || item.flutter_version || item.flutterVersion || '—';
  const getReleaseType = item => (item && (item.release_type || item.releaseType || item.type || item.release)) || 'Release';
  const getReleased = item => item.released || item.published || item.date || '—';
  const getDart = item => item.dart_version || item.dart || item.dartVersion || '—';

  // Date formatting -> "15 Sep 2025"
  function formatDateToDDMonYYYY(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (!isNaN(d)) {
      const day = `${d.getDate()}`.padStart(2, '0');
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
    }
    const m = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      const y = Number(m[1]), mo = Number(m[2]) - 1, da = Number(m[3]);
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return `${String(da).padStart(2,'0')} ${months[mo]} ${y}`;
    }
    return dateStr;
  }

  // Lunr index (client)
  const idx = useMemo(() => {
    try {
      return lunr(function () {
        this.ref('id');
        this.field('version');
        this.field('dart');
        this.field('summary');
        (data.items || []).forEach((it, i) => this.add({
          id: i,
          version: getVersion(it),
          dart: getDart(it),
          summary: it.summary || ''
        }));
      });
    } catch (e) {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Normalize requires into 3 logical lines:
  // macOS + Xcode | Windows + Visual Studio | Linux (...)
  function requiresToLines(req) {
    if (!req) return ['—'];
    if (typeof req === 'object') {
      const macos = req.macos || req.macOS || '';
      const xcode = req.xcode || req.xcode_version || '';
      const windows = req.windows || '';
      const vs = req.visual_studio || req.vs || '';
      const linux = req.linux || '';
      const line1 = [macos && String(macos).trim(), xcode && String(xcode).trim()].filter(Boolean).join(', ');
      const line2 = [windows && String(windows).trim(), vs && String(vs).trim()].filter(Boolean).join(', ');
      const line3 = linux && String(linux).trim();
      const out = [];
      if (line1) out.push(line1);
      if (line2) out.push(line2);
      if (line3) out.push(line3);
      return out.length ? out : ['—'];
    }
    if (typeof req === 'string') {
      const s = req.replace(/\s+/g, ' ').trim();
      const macosMatch = s.match(/(macOS[^,;\n]*)/i);
      const xcodeMatch = s.match(/(Xcode[^,;\n]*)/i);
      const winMatch = s.match(/(Windows[^,;\n]*)/i);
      const vsMatch = s.match(/(Visual\s+Studio[^,;\n]*)/i);
      const linuxMatch = s.match(/(Linux[^,;\n()]*(?:\([^)]+\))?)/i);
      const line1 = [macosMatch ? macosMatch[1].trim() : null, xcodeMatch ? xcodeMatch[1].trim() : null].filter(Boolean).join(', ');
      const line2 = [winMatch ? winMatch[1].trim() : null, vsMatch ? vsMatch[1].trim() : null].filter(Boolean).join(', ');
      const line3 = linuxMatch ? linuxMatch[1].trim() : null;
      const out = [];
      if (line1) out.push(line1);
      if (line2) out.push(line2);
      if (line3) out.push(line3);
      if (out.length) return out;
      return s.split(/[\n;|•]/).map(p => p.trim()).filter(Boolean);
    }
    return ['—'];
  }

  // Downloads rendering: one CTA per line, show only truthy URL keys
  function renderDownloads(platforms = {}) {
    if (!platforms || typeof platforms !== 'object') return <span className="text-flutter-gray-500">—</span>;

    const order = ['macos_arm64','macos_x64','windows_x64','linux_x64','macos','windows','linux'];
    const seen = new Set();
    const entries = [];

    order.forEach(k => {
      if (platforms[k]) {
        entries.push([k, platforms[k]]);
        seen.add(k);
      }
    });

    Object.entries(platforms).forEach(([k, v]) => {
      if (!v) return;
      if (!seen.has(k)) entries.push([k, v]);
    });

    if (!entries.length) return <span className="text-flutter-gray-500">—</span>;

    const labelMap = {
      macos_arm64: 'macOS arm64',
      macos_x64: 'macOS x64',
      macos: 'macOS',
      windows_x64: 'Windows x64',
      linux_x64: 'Linux x64',
      windows: 'Windows',
      linux: 'Linux',
    };

    return (
      <div className="flex flex-col items-start gap-2">
        {entries.map(([k, url]) => (
          url ? (
            <a
              key={k}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-block px-4 py-2 border border-flutter-blue-500 text-flutter-blue-500 rounded hover:bg-flutter-blue-500 hover:text-white transition-colors text-sm whitespace-nowrap"
            >
              {labelMap[k] || k}
            </a>
          ) : null
        ))}
      </div>
    );
  }

  // Release notes rendering: inline buttons, wrap when needed, only truthy URLs shown
  const ctaMap = {
    base: 'Full Notes',
    framework: 'Framework',
    material: 'Material',
    ios: 'iOS',
    android: 'Android',
    windows: 'Windows',
    linux: 'Linux',
    web: 'Web',
    tools: 'Tools'
  };

   function renderReleaseNotes(item) {
    const rn = item.release_notes || item.notes || item.notes_url || item.notesUrl || null;

    // debug: remove after verification
    // console.log(`[RN-debug] ${item.version || item.flutter_version} release_notes=`, rn);

    if (!rn) return <span className="text-flutter-gray-500">—</span>;

    let links = [];

    // If it's a plain string — only show full/base notes
    if (typeof rn === 'string') {
      const s = rn.trim();
      if (!s) return <span className="text-flutter-gray-500">—</span>;
      links = [['base', s]];
    } else if (typeof rn === 'object' && rn !== null) {
      // Only include *own* keys and only where the value is a non-empty string (truthy)
      const ownKeys = Object.keys(rn || {}).filter(k => Object.prototype.hasOwnProperty.call(rn, k));
      const valid = ownKeys
        .map(k => [k, rn[k]])
        .filter(([k, v]) => {
          if (v === null || v === undefined) return false;
          // allow strings only (avoid accidentally including nested objects)
          if (typeof v !== 'string') return false;
          return v.trim().length > 0;
        });

      // sort so 'base' (full notes) comes first if present
      valid.sort((a, b) => {
        if (a[0] === 'base' && b[0] !== 'base') return -1;
        if (b[0] === 'base' && a[0] !== 'base') return 1;
        return 0;
      });

      links = valid;
    }

    if (!links.length) return <span className="text-flutter-gray-500">—</span>;

    // Map keys to CTA labels
    const ctaMap = {
      base: 'Full Notes',
      framework: 'Framework',
      material: 'Material',
      ios: 'iOS',
      android: 'Android',
      windows: 'Windows',
      linux: 'Linux',
      web: 'Web',
      tools: 'Tools'
    };

    // debug: show what will be rendered (remove after verification)
    // console.log(`[RN] ${item.version || item.flutter_version} -> sectionsKeys=${links.map(l=>l[0]).join(',')} -> linksShown=${links.length}`);

    return (
      <div className="flex flex-row flex-wrap items-start gap-2">
        {links.map(([key, url]) => (
          <a
            key={key}
            href={String(url)}
            target="_blank"
            rel="noreferrer"
            className="inline-block px-4 py-2 border border-flutter-blue-500 text-flutter-blue-500 rounded hover:bg-flutter-blue-500 hover:text-white transition-colors text-sm whitespace-nowrap"
          >
            {ctaMap[key] || key}
          </a>
        ))}
      </div>
    );
  }

  // Filtering, searching, sorting
  useEffect(() => {
    let list = Array.isArray(data.items) ? [...data.items] : [];

    if (filter === 'Betas') {
      list = list.filter(item => item.channel === 'beta' || item.channel === 'main' || (item.channel === 'dev' && (item.version || '').includes('pre')));
    } else if (filter === 'Stable') {
      list = list.filter(item => item.channel === 'stable');
    } else if (filter === 'Beta') {
      list = list.filter(item => item.channel === 'beta');
    } else if (filter === 'Main') {
      list = list.filter(item => item.channel === 'main');
    } else if (filter === 'Hotfix') {
      list = list.filter(item => (String(item.release_type || '').toLowerCase()) === 'hotfix');
    }

    if (query && idx) {
      try {
        const hits = idx.search(query + '*');
        const hitIds = new Set(hits.map(h => Number(h.ref)));
        list = list.filter((_, i) => hitIds.has(i));
      } catch (e) {
        const q = query.toLowerCase();
        list = list.filter(it =>
          (getVersion(it) || '').toLowerCase().includes(q) ||
          (getDart(it) || '').toLowerCase().includes(q) ||
          ((it.summary || '')).toLowerCase().includes(q)
        );
      }
    }

    const parseDate = (dateStr) => {
      if (!dateStr) return new Date(0);
      const d = new Date(dateStr);
      if (!isNaN(d)) return d;
      const parts = String(dateStr).split(' ');
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const monMap = { 'Jan': 0,'Feb':1,'Mar':2,'Apr':3,'May':4,'Jun':5,'Jul':6,'Aug':7,'Sep':8,'Oct':9,'Nov':10,'Dec':11 };
        const month = monMap[parts[1]];
        const year = parseInt(parts[2]);
        if (!isNaN(day) && month !== undefined && !isNaN(year)) return new Date(year, month, day);
      }
      return new Date(0);
    };

    list.sort((a, b) => parseDate(getReleased(a)).getTime() - parseDate(getReleased(b)).getTime());
    list = list.reverse();
    setResults(list);
  }, [filter, query, data, idx]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center justify-center gap-3">
        <button onClick={() => setFilter('All Releases')} className={`px-4 py-2 text-xs font-medium rounded-md ${filter === 'All Releases' ? 'bg-flutter-blue-500 text-white' : 'bg-flutter-gray-100 dark:bg-flutter-gray-800 text-flutter-gray-700 dark:text-flutter-gray-300'}`}>All Releases</button>
        {['Stable','Beta','Main','Hotfix'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 text-xs font-medium rounded-md ${filter === f ? 'bg-flutter-blue-500 text-white' : 'bg-flutter-gray-100 dark:bg-flutter-gray-800 text-flutter-gray-700 dark:text-flutter-gray-300'}`}>{f}</button>
        ))}
      </div>

      {/* Search */}
      <div className="max-w-md mx-auto">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search version, dart, notes..."
          className="w-full px-4 py-2 rounded-md border border-flutter-gray-300 dark:border-flutter-gray-600 bg-white dark:bg-flutter-gray-800 text-flutter-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-flutter-blue-500 focus:border-transparent transition-all"
        />
      </div>

      <hr className="border-flutter-gray-200 dark:border-flutter-gray-700 my-6" />

      {/* Table container */}
      <div className="mx-auto w-full max-w-7xl">
        <div className="overflow-hidden">
          <table className="w-full table-auto border-collapse">
            <thead>
              <tr className="bg-flutter-gray-200 dark:bg-flutter-gray-700">
                <th className="py-4 px-6 text-center font-semibold text-flutter-gray-700 dark:text-flutter-gray-300">Version</th>
                <th className="py-4 px-6 text-center font-semibold text-flutter-gray-700 dark:text-flutter-gray-300">Channel</th>
                <th className="py-4 px-6 text-center font-semibold text-flutter-gray-700 dark:text-flutter-gray-300">Release Type</th>
                <th className="py-4 px-6 text-center font-semibold text-flutter-gray-700 dark:text-flutter-gray-300">Released</th>
                <th className="py-4 px-6 text-center font-semibold text-flutter-gray-700 dark:text-flutter-gray-300">Requires</th>
                <th className="py-4 px-6 text-center font-semibold text-flutter-gray-700 dark:text-flutter-gray-300">Downloads</th>
                <th className="py-4 px-6 text-center font-semibold text-flutter-gray-700 dark:text-flutter-gray-300">Release Notes</th>
              </tr>
            </thead>

            <tbody>
              {results.map((item, idx) => (
                <tr key={idx} className="border-b border-flutter-gray-200 dark:border-flutter-gray-800 hover:bg-flutter-gray-50 dark:hover:bg-flutter-gray-900 transition-colors">
                  {/* Version */}
                  <td className="py-6 px-6 align-top text-left">
                    <div className="text-flutter-gray-900 dark:text-white">
                      <div className="text-sm">Flutter <span className="font-bold block">{getVersion(item)}</span></div>
                      <div className="h-2" />
                      <div className="text-sm">Dart <span className="font-bold block">{getDart(item)}</span></div>
                    </div>
                  </td>

                  {/* Channel */}
                  <td className="py-6 px-6 align-top text-left">
                    <div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.channel === 'stable' ? 'bg-green-100 text-green-800' : item.channel === 'beta' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                        {item.channel}
                      </span>
                    </div>
                  </td>

                  {/* Release Type */}
                  <td className="py-6 px-6 align-top text-left">
                    <div className="text-sm text-flutter-gray-700 dark:text-flutter-gray-200">{getReleaseType(item)}</div>
                  </td>

                  {/* Released */}
                  <td className="py-6 px-6 align-top text-left">
                    <div className="text-sm text-flutter-gray-700 dark:text-flutter-gray-200">{formatDateToDDMonYYYY(getReleased(item))}</div>
                  </td>

                  {/* Requires */}
                  <td className="py-6 px-6 align-top text-left">
                    <div className="text-sm leading-relaxed text-flutter-gray-700 dark:text-flutter-gray-200">
                      {requiresToLines(item.requires).map((line, i) => (
                        <div key={i}>{line}</div>
                      ))}
                    </div>
                  </td>

                  {/* Downloads */}
                  <td className="py-6 px-6 align-top text-left">
                    {renderDownloads(item.platforms)}
                  </td>

                  {/* Release Notes */}
                  <td className="py-6 px-6 align-top text-left">
                    {renderReleaseNotes(item)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-2 border-t border-flutter-gray-200 dark:border-flutter-gray-700 text-sm text-flutter-gray-500">
        - If the direct download link doesn't work, check Flutter's official release notes.
      </div>
    </div>
  );
}