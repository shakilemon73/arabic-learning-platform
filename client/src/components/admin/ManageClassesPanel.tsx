import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getLiveClasses, deleteLiveClass, updateLiveClass } from "@/lib/api";
import { 
  Edit, 
  Trash2, 
  Users, 
  Calendar, 
  Clock, 
  X, 
  Eye,
  EyeOff,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { bn } from "date-fns/locale";

interface ManageClassesPanelProps {
  onClose: () => void;
  onEditClass: (classId: string) => void;
}

export default function ManageClassesPanel({ onClose, onEditClass }: ManageClassesPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: classes = [], isLoading, error } = useQuery({
    queryKey: ['live-classes'],
    queryFn: getLiveClasses
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLiveClass,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-classes'] });
      toast({
        title: "ক্লাস মুছে ফেলা হয়েছে",
        description: "ক্লাসটি সফলভাবে মুছে ফেলা হয়েছে।",
      });
      setDeleteConfirm(null);
    },
    onError: (error) => {
      console.error('Failed to delete class:', error);
      toast({
        title: "ক্লাস মুছতে ব্যর্থ",
        description: "দয়া করে আবার চেষ্টা করুন।",
        variant: "destructive"
      });
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ classId, isActive }: { classId: string; isActive: boolean }) =>
      updateLiveClass(classId, { is_active: isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-classes'] });
      toast({
        title: "ক্লাসের অবস্থা পরিবর্তিত হয়েছে",
        description: "ক্লাসের সক্রিয়তার অবস্থা আপডেট করা হয়েছে।",
      });
    },
    onError: (error) => {
      console.error('Failed to toggle class status:', error);
      toast({
        title: "অবস্থা পরিবর্তনে ব্যর্থ",
        description: "দয়া করে আবার চেষ্টা করুন।",
        variant: "destructive"
      });
    }
  });

  const handleDelete = (classId: string) => {
    if (deleteConfirm === classId) {
      deleteMutation.mutate(classId);
    } else {
      setDeleteConfirm(classId);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  const handleToggleActive = (classId: string, currentStatus: boolean) => {
    toggleActiveMutation.mutate({ classId, isActive: !currentStatus });
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-full max-w-4xl">
          <CardContent className="p-8">
            <div className="text-center">ক্লাসের তালিকা লোড হচ্ছে...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-full max-w-4xl">
          <CardContent className="p-8">
            <div className="text-center text-red-600">
              <AlertCircle className="h-12 w-12 mx-auto mb-4" />
              ক্লাসের তালিকা লোড করতে ব্যর্থ
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold text-islamic-green">
              সকল ক্লাস ম্যানেজমেন্ট ({classes.length} টি ক্লাস)
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {classes.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">কোনো ক্লাস পাওয়া যায়নি</p>
              <p className="text-sm">নতুন ক্লাস তৈরি করতে "নতুন ক্লাস তৈরি" বাটনে ক্লিক করুন</p>
            </div>
          ) : (
            <div className="space-y-4">
              {classes.map((classItem) => (
                <Card key={classItem.id} className="border border-gray-200 hover:border-islamic-green/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-900">
                            {classItem.title_bn || classItem.title}
                          </h3>
                          <Badge variant={classItem.is_active ? "default" : "secondary"}>
                            {classItem.is_active ? "সক্রিয়" : "নিষ্ক্রিয়"}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3">
                          {classItem.description_bn || classItem.description || "কোনো বিবরণ নেই"}
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {format(new Date(classItem.scheduled_at), "dd MMM yyyy", { locale: bn })}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4" />
                            <span>{classItem.duration} মিনিট</span>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4" />
                            <span>
                              {classItem.current_participants || 0}/{classItem.max_participants}
                            </span>
                          </div>
                          
                          <div className="text-sm text-gray-500">
                            {classItem.course_modules?.title_bn && (
                              <span>মডিউল: {classItem.course_modules.title_bn}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(classItem.id, classItem.is_active)}
                          disabled={toggleActiveMutation.isPending}
                        >
                          {classItem.is_active ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditClass(classItem.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(classItem.id)}
                          disabled={deleteMutation.isPending}
                          className={deleteConfirm === classItem.id ? "bg-red-100 text-red-600" : ""}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {deleteConfirm === classItem.id && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-800">
                          ⚠️ আবার ক্লিক করলে এই ক্লাসটি স্থায়ীভাবে মুছে যাবে। নিশ্চিত?
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}