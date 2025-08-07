import { Link, useLocation } from "wouter";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Menu, X, User, LogOut, Home, BookOpen, Monitor } from "lucide-react";
import { useState } from "react";

export default function Header() {
  const { user: authUser, signOut } = useSupabaseAuth();
  const isAuthenticated = !!authUser;
  const user = authUser;
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);

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
            {isAuthenticated && navItems.map((item) => (
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

          {/* User Menu / Login Button */}
          <div className="flex items-center space-x-4">
            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.user_metadata?.avatar_url || undefined} alt={user.user_metadata?.first_name || 'User'} />
                      <AvatarFallback>
                        {user.user_metadata?.first_name ? user.user_metadata.first_name[0].toUpperCase() : <User className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      {user.user_metadata?.first_name && (
                        <p className="font-medium">{user.user_metadata.first_name} {user.user_metadata?.last_name || ''}</p>
                      )}
                      {user.email && (
                        <p className="w-[200px] truncate text-sm text-muted-foreground">
                          {user.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <DropdownMenuItem 
                    onClick={async () => {
                      await signOut();
                    }}
                    className="flex items-center cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    লগ আউট
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/login">
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  লগইন
                </Button>
              </Link>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              className="md:hidden"
              onClick={toggleMobileMenu}
              size="sm"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
              {isAuthenticated && navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <div 
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                      item.active 
                        ? "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950" 
                        : "text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </div>
                </Link>
              ))}
              {!isAuthenticated && (
                <a
                  href="/api/login"
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User className="w-5 h-5" />
                  <span>লগইন</span>
                </a>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}