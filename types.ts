
export enum AgeGroup {
  Junior = '6-12', // Basic
  Senior = '12-16' // Advanced
}

export type Role = 'screen' | 'teacher' | 'student' | 'split' | null;

// Product Categories
export type ProductCategory = 'food' | 'stationery' | 'toy' | 'daily' | 'tech' | 'luxury' | 'health' | 'gift' | 'fun' | 'book' | 'sport' | 'diy' | 'office' | 'hobby';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  baseCost: number; 
  basePrice: number; 
  unlockLevel: number; // 1, 2, or 3. Shop level required to procure.
  stock: number;
  sold: number;
  quality: number; // 1-10
}

export interface ShopLevelConfig {
  level: number;
  name: string;
  description: string;
  maxStock: number;      
  maxCustomers: number;  
  upgradeCost: number;   
  imageEmoji: string;
}

export interface GameEvent {
  id: string;
  name: string;
  description: string;
  boostedCategories: ProductCategory[]; 
  priceMultiplier: number; 
  trafficMultiplier: number; 
  icon?: string; // Added icon for big screen visualization
}

// NEW: Market Fluctuation for dynamic price changes
export interface MarketFluctuation {
    category: ProductCategory;
    type: 'surge' | 'crash'; // surge = expensive cost, crash = cheap cost
    modifier: number; // e.g. 1.5 or 0.7
    reason: string;
}

export interface LogEntry {
  id: string;
  turn: number;
  message: string;
  type: 'info' | 'success' | 'warning' | 'danger';
}

export type CustomerTrait = 'price_sensitive' | 'quality_first' | 'impulsive' | 'skeptical' | 'trend_follower';

// Customer Intent Classification
export type CustomerIntent = 'buying' | 'consulting' | 'browsing' | 'returning' | 'thief';

export interface PricingThresholds {
    safe: number;   // Low margin, easy to sell (e.g., 1.2x)
    normal: number; // Normal margin, requires skill (e.g., 2.0x)
    risky: number;  // High margin, high resistance (e.g., 3.0x)
}

export interface MarketConfig {
  economicBoom: boolean; 
  skepticismLevel: 'low' | 'medium' | 'high'; 
  customerTraffic: number; 
  roundDuration: number; 
  
  // NEW: "Card Hand" Logic
  baseCustomerCount: number; // Fixed number of customers dealt per round (e.g., 3)
  customerSpawnRate?: number; // legacy support
  
  initialFunds: number; // Configurable starting money
  
  storageFeeRate: number; // Cost per item per round for unsold stock
  logisticsFeeRate: number; // Cost per item when buying
  pricingThresholds: PricingThresholds; // Teacher controlled pricing logic

  // NEW: Dynamic Cost & Upgrade Controls
  hotItemSurcharge: number; // e.g. 0.2 for 20% increase
  coldItemDiscount: number; // e.g. 0.2 for 20% discount
  upgradeCostMultiplier: number; // e.g. 1.0 for normal, 0.5 for cheap upgrades

  // NEW: Smart Traffic Control
  smartTrafficEnabled: boolean;
  smartTrafficCooldown: { min: number; max: number }; // Seconds (e.g., 15-60)
  smartTrafficWave: { min: number; max: number }; // Customer count (e.g., 2-5)
}

export interface NegotiationAction {
    id: string;
    label: string; 
    category: 'emotional' | 'logical' | 'aggressive' | 'financial';
    description: string; 
    textPayload: string; // NEW: The actual text sent to AI when card is clicked
    energyCost: number; 
    // Legacy impact properties restored for compatibility
    costPercentage?: number;
    impact?: {
        [key in CustomerTrait]?: {
            interest: number;
        }
    };
}

export interface CustomerReactions {
    expensive: string; 
    cheap: string;     
    flattery: string;  
    logic: string;     
    angry: string;     
    happy: string;     
}

export interface CustomerCard {
  id: string;
  name: string;
  avatar: string;
  age: number;
  trait: CustomerTrait; 
  traitLabel: string; 
  
  // REPLACED: budget is removed in favor of willingnessMultiplier
  // This represents how many times the BASE COST they are willing to pay (e.g. 1.5x)
  willingnessMultiplier: number; 
  
  intent: CustomerIntent; 
  
  preferredCategories: ProductCategory[]; 
  
  story: string; 
  need: string; 
  
  dialogueOpening: string; 
  reactions: CustomerReactions;
  
  purchaseQuantity: number;
  
  basePatience: number; 
  baseInterest: number; 
}

export interface ChatMessage {
    sender: 'user' | 'customer' | 'system';
    text: string;
}

export interface PlayerState {
  id: string;
  name: string;
  shopName: string;
  shopLogo: string | null; 
  avatar?: string | null;
  funds: number;
  inventory: Product[];
  logs: LogEntry[];
  totalProfit: number;
  lastTurnProfit: number;
  marketingLevel: number; 
  currentTurn: number;
  status: 'lobby' | 'ready' | 'procuring' | 'playing' | 'waiting_close' | 'finished';
  
  // Market Competition Mechanics
  reputation: number; // 0-100, affects organic traffic
  activeCampaign: 'none' | 'flyer' | 'influencer'; // Marketing boost for current round
  serverCustomerQueue: CustomerCard[]; // This is now the "Hand" of customers
  processedCustomerCount: number; // Tracks how many customers from the queue have been handled locally
}

// --- NETWORK TYPES ---
export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

export interface P2PPayload {
    type: 'GAME_SYNC' | 'PLAYER_UPDATE' | 'GAME_EVENT';
    payload: any;
}

export interface GameSyncPayload {
    eventName: string; 
    ageGroup: AgeGroup; // CRITICAL: Sync AgeGroup to clients
    isGameStarted: boolean;
    isRunning: boolean;
    timeLeft: number;
    roundNumber: number;
    currentGlobalEvent: GameEvent;
    marketConfig: MarketConfig;
    marketFluctuation: MarketFluctuation | null;
    players: PlayerState[]; 
    recentEvents: string[];
}
