import { useEffect, useMemo, useState } from 'react';
import lunr from 'lunr';

export default function ReleaseTable({ data }){
  const [filter, setFilter] = useState('All Releases');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(data.items || []);

  // build lunr index on client
  const idx = useMemo(() => {
    try{
      return lunr(function(){
        this.ref('id');
        this.field('version');
        this.field('dart');
        this.field('summary');
        data.items.forEach((it, i) => this.add({ 
          id: i, 
          version: it.version, 
          dart: it.dart, 
          summary: it.summary || '' 
        }));
      });
    }catch(e){
      return null;
    }
  }, [data]);

  useEffect(() => {
    let list = [...data.items]; // Create a copy to avoid mutating original data
    
    // Apply filter
    if (filter === 'Betas') {
      list = list.filter(item => item.channel === 'beta' || item.channel === 'main');
    } else if (filter === 'Stable') {
      list = list.filter(item => item.channel === 'stable');
    } else if (filter === 'Beta') {
      list = list.filter(item => item.channel === 'beta');
    } else if (filter === 'Main') {
      list = list.filter(item => item.channel === 'main');
    }
    
    // Apply search
    if(query && idx){
      const hits = idx.search(query + '*');
      const hitIds = new Set(hits.map(h => Number(h.ref)));
      list = list.filter((_, i) => hitIds.has(i));
    }
    
    // Sort by release date (newest first)
    list.sort((a, b) => {
      // Parse release dates - assuming format like "11 Sep 2024" or "15 Jan 2025"
      const parseDate = (dateStr) => {
        const months = {
          'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
          'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        };
        const parts = dateStr.split(' ');
        if (parts.length === 3) {
          const day = parseInt(parts[0]);
          const month = months[parts[1]];
          const year = parseInt(parts[2]);
          if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
            return new Date(year, month, day);
          }
        }
        return new Date(0); // fallback for invalid dates
      };
      
      const dateA = parseDate(a.released);
      const dateB = parseDate(b.released);
      return dateB.getTime() - dateA.getTime(); // newest first
    });
    
    setResults(list);
  }, [filter, query, data, idx]);

  return (
    <div className="space-y-6">
      {/* Filter buttons */}
      <div className="flex items-center justify-center gap-2">
        <button 
          onClick={() => setFilter('All Releases')}
          className={`px-4 py-2 text-xs font-medium rounded-md transition-colors ${
            filter === 'All Releases' 
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
            className={`px-4 py-2 text-xs font-medium rounded-md transition-colors ${
              filter === f 
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
      <div className="overflow-x-auto mx-auto">
        <table className="min-w-full border-collapse">
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
                    <span className="text-base font-medium text-flutter-gray-900 dark:text-white">Flutter {item.version}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.channel === 'stable' ? 'badge-stable' :
                      item.channel === 'beta' ? 'badge-beta' :
                      'badge-main'
                    }`}>
                      {item.channel}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 text-base text-flutter-gray-700 dark:text-flutter-gray-300">{item.release_type}</td>
                <td className="py-3 px-4 text-base text-flutter-gray-700 dark:text-flutter-gray-300 font-mono">{item.build}</td>
                <td className="py-3 px-4 text-base text-flutter-gray-700 dark:text-flutter-gray-300">{item.released}</td>
                <td className="py-3 px-4 text-base text-flutter-gray-700 dark:text-flutter-gray-300">{item.requires}</td>
                <td className="py-3 px-4 text-base text-flutter-gray-700 dark:text-flutter-gray-300">{item.dart}</td>
                <td className="py-3 px-4">
                  <a 
                    href={item.download} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-flutter-blue-500 hover:text-flutter-blue-600 text-base font-medium transition-colors"
                  >
                    Download
                  </a>
                </td>
                <td className="py-3 px-4">
                  <a 
                    href={item.release_notes} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-flutter-blue-500 hover:text-flutter-blue-600 text-base font-medium transition-colors"
                  >
                    Release Notes
                  </a>
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