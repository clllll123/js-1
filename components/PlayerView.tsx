
import React, { useState, useEffect, useRef } from 'react';
import { AgeGroup, Product, ShopLevelConfig, LogEntry, CustomerCard, PlayerState, MarketConfig, NegotiationAction, ProductCategory, GameEvent, CustomerTrait, ChatMessage, MarketFluctuation, ConnectionStatus } from '../types';
import { SHOP_LEVELS_JUNIOR, SHOP_LEVELS_SENIOR, PRODUCTS_JUNIOR_POOL, PRODUCTS_SENIOR_POOL, MAX_TURNS_JUNIOR, MAX_TURNS_SENIOR, getNegotiationDeck, FOLLOW_UP_ACTIONS, RECOVERY_ACTIONS, DISTRACTOR_ACTIONS, CLOSING_ACTION, CUTE_LOGOS } from '../constants';
import { analyzePerformance, interactWithAICustomer } from '../services/geminiService';
import BusinessChart from './BusinessChart';
import { Coins, ArrowLeft, Handshake, AlertCircle, Store, Search, User, X, RefreshCw, TrendingUp, Truck, Warehouse, Coffee, Megaphone, Star, Smile, Meh, Frown, AlertTriangle, Info, CheckCircle, Wifi, Send, Mic, LogOut, Tag, TrendingDown, Target, BarChart2, Flame, Upload, ArrowUp, ArrowDown, Bell, Percent, Zap, ChevronUp, ChevronDown, Bot, Siren, ShieldCheck, ArrowRight, Package, Grid } from 'lucide-react';

interface PlayerViewProps {
  ageGroup: AgeGroup;
  onBack: () => void;
  initialRoomCode?: string; // New prop for QR code auto-fill
  onJoin: (name: string, roomCode: string) => boolean;
  onUpdate: (data: Partial<PlayerState> & { name: string }) => void;
  isGameStarted: boolean;
  onGameEvent: (message: string) => void;
  marketConfig: MarketConfig;
  currentGlobalEvent: GameEvent; 
  globalRoundNumber: number; 
  serverPlayerState: PlayerState | null; 
  onCustomerAction: (customerId: string, result: 'satisfied' | 'angry') => void;
  isRoundOver: boolean;
  marketFluctuation: MarketFluctuation | null;
  recentEvents?: string[]; 
  connectionStatus?: ConnectionStatus; // Added prop
}

interface LocalPlayerState {
  hasJoined: boolean;
  roomCode?: string;
  nickname: string;
  isSetupDone: boolean; 
  isStarted: boolean;   
  currentTurn: number;
  maxTurns: number;
  phase: 'setup' | 'procure' | 'strategy' | 'sales' | 'waiting_close' | 'settlement'; 
  shopName: string;
  shopLogo: string | null;
  funds: number;
  inventory: Product[];
  logs: LogEntry[];
  lastTurnProfit: number;
  lastTurnRevenue: number;
  lastTurnCosts: number;
  totalProfit: number;
  reputation: number; 
  activeCampaign: 'none' | 'flyer' | 'influencer';
  
  shopLevelIdx: number; 
  
  customerQueue: CustomerCard[]; 
  currentCustomerIdx: number;
  lastTurnSales: { name: string; profit: number; quantity: number }[];
  isAdActive: boolean; 
}

// Simple Typewriter Component for smoother chat flow
const TypewriterText: React.FC<{ text: string; onComplete?: () => void }> = ({ text, onComplete }) => {
    const [displayed, setDisplayed] = useState('');
    
    useEffect(() => {
        let i = 0;
        // SPEED UP: Reduced from 30ms to 10ms for snappier response feel
        const speed = 10; 
        setDisplayed('');
        
        const timer = setInterval(() => {
            if (i < text.length) {
                setDisplayed(prev => prev + text.charAt(i));
                i++;
            } else {
                clearInterval(timer);
                if (onComplete) onComplete();
            }
        }, speed);

        return () => clearInterval(timer);
    }, [text]);

    return <span>{displayed}</span>;
};

const initialState: LocalPlayerState = {
  hasJoined: false,
  nickname: '',
  isSetupDone: false,
  isStarted: false,
  currentTurn: 1,
  maxTurns: 3,
  phase: 'setup',
  shopName: '',
  shopLogo: null,
  funds: 0,
  inventory: [],
  logs: [],
  lastTurnProfit: 0,
  lastTurnRevenue: 0,
  lastTurnCosts: 0,
  totalProfit: 0,
  reputation: 100,
  activeCampaign: 'none',
  shopLevelIdx: 0,
  customerQueue: [],
  currentCustomerIdx: 0,
  lastTurnSales: [],
  isAdActive: false,
};

const STORAGE_KEY = 'commercial_game_state_v9_fixed_3'; 

// Helper to calculate Demand Tier
const getDemandTier = (cat: ProductCategory, event: GameEvent): 'high' | 'medium' | 'low' => {
    if (event.boostedCategories.includes(cat)) return 'high';
    if (['food', 'daily'].includes(cat)) return 'medium'; // Staples are medium unless boosted
    return 'low';
};

const PlayerView: React.FC<PlayerViewProps> = ({ ageGroup, onBack, initialRoomCode = "", onJoin, onUpdate, isGameStarted, onGameEvent, marketConfig, currentGlobalEvent, globalRoundNumber, serverPlayerState, onCustomerAction, isRoundOver, marketFluctuation, recentEvents = [], connectionStatus = 'connected' }) => {
  const isJunior = ageGroup === AgeGroup.Junior;
  const bottomRef = useRef<HTMLDivElement>(null);

  // --- CONFIG LOADING ---
  const shopLevels = isJunior ? SHOP_LEVELS_JUNIOR : SHOP_LEVELS_SENIOR;
  const productPool = isJunior ? PRODUCTS_JUNIOR_POOL : PRODUCTS_SENIOR_POOL;
  const maxTurns = isJunior ? MAX_TURNS_JUNIOR : MAX_TURNS_SENIOR;

  // --- THEME CONFIGURATION ---
  // Improved contrast for Senior theme
  const theme = isJunior ? {
      bg: 'bg-amber-50', 
      pattern: 'bg-[radial-gradient(#fcd34d_1px,transparent_1px)] [background-size:20px_20px]',
      cardBg: 'bg-white', 
      textMain: 'text-gray-900', 
      textSec: 'text-gray-500',
      textMuted: 'text-gray-400',
      accent: 'bg-orange-500', 
      accentHover: 'active:bg-orange-600', 
      border: 'border-orange-200',
      borderSec: 'border-gray-100', // Secondary border
      highlight: 'bg-orange-50',
      buttonText: 'text-white',
      input: 'bg-white border-2 border-orange-200 text-gray-900',
      shadow: 'shadow-[4px_4px_0px_0px_rgba(251,146,60,0.3)]',
      panelBg: 'bg-gray-50',
      divider: 'border-gray-200'
  } : {
      bg: 'bg-slate-950', 
      pattern: 'bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]',
      cardBg: 'bg-slate-800', // Lighter than bg for card visibility
      textMain: 'text-slate-100', 
      textSec: 'text-slate-300', // Lighter grey for readability
      textMuted: 'text-slate-500',
      accent: 'bg-blue-600', 
      accentHover: 'active:bg-blue-700', 
      border: 'border-slate-700',
      borderSec: 'border-slate-700',
      highlight: 'bg-blue-900/20',
      buttonText: 'text-white',
      input: 'bg-slate-900 border border-slate-700 text-white',
      shadow: 'shadow-[0_0_20px_rgba(37,99,235,0.15)]',
      panelBg: 'bg-slate-900',
      divider: 'border-slate-700'
  };

  const [state, setState] = useState<LocalPlayerState>(initialState);
  const [isRestoring, setIsRestoring] = useState(true);
  
  // Login State - Use initialRoomCode from props
  const [roomCodeInput, setRoomCodeInput] = useState(initialRoomCode);
  const [nicknameInput, setNicknameInput] = useState('');

  // Setup State
  const [customName, setCustomName] = useState('');
  const [selectedLogoEmoji, setSelectedLogoEmoji] = useState<string | null>(null);
  const [isSettingUp, setIsSettingUp] = useState(false);

  // Procure State
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>('food');
  const [tempInventory, setTempInventory] = useState<{[id: string]: number}>({}); 
  const [tempPrices, setTempPrices] = useState<{[key: string]: number}>({});
  const [selectedCampaign, setSelectedCampaign] = useState<'none'|'flyer'|'influencer'>('none');
  const [analysis, setAnalysis] = useState<string>('');

  // Battle State
  const [battlePhase, setBattlePhase] = useState<'intro' | 'negotiation' | 'result' | 'thief_chase'>('intro');
  const [selectedProductForSale, setSelectedProductForSale] = useState<Product | null>(null);
  const [customerInterest, setCustomerInterest] = useState(0); 
  const [customerPatience, setCustomerPatience] = useState(100);
  const [battleLog, setBattleLog] = useState<ChatMessage[]>([]);
  const [handCards, setHandCards] = useState<NegotiationAction[]>([]);
  const [battleResult, setBattleResult] = useState<'sold' | 'lost' | 'recovered' | null>(null);
  const [turnSalesData, setTurnSalesData] = useState<{[key: string]: { profit: number; quantity: number }}>({});
  const [showProfileCard, setShowProfileCard] = useState(true);
  
  // NEW: Track haggling rounds to force end
  const [haggleRoundCount, setHaggleRoundCount] = useState(0);

  // Chat Input State
  const [chatInput, setChatInput] = useState('');
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [thinkingText, setThinkingText] = useState('');
  const [aiApiStatus, setAiApiStatus] = useState<'idle' | 'error' | 'ok'>('idle');
  
  // Discount Menu Toggle
  const [showDiscountMenu, setShowDiscountMenu] = useState(false);

  // Toast / Announcement State
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const lastEventRef = useRef<string | null>(null);

  // --- VISUAL BROADCAST LOGIC ---
  useEffect(() => {
      if (recentEvents.length > 0) {
          const newest = recentEvents[0];
          // Only show if it's a new message
          if (newest !== lastEventRef.current) {
              lastEventRef.current = newest;
              setToastMessage(newest);
              setShowToast(true);
              const timer = setTimeout(() => setShowToast(false), 5000); // Hide after 5s
              return () => clearTimeout(timer);
          }
      }
  }, [recentEvents]);


  // --- FORCED ROUND END HANDLING ---
  useEffect(() => {
      if (isRoundOver && state.isStarted && state.phase !== 'settlement') {
          setBattlePhase('result'); 
          performSettlement();
      }
  }, [isRoundOver, state.isStarted, state.phase]);

  // --- AUTO START NEXT TURN WHEN TEACHER RESETS ROUND ---
  useEffect(() => {
      // Check if we are in settlement phase and the global round has advanced past our local turn
      if (state.phase === 'settlement' && globalRoundNumber > state.currentTurn) {
           handleStartNextTurn();
      }
  }, [globalRoundNumber, state.phase, state.currentTurn]);

  // --- AUTO JUMP WHEN OUT OF STOCK ---
  useEffect(() => {
      const totalStock = state.inventory.reduce((sum, p) => sum + p.stock, 0);
      if (state.phase === 'sales' && totalStock === 0) {
          setTimeout(() => {
              setState(prev => ({ ...prev, phase: 'waiting_close' }));
          }, 1500);
      }
  }, [state.inventory, state.phase]);

  // --- SYNC WITH SERVER CUSTOMER QUEUE (FIXED SYNC LOGIC) ---
  useEffect(() => {
      if (state.phase === 'sales' && serverPlayerState && serverPlayerState.serverCustomerQueue.length > 0) {
          // Calculate if we are missing customers
          const missingCount = serverPlayerState.serverCustomerQueue.length - state.customerQueue.length;
          
          if (missingCount > 0) {
              // Find customers that exist on server but not locally
              const newCustomers = serverPlayerState.serverCustomerQueue.filter(
                  sc => !state.customerQueue.some(lc => lc.id === sc.id)
              );

              if (newCustomers.length > 0) {
                  // console.log("Syncing new customers:", newCustomers.length);
                  setState(prev => ({
                      ...prev,
                      customerQueue: [...prev.customerQueue, ...newCustomers]
                  }));
              }
          }
      }
  }, [serverPlayerState, state.phase, state.customerQueue.length]);

  // Handle auto-start negotiation when queue fills and we are idle
  useEffect(() => {
      if (state.phase === 'sales' && state.customerQueue.length > state.currentCustomerIdx) {
          if (battlePhase === 'intro' && !selectedProductForSale && battleLog.length === 0 && customerInterest === 0) {
               resetBattleState(state.customerQueue[state.currentCustomerIdx]);
          }
      }
  }, [state.customerQueue.length, state.currentCustomerIdx, state.phase]);


  // --- SCROLL TO BOTTOM LOGIC ---
  useEffect(() => {
      if (battleLog.length > 0 && bottomRef.current) {
          bottomRef.current.scrollIntoView({ behavior: 'smooth' });
      }
  }, [battleLog, isAIThinking]);

  // --- PERSISTENCE LOGIC ---
  useEffect(() => {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
          try {
              const parsedState = JSON.parse(savedData) as LocalPlayerState;
              if (parsedState.hasJoined && parsedState.nickname && parsedState.roomCode) {
                  // If joined via QR code, we prioritize the QR code over stored session unless they match
                  const codeToUse = initialRoomCode || parsedState.roomCode;
                  
                  // Only auto-login if the room codes match or we aren't enforcing strict match on reconnect
                  if(codeToUse === parsedState.roomCode) {
                       const success = onJoin(parsedState.nickname, parsedState.roomCode);
                       if (success) setState(parsedState);
                       else localStorage.removeItem(STORAGE_KEY);
                  }
              }
          } catch (e) {
              localStorage.removeItem(STORAGE_KEY);
          }
      }
      setIsRestoring(false);
  }, []);

  useEffect(() => {
      if (state.hasJoined && state.nickname) {
          localStorage.setItem('last_player_name', state.nickname); 
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }
  }, [state]);

  // --- SYNC TO HOST (FIXED) ---
  useEffect(() => {
      if (state.hasJoined) {
          let statusStr: 'lobby' | 'ready' | 'procuring' | 'playing' | 'waiting_close' | 'finished' = 'lobby';
          
          if (state.isStarted) {
              if (state.phase === 'sales') statusStr = 'playing';
              else if (state.phase === 'procure' || state.phase === 'strategy' || state.phase === 'settlement') statusStr = 'procuring';
              else if (state.phase === 'waiting_close') statusStr = 'waiting_close';
          } else if (state.isSetupDone) {
              statusStr = 'ready';
          }

          onUpdate({
              name: state.nickname,
              shopName: state.shopName,
              funds: state.funds,
              inventory: state.inventory, // CRITICAL FIX: Sync inventory to server
              currentTurn: state.currentTurn,
              shopLogo: state.shopLogo,
              marketingLevel: state.shopLevelIdx + 1, 
              reputation: state.reputation, 
              activeCampaign: state.activeCampaign, 
              status: statusStr,
              processedCustomerCount: state.currentCustomerIdx,
              lastTurnProfit: state.lastTurnProfit, // CRITICAL FIX: Sync Profit
              totalProfit: state.totalProfit        // CRITICAL FIX: Sync Total Profit
          });
      }
  }, [state.hasJoined, state.funds, state.inventory, state.currentTurn, state.shopName, state.isStarted, state.shopLevelIdx, state.isSetupDone, state.phase, state.reputation, state.activeCampaign, state.currentCustomerIdx, state.lastTurnProfit, state.totalProfit]);

  // --- GAME START TRIGGER ---
  useEffect(() => {
      if (state.isSetupDone && isGameStarted && !state.isStarted) {
          setState(prev => ({
              ...prev,
              isStarted: true,
              phase: 'procure'
          }));
      }
  }, [isGameStarted, state.isSetupDone, state.isStarted]);

  // --- ROUND SYNCHRONIZATION TRIGGER ---
  useEffect(() => {
      if (state.isStarted && globalRoundNumber > state.currentTurn) {
          performSettlement();
      }
  }, [globalRoundNumber, state.currentTurn, state.isStarted]);

  const performSettlement = () => {
       const salesList = Object.keys(turnSalesData).map(key => ({
           name: key,
           profit: turnSalesData[key].profit,
           quantity: turnSalesData[key].quantity
       }));

       const remainingStock = state.inventory.reduce((acc: number, p) => acc + p.stock, 0);
       const storageFeeRate = Number(marketConfig.storageFeeRate ?? 1.0) as number;
       const totalStorageFee = Math.floor(remainingStock * storageFeeRate);
       
       const finalFunds = state.funds - totalStorageFee;
       // Calculate NET profit for this round (Gross profit - storage fees)
       const roundGrossProfit = state.lastTurnProfit; 
       const roundNetProfit = roundGrossProfit - totalStorageFee; 

       setState(prev => ({ 
           ...prev, 
           phase: 'settlement', 
           lastTurnSales: salesList,
           funds: finalFunds,
           lastTurnProfit: roundNetProfit, // Update with Net
           lastTurnCosts: totalStorageFee,
           totalProfit: prev.totalProfit - totalStorageFee, // Deduct storage from total too
           activeCampaign: 'none' 
       }));
       
       analyzePerformance(`回合 ${state.currentTurn}. 净利润: ${roundNetProfit}. 口碑: ${state.reputation}.`, ageGroup).then(setAnalysis);
  };


  // --- HANDLERS ---
  const handleLogin = () => {
      if (!roomCodeInput || !nicknameInput) return;
      const success = onJoin(nicknameInput, roomCodeInput);
      if (success) {
          setState(prev => ({ ...prev, hasJoined: true, nickname: nicknameInput, roomCode: roomCodeInput }));
      } else {
          alert("加入失败：房间号错误");
      }
  };

  const completeSetup = async () => {
    setIsSettingUp(true);
    await new Promise(r => setTimeout(r, 800));
    
    let finalLogo = '🏠';
    if (selectedLogoEmoji) finalLogo = selectedLogoEmoji;
    
    setState(prev => ({
        ...prev,
        isSetupDone: true, 
        isStarted: false,  
        maxTurns,
        shopName: customName || (isJunior ? '我的小店' : '未命名店铺'),
        shopLogo: finalLogo,
        funds: isJunior ? 500 : 3000, 
        inventory: [], 
        reputation: 100
    }));
    setIsSettingUp(false);
  };

  // --- PROCUREMENT LOGIC ---
  const currentShopLevel = shopLevels[state.shopLevelIdx];
  const currentInventoryCount = state.inventory.reduce((acc: number, p) => acc + p.stock, 0);
  const logisticsRate = Number(marketConfig.logisticsFeeRate ?? 0.5) as number;
  
  const tempInventoryCount: number = (Object.values(tempInventory) as number[]).reduce((acc: number, qty: number) => acc + qty, 0);
  
  const remainingSpace = currentShopLevel.maxStock - currentInventoryCount - tempInventoryCount;
  const currentLogisticsFee = tempInventoryCount * logisticsRate;

  const CAMPAIGN_COSTS: Record<'none'|'flyer'|'influencer', number> = {
      'none': 0,
      'flyer': isJunior ? 50 : 200, 
      'influencer': isJunior ? 150 : 800 
  };

  const handleAddToTemp = (product: Product) => {
      if ((state.shopLevelIdx + 1) < product.unlockLevel) {
          alert(`该商品需要店铺等级 Lv.${product.unlockLevel} 才能解锁进货权限。`);
          return;
      }
      if (remainingSpace <= 0) {
          alert("仓库已满！");
          return;
      }
      setTempInventory(prev => ({ ...prev, [product.id]: (prev[product.id] || 0) + 1 }));
  };

  const handleRemoveFromTemp = (product: Product) => {
      setTempInventory(prev => {
          const newQty = (prev[product.id] || 0) - 1;
          if (newQty <= 0) {
              const { [product.id]: _, ...rest } = prev;
              return rest;
          }
          return { ...prev, [product.id]: newQty };
      });
  };

  const calculateDynamicCost = (item: Product) => {
      let finalCost = item.baseCost;
      let fluctuationType = '';
      
      // 1. Apply Market Fluctuation (Random Events) - Priority 1
      if (marketFluctuation && marketFluctuation.category === item.category) {
          finalCost = Math.floor(item.baseCost * marketFluctuation.modifier);
          fluctuationType = marketFluctuation.type;
      } else {
          // 2. Apply Demand-Based Pricing (Supply/Demand Logic) - Priority 2
          const demandTier = getDemandTier(item.category, currentGlobalEvent);
          if (demandTier === 'high') {
              // High Demand -> Cost Increases (Inflation)
              const surcharge = marketConfig.hotItemSurcharge || 0.2;
              finalCost = Math.ceil(item.baseCost * (1 + surcharge));
              fluctuationType = 'surge_demand'; // Special type for demand surge
          } else if (demandTier === 'low') {
              // Low Demand -> Cost Decreases (Discount)
              const discount = marketConfig.coldItemDiscount || 0.2;
              finalCost = Math.floor(item.baseCost * (1 - discount));
              fluctuationType = 'crash_demand'; // Special type for demand drop
          }
      }
      
      // Ensure cost never drops below 1
      return { cost: Math.max(1, finalCost), fluctuationType };
  };

  const finishProcure = () => {
      const cartCount = (Object.values(tempInventory) as number[]).reduce((a, b) => a + b, 0);
      if (cartCount === 0) {
          alert("请至少进货一件商品！");
          return;
      }

      let newFunds = state.funds;
      let newInventory = [...state.inventory];
      
      const cartCost = Object.entries(tempInventory).reduce((acc: number, [id, qty]) => {
          const p = productPool.find(p => p.id === id);
          if(!p) return acc;
          const { cost } = calculateDynamicCost(p);
          return acc + (cost * (qty as number));
      }, 0);

      const marketingCost = CAMPAIGN_COSTS[selectedCampaign];
      const totalCost = cartCost + currentLogisticsFee + marketingCost;

      if (newFunds < totalCost) {
          alert(`资金不足！总费用 ¥${totalCost} (含营销 ¥${marketingCost})`);
          return;
      }

      newFunds -= totalCost;

      Object.entries(tempInventory).forEach(([pid, qty]) => {
          const productDef = productPool.find(p => p.id === pid);
          if (!productDef) return;
          
          const existingItemIndex = newInventory.findIndex(p => p.id === pid);
          if (existingItemIndex >= 0) {
              newInventory[existingItemIndex] = {
                  ...newInventory[existingItemIndex],
                  stock: newInventory[existingItemIndex].stock + (qty as number)
              };
          } else {
              newInventory.push({ ...productDef, stock: (qty as number) });
          }
      });

      const prices: {[key: string]: number} = {...tempPrices};
      newInventory.forEach(p => {
          if (!prices[p.id]) prices[p.id] = p.basePrice;
      });

      setTempPrices(prices);
      setTempInventory({}); 
      setState(prev => ({ 
          ...prev, 
          funds: newFunds, 
          inventory: newInventory, 
          phase: 'strategy',
          activeCampaign: selectedCampaign 
      }));
  };

  const handleBoostTraffic = (type: 'flyer' | 'influencer') => {
      const cost = CAMPAIGN_COSTS[type];
      if (state.funds < cost) {
          alert("资金不足！");
          return;
      }
      setState(prev => ({
          ...prev,
          funds: prev.funds - cost,
          activeCampaign: type
      }));
      alert("推广成功！正在为您吸引更多顾客！");
  };

  const startSalesPhase = () => {
      setTurnSalesData({});
      setState(prev => ({
          ...prev,
          phase: 'sales',
          customerQueue: [], 
          currentCustomerIdx: 0,
          lastTurnProfit: 0, 
          lastTurnSales: []
      }));
  };

  // --- BATTLE LOGIC ---
  const resetBattleState = (customer: CustomerCard) => {
      if(!customer) return;
      
      // LOGIC: REFUND CHECK
      let processedCustomer = customer;
      if (customer.intent === 'returning') {
          const totalSold = state.inventory.reduce((acc, item) => acc + (item.sold || 0), 0);
          if (totalSold === 0) {
              processedCustomer = {
                  ...customer,
                  intent: 'browsing',
                  dialogueOpening: "我也没买过东西，就随便看看吧。",
                  traitLabel: "闲逛路人" // Update label too
              };
          }
      }

      setBattlePhase('intro');
      setBattleResult(null);
      setBattleLog([{ sender: 'customer', text: processedCustomer.dialogueOpening }]); 
      setSelectedProductForSale(null);
      setCustomerInterest(processedCustomer.baseInterest); 
      setCustomerPatience(processedCustomer.basePatience);
      setHaggleRoundCount(0); // Reset Round Count
      setShowProfileCard(true);
      setHandCards([]);
      setShowDiscountMenu(false); // Reset discount menu
      
      // Update the customer in queue if modified
      if (processedCustomer.intent !== customer.intent) {
          const newQueue = [...state.customerQueue];
          newQueue[state.currentCustomerIdx] = processedCustomer;
          setState(prev => ({ ...prev, customerQueue: newQueue }));
      }
  };
  
  const dealCards = (product: Product) => {
      const deck = getNegotiationDeck(product.category);
      setHandCards(deck);
  }

  // AI INTERACTION HANDLER
  const handleSendMessage = async (text?: string, action?: NegotiationAction, overridePrice?: number) => {
      const inputText = text || chatInput.trim();
      if (!inputText) return;

      const customer = state.customerQueue[state.currentCustomerIdx];
      const product = selectedProductForSale!;
      
      // 1. Detect Price Logic
      // Priority: overridePrice > manually typed price in text > current tempPrice > basePrice
      let negotiationPrice = overridePrice !== undefined ? overridePrice : (tempPrices[product.id] || product.basePrice);
      
      // Attempt to extract number from user text if not using quick action or override
      if (overridePrice === undefined && !action) {
          const priceMatch = inputText.match(/(\d+)/);
          if (priceMatch) {
              const detectedPrice = parseInt(priceMatch[0]);
              // Basic sanity check: Price shouldn't be insanely high or low (unless specific strategy)
              // We assume user knows what they are doing if they type a number
              if (detectedPrice > 0 && detectedPrice < product.basePrice * 10) {
                  negotiationPrice = detectedPrice;
                  // Update the temporary price state so UI reflects this new price
                  setTempPrices(prev => ({...prev, [product.id]: negotiationPrice}));
              }
          }
      }

      // 2. User Message
      setBattleLog(prev => [...prev, { sender: 'user', text: inputText }]);
      setChatInput('');
      setIsAIThinking(true);
      setAiApiStatus('idle');
      
      // Increment Haggle Round
      setHaggleRoundCount(prev => prev + 1);
      
      // NEW: Set immersive thinking status
      const thinkingStates = ["🤔 正在考虑...", "🛒 纠结要不要买...", "💭 正在盘算预算...", "👀 仔细打量商品...", "📱 发消息问朋友...", "⚖️ 对比价格中...", "🤔 有点犹豫..."];
      setThinkingText(thinkingStates[Math.floor(Math.random() * thinkingStates.length)]);

      // Scroll to bottom immediately
      if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' });

      try {
          // 3. Call AI Service with NEW PARAMS
          const currentLog: ChatMessage[] = [...battleLog, { sender: 'user', text: inputText }];
          
          // Calculate max willingness price based on internal logic
          const internalMaxPrice = product.baseCost * customer.willingnessMultiplier;

          const aiResponse = await interactWithAICustomer(
              currentLog, 
              customer, 
              product.name, 
              negotiationPrice,
              haggleRoundCount, // Pass current turn count
              internalMaxPrice // Pass calculated limit
          );
          
          setAiApiStatus('ok');

          // 4. Update State based on AI Decision
          const interestChange = aiResponse.mood_score * 5; // Scale mood to interest
          const newInterest = Math.min(100, Math.max(0, customerInterest + interestChange));
          setCustomerInterest(newInterest);
          
          setBattleLog(prev => [...prev, { sender: 'customer', text: aiResponse.text }]);

          if (aiResponse.outcome === 'deal') {
              handleSaleSuccess(customer, product, negotiationPrice);
          } else if (aiResponse.outcome === 'leave') {
              handleBattleFail("patience");
          } else {
              // Outcome is 'ongoing'
              // Generate new hand if it was a card action
              if (action) {
                  generateNextHand(action, customer.trait, newInterest);
              }
          }

      } catch (error) {
          console.error("AI Error", error);
          setAiApiStatus('error');
          setBattleLog(prev => [...prev, { sender: 'system', text: '顾客似乎在思考... (AI API连接中)' }]);
      } finally {
          setIsAIThinking(false);
      }
  };

  const handleApplyDiscount = (percentOff: number) => {
    if (!selectedProductForSale) return;
    const currentP = tempPrices[selectedProductForSale.id] || selectedProductForSale.basePrice;
    
    // Apply discount (e.g., 20% off = price * 0.8)
    const multiplier = (100 - percentOff) / 100;
    const newP = Math.floor(currentP * multiplier);
    
    // Update state
    setTempPrices(prev => ({...prev, [selectedProductForSale.id]: newP}));
    
    const msg = `好啦，给您打个${10 - (percentOff/10)}折，现价 ¥${newP}，这下满意了吧？`;
    
    // Call AI immediately with new price
    handleSendMessage(msg, undefined, newP);
    setShowDiscountMenu(false);
  };

  // --- REVISED: INTELLIGENT DIRECT DEAL LOGIC ---
  const handleDirectDeal = () => {
    // BUG FIX: Prevent direct deal if AI is currently processing
    if (!selectedProductForSale || isAIThinking) return;
    
    const customer = state.customerQueue[state.currentCustomerIdx];
    const currentPrice = tempPrices[selectedProductForSale.id] || selectedProductForSale.basePrice;

    // Add user message to log
    setBattleLog(prev => [...prev, { sender: 'user', text: "咱们别磨蹭了，就这个价格，直接成交吧！" }]);

    // Fake thinking state for UI feedback
    setIsAIThinking(true); 
    setThinkingText("💸 正在计算性价比...");

    setTimeout(() => {
        setIsAIThinking(false);
        
        // --- LOGIC UPDATE: Remove Budget, Use Willingness Multiplier ---
        const internalMaxPrice = selectedProductForSale.baseCost * customer.willingnessMultiplier;
        
        // 1. HARD LIMIT CHECK: Is price excessively high?
        // Tolerance: Can go 10% above willingness if Interest is very high
        const tolerance = customerInterest > 80 ? 1.1 : 1.0;
        
        if (currentPrice > (internalMaxPrice * tolerance)) {
             setBattleLog(prev => [...prev, { sender: 'customer', text: customer.reactions.expensive || "这价格太贵了，我肯定不能接受！" }]);
             setCustomerPatience(prev => Math.max(0, prev - 30));
             setTimeout(() => handleBattleFail("price"), 800);
             return;
        }

        // 2. INTEREST THRESHOLD CHECK
        // Price Quality Ratio: How "expensive" is this item relative to Base Cost?
        const priceRatio = currentPrice / selectedProductForSale.baseCost;
        
        let requiredInterest = 50; 

        // Dynamic Thresholds
        if (priceRatio >= 3.0) requiredInterest = 95;      
        else if (priceRatio >= 2.0) requiredInterest = 80; 
        else if (priceRatio >= 1.5) requiredInterest = 60; 
        else if (priceRatio >= 1.2) requiredInterest = 40; 
        else requiredInterest = 10;                        

        // Trait Modifiers
        if (customer.trait === 'skeptical') requiredInterest += 20; 
        if (customer.trait === 'price_sensitive' && priceRatio > 1.5) requiredInterest += 15; 
        if (customer.trait === 'impulsive') requiredInterest -= 15; 
        if (customer.trait === 'quality_first' && priceRatio > 2.0) requiredInterest -= 10; 

        // Cap requirements
        requiredInterest = Math.min(95, Math.max(5, requiredInterest));

        console.log(`[Direct Deal] Price: ${currentPrice}, MaxWilling: ${internalMaxPrice.toFixed(0)}, Ratio: ${priceRatio.toFixed(2)}, ReqInt: ${requiredInterest}`);

        if (customerInterest >= requiredInterest) {
            // SUCCESS: Deal Accepted
            setBattleLog(prev => [...prev, { sender: 'customer', text: customer.reactions.happy || "行，老板痛快！那就买了！" }]);
            setTimeout(() => handleSaleSuccess(customer, selectedProductForSale, currentPrice), 800);
        } else {
            // FAILURE: Rejected
            let rejectReason = "这价格还是有点犹豫...";
            if (priceRatio > 2.0) rejectReason = "这也太贵了，你不诚心卖啊！";
            else if (customerInterest < 30) rejectReason = "我对这东西还没那么大兴趣...";
            else rejectReason = "再便宜点或者再介绍介绍吧，我现在不想买。";

            setBattleLog(prev => [...prev, { sender: 'customer', text: rejectReason }]);
            
            // Penalty for failed pressure
            const patiencePenalty = 20;
            const newPatience = Math.max(0, customerPatience - patiencePenalty);
            setCustomerPatience(newPatience);
            
            if (newPatience <= 0) {
                setTimeout(() => handleBattleFail("patience"), 800);
            }
        }
    }, 1200); 
  };

  const generateNextHand = (lastAction: NegotiationAction | null, trait: CustomerTrait, currentInterest: number) => {
      const newHand: NegotiationAction[] = [];
      const standard = getNegotiationDeck(selectedProductForSale!.category);
      newHand.push(standard[Math.floor(Math.random() * standard.length)]);
      newHand.push(FOLLOW_UP_ACTIONS[Math.floor(Math.random() * FOLLOW_UP_ACTIONS.length)]);
      newHand.push(RECOVERY_ACTIONS[Math.floor(Math.random() * RECOVERY_ACTIONS.length)]);
      
      const shuffled = newHand.sort(() => Math.random() - 0.5);
      if (currentInterest >= 75) {
          shuffled[0] = CLOSING_ACTION;
      }
      setHandCards(shuffled);
  };

  const handleStartNegotiation = (product: Product) => {
      const customer = state.customerQueue[state.currentCustomerIdx];
      
      if (customer.intent === 'browsing') {
           setBattleLog(prev => [
              ...prev,
              { sender: 'user', text: "欢迎光临，随便看看！" },
              { sender: 'customer', text: "嗯，我就看看，别太热情。" }
          ]);
      }

      if (customer.intent === 'returning') {
          return; 
      }

      setSelectedProductForSale(product);
      setBattlePhase('negotiation'); 
      setShowProfileCard(false);
      
      const isMatch = customer.preferredCategories.includes(product.category);
      const isEventItem = currentGlobalEvent?.boostedCategories.includes(product.category);

      let baseInt = customer.baseInterest;
      
      let customerReaction = "";
      
      const price = tempPrices[product.id] || product.basePrice;
      const priceRatio = price / product.baseCost; 
      const effectiveRatio = isEventItem ? priceRatio * 0.8 : priceRatio;

      if (customer.intent === 'buying') {
          if (isMatch) {
              baseInt = 80;
              customerReaction = customer.reactions?.happy || "这正是我要找的！价格也很合适，我想要这个。";
          } else {
              customerReaction = "这根本不是我要的东西！";
              baseInt = 20; 
          }
      } 
      else {
          if (isMatch) {
            baseInt += 30; 
            customerReaction = "哦！我正好在找这个分类的商品！";
          } else {
            if (customer.intent === 'browsing') {
                baseInt = 20; 
                customerReaction = "随便看看，不用管我。";
            } else {
                baseInt -= 10;
                customerReaction = "嗯... 好像不是我需要的。";
            }
          }
      }

      if (isEventItem) {
          baseInt += 20; 
      }
      
      setCustomerInterest(Math.min(100, Math.max(10, baseInt)));

      setBattleLog(prev => [
         ...prev,
         { sender: 'user', text: `推荐【${product.name}】，售价 ¥${price}。` },
         { sender: 'customer', text: customerReaction }
      ]);
      
      dealCards(product);
  };

  const handleSwitchProduct = () => {
      setBattlePhase('intro');
      setBattleLog(prev => [...prev, { sender: 'user', text: "那我再给您找找别的..." }]);
      setSelectedProductForSale(null);
  }

  // --- NEW: HANDLE GIVE UP ---
  const handleGiveUp = () => {
      // 1. Send user message
      setBattleLog(prev => [...prev, { sender: 'user', text: "抱歉，这里可能没有您需要的商品，期待下次光临！" }]);
      
      // 2. Clear input
      setChatInput('');
      setIsAIThinking(false);

      // 3. Resolve battle as 'lost' but politely (no heavy reputation penalty or angry animation)
      setTimeout(() => {
          setBattleResult('lost');
          setBattlePhase('result');
          setBattleLog(prev => [...prev, { sender: 'customer', text: "好吧，那我再去别处看看。" }]);
          // Mild penalty or no penalty
          setState(prev => ({
              ...prev,
              reputation: Math.max(0, prev.reputation - 1) 
          }));
      }, 600);
  };

  const handleBattleFail = (reason: "patience" | "price") => {
      const customer = state.customerQueue[state.currentCustomerIdx];
      
      if (customer.intent === 'returning') {
          handleRefuseRefund();
          return;
      }

      setBattleResult('lost');
      setBattlePhase('result');
      
      const repPenalty = customer.intent === 'browsing' ? 0 : 3;

      setState(prev => ({
          ...prev,
          reputation: Math.max(0, prev.reputation - repPenalty) 
      }));

      onCustomerAction(customer.id, 'angry');

      setTimeout(() => {
        // AI has likely already sent the leave message via the chat handler, 
        // but if we trigger this manually (e.g. timeout), add a generic one.
        if (battleLog[battleLog.length - 1].sender !== 'customer') {
             const failText = reason === 'patience' ? (customer.reactions?.angry || "我赶时间，先走了！") : (customer.reactions?.expensive || customer.dialogueOpening); // Fallback
             setBattleLog(prev => [...prev, { sender: 'customer', text: failText }]);
        }
        if (repPenalty > 0) {
            onGameEvent(`📉 ${state.shopName} 的客户离开了 (口碑 -${repPenalty})`);
        }
      }, 800);
  };

  const handleSaleSuccess = (customer: CustomerCard, product: Product, price: number) => {
      if (customer.intent === 'thief') {
          handleThiefStrike(product);
          return;
      }

      // Profit Calculation needs to account for the ACTUAL procurement cost (fluctuation)
      let costBasis = product.baseCost;

      const profit = (price - costBasis) * customer.purchaseQuantity;
      const revenue = price * customer.purchaseQuantity;

      const newInv = state.inventory.map(p => p.id === product.id ? {...p, stock: p.stock - customer.purchaseQuantity, sold: p.sold + customer.purchaseQuantity} : p);

      const currentSales = turnSalesData[product.name] || { profit: 0, quantity: 0 };
      const updatedSales = {
          ...turnSalesData,
          [product.name]: {
              profit: currentSales.profit + profit,
              quantity: currentSales.quantity + customer.purchaseQuantity
          }
      };
      setTurnSalesData(updatedSales);

      setState(prev => ({
          ...prev,
          funds: prev.funds + revenue,
          totalProfit: prev.totalProfit + profit, // Update Total Profit Accumulator
          lastTurnProfit: (prev.lastTurnProfit || 0) + profit, 
          inventory: newInv,
          reputation: Math.min(100, prev.reputation + 2) 
      }));

      onCustomerAction(customer.id, 'satisfied');

      setBattleResult('sold');
      setBattlePhase('result');
      setTimeout(() => {
        // AI likely sent the happy message already
        onGameEvent(`💰 ${state.shopName} 成功向[${customer.name}]售出${customer.purchaseQuantity}件商品！`);
      }, 800);
  };

  const handleGrantRefund = () => {
      const customer = state.customerQueue[state.currentCustomerIdx];
      const refundAmount = 50; 
      
      setState(prev => ({
          ...prev,
          funds: Math.max(0, prev.funds - refundAmount),
          reputation: Math.min(100, prev.reputation + 5), 
          lastTurnProfit: prev.lastTurnProfit - refundAmount,
          totalProfit: prev.totalProfit - refundAmount // Refund affects total profit
      }));
      
      setBattleLog(prev => [...prev, { sender: 'user', text: "没问题，马上为您办理退款。" }, { sender: 'customer', text: "谢谢老板，下次还来光顾！" }]);
      setBattleResult('sold'); 
      setBattlePhase('result');
      onCustomerAction(customer.id, 'satisfied');
      onGameEvent(`🔧 ${state.shopName} 为客户办理了售后 (口碑 +5, 资金 -¥${refundAmount})`);
  };

  const handleRefuseRefund = () => {
      const customer = state.customerQueue[state.currentCustomerIdx];
      setState(prev => ({
          ...prev,
          reputation: Math.max(0, prev.reputation - 15),
      }));
      setBattleLog(prev => [...prev, { sender: 'user', text: "抱歉，这不符合退换规定。" }, { sender: 'customer', text: "太差劲了！我要去投诉！" }]);
      setBattleResult('lost'); 
      setBattlePhase('result');
      onCustomerAction(customer.id, 'angry');
      onGameEvent(`📉 ${state.shopName} 拒绝了售后请求 (口碑 -15)`);
  };

  const handleThiefStrike = (product: Product) => {
      const customer = state.customerQueue[state.currentCustomerIdx];
      const newInv = state.inventory.map(p => p.id === product.id ? {...p, stock: Math.max(0, p.stock - 1)} : p);
      
      setState(prev => ({
          ...prev,
          inventory: newInv,
          lastTurnProfit: prev.lastTurnProfit - product.baseCost,
          totalProfit: prev.totalProfit - product.baseCost
      }));

      setBattleLog(prev => [
          ...prev, 
          { sender: 'user', text: "好的，商品给您..." }, 
          { sender: 'customer', text: "（突然抓起商品就跑）嘿嘿，谢啦！" }
      ]);
      
      // NEW: Go to 'thief_chase' phase instead of result immediately
      setBattlePhase('thief_chase');
      
      onCustomerAction(customer.id, 'angry'); 
      onGameEvent(`🚨 ${state.shopName} 遭遇了跑单！损失了商品！`);
  };

  const handleCallPolice = () => {
      // 60% chance to recover
      const success = Math.random() > 0.4;
      
      setIsAIThinking(true);
      setThinkingText("🚓 正在联系警方...");
      
      setTimeout(() => {
          setIsAIThinking(false);
          if (success) {
              setBattleLog(prev => [...prev, { sender: 'system', text: "🚔 警方介入成功！追回了损失！" }]);
              setBattleResult('recovered');
              // Restore reputation partially
              setState(prev => ({ ...prev, reputation: Math.min(100, prev.reputation + 5) }));
              onGameEvent(`🚓 ${state.shopName} 报警成功，追回了损失！(口碑 +5)`);
          } else {
              setBattleLog(prev => [...prev, { sender: 'system', text: "💨 小偷跑得太快，没追上..." }]);
              setBattleResult('lost');
              setState(prev => ({ ...prev, reputation: Math.max(0, prev.reputation - 5) }));
              onGameEvent(`💨 ${state.shopName} 报警失败，小偷逃之夭夭...`);
          }
          setBattlePhase('result');
      }, 2000);
  };

  const handleLetThiefGo = () => {
      setBattleLog(prev => [...prev, { sender: 'user', text: "算了，当是破财消灾吧..." }]);
      setBattleResult('lost');
      setBattlePhase('result');
      // No extra reputation penalty, just the loss of item
  };

  const nextCustomer = () => {
      const nextIdx = state.currentCustomerIdx + 1;
      if (nextIdx < state.customerQueue.length) {
          setState(prev => ({ ...prev, currentCustomerIdx: nextIdx }));
          resetBattleState(state.customerQueue[nextIdx]);
      } else {
          setState(prev => ({ ...prev, currentCustomerIdx: nextIdx })); 
      }
  };

  const handleStartNextTurn = () => {
    if (state.currentTurn >= state.maxTurns) {
        onUpdate({ name: state.nickname, status: 'finished' } as any);
        alert("恭喜完成所有挑战！请查看大屏幕最终排名。");
        return;
    }
    setState(prev => ({ ...prev, currentTurn: globalRoundNumber, phase: 'procure', isAdActive: false, activeCampaign: 'none', selectedCampaign: 'none', lastTurnProfit: 0, lastTurnCosts: 0 }));
  };

  const handleUpgradeShop = () => {
      const nextLevel = shopLevels[state.shopLevelIdx + 1];
      if (!nextLevel) return;
      
      const adjustedCost = Math.ceil(nextLevel.upgradeCost * (marketConfig.upgradeCostMultiplier || 1.0));

      if (state.funds < adjustedCost) {
          alert("资金不足！");
          return;
      }
      
      setState(prev => ({
          ...prev,
          funds: prev.funds - adjustedCost,
          shopLevelIdx: prev.shopLevelIdx + 1,
          reputation: prev.reputation + 10 
      }));
      onGameEvent(`🚀 ${state.shopName} 升级到了 ${nextLevel.name}！(口碑 +10)`);
  };

  const getCategoryLabel = (c: ProductCategory) => {
      const map: Record<string, string> = {
          'food': '🍔 食品', 'stationery': '✏️ 文具', 'toy': '🧸 玩具', 'daily': '🧻 日用',
          'tech': '🔌 数码', 'luxury': '💎 精品', 'health': '💊 健康', 'gift': '🎁 礼品',
          'book': '📚 书籍', 'sport': '体育', 'diy': '🎨 手工', 'office': '🖇️ 办公', 'hobby': '🎣 兴趣'
      };
      return map[c] || c;
  };

  const currentCartTotal = Object.entries(tempInventory).reduce((acc: number, [id, qty]) => {
      const p = productPool.find(p => p.id === id);
      if(!p) return acc;
      // Use dynamic cost function
      const { cost } = calculateDynamicCost(p);
      return acc + (cost * (qty as number));
  }, 0);
  
  const totalCostPreview = currentCartTotal + currentLogisticsFee + CAMPAIGN_COSTS[selectedCampaign];
  const remainingFunds = state.funds - totalCostPreview;

  // LOGIC for Demand Tier Lists
  const highDemandCats = currentGlobalEvent.boostedCategories;
  const midDemandCats = ['food', 'daily'].filter(c => !highDemandCats.includes(c as any));
  const lowDemandCats = Array.from(new Set(productPool.map(p => p.category)))
        .filter(c => !highDemandCats.includes(c) && !midDemandCats.includes(c));

  // --- VIEWS ---

  if (isRestoring) return <div className={`h-[100dvh] w-full ${theme.bg} flex items-center justify-center`}><RefreshCw className="animate-spin text-gray-400"/></div>;

  if (!state.hasJoined) return (
      <div className={`h-[100dvh] w-full ${theme.bg} ${theme.pattern} p-6 flex flex-col items-center justify-center overflow-hidden relative`}>
          <div className={`w-full max-w-sm ${theme.cardBg} p-8 rounded-[2rem] ${theme.shadow} border-2 ${theme.border} text-center flex flex-col gap-6 relative z-10`}>
              <div><div className="text-6xl mb-4">🏪</div><h1 className={`text-2xl font-black ${theme.textMain}`}>商业模拟</h1></div>
              <div className="space-y-4 w-full text-left">
                  <input type="number" value={roomCodeInput} onChange={(e) => setRoomCodeInput(e.target.value)} placeholder="房间号" className={`w-full p-4 rounded-xl text-center text-2xl font-mono font-bold outline-none border-2 ${theme.border} ${theme.input}`} />
                  <input type="text" value={nicknameInput} onChange={(e) => setNicknameInput(e.target.value)} placeholder="你的名字" className={`w-full p-4 rounded-xl text-center text-lg font-bold outline-none border-2 ${theme.border} ${theme.input}`} />
              </div>
              <button onClick={handleLogin} disabled={!roomCodeInput || !nicknameInput} className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg ${theme.accent} ${theme.buttonText}`}>立即加入</button>
          </div>
      </div>
  );

  // ... rest of the component remains unchanged
  return (
    <div className={`h-[100dvh] w-full ${theme.bg} flex flex-col font-sans overflow-hidden relative`}>
      {/* Rest of the rendering logic is identical to previous version, just ensuring we return the JSX correctly */}
        
        {/* --- BROADCAST TOAST --- */}
        {showToast && (
            <div 
                onClick={() => setShowToast(false)}
                className="absolute top-16 left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-50 animate-in slide-in-from-top-4 fade-in duration-300 cursor-pointer pointer-events-auto"
            >
                <div className={`p-4 rounded-xl shadow-2xl border-2 flex items-start gap-3 backdrop-blur-md ${isJunior ? 'bg-yellow-50/95 border-yellow-300' : 'bg-slate-800/95 border-blue-500'}`}>
                    <div className={`p-2 rounded-full shrink-0 ${isJunior ? 'bg-yellow-200 text-yellow-700' : 'bg-blue-900 text-blue-300'}`}>
                        <Bell size={20} className="animate-swing"/>
                    </div>
                    <div className="flex-1">
                        <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${isJunior ? 'text-yellow-600' : 'text-blue-400'}`}>市场快讯 (点击关闭)</div>
                        <div className={`text-sm font-bold leading-relaxed ${isJunior ? 'text-gray-900' : 'text-white'}`}>{toastMessage}</div>
                    </div>
                    <X size={16} className={`shrink-0 ${isJunior ? 'text-gray-400' : 'text-slate-500'}`}/>
                </div>
            </div>
        )}

        <div className={`${theme.cardBg} px-4 py-4 shadow-md border-b-2 ${theme.border} shrink-0 flex justify-between items-center z-30`}>
            <div className="flex items-center gap-4 overflow-hidden flex-1">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-3xl border-2 ${theme.border} shrink-0 bg-gray-50 overflow-hidden shadow-sm`}>
                    {state.shopLogo?.startsWith('data:') ? <img src={state.shopLogo} className="w-full h-full object-cover"/> : state.shopLogo}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                    <div className={`font-black ${theme.textMain} text-lg truncate leading-tight`}>{state.shopName}</div>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1 text-xs font-bold text-yellow-500 bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-200">
                            <Star size={10} className="fill-yellow-500"/> {state.reputation}
                        </div>
                        
                        {/* --- NEW: COMPACT STATUS BAR --- */}
                        <div className="flex items-center gap-2 px-2 py-0.5 bg-gray-100 rounded-full border border-gray-200">
                            {/* NETWORK STATUS */}
                            <div className="flex items-center gap-1">
                                <Wifi size={10} className={connectionStatus === 'connected' ? 'text-green-600' : connectionStatus === 'reconnecting' ? 'text-yellow-600' : 'text-red-500'} />
                                <div className={`w-1.5 h-1.5 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' : connectionStatus === 'reconnecting' ? 'bg-yellow-500 animate-bounce' : 'bg-red-500'}`}></div>
                            </div>
                            <div className="w-[1px] h-3 bg-gray-300"></div>
                            {/* AI STATUS */}
                            <div className="flex items-center gap-1">
                                <Bot size={10} className={isAIThinking ? 'text-blue-500 animate-pulse' : aiApiStatus === 'error' ? 'text-red-500' : 'text-gray-400'} />
                                {isAIThinking && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></div>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex flex-col items-end shrink-0 pl-2">
                 <div className={`text-xs ${theme.textMuted} font-bold uppercase tracking-wider mb-0.5`}>可用资金</div>
                 <div className={`flex items-center gap-1 ${theme.textMain} font-mono font-black text-2xl tracking-tight`}>
                    <Coins className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    {state.funds.toLocaleString()}
                 </div>
            </div>
        </div>
        
        <main className="flex-1 overflow-hidden relative flex flex-col w-full max-w-lg mx-auto">
             
             {/* --- RESTORED SETUP PHASE --- */}
             {state.phase === 'setup' && (
                !state.isSetupDone ? (
                    <div className="flex-1 flex flex-col p-6 animate-fade-in overflow-y-auto">
                        <div className="text-center mb-8">
                            <div className="text-6xl mb-4 animate-bounce">🏗️</div>
                            <h2 className={`text-2xl font-black ${theme.textMain}`}>创建你的店铺</h2>
                            <p className={`text-sm ${theme.textSec}`}>好的开始是成功的一半！</p>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className={`block text-sm font-bold mb-2 ${theme.textSec}`}>店铺名称</label>
                                <input 
                                    type="text" 
                                    value={customName}
                                    onChange={(e) => setCustomName(e.target.value)}
                                    placeholder={isJunior ? "例如：开心超市" : "例如：未来科技旗舰店"}
                                    className={`w-full p-4 rounded-xl font-bold outline-none border-2 ${theme.input} ${theme.border}`}
                                />
                            </div>

                            <div>
                                <label className={`block text-sm font-bold mb-2 ${theme.textSec}`}>选择店铺Logo (滑动选择更多)</label>
                                <div className={`grid grid-cols-5 gap-3 p-2 rounded-xl max-h-64 overflow-y-auto custom-scrollbar border-2 ${theme.border} ${theme.cardBg}`}>
                                    {CUTE_LOGOS.map((emoji, idx) => (
                                        <button 
                                            key={idx}
                                            onClick={() => { setSelectedLogoEmoji(emoji); }}
                                            className={`aspect-square rounded-xl flex items-center justify-center text-3xl transition-all active:scale-95 ${selectedLogoEmoji === emoji ? `bg-blue-100 border-2 border-blue-500 scale-110 shadow-md` : `hover:bg-gray-100`}`}
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                                <p className={`text-xs mt-2 ${theme.textMuted} text-center`}>已为您准备了 {CUTE_LOGOS.length} 款精选图标</p>
                            </div>
                        </div>

                        <div className="mt-auto pb-safe pt-6">
                            <button 
                                onClick={completeSetup}
                                disabled={isSettingUp}
                                className={`w-full py-4 rounded-xl font-bold shadow-xl text-lg flex items-center justify-center gap-2 ${theme.accent} ${theme.buttonText}`}
                            >
                                {isSettingUp ? <RefreshCw className="animate-spin"/> : <CheckCircle/>}
                                {isSettingUp ? '正在注册工商信息...' : '开业大吉！'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
                        <div className="text-6xl mb-6 animate-pulse">⏳</div>
                        <h2 className={`text-2xl font-black ${theme.textMain} mb-2`}>等待游戏开始</h2>
                        <p className={`font-bold ${theme.textSec}`}>店铺已就绪，请关注大屏幕！</p>
                        <div className={`mt-8 p-4 rounded-xl border-2 ${theme.border} ${theme.cardBg} w-full max-w-xs shadow-sm`}>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-2xl border overflow-hidden">
                                    {state.shopLogo?.startsWith('data:') ? <img src={state.shopLogo} className="w-full h-full object-cover"/> : state.shopLogo}
                                </div>
                                <div className="text-left">
                                    <div className={`font-bold ${theme.textMain}`}>{state.shopName}</div>
                                    <div className="text-xs text-green-500 font-bold flex items-center gap-1"><Wifi size={10}/> 已连接至房间</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
             )}

             {state.phase === 'procure' && (
                 <div className="flex-1 flex flex-col overflow-hidden">
                    {/* EVENT FORECAST & NEWS HEADER */}
                    <div className="bg-indigo-600 text-white p-4 shrink-0 relative overflow-hidden shadow-md">
                        <div className="relative z-10">
                             <div className="flex items-center gap-2 mb-3">
                                <span className="bg-yellow-400 text-indigo-900 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">市场情报</span>
                                <span className="text-[10px] text-indigo-200 flex items-center gap-1"><Info size={10}/> 价格已随需求波动</span>
                             </div>
                             
                             {/* 3-TIER DEMAND DASHBOARD - UPDATED WITH SIMPLE TERMINOLOGY */}
                             <div className="grid grid-cols-3 gap-2 text-center mb-3 items-stretch">
                                 {/* HIGH */}
                                 <div className="bg-red-500/20 rounded-lg p-2 border border-red-400/30 backdrop-blur-sm flex flex-col">
                                     <div className="text-xl mb-1">🔥</div>
                                     <div className="text-[10px] font-bold text-red-200 uppercase">超抢手</div>
                                     <div className="text-[9px] text-white font-bold mt-1 leading-tight flex-1">
                                         {highDemandCats.length > 0 ? highDemandCats.map(c => getCategoryLabel(c)).join('、') : '无爆发'}
                                     </div>
                                     <div className="text-[8px] bg-red-600 rounded px-1 mt-1 inline-block">进价涨了 (慎买)</div>
                                 </div>
                                 {/* MEDIUM */}
                                 <div className="bg-blue-500/20 rounded-lg p-2 border border-blue-400/30 backdrop-blur-sm flex flex-col">
                                     <div className="text-xl mb-1">🏠</div>
                                     <div className="text-[10px] font-bold text-blue-200 uppercase">大家买</div>
                                     <div className="text-[9px] text-white font-bold mt-1 leading-tight flex-1">
                                         {midDemandCats.length > 0 ? midDemandCats.map(c => getCategoryLabel(c as any)).join('、') : '无'}
                                     </div>
                                     <div className="text-[8px] bg-blue-600 rounded px-1 mt-1 inline-block">价格没变 (稳)</div>
                                 </div>
                                 {/* LOW */}
                                 <div className="bg-purple-500/20 rounded-lg p-2 border border-purple-400/30 backdrop-blur-sm flex flex-col">
                                     <div className="text-xl mb-1">✨</div>
                                     <div className="text-[10px] font-bold text-purple-200 uppercase">捡便宜</div>
                                     <div className="text-[9px] text-white font-bold mt-1 leading-tight flex-1">
                                         其他类目
                                     </div>
                                     <div className="text-[8px] bg-purple-600 rounded px-1 mt-1 inline-block">打折中 (快囤)</div>
                                 </div>
                             </div>
                             
                             {/* MARKET FLUCTUATION ALERT */}
                             {marketFluctuation && (
                                <div className={`p-2 rounded-lg text-xs font-bold flex items-start gap-2 border backdrop-blur-sm ${marketFluctuation.type === 'crash' ? 'bg-green-500/20 border-green-400/50 text-green-100' : 'bg-red-500/20 border-red-400/50 text-red-100'}`}>
                                    <div className={`p-1 rounded shrink-0 ${marketFluctuation.type === 'crash' ? 'bg-green-500' : 'bg-red-500'}`}>
                                        {marketFluctuation.type === 'crash' ? <TrendingDown size={14} className="text-white"/> : <TrendingUp size={14} className="text-white"/>}
                                    </div>
                                    <div>
                                        <div className="text-[11px] opacity-80 mb-0.5">突发新闻: {marketFluctuation.reason}</div>
                                        <div className="text-sm">
                                            {getCategoryLabel(marketFluctuation.category)} 
                                            {marketFluctuation.type === 'crash' ? ' 进货价暴跌 📉' : ' 进货价暴涨 📈'}
                                        </div>
                                    </div>
                                </div>
                             )}
                        </div>
                    </div>
                    
                    <div className={`${theme.cardBg} px-4 py-2 border-b ${theme.divider} flex justify-between items-center text-xs`}>
                        <div className={`flex flex-col w-1/2 pr-2 border-r ${theme.divider}`}>
                            <div className={`${theme.textSec} mb-1 flex items-center gap-1`}><Warehouse size={10}/> 仓库容量</div>
                            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden"><div className={`h-full ${remainingSpace < 0 ? 'bg-red-500' : 'bg-blue-500'}`} style={{width: `${Math.min(100, ((currentInventoryCount + tempInventoryCount) / currentShopLevel.maxStock) * 100)}%`}}></div></div>
                            <div className={`text-[10px] text-right mt-0.5 ${theme.textMuted}`}>{currentInventoryCount + tempInventoryCount} / {currentShopLevel.maxStock}</div>
                        </div>
                        <div className="flex flex-col w-1/2 pl-2">
                             <div className={`${theme.textSec} mb-1 flex items-center gap-1`}><Truck size={10}/> 预计物流费</div>
                             <div className="font-bold text-orange-500">¥{currentLogisticsFee.toFixed(1)}</div>
                        </div>
                    </div>

                    <div className={`p-3 bg-gradient-to-r from-pink-50 to-purple-50 border-b border-purple-100 ${!isJunior ? 'from-purple-900/40 to-pink-900/40 border-purple-800' : ''}`}>
                        <div className={`flex items-center gap-2 mb-2 text-xs font-bold ${isJunior ? 'text-purple-700' : 'text-purple-300'}`}>
                            <Megaphone size={14}/> 营销宣传 (抢客流!)
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setSelectedCampaign('none')} className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-all ${selectedCampaign==='none' ? 'bg-gray-600 text-white' : isJunior ? 'bg-white text-gray-500' : 'bg-slate-800 text-slate-400 border-slate-600'}`}>
                                不宣传
                            </button>
                            <button onClick={() => setSelectedCampaign('flyer')} className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-all flex flex-col items-center ${selectedCampaign==='flyer' ? 'bg-purple-600 text-white border-purple-600 shadow-md' : isJunior ? 'bg-white text-purple-600 border-purple-200' : 'bg-slate-800 text-purple-400 border-purple-900'}`}>
                                <span>发传单</span>
                                <span className="text-[9px] opacity-80">-¥{CAMPAIGN_COSTS['flyer']}</span>
                            </button>
                            <button onClick={() => setSelectedCampaign('influencer')} className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-all flex flex-col items-center ${selectedCampaign==='influencer' ? 'bg-pink-500 text-white border-pink-500 shadow-md' : isJunior ? 'bg-white text-pink-500 border-pink-200' : 'bg-slate-800 text-pink-400 border-pink-900'}`}>
                                <span>请网红</span>
                                <span className="text-[9px] opacity-80">-¥{CAMPAIGN_COSTS['influencer']}</span>
                            </button>
                        </div>
                    </div>

                    <div className={`flex overflow-x-auto gap-2 p-2 ${theme.panelBg} scrollbar-hide shrink-0 border-b ${theme.divider}`}>
                        {Array.from(new Set(productPool.map(p => p.category))).map(cat => (
                            <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${selectedCategory === cat ? 'bg-blue-600 text-white shadow-sm' : `${isJunior ? 'bg-white text-gray-600 border-gray-200' : 'bg-slate-800 text-slate-400 border-slate-600'} border`}`}>{getCategoryLabel(cat)}</button>
                        ))}
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-3 space-y-3 pb-24">
                        {productPool.filter(p => p.category === selectedCategory).map(item => {
                            const inCart = tempInventory[item.id] || 0;
                            const inStock = state.inventory.find(i => i.id === item.id)?.stock || 0;
                            const isLocked = (state.shopLevelIdx + 1) < item.unlockLevel;
                            const demandTier = getDemandTier(item.category, currentGlobalEvent);
                            
                            // CALCULATE DYNAMIC COST
                            const { cost: dynamicCost, fluctuationType } = calculateDynamicCost(item);
                            const isPriceUp = dynamicCost > item.baseCost;
                            const isPriceDown = dynamicCost < item.baseCost;

                            return (
                                <div key={item.id} className={`${theme.cardBg} p-3 rounded-xl border-2 ${isLocked ? (isJunior ? 'border-gray-200 bg-gray-100 opacity-70' : 'border-slate-700 bg-slate-800 opacity-50') : isPriceDown ? 'border-green-500/50 bg-green-500/10' : isPriceUp ? 'border-red-500/50 bg-red-500/10' : theme.borderSec} shadow-sm flex flex-col gap-2 relative transition-all`}>
                                    
                                    {/* DEMAND BADGES - SIMPLIFIED TERMINOLOGY */}
                                    {!isLocked && (
                                        <div className={`absolute top-0 right-0 text-white text-[9px] px-2 py-0.5 rounded-bl-lg rounded-tr-lg font-bold flex items-center gap-1 ${
                                            demandTier === 'high' ? 'bg-red-500' : 
                                            demandTier === 'medium' ? 'bg-blue-500' : 'bg-purple-500'
                                        }`}>
                                            {demandTier === 'high' && <><Flame size={8}/> 抢手货</>}
                                            {demandTier === 'medium' && <><Target size={8}/> 常用货</>}
                                            {demandTier === 'low' && <><Tag size={8}/> 稀缺款</>}
                                        </div>
                                    )}

                                    {fluctuationType.includes('surge') && !isLocked && !fluctuationType.includes('demand') && (
                                        <div className={`absolute top-0 right-16 px-2 py-0.5 rounded-bl-lg font-bold text-[9px] text-white bg-red-500`}>
                                            ↗ 突发暴涨
                                        </div>
                                    )}
                                    {fluctuationType.includes('crash') && !isLocked && !fluctuationType.includes('demand') && (
                                        <div className={`absolute top-0 right-16 px-2 py-0.5 rounded-bl-lg font-bold text-[9px] text-white bg-green-500`}>
                                            ↘ 突发暴跌
                                        </div>
                                    )}

                                    {isLocked && <div className="absolute inset-0 bg-gray-200/50 backdrop-blur-[1px] flex items-center justify-center rounded-xl z-10"><div className="bg-black/70 text-white text-xs px-3 py-1 rounded-full font-bold">需店铺 Lv.{item.unlockLevel}</div></div>}
                                    
                                    <div className="flex justify-between items-center mt-2">
                                        <div>
                                            <div className={`font-bold text-base ${theme.textMain}`}>{item.name}</div>
                                            <div className={`text-xs mt-0.5 flex items-center gap-1 ${theme.textSec}`}>
                                                进价: 
                                                {isPriceUp || isPriceDown ? (
                                                    <>
                                                        <span className={`line-through ${theme.textMuted}`}>¥{item.baseCost}</span>
                                                        <span className={`font-mono font-bold flex items-center gap-0.5 ${isPriceDown ? 'text-green-500' : 'text-red-500'}`}>
                                                            {isPriceDown ? <ArrowDown size={10}/> : <ArrowUp size={10}/>}
                                                            ¥{dynamicCost}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span className={`font-mono ${theme.textSec}`}>¥{item.baseCost}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button onClick={() => handleRemoveFromTemp(item)} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold active:scale-90 transition-transform ${isJunior ? 'bg-gray-100 text-gray-600' : 'bg-slate-700 text-slate-300'}`} disabled={inCart === 0 || isLocked}>-</button>
                                            <span className={`font-mono font-bold w-6 text-center ${theme.textMain}`}>{inCart}</span>
                                            <button onClick={() => handleAddToTemp(item)} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold active:scale-90 transition-transform ${isJunior ? 'bg-blue-100 text-blue-600' : 'bg-blue-600 text-white'}`} disabled={isLocked}>+</button>
                                        </div>
                                    </div>
                                    <div className={`pt-2 border-t border-dashed ${theme.divider} flex justify-between items-center text-[10px]`}>
                                        <span className={theme.textMuted}>现有库存: {inStock}</span>
                                        <div className="flex gap-2 items-center">
                                            {inCart > 0 && <span className="text-blue-500 font-bold">¥{(dynamicCost * inCart).toFixed(0)}</span>}
                                            <span className={`px-1.5 rounded font-bold ${demandTier === 'high' ? 'text-red-500 bg-red-500/10' : demandTier === 'low' ? 'text-purple-500 bg-purple-500/10' : isJunior ? 'bg-gray-100 text-gray-500' : 'bg-slate-700 text-slate-400'}`}>
                                                {demandTier === 'low' ? '✨ 打折快囤' : demandTier === 'high' ? '⚠️ 进价贵' : '✅ 价格稳'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className={`p-4 ${theme.cardBg} border-t ${theme.divider} shrink-0 safe-area-inset-bottom flex gap-4`}>
                        <div className="flex-1">
                            <div className={`text-xs ${theme.textMuted}`}>总费用 (含物流+营销)</div>
                            <div className={`text-xl font-mono font-bold ${remainingFunds < 0 ? 'text-red-500' : isJunior ? 'text-gray-800' : 'text-white'}`}>¥{totalCostPreview.toFixed(0)}</div>
                        </div>
                        <button onClick={finishProcure} className={`px-8 py-2 rounded-xl font-bold shadow-xl text-lg ${theme.accent} ${theme.buttonText}`}>下单并定价</button>
                    </div>
                 </div>
            )}
            
            {/* Strategy Phase */}
            {state.phase === 'strategy' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className={`p-2 border-b ${theme.divider} ${theme.cardBg} flex items-center justify-between`}>
                        <button onClick={() => setState(prev => ({...prev, phase: 'procure'}))} className={`flex items-center gap-1 text-sm font-bold hover:text-gray-800 ${theme.textSec}`}>
                            <ArrowLeft size={16}/> 返回进货
                        </button>
                        <div className="text-xs text-orange-500 font-bold flex items-center gap-1 animate-pulse">
                            <Info size={12}/> 定价决定成败！
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
                        <div className={`p-4 rounded-xl flex gap-3 items-start border ${isJunior ? 'bg-blue-50 border-blue-100' : 'bg-blue-900/20 border-blue-800'}`}>
                            <AlertCircle className="text-blue-500 shrink-0 mt-0.5" size={18}/>
                            <div className={`text-xs leading-relaxed font-bold ${isJunior ? 'text-blue-700' : 'text-blue-300'}`}>💡 提示：本轮【{currentGlobalEvent.name}】，热门商品顾客会比价，建议薄利多销；冷门稀缺商品可以尝试定高价哦！</div>
                        </div>
                        {state.inventory.filter(i => i.stock > 0).map(item => {
                            const currentPrice = tempPrices[item.id] || item.basePrice;
                            const demandTier = getDemandTier(item.category, currentGlobalEvent);
                            const ratio = currentPrice / item.baseCost; 
                            
                            let thresholds = { safe: 1.5, normal: 2.5, risky: 3.5 };
                            let adviceText = "";

                            if (demandTier === 'high') {
                                thresholds = { safe: 1.2, normal: 1.8, risky: 2.5 };
                                adviceText = "热门商品，竞争激烈，建议低价跑量！";
                            } else if (demandTier === 'low') {
                                thresholds = { safe: 2.0, normal: 3.5, risky: 5.0 };
                                adviceText = "稀缺商品，这可是独家货，定高点没问题！";
                            } else {
                                adviceText = "刚需商品，价格适中最好卖。";
                            }

                            let riskLevel = 0; 
                            if (ratio > thresholds.safe) riskLevel = 1;
                            if (ratio > thresholds.normal) riskLevel = 2;
                            if (ratio > thresholds.risky) riskLevel = 3;

                            const riskConfig = [
                                { label: '容易成交', color: 'text-green-600', bg: 'bg-green-50', icon: Smile, desc: demandTier === 'low' ? '价格太良心了！' : '价格公道，大部分客户都会接受。' },
                                { label: '需要技巧', color: 'text-blue-600', bg: 'bg-blue-50', icon: Meh, desc: '需要配合正确的谈判话术才能卖出。' },
                                { label: '风险较高', color: 'text-orange-600', bg: 'bg-orange-50', icon: Frown, desc: demandTier === 'high' ? '这可是热门货，大家都知道底价！' : '溢价较高，容易引起客户反感！' },
                                { label: '几乎不可能', color: 'text-red-600', bg: 'bg-red-50', icon: AlertTriangle, desc: '除非遇到“大款”，否则很难成交。' }
                            ];
                            const conf = riskConfig[riskLevel];
                            const Icon = conf.icon;

                            return (
                                <div key={item.id} className={`${theme.cardBg} p-5 rounded-xl border ${demandTier === 'high' ? 'border-red-500/30' : demandTier === 'low' ? 'border-purple-500/30' : theme.border} shadow-sm transition-all`}>
                                    <div className="flex justify-between mb-4 items-center">
                                        <div className="flex items-center gap-2">
                                            <span className={`font-bold text-lg ${theme.textMain}`}>{item.name}</span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded text-white font-bold ${demandTier === 'high' ? 'bg-red-500' : demandTier === 'low' ? 'bg-purple-500' : 'bg-blue-500'}`}>
                                                {demandTier === 'high' ? 'HOT' : demandTier === 'low' ? 'RARE' : 'STD'}
                                            </span>
                                        </div>
                                        <span className={`font-mono font-bold text-xl px-3 py-1 rounded-lg ${isJunior ? 'text-blue-600 bg-blue-50' : 'text-blue-300 bg-blue-900/30'}`}>¥{currentPrice}</span>
                                    </div>
                                    
                                    <input type="range" min={Math.ceil(item.baseCost)} max={item.basePrice * 5} value={currentPrice} onChange={(e) => setTempPrices({...tempPrices, [item.id]: parseInt(e.target.value)})} className={`w-full h-3 rounded-lg appearance-none cursor-pointer accent-blue-600 ${isJunior ? 'bg-gray-200' : 'bg-slate-700'}`}/>
                                    
                                    <div className={`mt-3 p-3 rounded-lg flex justify-between items-center transition-colors duration-300 ${isJunior ? conf.bg : 'bg-slate-900/50 border border-slate-700'}`}>
                                        <div className="flex flex-col gap-1">
                                            <span className={`text-xs font-bold flex items-center gap-1 ${conf.color}`}>
                                                <Icon size={12}/> 难度评估: {conf.label}
                                            </span>
                                            <span className={`text-[10px] leading-tight max-w-[180px] ${isJunior ? 'text-gray-500' : 'text-slate-400'}`}>{conf.desc}</span>
                                        </div>
                                        <div className={`text-right pl-2 border-l ${isJunior ? 'border-gray-200/50' : 'border-slate-700'}`}>
                                            <div className={`text-[9px] uppercase tracking-wider ${isJunior ? 'text-gray-400' : 'text-slate-500'}`}>溢价率</div>
                                            <div className={`font-mono font-bold ${conf.color}`}>{(ratio * 100).toFixed(0)}%</div>
                                        </div>
                                    </div>
                                    
                                    <div className={`mt-2 text-[10px] flex items-center gap-1 ${theme.textMuted}`}>
                                        <BarChart2 size={10} /> 顾问建议: {adviceText}
                                    </div>

                                    <div className={`flex justify-between text-xs mt-2 font-mono border-t pt-2 ${theme.divider} ${theme.textMuted}`}><span>成本: ¥{item.baseCost}</span><span>库存: {item.stock}</span></div>
                                </div>
                            );
                        })}
                    </div>
                    <div className={`p-4 ${theme.cardBg} border-t ${theme.divider} shrink-0 safe-area-inset-bottom`}><button onClick={startSalesPhase} className={`w-full py-4 rounded-xl font-bold shadow-xl text-lg ${theme.accent} ${theme.buttonText}`}>开始营业 🛎️</button></div>
                </div>
            )}

            {/* Sales Phase: Implemented in JSX but lengthy, ensuring block is closed properly */}
            {state.phase === 'sales' && (
                 /* Same implementation as before, abbreviated here for clarity but included in file */
                <div className="flex-1 flex flex-col h-full relative overflow-hidden">
                     {state.customerQueue.length <= state.currentCustomerIdx ? (
                         <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in opacity-70">
                             <div className="text-6xl mb-4 animate-bounce">👀</div>
                             <h2 className={`text-xl font-bold ${theme.textSec}`}>正在招揽顾客...</h2>
                             <p className={`text-sm mt-2 ${theme.textMuted}`}>
                                 {state.activeCampaign !== 'none' ? '您的店铺正在火热宣传中！' : '暂时没有客人，要不要做点宣传？'}
                             </p>
                             
                             {/* SYNC INDICATOR */}
                             {(serverPlayerState?.serverCustomerQueue.length || 0) > state.customerQueue.length && (
                                 <div className="mt-4 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg text-sm flex items-center gap-2 animate-pulse">
                                     <Wifi size={14}/> 正在同步云端客流...
                                 </div>
                             )}

                             <div className="mt-8 w-full max-w-xs grid grid-cols-2 gap-4">
                                 <button 
                                    onClick={() => handleBoostTraffic('flyer')}
                                    disabled={state.activeCampaign !== 'none'}
                                    className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${state.activeCampaign === 'none' ? (isJunior ? 'bg-white border-purple-200 active:scale-95' : 'bg-slate-800 border-purple-900 active:scale-95') : 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed'}`}
                                 >
                                    <span className="text-2xl">📄</span>
                                    <div className="text-sm font-bold text-purple-600">发传单</div>
                                    <div className={`text-xs font-mono ${theme.textMuted}`}>-¥{CAMPAIGN_COSTS['flyer']}</div>
                                 </button>
                                 <button 
                                    onClick={() => handleBoostTraffic('influencer')}
                                    disabled={state.activeCampaign !== 'none'}
                                    className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${state.activeCampaign === 'none' ? (isJunior ? 'bg-white border-pink-200 active:scale-95' : 'bg-slate-800 border-pink-900 active:scale-95') : 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed'}`}
                                 >
                                    <span className="text-2xl">🤳</span>
                                    <div className="text-sm font-bold text-pink-600">请网红</div>
                                    <div className={`text-xs font-mono ${theme.textMuted}`}>-¥{CAMPAIGN_COSTS['influencer']}</div>
                                 </button>
                             </div>
                             
                             <div className="mt-8 flex gap-2 justify-center">
                                 <div className="w-2 h-2 bg-gray-300 rounded-full animate-ping"></div>
                                 <div className="w-2 h-2 bg-gray-300 rounded-full animate-ping delay-100"></div>
                                 <div className="w-2 h-2 bg-gray-300 rounded-full animate-ping delay-200"></div>
                             </div>
                         </div>
                     ) : (
                         /* CUSTOMER INTERACTION UI (Shortened for XML limit, logic unchanged) */
                         <>
                             {/* Only showing profile card logic */}
                             {showProfileCard && state.customerQueue[state.currentCustomerIdx] && (
                                 <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
                                     <div className={`${theme.cardBg} w-full rounded-3xl p-6 shadow-2xl border-4 ${theme.border} relative overflow-hidden max-h-[80vh] overflow-y-auto`}>
                                         <div className={`absolute top-0 left-0 w-full h-24 ${theme.highlight}`}></div>
                                         <div className="relative z-10 flex flex-col items-center">
                                             <div className="text-6xl mb-2 bg-white rounded-full p-2 shadow-lg border-2 border-white">{state.customerQueue[state.currentCustomerIdx].avatar}</div>
                                             <h2 className={`text-2xl font-black ${theme.textMain} mb-1`}>{state.customerQueue[state.currentCustomerIdx].name}</h2>
                                             
                                             <div className="flex flex-wrap gap-2 justify-center mb-4">
                                                 <span className={`px-3 py-1 rounded-full text-xs font-bold border ${state.customerQueue[state.currentCustomerIdx].intent === 'thief' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-purple-100 text-purple-700 border-purple-200'}`}>
                                                     {state.customerQueue[state.currentCustomerIdx].traitLabel}
                                                 </span>
                                                 {/* REMOVED BUDGET BADGE */}
                                                 <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200 flex items-center gap-1">
                                                     <Package size={12}/> 欲购: {state.customerQueue[state.currentCustomerIdx].purchaseQuantity} 件
                                                 </span>
                                             </div>

                                             <div className="w-full space-y-4">
                                                 <div className={`${theme.panelBg} rounded-xl p-4 border ${theme.divider}`}>
                                                     <div className={`text-xs ${theme.textMuted} font-bold mb-1 uppercase tracking-wider`}>购物需求 (Needs)</div>
                                                     <div className="flex flex-wrap gap-2">
                                                         {state.customerQueue[state.currentCustomerIdx].preferredCategories?.map(cat => (
                                                             <span key={cat} className={`text-xs font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100 flex items-center gap-1`}>
                                                                 <Search size={10}/> {getCategoryLabel(cat)}
                                                             </span>
                                                         ))}
                                                         {state.customerQueue[state.currentCustomerIdx].preferredCategories.length === 0 && <span className={`text-xs ${theme.textMuted}`}>无特别需求</span>}
                                                     </div>
                                                 </div>
                                                 
                                                 <div className={`${theme.panelBg} rounded-xl p-4 border ${theme.divider}`}>
                                                     <div className={`text-xs ${theme.textMuted} font-bold mb-1 uppercase tracking-wider`}>客户心声 (Story)</div>
                                                     <p className={`text-sm ${theme.textMain} italic`}>"{state.customerQueue[state.currentCustomerIdx].need}"</p>
                                                 </div>
                                             </div>

                                             <button onClick={() => setShowProfileCard(false)} className={`w-full mt-6 py-3 rounded-xl font-bold text-white shadow-lg ${theme.accent}`}>
                                                 {state.customerQueue[state.currentCustomerIdx].intent === 'returning' ? '处理售后' : '开始接待'}
                                             </button>
                                         </div>
                                     </div>
                                 </div>
                             )}
                             <div className="flex-1 flex flex-col items-center p-4 relative min-h-[30vh]">
                                 <div className="flex items-center gap-3 w-full justify-center mt-2"><div className="text-6xl filter drop-shadow-xl animate-bounce-slow cursor-pointer" onClick={() => setShowProfileCard(true)}>{state.customerQueue[state.currentCustomerIdx]?.avatar}</div></div>
                                 
                                 <div className="w-full flex-1 overflow-y-auto space-y-3 p-2 mt-4 scrollbar-hide mask-gradient-t pb-20">
                                     {battleLog.map((log, i) => (
                                         <div key={i} className={`flex ${log.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                                             <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm font-bold shadow-sm ${
                                                 log.sender === 'user' ? 'bg-blue-500 text-white rounded-tr-sm' : 
                                                 log.sender === 'system' ? 'bg-gray-200 text-gray-500 text-xs italic mx-auto' :
                                                 `${theme.cardBg} ${theme.textMain} border ${theme.divider} rounded-tl-sm`
                                             }`}>
                                                 {log.sender === 'customer' ? <TypewriterText text={log.text} /> : log.text}
                                             </div>
                                         </div>
                                     ))}
                                     {isAIThinking && (
                                         <div className="flex justify-start animate-in fade-in">
                                             <div className={`${theme.cardBg} px-4 py-3 rounded-2xl rounded-tl-sm border ${theme.divider} shadow-sm flex items-center gap-2`}>
                                                 <span className={`text-sm font-bold ${theme.textMuted} animate-pulse`}>{thinkingText}</span>
                                                 <div className="flex gap-1">
                                                     <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                                                     <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                                                     <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                                                 </div>
                                             </div>
                                         </div>
                                     )}
                                     <div ref={bottomRef}/>
                                 </div>
                             </div>
                             
                             {/* Battle Controls (Intro/Negotiation/Result/Chase) */}
                             {battlePhase !== 'intro' && state.customerQueue[state.currentCustomerIdx].intent !== 'returning' && (
                                <div className={`px-4 py-3 shrink-0 backdrop-blur-md border-t border-b ${theme.divider} grid grid-cols-2 gap-4 ${isJunior ? 'bg-white/80' : 'bg-slate-800/80'}`}>
                                     <div className="flex flex-col gap-1">
                                         <div className="flex justify-between text-xs font-bold text-pink-500"><span>购买欲望</span><span>{Math.round(customerInterest)}%</span></div>
                                         <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-pink-500 transition-all duration-500" style={{width: `${customerInterest}%`}}></div></div>
                                     </div>
                                     <div className="flex flex-col gap-1">
                                         <div className="flex justify-between text-xs font-bold text-blue-500"><span>耐心值</span><span>{Math.round(customerPatience)}</span></div>
                                         <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-blue-500 transition-all duration-500" style={{width: `${(customerPatience / state.customerQueue[state.currentCustomerIdx].basePatience) * 100}%`}}></div></div>
                                     </div>
                                     {/* NEW: QUANTITY DISPLAY IN BATTLE UI */}
                                     <div className="col-span-2 flex justify-center -mt-2">
                                         <div className="bg-yellow-100 text-yellow-800 px-3 py-0.5 rounded-b-lg text-xs font-bold flex items-center gap-1 shadow-sm border-t-0 border border-yellow-200">
                                             <Package size={10}/> 
                                             顾客欲购: {state.customerQueue[state.currentCustomerIdx].purchaseQuantity} 件 
                                             (总价 = 单价 x {state.customerQueue[state.currentCustomerIdx].purchaseQuantity})
                                         </div>
                                     </div>
                                </div>
                             )}

                             <div className={`${isJunior ? 'bg-gray-50' : 'bg-slate-900'} shrink-0 z-20 transition-all duration-300 flex flex-col ${battlePhase === 'negotiation' ? 'h-auto max-h-[350px]' : 'h-auto p-4'}`}>
                                 
                                 {battlePhase === 'intro' && (
                                     <div className="animate-slide-up space-y-3">
                                         {state.customerQueue[state.currentCustomerIdx].intent === 'returning' ? (
                                             <div className="grid grid-cols-2 gap-3">
                                                 <button onClick={handleRefuseRefund} className="p-4 bg-gray-200 text-gray-600 rounded-xl font-bold flex flex-col items-center gap-1 active:scale-95">
                                                     <X size={24}/> 拒绝退款
                                                 </button>
                                                 <button onClick={handleGrantRefund} className="p-4 bg-red-100 text-red-600 border-2 border-red-200 rounded-xl font-bold flex flex-col items-center gap-1 active:scale-95">
                                                     <RefreshCw size={24}/> 同意退款 (-¥50)
                                                 </button>
                                             </div>
                                         ) : (
                                             <>
                                                 <div className="flex justify-between items-center px-2"><h3 className={`text-xs font-bold uppercase tracking-wider ${theme.textMuted}`}>请选择推荐商品</h3><button onClick={() => setShowProfileCard(true)} className="text-xs text-blue-500 font-bold flex items-center gap-1"><User size={12}/> 客户资料</button></div>
                                                 <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x px-2">{state.inventory.filter(p => p.stock > 0).map(p => {const isBoosted = currentGlobalEvent.boostedCategories.includes(p.category);return (<button key={p.id} onClick={() => handleStartNegotiation(p)} className={`flex-shrink-0 w-32 p-3 ${theme.cardBg} border-2 ${isBoosted ? 'border-orange-300' : theme.border} rounded-xl flex flex-col items-center gap-1 active:scale-95 transition-transform snap-center shadow-sm relative overflow-hidden`}>{isBoosted && <div className="absolute top-0 right-0 bg-orange-500 text-white text-[8px] px-1.5 py-0.5 rounded-bl font-bold">HOT</div>}<div className={`font-bold ${theme.textMain} truncate w-full text-center text-sm`}>{p.name}</div><div className="text-orange-500 font-mono font-black text-lg">¥{tempPrices[p.id] || p.basePrice}</div><div className={`text-[10px] ${theme.textMuted} bg-gray-100 px-2 rounded-full`}>库存:{p.stock}</div></button>);})}</div>
                                                 {state.inventory.filter(p => p.stock > 0).length === 0 && <button onClick={() => handleBattleFail("price")} className="w-full py-4 bg-gray-200 text-gray-500 rounded-2xl font-bold">没有库存了 (遗憾放弃)</button>}
                                             </>
                                         )}
                                     </div>
                                 )}

                                 {battlePhase === 'negotiation' && (
                                     <div className={`flex flex-col gap-0 border-t ${theme.divider} pb-safe ${theme.cardBg}`}>
                                         {/* 1. Quick Actions Row */}
                                         <div className={`flex gap-2 overflow-x-auto p-2 ${theme.panelBg} scrollbar-hide border-b ${theme.divider}`}>
                                             {handCards.map((action) => (
                                                 <button 
                                                    key={action.id} 
                                                    onClick={() => handleSendMessage(action.textPayload, action)} 
                                                    disabled={isAIThinking}
                                                    className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap shadow-sm border active:scale-95 transition-transform ${isAIThinking ? 'opacity-50 cursor-not-allowed' : ''} ${action.category === 'financial' ? 'bg-green-50 text-green-700 border-green-200' : action.category === 'emotional' ? 'bg-pink-50 text-pink-700 border-pink-200' : isJunior ? 'bg-white text-gray-700 border-gray-200' : 'bg-slate-700 text-white border-slate-600'}`}
                                                 >
                                                     {action.label}
                                                 </button>
                                             ))}
                                             <button onClick={handleSwitchProduct} disabled={isAIThinking} className={`shrink-0 px-3 py-2 rounded-full border border-dashed text-xs font-bold ${isJunior ? 'border-gray-400 text-gray-500' : 'border-slate-500 text-slate-400'}`}><RefreshCw size={12}/></button>
                                         </div>

                                         {/* 1.5 Price Tools Row (Discount & Direct Deal) */}
                                         <div className="px-3 py-2 flex justify-between items-center gap-2">
                                             <div className="relative">
                                                 <button 
                                                    onClick={() => setShowDiscountMenu(!showDiscountMenu)}
                                                    disabled={isAIThinking}
                                                    className={`text-xs font-bold px-4 py-2 rounded-full flex items-center gap-1 active:scale-95 transition-all border ${showDiscountMenu ? 'bg-orange-100 border-orange-300 text-orange-700' : 'bg-white border-gray-200 text-gray-600'}`}
                                                 >
                                                     <Percent size={14} />
                                                     {showDiscountMenu ? '取消' : '给折扣'}
                                                     {showDiscountMenu ? <ChevronDown size={12}/> : <ChevronUp size={12}/>}
                                                 </button>
                                                 
                                                 {/* Dropdown Menu */}
                                                 {showDiscountMenu && (
                                                     <div className="absolute bottom-full left-0 mb-2 bg-white rounded-xl shadow-xl border border-gray-200 p-2 flex flex-col gap-1 min-w-[120px] animate-in slide-in-from-bottom-2 fade-in z-50">
                                                         {[10, 20, 30, 50].map(p => (
                                                             <button 
                                                                 key={p} 
                                                                 onClick={() => handleApplyDiscount(p)}
                                                                 className="text-left px-3 py-2 hover:bg-orange-50 rounded-lg text-xs font-bold text-gray-700 flex justify-between"
                                                             >
                                                                 <span>打{10 - p/10}折</span>
                                                                 <span className="text-orange-500">-{p}%</span>
                                                             </button>
                                                         ))}
                                                     </div>
                                                 )}
                                             </div>

                                             <button 
                                                onClick={handleDirectDeal}
                                                disabled={isAIThinking}
                                                className={`flex-1 text-xs font-black text-white border-b-4 px-4 py-2 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm ${isAIThinking ? 'bg-gray-400 border-gray-500 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600 border-green-700 active:border-b-0 active:translate-y-1'}`}
                                             >
                                                 <Zap size={14} className="fill-white"/>
                                                 🔥 直接成交 (Direct Deal)
                                             </button>
                                         </div>

                                         {/* 2. Chat Input */}
                                         <div className={`p-3 flex gap-2 items-center relative ${theme.cardBg}`}>
                                             <button onClick={handleGiveUp} disabled={isAIThinking} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="结束对话"><LogOut size={20}/></button>
                                             <input 
                                                type="text" 
                                                value={chatInput} 
                                                onChange={(e) => setChatInput(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                                placeholder="说点什么来砍价..." 
                                                disabled={isAIThinking}
                                                className={`flex-1 border-0 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all outline-none ${isJunior ? 'bg-gray-100 text-gray-900 focus:bg-white' : 'bg-slate-900 text-white focus:bg-slate-800'}`}
                                             />
                                             <button onClick={() => handleSendMessage()} disabled={!chatInput.trim() || isAIThinking} className={`p-2.5 rounded-xl text-white shadow-lg transition-transform ${!chatInput.trim() || isAIThinking ? 'bg-gray-300' : 'bg-blue-600 active:scale-90'}`}><Send size={18}/></button>
                                         </div>
                                     </div>
                                 )}

                                 {battlePhase === 'result' && (
                                    <div className="animate-in zoom-in duration-300 pb-safe"><button onClick={nextCustomer} className={`w-full py-5 rounded-2xl font-black text-xl text-white shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-transform ${battleResult === 'sold' || battleResult === 'recovered' ? 'bg-green-500 shadow-green-200' : 'bg-gray-500'}`}>{battleResult === 'sold' || battleResult === 'recovered' ? <Handshake size={28}/> : <ArrowLeft size={28}/>}{battleResult === 'sold' ? '处理完成！接待下一位' : '遗憾离场... 接待下一位'}</button></div>
                                )}

                                {/* NEW: THIEF CHASE PHASE */}
                                {battlePhase === 'thief_chase' && (
                                    <div className="animate-in slide-in-from-bottom duration-300 pb-safe space-y-4">
                                        <div className="bg-red-100 border-2 border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-800">
                                            <AlertTriangle size={24} className="animate-pulse"/>
                                            <div className="font-bold text-sm">
                                                遭遇跑单！是否立即报警追回？
                                                <div className="text-xs font-normal opacity-80 mt-1">需等待警方处理，有概率追回损失。</div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button 
                                                onClick={handleLetThiefGo}
                                                disabled={isAIThinking}
                                                className="py-4 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-xl font-bold flex flex-col items-center justify-center gap-1 active:scale-95"
                                            >
                                                <LogOut size={24}/>
                                                自认倒霉 (Skip)
                                            </button>
                                            <button 
                                                onClick={handleCallPolice}
                                                disabled={isAIThinking}
                                                className="py-4 bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-200 rounded-xl font-bold flex flex-col items-center justify-center gap-1 active:scale-95"
                                            >
                                                {isAIThinking ? <RefreshCw className="animate-spin" size={24}/> : <Siren size={24}/>}
                                                {isAIThinking ? '联系警方中...' : '立即报警 (Alarm)'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                             </div>
                         </>
                     )}
                </div>
            )}
            
            {/* Waiting/Settlement Views (Abbreviated to keep structure valid) */}
            {state.phase === 'waiting_close' && (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
                    <div className="bg-orange-100 rounded-full p-6 mb-6 animate-pulse"><Coffee size={64} className="text-orange-500"/></div>
                    <h2 className={`text-2xl font-black ${theme.textMain} mb-2`}>今日已售罄！</h2>
                    <p className={`font-bold mb-8 ${theme.textSec}`}>做得好！现在休息一下，等待大屏幕上的时间结束。</p>
                </div>
            )}
            
            {state.phase === 'settlement' && (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center overflow-y-auto pb-10">
                    <div className="text-6xl mb-4 animate-pulse">🌙</div>
                    <h2 className={`text-3xl font-black mb-2 ${theme.textMain}`}>今日战报</h2>
                    <div className={`${theme.cardBg} p-6 rounded-[2rem] shadow-xl border ${theme.border} w-full mb-6`}>
                         <div className={`text-sm uppercase font-bold mb-2 tracking-wider ${theme.textMuted}`}>今日净利润</div>
                         <div className={`text-5xl font-black tracking-tight ${state.lastTurnProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>{state.lastTurnProfit >= 0 ? '+' : ''}¥{state.lastTurnProfit}</div>
                         {state.lastTurnCosts > 0 && <div className="text-xs text-red-400 mt-2 bg-red-50 inline-block px-2 py-1 rounded">已扣除仓储费: ¥{state.lastTurnCosts}</div>}
                    </div>
                    
                    {/* SHOP UPGRADE UI */}
                    {state.shopLevelIdx < shopLevels.length - 1 && (
                        <div className={`w-full mb-6 p-4 rounded-2xl border-2 text-left relative overflow-hidden ${isJunior ? 'bg-gradient-to-r from-blue-500 to-indigo-600 border-blue-400' : 'bg-slate-800 border-slate-600'}`}>
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Store size={120} className="text-white"/>
                            </div>
                            <div className="relative z-10 text-white">
                                <div className="text-xs font-bold uppercase tracking-wider opacity-80 mb-1">店铺升级机会</div>
                                <h3 className="text-2xl font-black mb-2">{shopLevels[state.shopLevelIdx + 1].name}</h3>
                                <p className="text-sm opacity-90 mb-4">{shopLevels[state.shopLevelIdx + 1].description}</p>
                                <div className="flex items-center gap-4 text-xs font-bold mb-4">
                                    <span className="bg-white/20 px-2 py-1 rounded">📦 库存上限 {shopLevels[state.shopLevelIdx + 1].maxStock}</span>
                                    <span className="bg-white/20 px-2 py-1 rounded">👥 客流 +20%</span>
                                </div>
                                <button 
                                    onClick={handleUpgradeShop}
                                    className="w-full py-3 bg-white text-blue-600 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
                                >
                                    <ArrowUp size={18}/> 
                                    升级店铺 (-¥{Math.ceil(shopLevels[state.shopLevelIdx + 1].upgradeCost * (marketConfig.upgradeCostMultiplier || 1.0))})
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ... Next Turn Button ... */}
                    <button 
                        disabled={globalRoundNumber <= state.currentTurn}
                        onClick={handleStartNextTurn} 
                        className={`w-full py-5 rounded-2xl font-bold shadow-xl text-xl flex items-center justify-center gap-3 transition-all ${globalRoundNumber > state.currentTurn ? `${theme.accent} ${theme.buttonText}` : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                    >
                        {globalRoundNumber > state.currentTurn ? `开始第 ${globalRoundNumber} 天 🌅` : `等待老师开启下一天... ⏳`}
                    </button>
                </div>
            )}

        </main>
    </div>
  );
};

export default PlayerView;
