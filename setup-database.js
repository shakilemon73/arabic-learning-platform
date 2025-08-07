// Database setup script using Supabase client
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://sgyanvjlwlrzcrpjwlsd.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNneWFudmpsd2xyemNycGp3bHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NTg1MjAsImV4cCI6MjA3MDEzNDUyMH0.5xjMdSUdeHGln68tfuw626q4xDZkuR8Xg_e_w6g9iJk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDatabase() {
  console.log('🔧 Setting up Arabic Learning Platform Database...');
  
  try {
    // Check connection
    const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });
    if (error && !error.message.includes('does not exist')) {
      throw error;
    }
    
    console.log('✅ Database connection successful');
    
    // Read and log the schema (we'll apply it manually via Supabase dashboard)
    const schemaPath = join(__dirname, 'database-schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      console.log('📋 Database schema ready to apply via Supabase SQL Editor:');
      console.log('Copy and run the following in your Supabase SQL Editor:');
      console.log('=' .repeat(60));
      console.log(schema);
      console.log('=' .repeat(60));
    }
    
    // Insert sample data for development
    console.log('🌱 Setting up sample data...');
    await setupSampleData();
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
  }
}

async function setupSampleData() {
  // Sample course modules
  const sampleModules = [
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
  ];

  // Sample instructors
  const sampleInstructors = [
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
  ];

  // Sample live classes
  const sampleClasses = [
    {
      id: 'ccccccc-cccc-cccc-cccc-cccccccccccc',
      title: 'Arabic Alphabet Basics',
      title_bn: 'আরবি বর্ণমালার মৌলিক বিষয়',
      description: 'Introduction to Arabic letters and pronunciation',
      description_bn: 'আরবি অক্ষর এবং উচ্চারণের পরিচয়',
      module_id: '11111111-1111-1111-1111-111111111111',
      instructor_id: 'aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      duration: 90,
      max_participants: 30,
      current_participants: 0,
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
      scheduled_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // Day after tomorrow
      duration: 60,
      max_participants: 25,
      current_participants: 0,
      is_active: true
    }
  ];

  try {
    // Note: We'll create these via the database interface once schema is applied
    console.log('📝 Sample data prepared for:');
    console.log(`- ${sampleModules.length} course modules`);
    console.log(`- ${sampleInstructors.length} instructors`);
    console.log(`- ${sampleClasses.length} live classes`);
    console.log('🔧 Apply database schema first, then run data insertion');
    
  } catch (error) {
    console.log('ℹ️ Tables not yet created, please apply schema first');
  }
}

setupDatabase();