const { Client } = require('pg');

// Your Supabase database connection
const connectionString = 'postgresql://postgres.sgyanvjlwlrzcrpjwlsd:Ss049emon049@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres';

const client = new Client({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function fixDatabase() {
  try {
    console.log('🔌 Connecting to Supabase database...');
    await client.connect();
    console.log('✅ Connected to Supabase!');

    // First, check if users table exists
    console.log('\n📋 Checking existing tables...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'user_profiles')
    `);
    
    console.log('Existing tables:', tablesResult.rows.map(r => r.table_name));

    // Check auth.users table
    console.log('\n👥 Checking auth.users table...');
    const authUsersResult = await client.query(`
      SELECT id, email, created_at 
      FROM auth.users 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    console.log('Auth users found:', authUsersResult.rows.length);
    authUsersResult.rows.forEach(user => {
      console.log(`- ${user.email} (${user.id})`);
    });

    // Create users table if it doesn't exist
    console.log('\n🛠️ Creating/updating users table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
          id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
          email varchar NOT NULL UNIQUE,
          first_name varchar,
          last_name varchar,
          phone varchar,
          avatar_url varchar,
          enrollment_status varchar DEFAULT 'pending' CHECK (enrollment_status IN ('pending', 'active', 'suspended', 'completed')),
          payment_status varchar DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue', 'canceled')),
          course_progress integer DEFAULT 0 CHECK (course_progress >= 0 AND course_progress <= 100),
          classes_attended integer DEFAULT 0 CHECK (classes_attended >= 0),
          certificate_score integer DEFAULT 0 CHECK (certificate_score >= 0 AND certificate_score <= 100),
          role varchar DEFAULT 'student' CHECK (role IN ('student', 'instructor', 'admin')),
          created_at timestamptz DEFAULT NOW(),
          updated_at timestamptz DEFAULT NOW()
      );
    `);
    console.log('✅ Users table created/verified');

    // Create trigger function for auto-updating updated_at
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    console.log('✅ Updated_at trigger created');

    // Create auto-profile creation function
    await client.query(`
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS trigger
      LANGUAGE plpgsql
      SECURITY DEFINER SET search_path = public
      AS $$
      BEGIN
          INSERT INTO public.users (id, email, first_name, last_name)
          VALUES (
              NEW.id,
              NEW.email,
              COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
              COALESCE(NEW.raw_user_meta_data->>'last_name', '')
          );
          RETURN NEW;
      EXCEPTION
          WHEN unique_violation THEN
              RETURN NEW;
      END;
      $$;
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
      CREATE TRIGGER on_auth_user_created
          AFTER INSERT ON auth.users
          FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    `);
    console.log('✅ Auto-profile creation trigger created');

    // Enable RLS
    await client.query(`ALTER TABLE users ENABLE ROW LEVEL SECURITY;`);
    
    // Create RLS policies
    await client.query(`
      DROP POLICY IF EXISTS "Users can view own profile" ON users;
      CREATE POLICY "Users can view own profile" ON users
          FOR SELECT USING (auth.uid() = id);
    `);
    
    await client.query(`
      DROP POLICY IF EXISTS "Users can update own profile" ON users;
      CREATE POLICY "Users can update own profile" ON users
          FOR UPDATE USING (auth.uid() = id);
    `);
    
    await client.query(`
      DROP POLICY IF EXISTS "Service role can manage all users" ON users;
      CREATE POLICY "Service role can manage all users" ON users
          FOR ALL USING (auth.role() = 'service_role');
    `);
    console.log('✅ RLS policies created');

    // Insert missing user profiles
    console.log('\n🔄 Creating missing user profiles...');
    const insertResult = await client.query(`
      INSERT INTO users (id, email, first_name, last_name, created_at, updated_at)
      SELECT 
          au.id,
          au.email,
          COALESCE(au.raw_user_meta_data->>'first_name', split_part(au.email, '@', 1)),
          COALESCE(au.raw_user_meta_data->>'last_name', ''),
          au.created_at,
          NOW()
      FROM auth.users au
      LEFT JOIN users u ON au.id = u.id
      WHERE u.id IS NULL
      ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          first_name = COALESCE(users.first_name, EXCLUDED.first_name),
          last_name = COALESCE(users.last_name, EXCLUDED.last_name),
          updated_at = NOW()
      RETURNING id, email;
    `);
    
    console.log(`✅ Created/updated ${insertResult.rows.length} user profiles`);
    insertResult.rows.forEach(user => {
      console.log(`- ${user.email}`);
    });

    // Final verification
    console.log('\n📊 Final verification - Users in database:');
    const finalResult = await client.query(`
      SELECT u.id, u.email, u.first_name, u.last_name, u.enrollment_status, u.created_at
      FROM users u
      ORDER BY u.created_at DESC
    `);
    
    console.log(`Total users: ${finalResult.rows.length}`);
    finalResult.rows.forEach(user => {
      console.log(`- ${user.email} | ${user.first_name || 'No name'} | Status: ${user.enrollment_status} | Created: ${user.created_at}`);
    });

    console.log('\n🎉 Database setup complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

fixDatabase();