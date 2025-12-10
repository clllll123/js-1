
import React, { useState, useEffect, useRef } from 'react';
import { Role, AgeGroup, PlayerState, MarketConfig, GameEvent, CustomerCard, MarketFluctuation, ProductCategory, GameSyncPayload } from './types';
import BigScreenView from './components/BigScreenView';
import TeacherView from './components/TeacherView';
import PlayerView from './components/PlayerView';
import { Smartphone, SplitSquareHorizontal, X, Presentation, UserCog } from 'lucide-react';
import { speakAnnouncement, generateAICustomerBatch } from './services/geminiService';
import { GAME_EVENTS, generateCustomer } from './constants';
import { p2p } from './services/p2p';

// Helper to generate random fluctuation
// force: true ignores the 30% chance and guarantees a fluctuation
const generateFluctuation = (event: GameEvent, force: boolean = false): MarketFluctuation | null => {
    if (!force && Math.random() > 0.7) return null; // 30% chance of no major news normally

    const type = Math.random() > 0.5 ? 'surge' : 'crash';
    // Pick a category. If event has boosted categories, likely one of those, otherwise random.
    const categories: ProductCategory[] = event.boostedCategories.length > 0 
        ? event.boostedCategories 
        : ['food', 'daily', 'tech', 'toy', 'gift'];
    
    const category = categories[Math.floor(Math.random() * categories.length)];
    
    // Config
    let modifier = 1.0;
    let reason = "";

    const reasonsCrash = ["原材料大丰收", "技术突破成本降低", "工厂去库存", "政府补贴发放", "新型替代品出现", "国际汇率利好"];
    const reasonsSurge = ["产地发生自然灾害", "国际物流受阻", "原材料严重短缺", "市场需求突然爆发", "主要工厂停工", "关税政策调整"];

    if (type === 'crash') {
        modifier = 0.6 + Math.random() * 0.2; // 0.6 - 0.8
        reason = reasonsCrash[Math.floor(Math.random() * reasonsCrash.length)];
    } else {
        modifier = 1.2 + Math.random() * 0.4; // 1.2 - 1.6
        reason = reasonsSurge[Math.floor(Math.random() * reasonsSurge.length)];
    }

    return { category, type, modifier, reason };
};

const App: React.FC = () => {
  const [role, setRole] = useState<Role | 'split'>(null);
  const [ageGroup, setAgeGroup] = useState<AgeGroup>(AgeGroup.Junior);

  // --- SERVER STATE ---
  const [roomCode, setRoomCode] = useState<string>("8888");
  const [eventName, setEventName] = useState<string>("第一届商业模拟挑战赛");
  const [connectedPlayers, setConnectedPlayers] = useState<PlayerState[]>([]);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [recentEvents, setRecentEvents] = useState<string[]>([]);
  
  // Game Flow State
  const [marketConfig, setMarketConfig] = useState<MarketConfig>({
      economicBoom: true,
      skepticismLevel: 'low',
      customerTraffic: 1.0,
      roundDuration: 180,
      baseCustomerCount: 3, 
      storageFeeRate: 1.0,
      logisticsFeeRate: 0.5,
      pricingThresholds: {
          safe: 1.5,
          normal: 2.5,
          risky: 3.5
      },
      hotItemSurcharge: 0.2, // 20% price increase for hot items
      coldItemDiscount: 0.2, // 20% discount for cold items
      upgradeCostMultiplier: 1.0 // Normal upgrade cost
  });
  const [timeLeft, setTimeLeft] = useState(marketConfig.roundDuration);
  const [isRunning, setIsRunning] = useState(false);
  const [roundNumber, setRoundNumber] = useState(1);
  const [isRoundSummary, setIsRoundSummary] = useState(false); 
  
  // GLOBAL EVENT STATE
  const [currentGlobalEvent, setCurrentGlobalEvent] = useState<GameEvent>(GAME_EVENTS[0]);
  const [marketFluctuation, setMarketFluctuation] = useState<MarketFluctuation | null>(null);

  // --- AI CUSTOMER POOL (NEW) ---
  const [aiCustomerPool, setAiCustomerPool] = useState<CustomerCard[]>([]);
  const [isFetchingAI, setIsFetchingAI] = useState(false);

  // REF FOR NETWORK LOOP (PERFORMANCE OPTIMIZATION)
  // We keep a ref to the latest state so the broadcast interval can read it without triggering re-renders
  const gameStateRef = useRef({
      eventName,
      isGameStarted,
      isRunning,
      timeLeft,
      roundNumber,
      currentGlobalEvent,
      marketConfig,
      marketFluctuation,
      connectedPlayers,
      recentEvents
  });

  // Keep Ref Syncing
  useEffect(() => {
      gameStateRef.current = {
          eventName,
          isGameStarted,
          isRunning,
          timeLeft,
          roundNumber,
          currentGlobalEvent,
          marketConfig,
          marketFluctuation,
          connectedPlayers,
          recentEvents
      };
  }, [eventName, isGameStarted, isRunning, timeLeft, roundNumber, currentGlobalEvent, marketConfig, marketFluctuation, connectedPlayers, recentEvents]);


  // Function to replenish pool
  const replenishCustomerPool = async (count: number, forceEvent?: GameEvent) => {
      // Allow concurrent fetches if manually triggered? No, safer to lock.
      if (isFetchingAI) return;
      setIsFetchingAI(true);
      const evt = forceEvent || currentGlobalEvent;
      
      const newCustomers = await generateAICustomerBatch(count, roundNumber, evt, 'random');
      
      if (newCustomers.length > 0) {
          setAiCustomerPool(prev => [...prev, ...newCustomers]);
      }
      setIsFetchingAI(false);
  };

  // Exposed handler for Teacher View
  const handleTeacherGenerateAICustomers = async (count: number, distributeNow: boolean, bias: 'random' | 'easy' | 'hard' | 'chaos' = 'random') => {
      // 1. Generate
      setIsFetchingAI(true);
      const newCustomers = await generateAICustomerBatch(count, roundNumber, currentGlobalEvent, bias);
      setIsFetchingAI(false);

      if (newCustomers.length > 0) {
          if (distributeNow) {
              // Distribute immediately to all active players
              setConnectedPlayers(prev => prev.map(player => {
                  if (player.status !== 'playing' && player.status !== 'ready') return player;
                  // Clone cards with unique IDs for each player so they don't share the same exact object ID
                  const personalizedCards = newCustomers.map((c, i) => ({
                      ...c,
                      id: `${c.id}_airdrop_${player.id}_${i}`
                  }));
                  return { ...player, serverCustomerQueue: [...player.serverCustomerQueue, ...personalizedCards] };
              }));
              const diffText = bias === 'easy' ? '（友好团）' : bias === 'hard' ? '（挑战团）' : bias === 'chaos' ? '（捣乱团）' : '';
              const msg = `🤖 系统空投了 ${count} 位 AI 顾客${diffText}！`;
              handleGameEvent(msg);
              p2p.broadcastEvent(msg);
              speakAnnouncement("注意！一批性格各异的新客户刚刚到达商业中心！", ageGroup);
          } else {
              // Just add to pool
              setAiCustomerPool(prev => [...prev, ...newCustomers]);
              handleGameEvent(`💾 系统后台生成了 ${count} 位 AI 顾客，等待进场。`);
          }
      }
  };


  // --- MARKET SIMULATION ENGINE ---
  const marketIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
      if (isRunning && isGameStarted && !isRoundSummary) {
          marketIntervalRef.current = setInterval(() => {
              checkAndDealBonusCustomers();
          }, 5000); 
      } else {
          if (marketIntervalRef.current) clearInterval(marketIntervalRef.current);
      }
      return () => { if (marketIntervalRef.current) clearInterval(marketIntervalRef.current); };
  }, [isRunning, isGameStarted, isRoundSummary, connectedPlayers.length, currentGlobalEvent, aiCustomerPool]); 

  // Check for Round End Condition
  useEffect(() => {
      if (isRunning && isGameStarted && !isRoundSummary) {
          if (timeLeft === 0) {
              endRound();
              return;
          }
      }
  }, [timeLeft, isRunning, isGameStarted, isRoundSummary]);

  // --- NETWORKING: BROADCAST LOOP (OPTIMIZED) ---
  // Using a dedicated interval instead of reacting to every state change.
  // This limits network traffic to 1 message per second regardless of how many players join.
  useEffect(() => {
      if ((role === 'teacher' || role === 'screen') && isGameStarted) {
          const interval = setInterval(() => {
              const current = gameStateRef.current;
              
              // DATA SLIMMING: Remove heavy logs from the broadcast to save bandwidth
              // Students maintain their own logs locally.
              const lightweightPlayers = current.connectedPlayers.map(p => ({
                  ...p,
                  logs: [] 
              }));

              const payload: GameSyncPayload = {
                  eventName: current.eventName,
                  isGameStarted: current.isGameStarted,
                  isRunning: current.isRunning,
                  timeLeft: current.timeLeft,
                  roundNumber: current.roundNumber,
                  currentGlobalEvent: current.currentGlobalEvent,
                  marketConfig: current.marketConfig,
                  marketFluctuation: current.marketFluctuation,
                  players: lightweightPlayers,
                  recentEvents: current.recentEvents
              };
              p2p.broadcastGameSync(payload);
          }, 1000); // 1Hz Broadcast Rate

          return () => clearInterval(interval);
      }
  }, [isGameStarted, role]); // Only restart loop if role or game status fundamental changes


  // Unified function to distribute cards using pool
  const distributeCustomers = (countPerPlayer: number) => {
      let poolCopy = [...aiCustomerPool];
      
      setConnectedPlayers(prev => prev.map(player => {
          if (player.status !== 'playing' && player.status !== 'ready') return player;
          
          const newCards: CustomerCard[] = [];
          for(let i=0; i<countPerPlayer; i++) {
              if (poolCopy.length > 0) {
                  const c = poolCopy.shift()!;
                  newCards.push({ ...c, id: `${c.id}_p${player.id}_${i}` }); // Unique ID for this instance
              } else {
                  newCards.push(generateCustomer(roundNumber, currentGlobalEvent));
              }
          }
          return { ...player, serverCustomerQueue: [...player.serverCustomerQueue, ...newCards] };
      }));

      // Update the pool state with remaining
      setAiCustomerPool(poolCopy);
  };


  const checkAndDealBonusCustomers = () => {
      let poolCopy = [...aiCustomerPool];
      let poolModified = false;

      setConnectedPlayers(prevPlayers => {
          return prevPlayers.map(player => {
              if (player.status !== 'playing') return player;
              
              const queueSize = player.serverCustomerQueue.length - (player.processedCustomerCount || 0);
              let chance = 0.05; 
              if (player.reputation > 80) chance += 0.1;
              if (queueSize <= 0) chance += 0.2;
              if (player.activeCampaign === 'flyer') chance = 0.6; 
              if (player.activeCampaign === 'influencer') chance = 0.9; 
              if (queueSize <= 0 && player.activeCampaign !== 'none') chance = 1.0; 

              if (Math.random() < chance) {
                  let bonusCustomer: CustomerCard;
                  
                  // Try pool
                  if (poolCopy.length > 0) {
                      const c = poolCopy.shift()!;
                      bonusCustomer = { ...c, id: `${c.id}_bonus_${player.id}` };
                      poolModified = true;
                  } else {
                      bonusCustomer = generateCustomer(roundNumber, currentGlobalEvent);
                  }

                  if (player.activeCampaign === 'influencer') {
                      bonusCustomer.budget = Math.floor(bonusCustomer.budget * 1.5);
                      bonusCustomer.name = `[粉丝] ${bonusCustomer.name}`;
                  }

                  return {
                      ...player,
                      serverCustomerQueue: [...player.serverCustomerQueue, bonusCustomer]
                  };
              }
              return player;
          });
      });

      if (poolModified) {
          setAiCustomerPool(poolCopy);
      }
  };

  // --- PLAYER CALLBACKS ---
  const handleCustomerAction = (playerId: string, customerId: string, result: 'satisfied' | 'angry') => {
      // Host side logic tracked in connectedPlayers state
  };

  // --- TIMER LOGIC ---
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRunning && timeLeft > 0 && !isRoundSummary) {
        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    if (timerRef.current) clearInterval(timerRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    } else {
        if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
        if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, isRoundSummary]);

  const endRound = () => {
      setIsRunning(false);
      setIsRoundSummary(true); 
      speakAnnouncement(`第${roundNumber}轮结束！请查看大屏幕经营报告。`, ageGroup);
  };

  // --- ACTIONS ---

  const handleCreateRoom = () => {
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      setRoomCode(code);
      setConnectedPlayers([]);
      setIsGameStarted(false);
      setRecentEvents([]);
      
      // Initialize P2P Host
      p2p.initHost(code, (id) => {
          console.log("P2P Room Created:", id);
      });
      p2p.setCallbacks({
          onPlayerUpdate: (playerData) => {
              setConnectedPlayers(prev => {
                  const existing = prev.find(p => p.id === playerData.id || p.name === playerData.name);
                  if (existing) {
                      return prev.map(p => p.id === existing.id ? { ...existing, ...playerData } : p);
                  } else {
                      // New join via network
                      return [...prev, { ...playerData, serverCustomerQueue: [] }];
                  }
              });
          }
      });

      return code;
  };

  const handleStartGame = () => {
      setIsGameStarted(true);
      setIsRunning(true); 
      setIsRoundSummary(false);
      
      const evt = currentGlobalEvent;
      let fluc = marketFluctuation;
      if (!fluc && Math.random() > 0.5) {
          fluc = generateFluctuation(evt);
          setMarketFluctuation(fluc);
      }
      
      replenishCustomerPool(10, evt);

      const initialCount = marketConfig.baseCustomerCount || 3;
      distributeCustomers(initialCount);

      const msg = `🚀 游戏正式开始！每人派发 ${initialCount} 位顾客！`;
      setRecentEvents(prev => [msg, ...prev]);
      p2p.broadcastEvent(msg);
  };

  const handlePlayerJoin = (name: string, room: string): boolean => {
      // In Local/Split mode, check logic locally
      if (role === 'split') {
        if (room !== roomCode) return false;
        const existingPlayer = connectedPlayers.find(p => p.name === name);
        if (existingPlayer) return true; 

        const newPlayer: PlayerState = {
            id: `p-${Date.now()}`,
            name: name,
            shopName: '未命名店铺',
            shopLogo: null,
            funds: 0,
            inventory: [],
            logs: [],
            totalProfit: 0,
            lastTurnProfit: 0,
            marketingLevel: 1,
            currentTurn: 1,
            status: 'lobby',
            reputation: 100, 
            activeCampaign: 'none',
            serverCustomerQueue: [],
            processedCustomerCount: 0
        };
        setConnectedPlayers(prev => [...prev, newPlayer]);
        return true;
      }
      
      // In Network mode, PlayerView handles P2P connection init
      // We just validate the room code format locally, actual check happens in P2P handshake
      return true;
  };

  const handlePlayerUpdate = (playerData: Partial<PlayerState> & { name: string }) => {
      if (role === 'split') {
        setConnectedPlayers(prev => prev.map(p => 
            p.name === playerData.name ? { ...p, ...playerData } : p
        ));
      } else if (role === 'student') {
        // Send to host
        // We need to merge with a full object structure if possible, but Partial is okay
        // ID is crucial. PlayerView generates ID.
        // We'll rely on p2p.sendPlayerUpdate called inside PlayerView or here?
        // Actually, PlayerView calls this on changes.
        // We need to ensure ID is present.
        if (playerData.id) {
            p2p.sendPlayerUpdate(playerData as PlayerState);
        }
      }
  };

  const handleGameEvent = (message: string) => {
      setRecentEvents(prev => [message, ...prev].slice(0, 20));
  };

  const handleMarketConfigChange = (newConfig: Partial<MarketConfig>) => {
      setMarketConfig(prev => ({ ...prev, ...newConfig }));
  };

  const handleToggleTimer = () => setIsRunning(!isRunning);
  
  const handleResetRound = () => {
      setIsRunning(false);
      setIsRoundSummary(false); 
      setTimeLeft(marketConfig.roundDuration);
      setRoundNumber(prev => prev + 1);
      
      const nextEvent = GAME_EVENTS[Math.floor(Math.random() * GAME_EVENTS.length)];
      setCurrentGlobalEvent(nextEvent);
      setMarketFluctuation(generateFluctuation(nextEvent)); 
      
      replenishCustomerPool(10, nextEvent);

      setConnectedPlayers(prev => prev.map(p => ({
          ...p,
          activeCampaign: 'none',
          serverCustomerQueue: [], 
          processedCustomerCount: 0 
      })));

      const count = marketConfig.baseCustomerCount || 3;
      distributeCustomers(count);

      handleGameEvent(`🌞 新的一天开始了！每人新增 ${count} 位潜在客户。`);
      handleGameEvent(`📢 市场情报: ${nextEvent.name}`);
  };

  const handleTriggerRandomEvent = () => {
      const randomEvent = GAME_EVENTS[Math.floor(Math.random() * GAME_EVENTS.length)];
      const fluctuation = generateFluctuation(randomEvent, true);
      
      setCurrentGlobalEvent(randomEvent);
      setMarketFluctuation(fluctuation);
      
      const fluctuationText = fluctuation ? (fluctuation.type === 'crash' ? `📉 ${fluctuation.category}价格暴跌` : `📈 ${fluctuation.category}价格飞涨`) : '';
      const msg = `🎲 智能随机事件触发: ${randomEvent.name} ${fluctuationText}`;
      handleGameEvent(msg);
      p2p.broadcastEvent(msg);
      
      const voiceText = `注意！市场发生随机变动！${randomEvent.name}来了。${fluctuation ? `受${fluctuation.reason}影响，${fluctuation.category}类的进货价格出现${fluctuation.type === 'crash' ? '暴跌' : '暴涨'}！` : ''}`;
      speakAnnouncement(voiceText, ageGroup);
  };

  const handleForceSettlement = () => {
      setTimeLeft(0); 
  };

  const reset = () => {
      setRole(null);
      setConnectedPlayers([]);
      setIsGameStarted(false);
      setRecentEvents([]);
      setIsRunning(false);
      setRoundNumber(1);
      setTimeLeft(180);
      setIsRoundSummary(false);
      setAiCustomerPool([]);
      p2p.destroy();
  };

  const [splitLeftView, setSplitLeftView] = useState<'screen' | 'teacher'>('teacher');

  // --- RENDER ---

  if (role === 'split') {
    const simulatorPlayer = connectedPlayers.length > 0 ? connectedPlayers[connectedPlayers.length - 1] : null;
    return (
      <div className="flex h-screen w-screen bg-gray-900 overflow-hidden">
        <div className="flex-1 h-full border-r border-gray-700 relative flex flex-col">
            <div className="absolute top-4 left-4 z-50 flex gap-2">
                <button onClick={reset} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs flex items-center gap-1 shadow-lg"><X size={14}/> 退出</button>
                <div className="bg-slate-800 rounded p-1 flex gap-1 shadow-lg border border-slate-700">
                    <button onClick={() => setSplitLeftView('teacher')} className={`px-3 py-1 rounded text-xs font-bold ${splitLeftView === 'teacher' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>老师端</button>
                    <button onClick={() => setSplitLeftView('screen')} className={`px-3 py-1 rounded text-xs font-bold ${splitLeftView === 'screen' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>大屏端</button>
                </div>
            </div>
            
            {splitLeftView === 'teacher' ? (
                <TeacherView 
                    ageGroup={ageGroup}
                    connectedPlayers={connectedPlayers}
                    roomCode={roomCode}
                    eventName={eventName}
                    setEventName={setEventName}
                    onStartGame={handleStartGame}
                    marketConfig={marketConfig}
                    onUpdateMarketConfig={handleMarketConfigChange}
                    timeLeft={timeLeft}
                    isRunning={isRunning}
                    roundNumber={roundNumber}
                    isGameStarted={isGameStarted}
                    onToggleTimer={handleToggleTimer}
                    onResetRound={handleResetRound}
                    onForceSettlement={handleForceSettlement}
                    aiCustomerPoolCount={aiCustomerPool.length}
                    onGenerateAICustomers={handleTeacherGenerateAICustomers}
                    currentEvent={currentGlobalEvent}
                    onSetEvent={setCurrentGlobalEvent}
                    onTriggerRandomEvent={handleTriggerRandomEvent}
                />
            ) : (
                <BigScreenView 
                    ageGroup={ageGroup}
                    connectedPlayers={connectedPlayers}
                    roomCode={roomCode}
                    eventName={eventName}
                    recentEvents={recentEvents}
                    timeLeft={timeLeft}
                    roundNumber={roundNumber}
                    isRunning={isRunning}
                    isGameStarted={isGameStarted}
                    currentEvent={currentGlobalEvent}
                    isRoundSummary={isRoundSummary}
                />
            )}
        </div>

        <div className="w-[400px] bg-gray-200 flex flex-col items-center justify-center p-4 shadow-2xl relative bg-checkerboard">
            <div className="text-gray-500 text-xs mb-2 font-mono flex items-center gap-1"><Smartphone size={12}/> iPhone 14 Pro Simulator (Local Mode)</div>
            <div className="w-full h-[85vh] bg-black rounded-[3rem] border-8 border-gray-800 shadow-xl overflow-hidden relative ring-4 ring-gray-300/20">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-b-2xl z-50"></div>
                <div className="w-full h-full bg-white overflow-y-auto scrollbar-hide">
                    <PlayerView 
                        ageGroup={ageGroup} 
                        onBack={reset} 
                        onJoin={(name, room) => handlePlayerJoin(name, room)}
                        onUpdate={handlePlayerUpdate}
                        isGameStarted={isGameStarted}
                        onGameEvent={handleGameEvent}
                        marketConfig={marketConfig}
                        currentGlobalEvent={currentGlobalEvent}
                        globalRoundNumber={roundNumber}
                        serverPlayerState={simulatorPlayer || null}
                        onCustomerAction={(cid, res) => simulatorPlayer && handleCustomerAction(simulatorPlayer.id, cid, res)}
                        isRoundOver={isRoundSummary} 
                        marketFluctuation={marketFluctuation}
                        recentEvents={recentEvents} // Pass recentEvents to Simulator
                    />
                </div>
            </div>
        </div>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-5xl w-full text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
          <h1 className="text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">青少年商业实践乐园</h1>
          <p className="text-slate-500 mb-10 text-lg">请选择您的登录终端</p>
          <div className="inline-flex bg-gray-100 p-1 rounded-full mb-10 shadow-inner">
             {Object.values(AgeGroup).map((age) => (
                 <button key={age} onClick={() => setAgeGroup(age)} className={`px-8 py-3 rounded-full text-sm font-bold transition-all duration-300 ${ageGroup === age ? 'bg-white text-blue-600 shadow-md transform scale-105' : 'text-gray-500 hover:text-gray-700'}`}>{age === AgeGroup.Junior ? '🎈 6-12岁 (趣味版)' : '💼 12-16岁 (专业版)'}</button>
             ))}
          </div>
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <button onClick={() => { setRole('screen'); handleCreateRoom(); }} className="group p-6 border-2 border-slate-100 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-all flex flex-col items-center gap-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs px-2 py-1 rounded-bl-lg font-bold">DISPLAY</div>
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:scale-110 transition-all duration-300 shadow-lg"><Presentation className="w-8 h-8 text-blue-600 group-hover:text-white" /></div>
              <div><div className="text-lg font-bold text-slate-800">大屏展示端</div><div className="text-xs text-slate-500 mt-1">实时数据 / 排行榜</div></div>
            </button>
            <button onClick={() => { setRole('teacher'); handleCreateRoom(); }} className="group p-6 border-2 border-slate-100 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50 transition-all flex flex-col items-center gap-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-indigo-500 text-white text-xs px-2 py-1 rounded-bl-lg font-bold">ADMIN</div>
              <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:scale-110 transition-all duration-300 shadow-lg"><UserCog className="w-8 h-8 text-indigo-600 group-hover:text-white" /></div>
              <div><div className="text-lg font-bold text-slate-800">老师管理端</div><div className="text-xs text-slate-500 mt-1">流程控制 / 后台配置</div></div>
            </button>
            <button onClick={() => { setRole('split'); handleCreateRoom(); }} className="group p-6 border-2 border-dashed border-purple-200 rounded-2xl hover:border-purple-500 hover:bg-purple-50 transition-all flex flex-col items-center gap-4 relative">
               <div className="absolute top-0 right-0 bg-purple-500 text-white text-xs px-2 py-1 rounded-bl-lg font-bold">TEST</div>
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center group-hover:bg-purple-600 group-hover:rotate-90 transition-all duration-300 shadow-lg"><SplitSquareHorizontal className="w-8 h-8 text-purple-600 group-hover:text-white" /></div>
              <div><div className="text-lg font-bold text-slate-800">全功能测试</div><div className="text-xs text-slate-500 mt-1">双屏联动 / 教学演示</div></div>
            </button>
            <button onClick={() => setRole('student')} className="group p-6 border-2 border-slate-100 rounded-2xl hover:border-pink-500 hover:bg-pink-50 transition-all flex flex-col items-center gap-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-pink-500 text-white text-xs px-2 py-1 rounded-bl-lg font-bold">PLAYER</div>
              <div className="w-16 h-16 bg-pink-100 rounded-2xl flex items-center justify-center group-hover:bg-pink-600 group-hover:-translate-y-2 transition-all duration-300 shadow-lg"><Smartphone className="w-8 h-8 text-pink-600 group-hover:text-white" /></div>
              <div><div className="text-lg font-bold text-slate-800">学生操作端</div><div className="text-xs text-slate-500 mt-1">扫码 / 登录 / 游戏</div></div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- NETWORKED MODES ---

  if (role === 'screen') {
      return <BigScreenView 
        ageGroup={ageGroup} connectedPlayers={connectedPlayers} roomCode={roomCode} eventName={eventName} recentEvents={recentEvents} timeLeft={timeLeft} roundNumber={roundNumber} isRunning={isRunning} isGameStarted={isGameStarted} currentEvent={currentGlobalEvent}
        isRoundSummary={isRoundSummary}
      />;
  }

  if (role === 'teacher') {
      return <TeacherView 
        ageGroup={ageGroup} connectedPlayers={connectedPlayers} roomCode={roomCode} eventName={eventName} setEventName={setEventName} onStartGame={handleStartGame} marketConfig={marketConfig} onUpdateMarketConfig={handleMarketConfigChange} timeLeft={timeLeft} isRunning={isRunning} roundNumber={roundNumber} isGameStarted={isGameStarted} onToggleTimer={handleToggleTimer} onResetRound={handleResetRound} onForceSettlement={handleForceSettlement} aiCustomerPoolCount={aiCustomerPool.length} onGenerateAICustomers={handleTeacherGenerateAICustomers}
        currentEvent={currentGlobalEvent} onSetEvent={setCurrentGlobalEvent} onTriggerRandomEvent={handleTriggerRandomEvent}
      />;
  }

  if (role === 'student') {
      // In Network mode, myPlayer logic is handled inside PlayerView via P2P syncing
      // We don't have the full player list in App.tsx for students usually, 
      // but for simplicity we can let PlayerView manage its local state and just sync up.
      return <PlayerView 
        ageGroup={ageGroup} 
        onBack={reset} 
        onJoin={(name, room) => {
            // P2P connect logic
            return new Promise((resolve) => {
                p2p.initClient(room, () => {
                    // Setup listener
                    p2p.setCallbacks({
                        onGameSync: (data) => {
                            setEventName(data.eventName); // Sync Title
                            setIsGameStarted(data.isGameStarted);
                            setIsRunning(data.isRunning);
                            setTimeLeft(data.timeLeft);
                            setRoundNumber(data.roundNumber);
                            setCurrentGlobalEvent(data.currentGlobalEvent);
                            setMarketConfig(data.marketConfig);
                            setMarketFluctuation(data.marketFluctuation);
                            setRecentEvents(data.recentEvents);
                            
                            // Also update connectedPlayers for leaderboard view if needed
                            if(data.players) setConnectedPlayers(data.players);
                        },
                        onGameEvent: (msg) => {
                            setRecentEvents(prev => [msg, ...prev].slice(0, 20));
                        }
                    });
                    resolve(true);
                });
                // Fallback timeout if connection fails?
                setTimeout(() => resolve(false), 5000);
            }) as any; 
        }}
        onUpdate={handlePlayerUpdate}
        isGameStarted={isGameStarted}
        onGameEvent={handleGameEvent}
        marketConfig={marketConfig}
        currentGlobalEvent={currentGlobalEvent}
        globalRoundNumber={roundNumber}
        serverPlayerState={connectedPlayers.find(p => p.name === localStorage.getItem('last_player_name')) || null} 
        onCustomerAction={() => {}} // Client doesn't need to callback up for this, funds update handles it
        isRoundOver={isRoundSummary} 
        marketFluctuation={marketFluctuation}
        recentEvents={recentEvents} // Pass to PlayerView
      />;
  }

  return null;
};

export default App;
