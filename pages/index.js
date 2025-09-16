import fs from 'fs';
import path from 'path';
import ReleaseTable from '../components/ReleaseTable';
import ThemeToggle from '../components/ThemeToggle';

export default function Home({ data }){
  // Feature flag to control donate button visibility
  const SHOW_DONATE_BUTTON = false;
  
  return (
        <div className="min-h-screen bg-white dark:bg-flutter-gray-900">
          {/* Header */}
          <header className="bg-white dark:bg-flutter-gray-800 border-b border-flutter-gray-200 dark:border-flutter-gray-700">
            <div className="max-w-6xl mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-flutter-blue-500 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">F</span>
                    </div>
                    <h1 className="text-2xl font-semibold text-flutter-gray-900 dark:text-white">Flutter Releases</h1>
                  </div>
                  <p className="text-flutter-gray-600 dark:text-flutter-gray-400 text-base ml-11 mt-1">
                    All Flutter releases in one place
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <ThemeToggle />
                  {SHOW_DONATE_BUTTON && (
                    <a className="px-3 py-2 bg-flutter-blue-500 text-white rounded-md text-sm hover:bg-flutter-blue-600 transition-colors" href="https://buymeacoffee.com/shankarmadeshvaran" target="_blank" rel="noreferrer">☕ Donate</a>
                  )}
                </div>
              </div>
            </div>
          </header>

          <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Page header */}
        <div className="mb-8">          
          {/* Disclaimer */}
          <div className="mb-6 text-center">
            <p className="text-base text-flutter-gray-600 dark:text-flutter-gray-400 mb-2">
              All downloads are hosted by Google. Links on this site take you directly to Flutter's official download pages.
            </p>
            <p className="text-base text-flutter-gray-600 dark:text-flutter-gray-400 mb-2">
              This is not an official Google website. A free resource for the flutter community.{SHOW_DONATE_BUTTON && (
                <span>
                  {' '}<a href="https://buymeacoffee.com/shankarmadeshvaran" target="_blank" rel="noreferrer" className="text-red-500 hover:text-red-600 font-medium">Please consider donating</a>
                  {' '}to help maintain it.
                </span>
              )}
            </p>
            <p className="text-base text-flutter-gray-600 dark:text-flutter-gray-400">
              Stay up-to-date via our <span className="text-red-500 font-medium">JSON API</span><span className="text-red-500 font-medium">,</span> <span className="text-red-500 font-medium">RSS feed</span><span className="text-red-500 font-medium">,</span> and <span className="text-red-500 font-medium">X account</span>.
            </p>
          </div>
        </div>

        <hr className="border-flutter-gray-200 dark:border-flutter-gray-700 mb-8" />

        <ReleaseTable data={data} />

        <footer className="mt-16 pt-8 border-t border-flutter-gray-200 dark:border-flutter-gray-700">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <p className="text-sm text-flutter-gray-500 dark:text-flutter-gray-400">
              flutterreleases.com is developed and maintained by{' '}
              <a href="https://x.com/devinmaking" className="text-flutter-blue-500 hover:text-flutter-blue-600" target="_blank" rel="noreferrer">
                @devinmaking
              </a>
            </p>
            <div className="text-xs text-flutter-gray-400 dark:text-flutter-gray-500">
              Last updated: {data.generated_at ? new Date(data.generated_at).toLocaleDateString() : 'Unknown'}
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

export async function getStaticProps(){
  const p = path.join(process.cwd(), 'public', 'data', 'releases.json');
  const raw = fs.readFileSync(p, 'utf-8');
  const data = JSON.parse(raw);
  return { props: { data } };
}