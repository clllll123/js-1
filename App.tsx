
import React, { useState, useEffect, useRef } from 'react';
import { AgeGroup, ConnectionStatus, GameEvent, MarketConfig, MarketFluctuation, PlayerState } from './types';
import PlayerView from './components/PlayerView';
import TeacherView from './components/TeacherView';
import { p2p } from './services/p2p';
import { GAME_EVENTS, generateCustomer, MAX_TURNS_JUNIOR, MAX_TURNS_SENIOR } from './constants';
import { GraduationCap, Presentation, Users, Trophy, Store, Sparkles, School, Briefcase } from 'lucide-react';

const App: React.FC = () => {
  const [role, setRole] = useState<'teacher' | 'student' | null>(null);
  const [ageGroup, setAgeGroup] = useState<AgeGroup>(AgeGroup.Junior);
  const [roomCode, setRoomCode] = useState<string>("");
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [initialRoomCode, setInitialRoomCode] = useState<string>("");

  // Game State (Host)
  const [connectedPlayers, setConnectedPlayers] = useState<PlayerState[]>([]);
  const [marketConfig, setMarketConfig] = useState<MarketConfig>({
      economicBoom: true,
      skepticismLevel: 'medium',
      customerTraffic: 50,
      roundDuration: 180, // 3 minutes
      baseCustomerCount: 3,
      customerSpawnRate: 8, // Slider visual only now
      storageFeeRate: 0.5,
      logisticsFeeRate: 0.5,
      pricingThresholds: { safe: 1.5, normal: 2.5, risky: 3.5 },
      hotItemSurcharge: 0.2,
      coldItemDiscount: 0.2,
      upgradeCostMultiplier: 1.0,
      
      // Smart Traffic Defaults
      smartTrafficEnabled: true,
      smartTrafficCooldown: { min: 15, max: 60 },
      smartTrafficWave: { min: 2, max: 5 }
  });
  const [eventName, setEventName] = useState("商业模拟挑战赛");
  const [currentGlobalEvent, setCurrentGlobalEvent] = useState<GameEvent>(GAME_EVENTS[0]);
  const [marketFluctuation, setMarketFluctuation] = useState<MarketFluctuation | null>(null);
  const [recentEvents, setRecentEvents] = useState<string[]>([]);
  
  // Game Control (Host)
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(180);
  const [roundNumber, setRoundNumber] = useState(1);
  const [aiStatus, setAiStatus] = useState<'idle' | 'processing'>('idle');

  // Traffic Engine Refs
  const playerCampaignRef = useRef<Record<string, 'none' | 'flyer' | 'influencer'>>({});
  const playerNextSmartSpawnRef = useRef<Record<string, number>>({});
  
  // HOST: Track previous funds to generate Real-time Sales Events for Big Screen
  const prevPlayerFundsRef = useRef<Record<string, number>>({});

  // Parse URL query params for auto-join
  useEffect(() => {
    if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const room = params.get('room');
        const mode = params.get('mode');
        if (room) setInitialRoomCode(room);
        if (mode === 'junior') setAgeGroup(AgeGroup.Junior);
        if (mode === 'senior') setAgeGroup(AgeGroup.Senior);
    }
  }, []);

  // HOST LOGIC
  useEffect(() => {
    if (role === 'teacher' && roomCode) {
        p2p.initHost(roomCode, () => {
            setConnectionStatus('connected');
            p2p.setCallbacks({
                onPlayerUpdate: (player) => {
                    setConnectedPlayers(prev => {
                        const existing = prev.findIndex(p => p.name === player.name);
                        if (existing >= 0) {
                            const updated = [...prev];
                            // Merge updates
                            updated[existing] = { ...updated[existing], ...player };
                            return updated;
                        }
                        // New player
                        return [...prev, { 
                            ...player, 
                            id: `p_${Date.now()}_${Math.random()}`,
                            logs: [],
                            serverCustomerQueue: [], // Init queue
                            processedCustomerCount: 0 
                        }];
                    });
                },
                onConnectionStatus: (s) => setConnectionStatus(s)
            });
        });
    }
  }, [role, roomCode]);

  // HOST: Auto-Generate "Recent Transaction Events" for Big Screen
  useEffect(() => {
      if (role === 'teacher' && isGameStarted) {
          connectedPlayers.forEach(p => {
              const oldFunds = prevPlayerFundsRef.current[p.id];
              // Initialize tracking if new
              if (oldFunds === undefined) {
                  prevPlayerFundsRef.current[p.id] = p.funds;
                  return;
              }

              // Check for fund INCREASE (Sales)
              if (p.funds > oldFunds) {
                  const diff = p.funds - oldFunds;
                  // Ignore huge jumps (like resets), typical sales are small
                  if (diff < 5000) {
                      const msg = `💰 ${p.shopName || p.name} 刚刚成交一单，入账 ¥${diff}！`;
                      setRecentEvents(prev => [msg, ...prev].slice(0, 10)); // Keep last 10
                  }
              }
              
              // Update ref
              prevPlayerFundsRef.current[p.id] = p.funds;
          });
      }
  }, [connectedPlayers, role, isGameStarted]);

  // HOST: Game Loop / Broadcast
  useEffect(() => {
    if (role !== 'teacher') return;

    // Broadcast Game State to all clients
    p2p.broadcastGameSync({
        eventName,
        ageGroup,
        isGameStarted,
        isRunning,
        timeLeft,
        roundNumber,
        currentGlobalEvent,
        marketConfig,
        marketFluctuation,
        players: connectedPlayers,
        recentEvents
    });

  }, [role, eventName, ageGroup, isGameStarted, isRunning, timeLeft, roundNumber, currentGlobalEvent, marketConfig, marketFluctuation, connectedPlayers, recentEvents]);

  // HOST: Timer
  useEffect(() => {
      if (role === 'teacher' && isRunning && timeLeft > 0) {
          const timer = setInterval(() => {
              setTimeLeft(prev => prev - 1);
          }, 1000);
          return () => clearInterval(timer);
      } else if (timeLeft === 0 && isRunning) {
          setIsRunning(false); // Time up
      }
  }, [role, isRunning, timeLeft]);

  // HOST: AI Customer Generation Logic (Legacy Helper for manual trigger)
  const generateAICustomers = async (count: number, distributeNow: boolean) => {
      // Generate customers
      const newCustomers = Array.from({ length: count }).map(() => generateCustomer(roundNumber, currentGlobalEvent, true));
      
      // Distribute to all connected players
      setConnectedPlayers(prev => prev.map(p => ({
          ...p,
          serverCustomerQueue: [...p.serverCustomerQueue, ...newCustomers]
      })));
  };

  // --- HOST: TRAFFIC ENGINE V5 (Configurable Smart Traffic) ---
  
  // 1. Initial Wave on Round Start
  useEffect(() => {
      if (role === 'teacher' && isRunning) {
          // Round just started (isRunning became true)
          // Generate Configurable 2-5 customers for everyone immediately
          console.log("🌊 Round Start: Generating Initial Wave");
          
          setConnectedPlayers(prev => prev.map(p => {
              const min = marketConfig.smartTrafficWave.min;
              const max = marketConfig.smartTrafficWave.max;
              const waveCount = Math.floor(Math.random() * (max - min + 1)) + min;
              
              const wave = Array.from({ length: waveCount }).map(() => generateCustomer(roundNumber, currentGlobalEvent, true));
              
              // Reset campaign tracking for new round
              playerCampaignRef.current[p.id] = 'none';
              
              // Reset Smart Traffic Timer for this player (Give them some time before first smart wave)
              const cooldown = Math.floor(Math.random() * (marketConfig.smartTrafficCooldown.max - marketConfig.smartTrafficCooldown.min + 1)) + marketConfig.smartTrafficCooldown.min;
              playerNextSmartSpawnRef.current[p.id] = Date.now() + (cooldown * 1000);

              return {
                  ...p,
                  serverCustomerQueue: [...p.serverCustomerQueue, ...wave]
              };
          }));
      }
  }, [role, isRunning, roundNumber]); // Depend on isRunning flipping to true

  // 2. Traffic Loop: Marketing Burst & Smart Traffic
  useEffect(() => {
      if (role === 'teacher' && isRunning && isGameStarted) {
          const trafficInterval = setInterval(() => {
              const now = Date.now();

              setConnectedPlayers(currentPlayers => {
                  let hasUpdates = false;
                  
                  const updatedPlayers = currentPlayers.map(p => {
                      let newQueue = [...p.serverCustomerQueue];
                      let modified = false;

                      // --- A. MARKETING BURST CHECK ---
                      // Check if campaign state changed since last check
                      const lastCampaign = playerCampaignRef.current[p.id] || 'none';
                      const currentCampaign = p.activeCampaign;

                      if (currentCampaign !== lastCampaign && currentCampaign !== 'none') {
                          // BURST TRIGGERED!
                          let burstCount = 0;
                          if (currentCampaign === 'flyer') burstCount = Math.floor(Math.random() * 3) + 3; // 3-5
                          if (currentCampaign === 'influencer') burstCount = Math.floor(Math.random() * 3) + 8; // 8-10
                          
                          console.log(`🚀 Marketing Burst for ${p.name}: ${currentCampaign} -> +${burstCount} customers`);
                          
                          const burst = Array.from({ length: burstCount }).map(() => generateCustomer(roundNumber, currentGlobalEvent, true));
                          newQueue = [...newQueue, ...burst];
                          modified = true;
                          hasUpdates = true;
                          
                          // Reset Smart Traffic timer to delay it after a burst
                          const cooldown = Math.floor(Math.random() * (marketConfig.smartTrafficCooldown.max - marketConfig.smartTrafficCooldown.min + 1)) + marketConfig.smartTrafficCooldown.min;
                          playerNextSmartSpawnRef.current[p.id] = now + (cooldown * 1000);
                      }
                      
                      // Update tracker
                      playerCampaignRef.current[p.id] = currentCampaign;

                      // --- B. SMART TRAFFIC (Idle Auto-Fill) ---
                      if (marketConfig.smartTrafficEnabled && currentCampaign === 'none') {
                           // Initialize timer if missing
                           if (!playerNextSmartSpawnRef.current[p.id]) {
                               const initDelay = Math.random() * 5000; // Stagger start
                               playerNextSmartSpawnRef.current[p.id] = now + initDelay;
                           }

                           if (now >= playerNextSmartSpawnRef.current[p.id]) {
                               // TIME TO SPAWN!
                               const min = marketConfig.smartTrafficWave.min;
                               const max = marketConfig.smartTrafficWave.max;
                               const smartCount = Math.floor(Math.random() * (max - min + 1)) + min;
                               
                               // console.log(`🧠 Smart Traffic for ${p.name}: +${smartCount} customers`);
                               const smartWave = Array.from({ length: smartCount }).map(() => generateCustomer(roundNumber, currentGlobalEvent, true));
                               newQueue = [...newQueue, ...smartWave];
                               modified = true;
                               hasUpdates = true;

                               // Set Next Spawn Time (Random 15-60s)
                               const nextCooldown = Math.floor(Math.random() * (marketConfig.smartTrafficCooldown.max - marketConfig.smartTrafficCooldown.min + 1)) + marketConfig.smartTrafficCooldown.min;
                               playerNextSmartSpawnRef.current[p.id] = now + (nextCooldown * 1000);
                           }
                      }

                      if (modified) {
                          return { ...p, serverCustomerQueue: newQueue };
                      }
                      return p;
                  });

                  return hasUpdates ? updatedPlayers : currentPlayers;
              });
          }, 1000);

          return () => clearInterval(trafficInterval);
      }
  }, [role, isRunning, isGameStarted, roundNumber, currentGlobalEvent, marketConfig]); // Added marketConfig dependency

  // --- RENDER ---

  if (!role) {
    const isJunior = ageGroup === AgeGroup.Junior;
    return (
        <div className={`h-[100dvh] w-full flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors duration-700 ${isJunior ? 'bg-orange-50' : 'bg-slate-900'}`}>
            {/* Background Pattern */}
            <div className={`absolute inset-0 opacity-10 ${isJunior ? 'bg-[radial-gradient(#f97316_1px,transparent_1px)] [background-size:20px_20px]' : 'bg-[linear-gradient(rgba(56,189,248,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.2)_1px,transparent_1px)] [background-size:40px_40px]'}`}></div>
            
            {/* Animated Blobs */}
            {isJunior && (
                <>
                    <div className="absolute top-10 left-10 text-8xl opacity-20 animate-bounce delay-1000">🎈</div>
                    <div className="absolute bottom-10 right-10 text-8xl opacity-20 animate-bounce">🎨</div>
                </>
            )}

            <div className="max-w-4xl w-full z-10 flex flex-col items-center">
                <div className="mb-10 text-center relative">
                    <div className={`inline-block px-4 py-1 rounded-full text-xs font-bold mb-2 tracking-widest uppercase border ${isJunior ? 'bg-orange-100 text-orange-600 border-orange-200' : 'bg-blue-900/50 text-blue-400 border-blue-500/50'}`}>
                        Business Simulation Lab
                    </div>
                    <h1 className={`text-5xl md:text-7xl font-black mb-2 tracking-tight ${isJunior ? 'text-gray-900 font-cartoon' : 'text-white font-pro'}`}>
                        商业实践乐园
                    </h1>
                    <p className={`text-lg font-bold ${isJunior ? 'text-gray-500' : 'text-slate-400'}`}>
                        AI 驱动的沉浸式商业模拟教学系统
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl mb-12">
                    {/* STUDENT CARD */}
                    <button 
                        onClick={() => setRole('student')}
                        className={`group relative p-8 rounded-3xl border-2 text-left transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl flex flex-col items-start gap-4 overflow-hidden ${
                            isJunior 
                            ? 'bg-white border-white shadow-xl hover:shadow-orange-200/50' 
                            : 'bg-slate-800 border-slate-700 hover:border-blue-500/50 hover:shadow-blue-900/20'
                        }`}
                    >
                        <div className={`absolute -right-4 -top-4 w-32 h-32 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity ${isJunior ? 'bg-orange-400' : 'bg-blue-500'}`}></div>
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${isJunior ? 'bg-gradient-to-br from-orange-400 to-red-500' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
                            <GraduationCap size={32} />
                        </div>
                        <div>
                            <h2 className={`text-2xl font-black mb-1 ${isJunior ? 'text-gray-800' : 'text-white'}`}>我是学生</h2>
                            <div className={`text-sm font-bold ${isJunior ? 'text-gray-400' : 'text-slate-400'}`}>Player / Student</div>
                        </div>
                        <p className={`text-sm leading-relaxed ${isJunior ? 'text-gray-500' : 'text-slate-400'}`}>
                            加入游戏房间，经营你的专属店铺，与 AI 顾客斗智斗勇，赚取第一桶金！
                        </p>
                        <div className={`mt-auto px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${
                            isJunior ? 'bg-orange-50 text-orange-600 group-hover:bg-orange-100' : 'bg-slate-700 text-blue-400 group-hover:bg-slate-600'
                        }`}>
                            立即进入 <Store size={14}/>
                        </div>
                    </button>

                    {/* TEACHER CARD */}
                    <button 
                        onClick={() => {
                            const code = Math.floor(1000 + Math.random() * 9000).toString();
                            setRoomCode(code);
                            setRole('teacher');
                        }}
                        className={`group relative p-8 rounded-3xl border-2 text-left transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl flex flex-col items-start gap-4 overflow-hidden ${
                            isJunior 
                            ? 'bg-white border-white shadow-xl hover:shadow-purple-200/50' 
                            : 'bg-slate-800 border-slate-700 hover:border-purple-500/50 hover:shadow-purple-900/20'
                        }`}
                    >
                        <div className={`absolute -right-4 -top-4 w-32 h-32 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity ${isJunior ? 'bg-purple-400' : 'bg-purple-600'}`}></div>
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${isJunior ? 'bg-gradient-to-br from-purple-400 to-pink-500' : 'bg-gradient-to-br from-purple-600 to-fuchsia-700'}`}>
                            <Presentation size={32} />
                        </div>
                        <div>
                            <h2 className={`text-2xl font-black mb-1 ${isJunior ? 'text-gray-800' : 'text-white'}`}>我是老师</h2>
                            <div className={`text-sm font-bold ${isJunior ? 'text-gray-400' : 'text-slate-400'}`}>Host / Teacher</div>
                        </div>
                        <p className={`text-sm leading-relaxed ${isJunior ? 'text-gray-500' : 'text-slate-400'}`}>
                            创建游戏房间，控制市场宏观经济，触发突发事件，生成 AI 分析报告。
                        </p>
                        <div className={`mt-auto px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${
                            isJunior ? 'bg-purple-50 text-purple-600 group-hover:bg-purple-100' : 'bg-slate-700 text-purple-400 group-hover:bg-slate-600'
                        }`}>
                            创建房间 <Users size={14}/>
                        </div>
                    </button>
                </div>

                {/* AGE GROUP TOGGLE */}
                <div className={`flex p-1 rounded-full border ${isJunior ? 'bg-white border-gray-200 shadow-sm' : 'bg-slate-800 border-slate-700'}`}>
                    <button 
                        onClick={() => setAgeGroup(AgeGroup.Junior)}
                        className={`px-6 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-all ${
                            isJunior 
                            ? 'bg-orange-500 text-white shadow-md' 
                            : 'text-gray-400 hover:text-gray-200'
                        }`}
                    >
                        <School size={16} /> 小学版 (Junior)
                    </button>
                    <button 
                        onClick={() => setAgeGroup(AgeGroup.Senior)}
                        className={`px-6 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-all ${
                            !isJunior 
                            ? 'bg-blue-600 text-white shadow-md' 
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        <Briefcase size={16} /> 中学版 (Senior)
                    </button>
                </div>
            </div>
        </div>
    );
  }

  if (role === 'teacher') {
      return (
          <TeacherView 
              ageGroup={ageGroup}
              connectedPlayers={connectedPlayers}
              roomCode={roomCode}
              eventName={eventName}
              setEventName={setEventName}
              onStartGame={() => { setIsGameStarted(true); setIsRunning(true); }}
              marketConfig={marketConfig}
              onUpdateMarketConfig={(cfg) => setMarketConfig(prev => ({ ...prev, ...cfg }))}
              timeLeft={timeLeft}
              isRunning={isRunning}
              roundNumber={roundNumber}
              isGameStarted={isGameStarted}
              onToggleTimer={() => setIsRunning(!isRunning)}
              onResetRound={() => {
                  setIsRunning(false);
                  setTimeLeft(marketConfig.roundDuration);
              }}
              onForceSettlement={() => {
                  setTimeLeft(0);
                  setIsRunning(false);
              }}
              aiCustomerPoolCount={0}
              onGenerateAICustomers={generateAICustomers}
              currentEvent={currentGlobalEvent}
              onSetEvent={setCurrentGlobalEvent}
              onTriggerRandomEvent={() => {
                  const ev = GAME_EVENTS[Math.floor(Math.random() * GAME_EVENTS.length)];
                  setCurrentGlobalEvent(ev);
                  setRecentEvents(prev => [`🎲 随机事件触发: ${ev.name}`, ...prev]);
              }}
              recentEvents={recentEvents}
              connectionStatus={connectionStatus}
              aiStatus={aiStatus}
              setAiStatus={setAiStatus}
          />
      );
  }

  // PLAYER MODE
  return (
      <PlayerView 
        ageGroup={ageGroup} 
        onBack={() => setRole(null)} 
        initialRoomCode={initialRoomCode} 
        onJoin={(name, inputData) => {
            const roomCodeInput = inputData;
            return new Promise((resolve) => {
                p2p.initClient(roomCodeInput, () => {
                    setConnectionStatus('connected');
                    p2p.setCallbacks({
                        onGameSync: (data) => {
                            setEventName(data.eventName);
                            if (data.ageGroup && data.ageGroup !== ageGroup) {
                                setAgeGroup(data.ageGroup); 
                            } 
                            setIsGameStarted(data.isGameStarted);
                            setIsRunning(data.isRunning);
                            setTimeLeft(data.timeLeft);
                            setRoundNumber(data.roundNumber);
                            setCurrentGlobalEvent(data.currentGlobalEvent);
                            setMarketConfig(data.marketConfig);
                            setMarketFluctuation(data.marketFluctuation);
                            setRecentEvents(data.recentEvents);
                            // Student only needs to know about themselves generally, but leaderboard needs all
                            if(data.players) setConnectedPlayers(data.players);
                        },
                        onGameEvent: (msg) => setRecentEvents(prev => [msg, ...prev]),
                        onConnectionStatus: (status) => setConnectionStatus(status)
                    });
                    resolve(true);
                });
            }) as any;
        }}
        onUpdate={(d) => p2p.sendPlayerUpdate(d as any)}
        isGameStarted={isGameStarted}
        onGameEvent={(msg) => setRecentEvents(prev => [msg, ...prev])}
        marketConfig={marketConfig}
        currentGlobalEvent={currentGlobalEvent}
        globalRoundNumber={roundNumber}
        serverPlayerState={connectedPlayers.find(p => p.name === localStorage.getItem('last_player_name')) || null} 
        onCustomerAction={() => {}} 
        isRoundOver={!isRunning && timeLeft === 0} 
        marketFluctuation={marketFluctuation}
        recentEvents={recentEvents} 
        connectionStatus={connectionStatus}
      />
  );
};

export default App;
