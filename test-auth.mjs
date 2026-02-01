#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://atydffkpyvxcmzxyibhj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0eWRmZmtweXZ4Y216eHlpYmhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMjI2MTIsImV4cCI6MjA3NDg5ODYxMn0.aO9TgPSM0-tSm9Beh0r0BG-KUjL8UeFXYxSp-TFfqEE";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testAuth() {
  try {
    console.log("Testing Supabase authentication...");
    
    // Try to login as a test user
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'altbayi@test.com',
      password: 'TestPassword123!'
    });
    
    if (error) {
      console.error('Login error:', error.message);
      
      // Try to create a test user if doesn't exist
      console.log("\nAttempting to create test user...");
      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: 'altbayi@test.com',
        password: 'TestPassword123!',
        options: {
          data: {
            rol: 'Alt Bayi',
            tam_ad: 'Test Alt Bayi'
          }
        }
      });
      
      if (signupError) {
        console.error('Signup error:', signupError.message);
      } else {
        console.log('Signup successful:', signupData.user?.id);
      }
    } else {
      console.log('Login successful! User ID:', data.user?.id);
      console.log('Session access token:', data.session?.access_token?.substring(0, 20) + '...');
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

testAuth();
