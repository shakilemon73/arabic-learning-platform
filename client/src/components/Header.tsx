import { Link, useLocation } from "wouter";
import { Home, BookOpen, Monitor } from "lucide-react";

export default function Header() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "হোম", icon: Home, active: location === "/" },
    { href: "/dashboard", label: "ড্যাশবোর্ড", icon: BookOpen, active: location === "/dashboard" },
    { href: "/live-class", label: "লাইভ ক্লাস", icon: Monitor, active: location === "/live-class" },
  ];

  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-emerald-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">আ</span>
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">আরবি শিক্ষা</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <span className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  item.active 
                    ? "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950" 
                    : "text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400"
                }`}>
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </span>
              </Link>
            ))}
          </div>

          {/* User info - simplified */}
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">আহমেদ হাসান</span>
          </div>
        </div>
      </nav>
    </header>
  );
}