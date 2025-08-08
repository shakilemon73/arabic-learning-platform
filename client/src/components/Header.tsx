import { Link, useLocation } from "wouter";
import { Home, BookOpen, Monitor, User, LogOut, LogIn } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Header() {
  const [location] = useLocation();
  const { user, signOut } = useAuth();

  const navItems = [
    { href: "/", label: "হোম", icon: Home, active: location === "/" },
    { href: "/dashboard", label: "ড্যাশবোর্ড", icon: BookOpen, active: location === "/dashboard", requireAuth: true },
    { href: "/live-class", label: "লাইভ ক্লাস", icon: Monitor, active: location === "/live-class", requireAuth: true },
  ];

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/";
  };

  const displayName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'ব্যবহারকারী';

  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center space-x-2 hover:opacity-80 transition-opacity cursor-pointer">
              <div className="w-8 h-8 bg-gradient-to-br from-islamic-green to-emerald-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">আ</span>
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">আরবি শিক্ষা</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => {
              // Show auth-required items only if user is authenticated
              if (item.requireAuth && !user) return null;
              
              return (
                <Link key={item.href} href={item.href}>
                  <span className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    item.active 
                      ? "text-islamic-green dark:text-green-400 bg-green-50 dark:bg-green-950" 
                      : "text-gray-600 dark:text-gray-300 hover:text-islamic-green dark:hover:text-green-400"
                  }`}>
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </span>
                </Link>
              );
            })}
          </div>

          {/* User Authentication Section */}
          <div className="flex items-center space-x-4">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-islamic-green text-white">
                        {displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{displayName}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      ড্যাশবোর্ড
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    লগআউট
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    <LogIn className="mr-2 h-4 w-4" />
                    লগইন
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" className="bg-islamic-green hover:bg-islamic-green/90">
                    নিবন্ধন
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}