/**
 * Extension-specific TypeScript types
 */

// Add your custom types here

export interface MyItem {
  id: string;
  name: string;
  createdAt: string;
}

// Re-export shared types for convenience
export type { 
  AuthStore, 
  UserInfo, 
  SubscriptionInfo 
} from "@dracon/wxt-shared/storage";

export type { 
  DraconConfig, 
  Environment 
} from "@dracon/wxt-shared/config";
