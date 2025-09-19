// components/Header.js
import ThemeToggle from './ThemeToggle';

export default function Header() {
    const SHOW_DONATE_BUTTON = true;

    return (
        <header className="bg-white dark:bg-flutter-gray-800 border-b border-flutter-gray-200 dark:border-flutter-gray-700">
            <div className="max-w-6xl mx-auto px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                        <div className="flex items-center">
                            <img
                                src="/lockup_flutter_horizontal.svg"
                                alt="Flutter Logo"
                                width={140}
                                height={36}
                                className="block dark:hidden"
                            />
                            <img
                                src="/lockup_flutter_horizontal_wht.svg"
                                alt="Flutter Logo"
                                width={140}
                                height={36}
                                className="hidden dark:block"
                            />
                        </div>

                        <p className="text-lg sm:text-xl font-medium mt-2 ml-1 text-flutter-gray-700 dark:text-white">
                            All Flutter versions and releases in one place
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                        {SHOW_DONATE_BUTTON && (
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