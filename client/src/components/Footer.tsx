import { Link } from "wouter";
import { Heart, Mail, Phone, MapPin, Facebook, Twitter, Youtube } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-emerald-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">আ</span>
              </div>
              <span className="text-xl font-bold">আরবি শিক্ষা</span>
            </div>
            <p className="text-gray-400 text-sm">
              বাংলাদেশী মুসলমানদের জন্য সাশ্রয়ী মূল্যে আরবি ভাষা শিক্ষার প্ল্যাটফর্ম
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4">দ্রুত লিংক</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/" className="hover:text-green-400 transition-colors">হোম</Link></li>
              <li><Link href="/course-registration" className="hover:text-green-400 transition-colors">কোর্স নিবন্ধন</Link></li>
              <li><Link href="/dashboard" className="hover:text-green-400 transition-colors">ড্যাশবোর্ড</Link></li>
              <li><Link href="/live-class" className="hover:text-green-400 transition-colors">লাইভ ক্লাস</Link></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-semibold mb-4">যোগাযোগ</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-center space-x-2">
                <Phone className="w-4 h-4" />
                <span>+৮৮ ০১৭xxxxxxxx</span>
              </li>
              <li className="flex items-center space-x-2">
                <Mail className="w-4 h-4" />
                <span>info@arabicshiksha.bd</span>
              </li>
              <li className="flex items-center space-x-2">
                <MapPin className="w-4 h-4" />
                <span>ঢাকা, বাংলাদেশ</span>
              </li>
            </ul>
          </div>

          {/* Social Media */}
          <div>
            <h3 className="font-semibold mb-4">সোশ্যাল মিডিয়া</h3>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-green-400 transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-green-400 transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-green-400 transition-colors">
                <Youtube className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-400">
              © {new Date().getFullYear()} আরবি শিক্ষা। সকল অধিকার সংরক্ষিত।
            </p>
            <p className="text-sm text-gray-400 flex items-center space-x-1 mt-4 md:mt-0">
              <span>বানানো হয়েছে</span>
              <Heart className="w-4 h-4 text-red-500" />
              <span>দিয়ে বাংলাদেশে</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}