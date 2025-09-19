// components/Header.js
import ThemeToggle from './ThemeToggle';

export default function Header({ showDonate = true }) {
    return (
        <header className="bg-white dark:bg-flutter-gray-800 border-b border-flutter-gray-200 dark:border-flutter-gray-700">
            <div className="max-w-6xl mx-auto px-6 py-4">
                <div className="flex items-center justify-between">
                    {/* Logo + title */}
                    <div className="flex flex-col">
                        <div className="flex items-center gap-3">
                            <img
                                src="/flutter-logo.svg"
                                alt="Flutter Logo"
                                className="w-8 h-8"
                            />
                            <h1 className="text-2xl font-semibold text-flutter-gray-900 dark:text-white">
                                Flutter Releases
                            </h1>
                        </div>
                        <p className="text-flutter-gray-600 dark:text-flutter-gray-400 text-base ml-11 mt-1">
                            All Flutter releases in one place
                        </p>
                    </div>

                    {/* Theme toggle + donate button */}
                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                        {showDonate && (
                            <a
                                className="px-3 py-2 bg-flutter-blue-500 text-white rounded-md text-sm hover:bg-flutter-blue-600 transition-colors"
                                href="https://buymeacoffee.com/shankarmadeshvaran"
                                target="_blank"
                                rel="noreferrer"
                            >
                                ☕ Donate
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}