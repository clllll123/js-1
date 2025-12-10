import React, { useState, useEffect, useRef } from 'react';
import { Role, AgeGroup, PlayerState, MarketConfig, GameEvent, CustomerCard, MarketFluctuation, ProductCategory, GameSyncPayload } from './types';
import BigScreenView from './components/BigScreenView';
import TeacherView from './components/TeacherView';
import PlayerView from './components/PlayerView';
import { Smartphone, SplitSquareHorizontal, X, ArrowLeft, Store, ChevronRight, Monitor, Settings } from 'lucide-react';
import { speakAnnouncement, generateAICustomerBatch } from './services/geminiService';
import { GAME_EVENTS, generateCustomer } from './constants';
import { p2p } from './services/p2p';

// Helper to generate random fluctuation
const generateFluctuation = (event: GameEvent, force: boolean = false): MarketFluctuation | null => {
    if (!force && Math.random() > 0.7) return null; // 30% chance of no major news normally

    const type = Math.random() > 0.5 ? 'surge' : 'crash';
    const categories: ProductCategory[] = event.boostedCategories.length > 0 
        ? event.boostedCategories 
        : ['food', 'daily', 'tech', 'toy', 'gift'];
    
    const category = categories[Math.floor(Math.random() * categories.length)];
    
    const reasonsCrash = ["原材料大丰收", "技术突破成本降低", "工厂去库存", "政府补贴发放", "新型替代品出现", "国际汇率利好"];
    const reasonsSurge = ["产地发生自然灾害", "国际物流受阻", "原材料严重短缺", "市场需求突然爆发", "主要工厂停工", "关税政策调整"];

    let modifier = 1.0;
    let reason = "";

    if (type === 'crash') {
        modifier = 0.6 + Math.random() * 0.2; 
        reason = reasonsCrash[Math.floor(Math.random() * reasonsCrash.length)];
    } else {
        modifier = 1.2 + Math.random() * 0.4;
        reason = reasonsSurge[Math.floor(Math.random() * reasonsSurge.length)];
    }

    return { category, type, modifier, reason };
};

const App: React.FC = () => {
  const [role, setRole] = useState<Role | 'split'>(null);
  const [landingStep, setLandingStep] = useState<0 | 1>(0); // 0: Version, 1: Action
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
      pricingThresholds: { safe: 1.5, normal: 2.5, risky: 3.5 },
      hotItemSurcharge: 0.2,
      coldItemDiscount: 0.2,
      upgradeCostMultiplier: 1.0
  });
  const [timeLeft, setTimeLeft] = useState(marketConfig.roundDuration);
  const [isRunning, setIsRunning] = useState(false);
  const [roundNumber, setRoundNumber] = useState(1);
  const [isRoundSummary, setIsRoundSummary] = useState(false); 
  
  // GLOBAL EVENT STATE
  const [currentGlobalEvent, setCurrentGlobalEvent] = useState<GameEvent>(GAME_EVENTS[0]);
  const [marketFluctuation, setMarketFluctuation] = useState<MarketFluctuation | null>(null);

  // AI POOL
  const [aiCustomerPool, setAiCustomerPool] = useState<CustomerCard[]>([]);
  const [isFetchingAI, setIsFetchingAI] = useState(false);

  const gameStateRef = useRef({
      eventName, isGameStarted, isRunning, timeLeft, roundNumber, currentGlobalEvent, marketConfig, marketFluctuation, connectedPlayers, recentEvents
  });

  useEffect(() => {
      gameStateRef.current = { eventName, isGameStarted, isRunning, timeLeft, roundNumber, currentGlobalEvent, marketConfig, marketFluctuation, connectedPlayers, recentEvents };
  }, [eventName, isGameStarted, isRunning, timeLeft, roundNumber, currentGlobalEvent, marketConfig, marketFluctuation, connectedPlayers, recentEvents]);

  const replenishCustomerPool = async (count: number, forceEvent?: GameEvent) => {
      if (isFetchingAI) return;
      setIsFetchingAI(true);
      const evt = forceEvent || currentGlobalEvent;
      const newCustomers = await generateAICustomerBatch(count, roundNumber, evt, 'random');
      if (newCustomers.length > 0) setAiCustomerPool(prev => [...prev, ...newCustomers]);
      setIsFetchingAI(false);
  };

  // --- MARKET LOGIC ---
  const marketIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
      if (isRunning && isGameStarted && !isRoundSummary) {
          marketIntervalRef.current = setInterval(() => {
             // Logic to deal extra customers occasionally
             // simplified for stability
          }, 5000); 
      }
      return () => { if (marketIntervalRef.current) clearInterval(marketIntervalRef.current); };
  }, [isRunning, isGameStarted, isRoundSummary]);

  useEffect(() => {
      if (isRunning && isGameStarted && !isRoundSummary) {
          if (timeLeft === 0) {
              endRound();
              return;
          }
      }
  }, [timeLeft, isRunning, isGameStarted, isRoundSummary]);

  // BROADCAST LOOP
  useEffect(() => {
      if ((role === 'teacher' || role === 'screen' || role === 'split') && isGameStarted) {
          const interval = setInterval(() => {
              const current = gameStateRef.current;
              const payload: GameSyncPayload = {
                  eventName: current.eventName,
                  isGameStarted: current.isGameStarted,
                  isRunning: current.isRunning,
                  timeLeft: current.timeLeft,
                  roundNumber: current.roundNumber,
                  currentGlobalEvent: current.currentGlobalEvent,
                  marketConfig: current.marketConfig,
                  marketFluctuation: current.marketFluctuation,
                  players: current.connectedPlayers.map(p => ({...p, logs: []})),
                  recentEvents: current.recentEvents
              };
              p2p.broadcastGameSync(payload);
          }, 1000);
          return () => clearInterval(interval);
      }
  }, [isGameStarted, role]);

  const distributeCustomers = (countPerPlayer: number) => {
      let poolCopy = [...aiCustomerPool];
      setConnectedPlayers(prev => prev.map(player => {
          if (player.status !== 'playing' && player.status !== 'ready') return player;
          const newCards: CustomerCard[] = [];
          for(let i=0; i<countPerPlayer; i++) {
              if (poolCopy.length > 0) {
                  const c = poolCopy.shift()!;
                  newCards.push({ ...c, id: `${c.id}_p${player.id}_${i}` }); 
              } else {
                  newCards.push(generateCustomer(roundNumber, currentGlobalEvent));
              }
          }
          return { ...player, serverCustomerQueue: [...player.serverCustomerQueue, ...newCards] };
      }));
      setAiCustomerPool(poolCopy);
  };

  // TIMER
  useEffect(() => {
    let timer: any;
    if (isRunning && timeLeft > 0 && !isRoundSummary) {
        timer = setInterval(() => {
            setTimeLeft((prev) => prev > 0 ? prev - 1 : 0);
        }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRunning, isRoundSummary, timeLeft]);

  const endRound = () => {
      setIsRunning(false);
      setIsRoundSummary(true); 
      speakAnnouncement(`第${roundNumber}轮结束！请查看大屏幕经营报告。`, ageGroup);
  };

  // ACTIONS
  const handleCreateRoom = () => {
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      setRoomCode(code);
      setConnectedPlayers([]);
      setIsGameStarted(false);
      setRecentEvents([]);
      p2p.initHost(code, (id) => console.log("Host Init:", id));
      p2p.setCallbacks({
          onPlayerUpdate: (playerData) => {
              setConnectedPlayers(prev => {
                  const existing = prev.find(p => p.id === playerData.id || p.name === playerData.name);
                  if (existing) {
                      return prev.map(p => p.id === existing.id ? { ...existing, ...playerData } : p);
                  } else {
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
      
      const randomEvent = GAME_EVENTS[Math.floor(Math.random() * GAME_EVENTS.length)];
      setCurrentGlobalEvent(randomEvent);
      
      let fluc = generateFluctuation(randomEvent);
      setMarketFluctuation(fluc);
      
      replenishCustomerPool(10, randomEvent);

      const initialCount = marketConfig.baseCustomerCount || 3;
      distributeCustomers(initialCount);

      const msg = `🚀 游戏正式开始！`;
      setRecentEvents(prev => [msg, ...prev]);
      p2p.broadcastEvent(msg);
      speakAnnouncement(`游戏开始！当前市场：${randomEvent.name}`, ageGroup);
  };

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
      handleGameEvent(`🌞 第 ${roundNumber + 1} 轮开始！`);
  };

  const handleGameEvent = (message: string) => {
      setRecentEvents(prev => [message, ...prev].slice(0, 20));
  };

  const handleTriggerRandomEvent = () => {
      const randomEvent = GAME_EVENTS[Math.floor(Math.random() * GAME_EVENTS.length)];
      const fluctuation = generateFluctuation(randomEvent, true);
      setCurrentGlobalEvent(randomEvent);
      setMarketFluctuation(fluctuation);
      const msg = `🎲 随机事件: ${randomEvent.name}`;
      handleGameEvent(msg);
      p2p.broadcastEvent(msg);
      speakAnnouncement(`注意！${randomEvent.name}来了！`, ageGroup);
  };

  // --- RENDER ---
  if (!role) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans text-white bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
        <div className="w-full max-w-5xl">
            <div className="text-center mb-12 animate-fade-in-up">
                 <h1 className="text-5xl md:text-6xl font-black mb-4 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-purple-300">青少年商业实践乐园</h1>
                 <p className="text-slate-400 text-lg">P2P Real-time Business Simulation</p>
            </div>

            {/* Step 0: Version */}
            {landingStep === 0 && (
                <div className="grid md:grid-cols-2 gap-8 animate-fade-in-up">
                    <button onClick={() => { setAgeGroup(AgeGroup.Junior); setLandingStep(1); }} className="group bg-white rounded-3xl p-8 hover:scale-105 transition-all shadow-xl text-left border-b-8 border-yellow-400">
                         <div className="text-6xl mb-4">🎈</div>
                         <h2 className="text-3xl font-black text-slate-900 mb-2">趣味版 (Junior)</h2>
                         <p className="text-slate-500">适合6-12岁。卡通画风，简化模型，体验买卖乐趣。</p>
                    </button>
                    <button onClick={() => { setAgeGroup(AgeGroup.Senior); setLandingStep(1); }} className="group bg-slate-800 rounded-3xl p-8 hover:scale-105 transition-all shadow-xl text-left border-b-8 border-blue-500">
                         <div className="text-6xl mb-4">💼</div>
                         <h2 className="text-3xl font-black text-white mb-2">专业版 (Senior)</h2>
                         <p className="text-slate-400">适合12-16岁。真实商业逻辑，包含竞争、营销策略。</p>
                    </button>
                </div>
            )}

            {/* Step 1: Action */}
            {landingStep === 1 && (
                <div className="animate-fade-in-up">
                    <button onClick={() => setLandingStep(0)} className="mb-6 text-slate-400 hover:text-white flex items-center gap-1"><ArrowLeft size={16}/> 返回</button>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <button onClick={() => { setRole('teacher'); handleCreateRoom(); }} className="md:col-span-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-10 shadow-2xl hover:scale-[1.02] transition-all text-left relative overflow-hidden group">
                            <div className="relative z-10">
                                <div className="inline-block bg-white/20 px-3 py-1 rounded-full text-xs font-bold mb-4 backdrop-blur-sm">我是组织者 / 老师</div>
                                <h2 className="text-4xl font-black text-white mb-4">创建经营广场</h2>
                                <p className="text-blue-100 max-w-md mb-8">开启大屏幕视图，生成房间二维码。同时包含游戏流程控制、事件触发等管理功能。</p>
                                <div className="flex items-center gap-2 font-bold text-lg bg-white/10 w-fit px-4 py-2 rounded-full">立即创建 <ChevronRight /></div>
                            </div>
                            <Monitor className="absolute right-[-20px] bottom-[-40px] w-64 h-64 text-white/10 group-hover:text-white/20 transition-colors" />
                        </button>

                        <div className="flex flex-col gap-6">
                            <button onClick={() => { setRole('split'); handleCreateRoom(); }} className="flex-1 bg-slate-800 rounded-2xl p-6 hover:bg-slate-700 transition-all text-left border border-slate-700 hover:border-purple-500">
                                <SplitSquareHorizontal className="text-purple-400 w-8 h-8 mb-3" />
                                <h3 className="text-xl font-bold text-white">双屏演示模式</h3>
                                <p className="text-sm text-slate-400 mt-1">单机测试大屏+手机端</p>
                            </button>
                            <button onClick={() => setRole('student')} className="flex-1 bg-slate-800 rounded-2xl p-6 hover:bg-slate-700 transition-all text-left border border-slate-700 hover:border-pink-500">
                                <Smartphone className="text-pink-400 w-8 h-8 mb-3" />
                                <h3 className="text-xl font-bold text-white">我是学生</h3>
                                <p className="text-sm text-slate-400 mt-1">扫码或输入房间号加入</p>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    );
  }

  // --- VIEWS ---

  if (role === 'teacher') {
      return <TeacherView 
        ageGroup={ageGroup} 
        connectedPlayers={connectedPlayers} 
        roomCode={roomCode} 
        eventName={eventName} 
        setEventName={setEventName} 
        onStartGame={handleStartGame} 
        marketConfig={marketConfig} 
        onUpdateMarketConfig={(cfg) => setMarketConfig(prev => ({...prev, ...cfg}))} 
        timeLeft={timeLeft} 
        isRunning={isRunning} 
        roundNumber={roundNumber} 
        isGameStarted={isGameStarted} 
        onToggleTimer={() => setIsRunning(!isRunning)} 
        onResetRound={handleResetRound} 
        onForceSettlement={() => setTimeLeft(0)} 
        aiCustomerPoolCount={aiCustomerPool.length} 
        onGenerateAICustomers={async (c, d, b) => { replenishCustomerPool(c); }} 
        currentEvent={currentGlobalEvent} 
        onSetEvent={setCurrentGlobalEvent} 
        onTriggerRandomEvent={handleTriggerRandomEvent}
        recentEvents={recentEvents} // PASSED PROP
      />;
  }

  if (role === 'split') {
    // Simulator Mode
    const simPlayer = connectedPlayers.length > 0 ? connectedPlayers[connectedPlayers.length - 1] : null;
    return (
      <div className="flex h-screen w-screen bg-gray-900 overflow-hidden">
        <div className="flex-1 h-full border-r border-gray-700 relative">
            <div className="absolute top-4 left-4 z-50"><button onClick={() => setRole(null)} className="bg-red-600 text-white px-3 py-1 rounded text-xs">退出</button></div>
            <TeacherView 
                ageGroup={ageGroup} connectedPlayers={connectedPlayers} roomCode={roomCode} eventName={eventName} setEventName={setEventName} onStartGame={handleStartGame} marketConfig={marketConfig} onUpdateMarketConfig={(cfg) => setMarketConfig(prev => ({...prev, ...cfg}))} timeLeft={timeLeft} isRunning={isRunning} roundNumber={roundNumber} isGameStarted={isGameStarted} onToggleTimer={() => setIsRunning(!isRunning)} onResetRound={handleResetRound} onForceSettlement={() => setTimeLeft(0)} aiCustomerPoolCount={aiCustomerPool.length} onGenerateAICustomers={async () => {}} currentEvent={currentGlobalEvent} onSetEvent={setCurrentGlobalEvent} onTriggerRandomEvent={handleTriggerRandomEvent} recentEvents={recentEvents}
            />
        </div>
        <div className="w-[380px] bg-gray-200 flex items-center justify-center p-4">
             <div className="w-full h-[80vh] bg-black rounded-[2.5rem] border-8 border-gray-800 overflow-hidden relative">
                <div className="absolute top-0 w-full h-full bg-white overflow-y-auto scrollbar-hide">
                    <PlayerView 
                        ageGroup={ageGroup} onBack={() => {}} 
                        onJoin={(name, room) => {
                            if(room !== roomCode) return false;
                            const newP: PlayerState = { id: `p-${Date.now()}`, name, shopName: 'Sim Shop', shopLogo: null, funds: 0, inventory: [], logs: [], totalProfit: 0, lastTurnProfit: 0, marketingLevel: 1, currentTurn: 1, status: 'lobby', reputation: 100, activeCampaign: 'none', serverCustomerQueue: [], processedCustomerCount: 0 };
                            setConnectedPlayers(prev => [...prev, newP]);
                            return true;
                        }} 
                        onUpdate={(d) => setConnectedPlayers(prev => prev.map(p => p.name === d.name ? {...p, ...d} : p))} 
                        isGameStarted={isGameStarted} onGameEvent={handleGameEvent} marketConfig={marketConfig} currentGlobalEvent={currentGlobalEvent} globalRoundNumber={roundNumber} serverPlayerState={simPlayer} onCustomerAction={() => {}} isRoundOver={isRoundSummary} marketFluctuation={marketFluctuation} recentEvents={recentEvents} 
                    />
                </div>
             </div>
        </div>
      </div>
    );
  }

  return (
      <PlayerView 
        ageGroup={ageGroup} 
        onBack={() => setRole(null)} 
        onJoin={(name, room) => {
            return new Promise((resolve) => {
                p2p.initClient(room, () => {
                    p2p.setCallbacks({
                        onGameSync: (data) => {
                            setEventName(data.eventName); 
                            setIsGameStarted(data.isGameStarted);
                            setIsRunning(data.isRunning);
                            setTimeLeft(data.timeLeft);
                            setRoundNumber(data.roundNumber);
                            setCurrentGlobalEvent(data.currentGlobalEvent);
                            setMarketConfig(data.marketConfig);
                            setMarketFluctuation(data.marketFluctuation);
                            setRecentEvents(data.recentEvents);
                            if(data.players) setConnectedPlayers(data.players);
                        },
                        onGameEvent: (msg) => setRecentEvents(prev => [msg, ...prev])
                    });
                    resolve(true);
                });
            }) as any;
        }}
        onUpdate={(d) => p2p.sendPlayerUpdate(d as any)}
        isGameStarted={isGameStarted}
        onGameEvent={handleGameEvent}
        marketConfig={marketConfig}
        currentGlobalEvent={currentGlobalEvent}
        globalRoundNumber={roundNumber}
        serverPlayerState={connectedPlayers.find(p => p.name === localStorage.getItem('last_player_name')) || null} 
        onCustomerAction={() => {}} 
        isRoundOver={isRoundSummary} 
        marketFluctuation={marketFluctuation}
        recentEvents={recentEvents} 
      />
  );
};

export default App;