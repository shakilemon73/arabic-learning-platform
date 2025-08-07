// Sample data insertion script for Supabase
import { supabase } from '../lib/supabase';

export async function insertSampleData() {
  console.log('🌱 Inserting sample data...');

  try {
    // Sample course modules
    const { error: moduleError } = await supabase
      .from('course_modules')
      .upsert([
        {
          id: '11111111-1111-1111-1111-111111111111',
          title: 'Arabic Alphabet and Basic Reading',
          title_bn: 'আরবি বর্ণমালা ও প্রাথমিক পড়া',
          description: 'Learn the Arabic alphabet and basic reading skills',
          description_bn: 'আরবি বর্ণমালা এবং প্রাথমিক পড়ার দক্ষতা শিখুন',
          level: 1,
          order: 1,
          is_active: true
        },
        {
          id: '22222222-2222-2222-2222-222222222222',
          title: 'Basic Grammar and Sentence Structure',
          title_bn: 'মৌলিক ব্যাকরণ ও বাক্য গঠন',
          description: 'Introduction to Arabic grammar and sentence formation',
          description_bn: 'আরবি ব্যাকরণ ও বাক্য গঠনের পরিচয়',
          level: 2,
          order: 2,
          is_active: true
        },
        {
          id: '33333333-3333-3333-3333-333333333333',
          title: 'Quranic Arabic and Religious Texts',
          title_bn: 'কুরআনিক আরবি ও ধর্মীয় পাঠ্য',
          description: 'Understanding Quranic Arabic and religious terminology',
          description_bn: 'কুরআনিক আরবি এবং ধর্মীয় পরিভাষা বোঝা',
          level: 3,
          order: 3,
          is_active: true
        }
      ]);

    if (moduleError) throw moduleError;
    console.log('✅ Course modules inserted');

    // Sample instructors
    const { error: instructorError } = await supabase
      .from('instructors')
      .upsert([
        {
          id: 'aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          name: 'Dr. Ahmed Hassan',
          name_bn: 'ড. আহমেদ হাসান',
          email: 'ahmed.hassan@example.com',
          bio: 'PhD in Arabic Literature with 15 years of teaching experience',
          bio_bn: 'আরবি সাহিত্যে পিএইচডি, ১৫ বছরের শিক্ষকতার অভিজ্ঞতা',
          qualifications: 'PhD in Arabic Literature, MA in Islamic Studies',
          qualifications_bn: 'আরবি সাহিত্যে পিএইচডি, ইসলামিক স্টাডিজে এমএ',
          is_active: true
        },
        {
          id: 'bbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          name: 'Ustada Fatima Ali',
          name_bn: 'উস্তাদা ফাতিমা আলী',
          email: 'fatima.ali@example.com',
          bio: 'Specialist in Quranic Arabic with focus on modern teaching methods',
          bio_bn: 'আধুনিক শিক্ষা পদ্ধতির উপর দৃষ্টি নিবদ্ধ করে কুরআনিক আরবির বিশেষজ্ঞ',
          qualifications: 'MA in Quranic Studies, Certificate in Modern Language Teaching',
          qualifications_bn: 'কুরআনিক স্টাডিজে এমএ, আধুনিক ভাষা শিক্ষায় সার্টিফিকেট',
          is_active: true
        }
      ]);

    if (instructorError) throw instructorError;
    console.log('✅ Instructors inserted');

    // Sample live classes
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date();
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    const threeDaysLater = new Date();
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);

    const { error: classError } = await supabase
      .from('live_classes')
      .upsert([
        {
          id: 'ccccccc-cccc-cccc-cccc-cccccccccccc',
          title: 'Arabic Alphabet Basics',
          title_bn: 'আরবি বর্ণমালার মৌলিক বিষয়',
          description: 'Introduction to Arabic letters and pronunciation',
          description_bn: 'আরবি অক্ষর এবং উচ্চারণের পরিচয়',
          module_id: '11111111-1111-1111-1111-111111111111',
          instructor_id: 'aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          scheduled_at: tomorrow.toISOString(),
          duration: 90,
          max_participants: 30,
          current_participants: 8,
          is_active: true
        },
        {
          id: 'ddddddd-dddd-dddd-dddd-dddddddddddd',
          title: 'Reading Practice Session',
          title_bn: 'পড়ার অনুশীলন সেশন',
          description: 'Practice reading Arabic text with proper pronunciation',
          description_bn: 'সঠিক উচ্চারণসহ আরবি পাঠ্য পড়ার অনুশীলন',
          module_id: '11111111-1111-1111-1111-111111111111',
          instructor_id: 'bbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          scheduled_at: dayAfterTomorrow.toISOString(),
          duration: 60,
          max_participants: 25,
          current_participants: 12,
          is_active: true
        },
        {
          id: 'eeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
          title: 'Grammar Fundamentals',
          title_bn: 'ব্যাকরণের মৌলিক বিষয়',
          description: 'Basic Arabic grammar rules and sentence structure',
          description_bn: 'আরবি ব্যাকরণের মৌলিক নিয়ম ও বাক্য গঠন',
          module_id: '22222222-2222-2222-2222-222222222222',
          instructor_id: 'aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          scheduled_at: threeDaysLater.toISOString(),
          duration: 75,
          max_participants: 30,
          current_participants: 5,
          is_active: true
        }
      ]);

    if (classError) throw classError;
    console.log('✅ Live classes inserted');

    console.log('🎉 Sample data insertion completed successfully!');
    return { success: true };

  } catch (error) {
    console.error('❌ Error inserting sample data:', error);
    return { success: false, error };
  }
}