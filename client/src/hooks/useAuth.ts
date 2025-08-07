// Legacy auth hook - use useSupabaseAuth instead
import { useSupabaseAuth } from "./useSupabaseAuth";

export function useAuth() {
  return useSupabaseAuth();
}
