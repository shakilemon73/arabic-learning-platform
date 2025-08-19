/**
 * ModeratorManager - Room moderation and control
 */

import { EventEmitter } from './EventEmitter';
import { SupabaseClient } from '@supabase/supabase-js';

export class ModeratorManager extends EventEmitter {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    super();
    this.supabase = supabase;
  }

  cleanup(): void {
    this.removeAllListeners();
  }
}