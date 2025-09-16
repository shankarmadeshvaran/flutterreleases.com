import { useEffect, useMemo, useState } from 'react';
import lunr from 'lunr';

export default function ReleaseTable({ data }) {
  const [filter, setFilter] = useState('All Releases');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(data.items || []);

  // Helper: prefer one of multiple possible keys
  const getVersion = item => item.version || item.flutter_version || '—';
  const getReleaseType = item => item.release_type || item.releaseType || item.release || 'Release';
  const getBuild = item => item.build || item.engine_revision || item.engine || '—';
  const getReleased = item => item.released || item.published || item.date || '—';
  const getDart = item => item.dart || item.dart_version || item.dartVersion || '—';

  // Notes link: prefer explicit notes_url/release_notes, then ref_url, then GitHub tag
  const getNotesLink = item => item.notes_url || item.release_notes || item.ref_url || item.release_notes_url || null;

  // Download link: look into `download`, or `platforms` first available url
  const getDownloadLink = item => {
    if (item.download) return item.download;
    const p = item.platforms || {};
    return p.macos_arm64 || p.macos_x64 || p.windows_x64 || p.linux_x64 || null;
  };

  // normalize `requires` into array of clean lines
  function requiresToLines(req) {
    if (!req) return ['—'];

    const pushUnique = (arr, v) => { if (!v) return; const s = String(v).trim(); if (!s) return; if (!arr.includes(s)) arr.push(s); };

    // If it's already an array — sanitize items
    if (Array.isArray(req)) {
      const out = [];
      req.forEach(r => {
        const s = String(r).trim();
        if (!s) return;
        // Clean duplicates of "Standard dev tools"
        const cleaned = s.replace(/Standard dev tools\s*/i, '').replace(/\s*\(\s*\)/, '').trim();
        pushUnique(out, cleaned);
      });
      if (out.length) return out;
    }

    // If it's a string, try to extract known pieces
    if (typeof req === 'string') {
      const s = req.trim();

      // quick normalize: remove repeated words like "macOS macOS" or "Windows Windows"
      const dedup = s.replace(/\b(macOS|Windows)\s+\1\b/gi, '$1');

      const lines = [];

      // macOS + possible Xcode in same chunk
      const macosMatch = dedup.match(/(macOS[^,;\n()]*)/i);
      if (macosMatch) {
        const macChunk = macosMatch[1].trim();
        // ensure it starts with "macOS"
        pushUnique(lines, macChunk.toLowerCase().startsWith('macos') ? macChunk : `macOS ${macChunk}`);
      }

      // xcode may appear separately or in same chunk
      const xcodeMatch = dedup.match(/(Xcode[^,;\n()]*)/i);
      if (xcodeMatch) pushUnique(lines, xcodeMatch[1].trim());

      // Windows + Visual Studio
      const winMatch = dedup.match(/(Windows[^,;\n()]*)/i);
      if (winMatch) {
        const winChunk = winMatch[1].trim();
        pushUnique(lines, winChunk.toLowerCase().startsWith('windows') ? winChunk : `Windows ${winChunk}`);
      }
      const vsMatch = dedup.match(/(Visual\s+Studio[^,;\n()]*)/i);
      if (vsMatch) pushUnique(lines, vsMatch[1].trim());

      // Linux tools - find inside parentheses or after 'Linux'
      if (/linux/i.test(dedup)) {
        // try to find tools inside parentheses first
        const toolsParen = dedup.match(/\(([^)]+)\)/);
        if (toolsParen && toolsParen[1]) {
          // clean up nested parentheses and "Standard dev tools" phrase
          const cleaned = toolsParen[1].replace(/Standard dev tools\s*/i, '').replace(/[()]/g, '').trim();
          if (cleaned) pushUnique(lines, `Linux (${cleaned})`);
          else pushUnique(lines, `Linux (bash, git, curl, unzip)`);
        } else {
          // try to capture after 'Linux' with separators
          const linuxAfter = dedup.match(/Linux[^,;\n]*[:\-]?\s*([^,;\n]+)/i);
          if (linuxAfter && linuxAfter[1]) {
            const cleaned = linuxAfter[1].replace(/Standard dev tools\s*/i, '').replace(/[()]/g, '').trim();
            if (cleaned) pushUnique(lines, `Linux (${cleaned})`);
            else pushUnique(lines, `Linux (bash, git, curl, unzip)`);
          } else {
            // fallback default
            pushUnique(lines, `Linux (bash, git, curl, unzip)`);
          }
        }
      }

      // If we found structured pieces, return them
      if (lines.length) return lines;

      // fallback: split on separators and return cleaned parts
      const parts = dedup.split(/[\n;|•·]/).map(p => p.replace(/Standard dev tools\s*/i, '').replace(/[()]/g, '').trim()).filter(Boolean);
      if (parts.length > 1) return parts.map(p => {
        // map linux-like parts into canonical form
        if (/linux/i.test(p)) {
          const cleaned = p.replace(/linux/i, '').replace(/Standard dev tools\s*/i, '').replace(/[()]/g, '').trim();
          return cleaned ? `Linux (${cleaned})` : `Linux (bash, git, curl, unzip)`;
        }
        return p;
      });

      return [dedup.replace(/Standard dev tools\s*/i, '').replace(/\s*\(\s*\)/, '').trim()];
    }

    // If it's an object: prefer known keys
    if (typeof req === 'object') {
      const out = [];
      // macOS
      if (req.macos) {
        const m = String(req.macos).trim();
        // if contains both macOS and Xcode separated by comma, split
        const parts = m.split(/[,;]/).map(p => p.trim()).filter(Boolean);
        parts.forEach(p => {
          // if value already contains 'macOS' keep as-is otherwise prefix
          pushUnique(out, p.toLowerCase().startsWith('macos') ? p : `macOS ${p}`);
        });
      }
      // xcode explicit keys
      if (req.xcode) pushUnique(out, String(req.xcode).trim().toLowerCase().startsWith('xcode') ? String(req.xcode).trim() : `Xcode ${String(req.xcode).trim()}`);
      if (req.xcode_version) pushUnique(out, `Xcode ${String(req.xcode_version).trim()}`);

      // Windows
      if (req.windows) {
        const w = String(req.windows).trim();
        pushUnique(out, w.toLowerCase().startsWith('windows') ? w : `Windows ${w}`);
      }
      // Visual Studio keys
      if (req.visual_studio) pushUnique(out, String(req.visual_studio).trim().toLowerCase().startsWith('visual') ? String(req.visual_studio).trim() : `Visual Studio ${String(req.visual_studio).trim()}`);
      if (req.vs) pushUnique(out, `Visual Studio ${String(req.vs).trim()}`);

      // Linux
      if (req.linux) {
        const l = String(req.linux).replace(/Standard dev tools\s*/i, '').replace(/[()]/g, '').trim();
        if (l) pushUnique(out, `Linux (${l})`);
        else pushUnique(out, `Linux (bash, git, curl, unzip)`);
      } else {
        // default linux line when not present
        pushUnique(out, `Linux (bash, git, curl, unzip)`);
      }

      // If nothing found, dump other keys
      if (out.length === 0) {
        for (const [k, v] of Object.entries(req)) {
          if (!v) continue;
          pushUnique(out, `${k}: ${String(v).trim()}`);
        }
      }

      return out.length ? out : ['—'];
    }

    return ['—'];
  }

  // build lunr index on client
  const idx = useMemo(() => {
    try {
      return lunr(function () {
        this.ref('id');
        this.field('version');
        this.field('dart');
        this.field('summary');
        data.items.forEach((it, i) => this.add({
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

  useEffect(() => {
    let list = Array.isArray(data.items) ? [...data.items] : [];

    // Apply filter
    if (filter === 'Betas') {
      list = list.filter(item => item.channel === 'beta' || item.channel === 'main' || (item.channel === 'dev' && (item.version || '').includes('pre')));
    } else if (filter === 'Stable') {
      list = list.filter(item => item.channel === 'stable');
    } else if (filter === 'Beta') {
      list = list.filter(item => item.channel === 'beta');
    } else if (filter === 'Main') {
      list = list.filter(item => item.channel === 'main');
    }

    // Apply search (lunr if available)
    if (query && idx) {
      try {
        const hits = idx.search(query + '*');
        const hitIds = new Set(hits.map(h => Number(h.ref)));
        list = list.filter((_, i) => hitIds.has(i));
      } catch (e) {
        const q = query.toLowerCase();
        list = list.filter(it =>
          getVersion(it).toLowerCase().includes(q) ||
          getDart(it).toLowerCase().includes(q) ||
          (it.summary || '').toLowerCase().includes(q)
        );
      }
    }

    // Sort by release date (newest first). Accepts ISO or "YYYY-MM-DD" or "11 Sep 2024"
    const parseDate = (dateStr) => {
      if (!dateStr) return new Date(0);
      // try Date parse
      const d = new Date(dateStr);
      if (!isNaN(d)) return d;
      // try "DD MMM YYYY"
      const parts = String(dateStr).split(' ');
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const monMap = { 'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5, 'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11 };
        const month = monMap[parts[1]];
        const year = parseInt(parts[2]);
        if (!isNaN(day) && month !== undefined && !isNaN(year)) return new Date(year, month, day);
      }
      return new Date(0);
    };

    list.sort((a, b) => parseDate(getReleased(a)).getTime() - parseDate(getReleased(b)).getTime());
    // newest first -> reverse
    list = list.reverse();

    setResults(list);
  }, [filter, query, data, idx]);

  return (
    <div className="space-y-6">
      {/* Filter buttons */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => setFilter('All Releases')}
          className={`px-4 py-2 text-xs font-medium rounded-md transition-colors ${filter === 'All Releases'
              ? 'bg-flutter-blue-500 text-white'
              : 'bg-flutter-gray-100 dark:bg-flutter-gray-800 text-flutter-gray-700 dark:text-flutter-gray-300 hover:bg-flutter-gray-200 dark:hover:bg-flutter-gray-700'
            }`}
        >
          All Releases
        </button>

        {['Stable', 'Beta', 'Main'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-xs font-medium rounded-md transition-colors ${filter === f
                ? 'bg-flutter-blue-500 text-white'
                : 'bg-flutter-gray-100 dark:bg-flutter-gray-800 text-flutter-gray-700 dark:text-flutter-gray-300 hover:bg-flutter-gray-200 dark:hover:bg-flutter-gray-700'
              }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Search input */}
      <div className="max-w-md mx-auto">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search version, dart, notes..."
          className="w-full px-4 py-2 rounded-md border border-flutter-gray-300 dark:border-flutter-gray-600 bg-white dark:bg-flutter-gray-800 text-flutter-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-flutter-blue-500 focus:border-transparent transition-all"
        />
      </div>

      <hr className="border-flutter-gray-200 dark:border-flutter-gray-700 my-6" />

      {/* Release table */}
      <div className="overflow-x-auto mx-auto w-full">
        <table className="w-full border-collapse table-auto">
          <thead>
            <tr className="border-b border-flutter-gray-200 dark:border-flutter-gray-700">
              <th className="text-left py-3 px-4 text-base font-semibold text-flutter-gray-700 dark:text-flutter-gray-300">Version</th>
              <th className="text-left py-3 px-4 text-base font-semibold text-flutter-gray-700 dark:text-flutter-gray-300">Release</th>
              <th className="text-left py-3 px-4 text-base font-semibold text-flutter-gray-700 dark:text-flutter-gray-300">Build</th>
              <th className="text-left py-3 px-4 text-base font-semibold text-flutter-gray-700 dark:text-flutter-gray-300">Released</th>
              <th className="text-left py-3 px-4 text-base font-semibold text-flutter-gray-700 dark:text-flutter-gray-300">Requires</th>
              <th className="text-left py-3 px-4 text-base font-semibold text-flutter-gray-700 dark:text-flutter-gray-300">Dart</th>
              <th className="text-left py-3 px-4 text-base font-semibold text-flutter-gray-700 dark:text-flutter-gray-300">Download¹</th>
              <th className="text-left py-3 px-4 text-base font-semibold text-flutter-gray-700 dark:text-flutter-gray-300">Release Notes¹</th>
            </tr>
          </thead>
          <tbody>
            {results.map((item, idx) => (
              <tr key={idx} className="border-b border-flutter-gray-100 dark:border-flutter-gray-800 hover:bg-flutter-gray-50 dark:hover:bg-flutter-gray-800 transition-colors">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-medium text-flutter-gray-900 dark:text-white">Flutter {getVersion(item)}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.channel === 'stable' ? 'badge-stable' :
                        item.channel === 'beta' ? 'badge-beta' :
                          'badge-main'
                      }`}>
                      {item.channel}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 text-base text-flutter-gray-700 dark:text-flutter-gray-300">{getReleaseType(item)}</td>
                <td className="py-3 px-4 text-base text-flutter-gray-700 dark:text-flutter-gray-300 font-mono">{getBuild(item)}</td>
                <td className="py-3 px-4 text-base text-flutter-gray-700 dark:text-flutter-gray-300">{getReleased(item)}</td>
                <td className="py-3 px-4 text-base text-flutter-gray-700 dark:text-flutter-gray-300">
                  {requiresToLines(item.requires).map((line, i) => (
                    <div key={i} className="text-sm leading-5">{line}</div>
                  ))}
                </td>
                <td className="py-3 px-4 text-base text-flutter-gray-700 dark:text-flutter-gray-300">{getDart(item)}</td>
                <td className="py-3 px-4">
                  {getDownloadLink(item) ? (
                    <a href={getDownloadLink(item)} target="_blank" rel="noreferrer" className="text-flutter-blue-500 hover:text-flutter-blue-600">Download</a>
                  ) : <span className="text-flutter-gray-500">—</span>}
                </td>

                <td className="py-3 px-4">
                  {getNotesLink(item) ? (
                    <a href={getNotesLink(item)} target="_blank" rel="noreferrer" className="text-flutter-blue-500 hover:text-flutter-blue-600">Release Notes</a>
                  ) : <span className="text-flutter-gray-500">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer note */}
      <div className="mt-4 pt-2 border-t border-flutter-gray-200 dark:border-flutter-gray-700">
        <sup></sup> - If the direct download link doesn't work, you can find most downloads on{' '}
        <a href="https://docs.flutter.dev/release/release-notes" className="text-flutter-blue-500 hover:text-flutter-blue-600" target="_blank" rel="noreferrer">
          Flutter release notes
        </a>
      </div>
    </div>
  );
}