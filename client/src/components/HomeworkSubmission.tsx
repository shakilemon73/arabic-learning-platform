import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, X, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface HomeworkSubmissionProps {
  sessionId: string;
  userId: string;
  onClose: () => void;
}

interface FileUpload {
  file: File;
  preview?: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
}

export default function HomeworkSubmission({ 
  sessionId, 
  userId, 
  onClose 
}: HomeworkSubmissionProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    
    const newFiles: FileUpload[] = selectedFiles.map(file => {
      const fileUpload: FileUpload = {
        file,
        progress: 0,
        status: 'pending'
      };

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          fileUpload.preview = e.target?.result as string;
          setFiles(prev => [...prev]);
        };
        reader.readAsDataURL(file);
      }

      return fileUpload;
    });

    setFiles(prev => [...prev, ...newFiles]);
    
    // Clear the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFile = async (file: File, onProgress: (progress: number) => void): Promise<string> => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionId', sessionId);
      formData.append('userId', userId);

      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          resolve(response.fileUrl);
        } else {
          reject(new Error('Upload failed'));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload error'));
      });

      xhr.open('POST', '/api/upload-homework-file');
      xhr.send(formData);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast({
        title: "শিরোনাম প্রয়োজন",
        description: "দয়া করে হোমওয়ার্কের শিরোনাম লিখুন",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload all files
      const uploadedFiles = [];
      
      for (let i = 0; i < files.length; i++) {
        const fileUpload = files[i];
        fileUpload.status = 'uploading';
        setFiles([...files]);

        try {
          const fileUrl = await uploadFile(fileUpload.file, (progress) => {
            fileUpload.progress = progress;
            setFiles([...files]);
          });

          fileUpload.status = 'completed';
          uploadedFiles.push({
            fileName: fileUpload.file.name,
            fileUrl,
            fileSize: fileUpload.file.size,
          });
        } catch (error) {
          fileUpload.status = 'error';
          console.error('File upload failed:', error);
        }
        
        setFiles([...files]);
      }

      // Submit homework
      const submissionData = {
        title: title.trim(),
        description: description.trim(),
        files: uploadedFiles,
        sessionId,
      };

      const response = await fetch('/api/homework/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        throw new Error('Submission failed');
      }

      const result = await response.json();

      toast({
        title: "হোমওয়ার্ক জমা দিয়েছেন",
        description: "আপনার হোমওয়ার্ক সফলভাবে জমা দেওয়া হয়েছে",
      });

      // Reset form
      setTitle('');
      setDescription('');
      setFiles([]);
      onClose();

    } catch (error) {
      console.error('Submission error:', error);
      toast({
        title: "জমা দিতে ব্যর্থ",
        description: "হোমওয়ার্ক জমা দিতে সমস্যা হয়েছে",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title" className="font-bengali">
          শিরোনাম *
        </Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="হোমওয়ার্কের শিরোনাম লিখুন"
          className="font-bengali"
          required
          data-testid="homework-title"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="font-bengali">
          বিবরণ
        </Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="হোমওয়ার্ক সম্পর্কে অতিরিক্ত তথ্য (ঐচ্ছিক)"
          className="font-bengali min-h-24"
          data-testid="homework-description"
        />
      </div>

      <div className="space-y-4">
        <Label className="font-bengali">ফাইল আপলোড</Label>
        
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="w-full border-dashed border-2 h-20 font-bengali"
          data-testid="file-upload-button"
        >
          <Upload className="w-6 h-6 mr-2" />
          ফাইল নির্বাচন করুন (PDF, ছবি, ডকুমেন্ট)
        </Button>
        
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          multiple
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
          className="hidden"
          data-testid="file-input"
        />

        {files.length > 0 && (
          <div className="space-y-3">
            {files.map((fileUpload, index) => (
              <Card key={index} className="p-4">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {fileUpload.preview ? (
                        <img
                          src={fileUpload.preview}
                          alt="Preview"
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <FileText className="w-8 h-8 text-muted-foreground" />
                      )}
                      
                      <div>
                        <p className="text-sm font-medium truncate max-w-48">
                          {fileUpload.file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(fileUpload.file.size)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {fileUpload.status === 'uploading' && (
                        <div className="w-20">
                          <Progress value={fileUpload.progress} className="h-2" />
                        </div>
                      )}
                      
                      {fileUpload.status === 'completed' && (
                        <Check className="w-5 h-5 text-green-500" />
                      )}
                      
                      {fileUpload.status === 'error' && (
                        <X className="w-5 h-5 text-red-500" />
                      )}
                      
                      {fileUpload.status === 'pending' && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          data-testid={`remove-file-${index}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {fileUpload.status === 'uploading' && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>আপলোড হচ্ছে...</span>
                        <span>{fileUpload.progress}%</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-3">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isSubmitting}
          data-testid="cancel-homework"
        >
          বাতিল
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || !title.trim()}
          className="btn-kinetic"
          data-testid="submit-homework-final"
        >
          {isSubmitting ? 'জমা দেওয়া হচ্ছে...' : 'জমা দিন'}
        </Button>
      </div>
    </form>
  );
}