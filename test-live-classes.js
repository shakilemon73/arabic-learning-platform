// Test script to check live classes data
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sgyanvjlwlrzcrpjwlsd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNneWFudmpsd2xyemNycGp3bHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NTg1MjAsImV4cCI6MjA3MDEzNDUyMH0.5xjMdSUdeHGln68tfuw626q4xDZkuR8Xg_e_w6g9iJk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testQueries() {
  console.log('Testing Supabase live classes queries...\n');
  
  // Test 1: Count all live_classes
  console.log('1. Counting all live_classes...');
  const { data: countData, error: countError } = await supabase
    .from('live_classes')
    .select('*', { count: 'exact' });
  
  if (countError) {
    console.error('Count error:', countError);
  } else {
    console.log(`Total live_classes: ${countData.length}`);
  }

  // Test 2: Simple query without joins
  console.log('\n2. Simple query without joins...');
  const { data: simpleData, error: simpleError } = await supabase
    .from('live_classes')
    .select('*')
    .eq('is_active', true);
    
  if (simpleError) {
    console.error('Simple query error:', simpleError);
  } else {
    console.log(`Active classes (simple): ${simpleData.length}`);
    if (simpleData.length > 0) {
      console.log('First class:', simpleData[0]);
    }
  }

  // Test 3: Query with joins (as used in api.ts)
  console.log('\n3. Query with joins (api.ts style)...');
  const { data: joinData, error: joinError } = await supabase
    .from('live_classes')
    .select(`
      id,
      title,
      title_bn,
      description,
      description_bn,
      module_id,
      instructor_id,
      scheduled_at,
      duration,
      meeting_url,
      recording_url,
      max_participants,
      is_active,
      created_at,
      course_modules (
        title,
        title_bn,
        level
      ),
      instructors (
        name,
        name_bn,
        email
      )
    `)
    .eq('is_active', true)
    .order('scheduled_at')
    .limit(20);
    
  if (joinError) {
    console.error('Join query error:', joinError);
  } else {
    console.log(`Active classes (with joins): ${joinData.length}`);
    if (joinData.length > 0) {
      console.log('First class with joins:', joinData[0]);
    }
  }

  // Test 4: Check related tables
  console.log('\n4. Checking related tables...');
  const { data: modulesData, error: modulesError } = await supabase
    .from('course_modules')
    .select('*')
    .limit(5);
    
  if (modulesError) {
    console.error('Modules error:', modulesError);
  } else {
    console.log(`Course modules: ${modulesData.length}`);
  }

  const { data: instructorsData, error: instructorsError } = await supabase
    .from('instructors')
    .select('*')
    .limit(5);
    
  if (instructorsError) {
    console.error('Instructors error:', instructorsError);
  } else {
    console.log(`Instructors: ${instructorsData.length}`);
  }
}

testQueries().catch(console.error);