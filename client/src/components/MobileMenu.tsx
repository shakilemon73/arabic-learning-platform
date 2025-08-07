import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Home, User, Video, LogOut, BookOpen, Award } from "lucide-react";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  user: any;
}

export default function MobileMenu({ isOpen, onClose, isAuthenticated, user }: MobileMenuProps) {
  if (!isOpen) return null;

  return (
    <div className="md:hidden bg-white border-t border-gray-100 shadow-lg">
      <div className="px-4 pt-4 pb-3 space-y-3">
        {isAuthenticated && user && (
          <div className="flex items-center space-x-3 pb-3 border-b border-gray-200">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.profileImageUrl} alt={user.firstName} />
              <AvatarFallback className="bg-islamic-green text-white">
                {user.firstName ? user.firstName.charAt(0) : "ম"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-gray-900">{user.firstName} {user.lastName}</p>
              <p className="text-sm text-gray-600">{user.email}</p>
            </div>
          </div>
        )}

        <div className="space-y-1">
          <a 
            href="/" 
            className="flex items-center px-3 py-2 text-gray-700 hover:text-islamic-green font-medium rounded-lg hover:bg-gray-50"
            onClick={onClose}
          >
            <Home className="w-5 h-5 mr-3" />
            হোম
          </a>
          
          <a 
            href="#courses" 
            className="flex items-center px-3 py-2 text-gray-700 hover:text-islamic-green font-medium rounded-lg hover:bg-gray-50"
            onClick={onClose}
          >
            <BookOpen className="w-5 h-5 mr-3" />
            কোর্স সমূহ
          </a>

          {isAuthenticated && (
            <>
              <a 
                href="/dashboard" 
                className="flex items-center px-3 py-2 text-gray-700 hover:text-islamic-green font-medium rounded-lg hover:bg-gray-50"
                onClick={onClose}
              >
                <User className="w-5 h-5 mr-3" />
                ড্যাশবোর্ড
              </a>
              
              <a 
                href="/live-class" 
                className="flex items-center px-3 py-2 text-gray-700 hover:text-islamic-green font-medium rounded-lg hover:bg-gray-50"
                onClick={onClose}
              >
                <Video className="w-5 h-5 mr-3" />
                লাইভ ক্লাস
              </a>
            </>
          )}

          <a 
            href="#about" 
            className="flex items-center px-3 py-2 text-gray-700 hover:text-islamic-green font-medium rounded-lg hover:bg-gray-50"
            onClick={onClose}
          >
            <Award className="w-5 h-5 mr-3" />
            আমাদের সম্পর্কে
          </a>
        </div>

        <div className="pt-3 border-t border-gray-200">
          {isAuthenticated ? (
            <Button
              variant="outline"
              className="w-full justify-start text-red-600 border-red-600 hover:bg-red-50"
              onClick={() => {
                onClose();
                window.location.href = "/api/logout";
              }}
            >
              <LogOut className="w-5 h-5 mr-3" />
              লগ আউট
            </Button>
          ) : (
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start text-islamic-green border-islamic-green hover:bg-islamic-green hover:text-white"
                onClick={() => {
                  onClose();
                  window.location.href = "/api/login";
                }}
              >
                লগইন
              </Button>
              <Button
                className="w-full justify-start bg-islamic-green hover:bg-dark-green"
                onClick={() => {
                  onClose();
                  window.location.href = "/api/login";
                }}
              >
                নিবন্ধন করুন
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
