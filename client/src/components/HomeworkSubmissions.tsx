import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Upload, 
  FileText, 
  Calendar,
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Download,
  Plus
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { createHomeworkSubmission, getUserHomework, updateHomeworkStatus } from '@/lib/supabase';
import { format } from 'date-fns';

interface HomeworkSubmissionsProps {
  classId?: string;
  showSubmitForm?: boolean;
}

interface HomeworkSubmission {
  id: string;
  user_id: string;
  class_id: string;
  title: string;
  description?: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  status: 'pending' | 'submitted' | 'graded';
  grade?: number;
  feedback?: string;
  submitted_at: string;
  graded_at?: string;
  live_classes?: {
    title: string;
    title_bn: string;
    scheduled_at: string;
  };
}

export default function HomeworkSubmissions({ 
  classId,
  showSubmitForm = true 
}: HomeworkSubmissionsProps) {
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [submissionTitle, setSubmissionTitle] = useState('');
  const [submissionDescription, setSubmissionDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's homework submissions
  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['homework-submissions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await getUserHomework(user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Submit homework mutation
  const submitHomeworkMutation = useMutation({
    mutationFn: async (submissionData: {
      title: string;
      description?: string;
      file_url?: string;
      file_name?: string;
      file_size?: number;
    }) => {
      if (!user?.id || !classId) throw new Error('Missing user or class ID');
      
      const { data, error } = await createHomeworkSubmission({
        user_id: user.id,
        class_id: classId,
        title: submissionData.title,
        description: submissionData.description,
        file_url: submissionData.file_url,
        file_name: submissionData.file_name,
        file_size: submissionData.file_size,
        status: 'submitted'
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homework-submissions', user?.id] });
      setIsSubmitDialogOpen(false);
      setSubmissionTitle('');
      setSubmissionDescription('');
      setSelectedFile(null);
      toast({
        title: "হোমওয়ার্ক জমা দেওয়া হয়েছে",
        description: "আপনার হোমওয়ার্ক সফলভাবে জমা দেওয়া হয়েছে",
      });
    },
    onError: (error) => {
      console.error('Error submitting homework:', error);
      toast({
        title: "হোমওয়ার্ক জমা দিতে ত্রুটি",
        description: "হোমওয়ার্ক জমা দিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।",
        variant: "destructive"
      });
    }
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "ফাইল খুব বড়",
          description: "অনুগ্রহ করে 10MB এর চেয়ে ছোট ফাইল নির্বাচন করুন",
          variant: "destructive"
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!submissionTitle.trim()) {
      toast({
        title: "শিরোনাম প্রয়োজন",
        description: "অনুগ্রহ করে হোমওয়ার্কের শিরোনাম দিন",
        variant: "destructive"
      });
      return;
    }

    // In a real app, you'd upload the file to Supabase Storage first
    // For now, we'll simulate with file info
    const submissionData = {
      title: submissionTitle.trim(),
      description: submissionDescription.trim() || undefined,
      file_name: selectedFile?.name,
      file_size: selectedFile?.size,
      file_url: selectedFile ? `uploads/${selectedFile.name}` : undefined
    };

    submitHomeworkMutation.mutate(submissionData);
  };

  const getStatusBadge = (status: string, grade?: number) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />অপেক্ষমাণ</Badge>;
      case 'submitted':
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />জমা দেওয়া</Badge>;
      case 'graded':
        return (
          <Badge variant={grade && grade >= 70 ? "default" : "destructive"}>
            <CheckCircle className="w-3 h-3 mr-1" />
            মূল্যায়ন ({grade || 0}%)
          </Badge>
        );
      default:
        return <Badge variant="outline">অজানা</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-bengali">হোমওয়ার্ক সাবমিশন</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="homework-submissions-container">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="font-bengali">হোমওয়ার্ক সাবমিশন</CardTitle>
          {showSubmitForm && classId && (
            <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="submit-homework-button">
                  <Plus className="w-4 h-4 mr-2" />
                  হোমওয়ার্ক জমা দিন
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-bengali">নতুন হোমওয়ার্ক জমা দিন</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="title" className="font-bengali">শিরোনাম *</Label>
                    <Input
                      id="title"
                      value={submissionTitle}
                      onChange={(e) => setSubmissionTitle(e.target.value)}
                      placeholder="হোমওয়ার্কের শিরোনাম লিখুন"
                      className="font-bengali"
                      data-testid="homework-title-input"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description" className="font-bengali">বিবরণ</Label>
                    <Textarea
                      id="description"
                      value={submissionDescription}
                      onChange={(e) => setSubmissionDescription(e.target.value)}
                      placeholder="হোমওয়ার্ক সম্পর্কে বিস্তারিত লিখুন"
                      className="font-bengali"
                      data-testid="homework-description-input"
                    />
                  </div>

                  <div>
                    <Label htmlFor="file" className="font-bengali">ফাইল সংযুক্ত করুন</Label>
                    <div className="mt-2">
                      <Input
                        id="file"
                        type="file"
                        onChange={handleFileSelect}
                        className="font-bengali"
                        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                        data-testid="homework-file-input"
                      />
                      {selectedFile && (
                        <p className="text-sm text-muted-foreground mt-1 font-bengali">
                          নির্বাচিত: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsSubmitDialogOpen(false)}
                    >
                      বাতিল
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitHomeworkMutation.isPending}
                      data-testid="submit-homework-form-button"
                    >
                      {submitHomeworkMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          জমা দিচ্ছি...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          জমা দিন
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {submissions.length > 0 ? (
          <div className="space-y-4">
            {submissions.map((submission: HomeworkSubmission) => (
              <Card key={submission.id} className="border-l-4 border-l-islamic-green" data-testid={`homework-${submission.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <h3 className="font-medium font-bengali">{submission.title}</h3>
                        {getStatusBadge(submission.status, submission.grade)}
                      </div>
                      
                      {submission.description && (
                        <p className="text-sm text-muted-foreground mb-2 font-bengali">
                          {submission.description}
                        </p>
                      )}
                      
                      <div className="flex items-center text-xs text-muted-foreground space-x-4">
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {format(new Date(submission.submitted_at), 'dd/MM/yyyy HH:mm')}
                        </span>
                        {submission.live_classes && (
                          <span className="font-bengali">
                            ক্লাস: {submission.live_classes.title_bn || submission.live_classes.title}
                          </span>
                        )}
                        {submission.file_name && (
                          <span className="flex items-center">
                            <Download className="w-3 h-3 mr-1" />
                            {submission.file_name}
                          </span>
                        )}
                      </div>

                      {submission.feedback && (
                        <div className="mt-2 p-2 bg-muted rounded-md">
                          <p className="text-sm font-medium font-bengali">শিক্ষকের মতামত:</p>
                          <p className="text-sm font-bengali">{submission.feedback}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground font-bengali">
              এখনো কোন হোমওয়ার্ক জমা দেওয়া হয়নি।
            </p>
            {showSubmitForm && classId && (
              <p className="text-sm text-muted-foreground mt-2 font-bengali">
                উপরের "হোমওয়ার্ক জমা দিন" বোতামে ক্লিক করে আপনার প্রথম হোমওয়ার্ক জমা দিন।
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}