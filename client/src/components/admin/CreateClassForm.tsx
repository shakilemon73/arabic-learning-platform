import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createLiveClass, getCourseModules, getAllInstructors } from "@/lib/api";
import { Calendar, Clock, Users, X } from "lucide-react";
import { format } from "date-fns";

const createClassSchema = z.object({
  title: z.string().min(1, "ইংরেজি শিরোনাম প্রয়োজন"),
  title_bn: z.string().min(1, "বাংলা শিরোনাম প্রয়োজন"),
  description: z.string().optional(),
  description_bn: z.string().optional(),
  module_id: z.string().optional(),
  instructor_id: z.string().optional(),
  scheduled_at: z.string().min(1, "ক্লাসের তারিখ ও সময় প্রয়োজন"),
  duration: z.number().min(30, "কমপক্ষে ৩০ মিনিট").max(180, "সর্বোচ্চ ১৮০ মিনিট"),
  max_participants: z.number().min(1).max(100),
  is_active: z.boolean().default(true)
});

type CreateClassFormData = z.infer<typeof createClassSchema>;

interface CreateClassFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateClassForm({ onClose, onSuccess }: CreateClassFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CreateClassFormData>({
    resolver: zodResolver(createClassSchema),
    defaultValues: {
      title: "",
      title_bn: "",
      description: "",
      description_bn: "",
      module_id: "",
      instructor_id: "",
      scheduled_at: "",
      duration: 90,
      max_participants: 30,
      is_active: true
    }
  });

  // Fetch course modules and instructors
  const { data: modules = [] } = useQuery({
    queryKey: ['course-modules'],
    queryFn: getCourseModules
  });

  const { data: instructors = [] } = useQuery({
    queryKey: ['instructors'],
    queryFn: getAllInstructors
  });

  const createClassMutation = useMutation({
    mutationFn: createLiveClass,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-classes'] });
      toast({
        title: "ক্লাস তৈরি সফল হয়েছে",
        description: "নতুন লাইভ ক্লাস সফলভাবে তৈরি করা হয়েছে।",
      });
      onSuccess();
      onClose();
    },
    onError: (error) => {
      console.error('Failed to create class:', error);
      toast({
        title: "ক্লাস তৈরিতে ব্যর্থ",
        description: "দয়া করে আবার চেষ্টা করুন।",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: CreateClassFormData) => {
    createClassMutation.mutate({
      ...data,
      module_id: data.module_id || null,
      instructor_id: data.instructor_id || null,
      description: data.description || null,
      description_bn: data.description_bn || null,
      meeting_url: null,
      recording_url: null
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold text-islamic-green">
              নতুন লাইভ ক্লাস তৈরি করুন
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">মৌলিক তথ্য</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">ইংরেজি শিরোনাম *</Label>
                  <Input
                    id="title"
                    {...form.register("title")}
                    placeholder="Arabic Grammar Basics"
                  />
                  {form.formState.errors.title && (
                    <p className="text-sm text-red-600">{form.formState.errors.title.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="title_bn">বাংলা শিরোনাম *</Label>
                  <Input
                    id="title_bn"
                    {...form.register("title_bn")}
                    placeholder="আরবি ব্যাকরণের মূলনীতি"
                  />
                  {form.formState.errors.title_bn && (
                    <p className="text-sm text-red-600">{form.formState.errors.title_bn.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="description">ইংরেজি বিবরণ</Label>
                  <Textarea
                    id="description"
                    {...form.register("description")}
                    placeholder="Class description in English"
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="description_bn">বাংলা বিবরণ</Label>
                  <Textarea
                    id="description_bn"
                    {...form.register("description_bn")}
                    placeholder="ক্লাসের বিবরণ বাংলায়"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Class Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">ক্লাসের বিস্তারিত</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="module_id">কোর্স মডিউল</Label>
                  <Select onValueChange={(value) => form.setValue("module_id", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="মডিউল নির্বাচন করুন" />
                    </SelectTrigger>
                    <SelectContent>
                      {modules.map((module) => (
                        <SelectItem key={module.id} value={module.id}>
                          {module.title_bn} - স্তর {module.level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="instructor_id">প্রশিক্ষক</Label>
                  <Select onValueChange={(value) => form.setValue("instructor_id", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="প্রশিক্ষক নির্বাচন করুন" />
                    </SelectTrigger>
                    <SelectContent>
                      {instructors.map((instructor) => (
                        <SelectItem key={instructor.id} value={instructor.id}>
                          {instructor.name_bn || instructor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="scheduled_at">তারিখ ও সময় *</Label>
                  <Input
                    id="scheduled_at"
                    type="datetime-local"
                    {...form.register("scheduled_at")}
                  />
                  {form.formState.errors.scheduled_at && (
                    <p className="text-sm text-red-600">{form.formState.errors.scheduled_at.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="duration">সময়কাল (মিনিট) *</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="30"
                    max="180"
                    {...form.register("duration", { valueAsNumber: true })}
                  />
                  {form.formState.errors.duration && (
                    <p className="text-sm text-red-600">{form.formState.errors.duration.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="max_participants">সর্বোচ্চ অংশগ্রহণকারী *</Label>
                  <Input
                    id="max_participants"
                    type="number"
                    min="1"
                    max="100"
                    {...form.register("max_participants", { valueAsNumber: true })}
                  />
                  {form.formState.errors.max_participants && (
                    <p className="text-sm text-red-600">{form.formState.errors.max_participants.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-4 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                বাতিল
              </Button>
              <Button 
                type="submit" 
                disabled={createClassMutation.isPending}
                className="bg-islamic-green hover:bg-dark-green"
              >
                {createClassMutation.isPending ? 'তৈরি করা হচ্ছে...' : 'ক্লাস তৈরি করুন'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}