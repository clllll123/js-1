
import React, { useEffect, useRef, useState } from 'react';
import { AgeGroup, PlayerState, GameEvent, ConnectionStatus } from '../types';
import { Users, Trophy, Activity, Globe, Store, Crown, Clock, Zap, Star, AlertTriangle, Flame, Package, Wifi, Bot, Server, TrendingUp, TrendingDown, Minus, LineChart } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { MARKET_NEWS_TICKER } from '../constants';

interface BigScreenViewProps {
  ageGroup: AgeGroup;
  connectedPlayers: PlayerState[];
  roomCode: string;
  eventName: string;
  recentEvents: string[];
  timeLeft: number;
  roundNumber: number;
  isRunning: boolean;
  isGameStarted: boolean;
  currentEvent: GameEvent; 
  isRoundSummary?: boolean; 
  connectionStatus: ConnectionStatus;
  aiStatus: 'idle' | 'processing';
}

const CATEGORY_MAP: Record<string, string> = {
    'food': '食品', 'stationery': '文具', 'toy': '玩具', 'daily': '日用',
    'tech': '数码', 'luxury': '奢品', 'health': '健康', 'gift': '礼品',
    'fun': '娱乐', 'book': '书籍', 'sport': '体育', 'diy': '手工', 'office': '办公', 'hobby': '爱好'
};

// --- SUB-COMPONENTS ---

const NewsTicker: React.FC<{ ageGroup: AgeGroup }> = ({ ageGroup }) => {
    const isJunior = ageGroup === AgeGroup.Junior;
    return (
        <div className={`w-full overflow-hidden whitespace-nowrap py-1.5 z-40 relative flex items-center ${isJunior ? 'bg-indigo-600 text-white' : 'bg-cyan-950/80 text-cyan-400 border-b border-cyan-800'}`}>
            <div className={`px-4 font-black uppercase text-xs tracking-widest shrink-0 z-10 ${isJunior ? 'bg-indigo-700' : 'bg-cyan-900'}`}>
                {isJunior ? '📢 校园广播' : '📰 MARKET NEWS'}
            </div>
            <div className="animate-marquee inline-block pl-4">
                {MARKET_NEWS_TICKER.map((news, i) => (
                    <span key={i} className="mx-8 text-xs font-mono font-bold">
                        {isJunior ? '✨' : '>>'} {news}
                    </span>
                ))}
            </div>
            {/* Duplicate for smooth looping */}
            <div className="animate-marquee inline-block" aria-hidden="true">
                {MARKET_NEWS_TICKER.map((news, i) => (
                    <span key={i} className="mx-8 text-xs font-mono font-bold">
                        {isJunior ? '✨' : '>>'} {news}
                    </span>
                ))}
            </div>
             <style>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-100%); }
                }
                .animate-marquee {
                    animation: marquee 60s linear infinite;
                }
            `}</style>
        </div>
    );
};

const MarketTrendChart: React.FC<{ data: { time: string, value: number }[], isJunior: boolean }> = ({ data, isJunior }) => {
    return (
        <div className="w-full h-32 relative">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={isJunior ? "#f59e0b" : "#22d3ee"} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={isJunior ? "#f59e0b" : "#22d3ee"} stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <Tooltip contentStyle={{backgroundColor: '#000', border: 'none', color: '#fff', fontSize: '10px'}} itemStyle={{color: '#fff'}} cursor={{stroke: '#fff', strokeWidth: 1}}/>
                    <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke={isJunior ? "#f59e0b" : "#22d3ee"} 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorValue)" 
                        isAnimationActive={false}
                    />
                </AreaChart>
            </ResponsiveContainer>
            <div className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded ${isJunior ? 'bg-yellow-100 text-yellow-700' : 'bg-cyan-900/50 text-cyan-400 border border-cyan-500/30'}`}>
                {isJunior ? '💰 市场总资金' : '📈 MARKET CAPITALIZATION'}
            </div>
        </div>
    );
}

const RoundSummaryReport: React.FC<{ players: PlayerState[]; round: number }> = ({ players, round }) => {
    const totalProfit = players.reduce((acc, p) => acc + (p.lastTurnProfit || 0), 0);
    const sortedByProfit = [...players].sort((a,b) => (b.lastTurnProfit || 0) - (a.lastTurnProfit || 0));
    const sortedByRep = [...players].sort((a,b) => (b.reputation || 0) - (a.reputation || 0));
    const mvp = sortedByProfit[0];
    const star = sortedByRep[0];

    return (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center p-8 animate-in zoom-in duration-500">
            <h1 className="text-6xl font-black text-yellow-400 mb-2 tracking-widest uppercase filter drop-shadow-lg">第 {round} 轮经营战报</h1>
            <p className="text-white text-xl mb-12">本轮经营分析 (ROUND SUMMARY)</p>

            <div className="grid grid-cols-3 gap-8 w-full max-w-6xl">
                {/* Total Stats */}
                <div className="bg-slate-800/80 rounded-3xl p-8 border border-slate-700 flex flex-col items-center justify-center text-center shadow-2xl">
                    <div className="text-gray-400 font-bold uppercase tracking-wider mb-2">本轮总利润</div>
                    <div className={`text-6xl font-black mb-4 ${totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {totalProfit >= 0 ? '+' : ''}¥{totalProfit.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">所有店铺利润总和</div>
                </div>

                {/* MVP */}
                <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-3xl p-8 border-2 border-yellow-500 flex flex-col items-center text-center shadow-[0_0_50px_rgba(234,179,8,0.2)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-yellow-500 text-black font-bold px-4 py-1 rounded-bl-xl">MVP</div>
                    <Crown size={64} className="text-yellow-400 mb-4 animate-bounce"/>
                    <div className="text-3xl font-bold text-white mb-1">{mvp ? (mvp.shopName || mvp.name) : '-'}</div>
                    <div className="text-yellow-200 text-lg mb-4">利润冠军</div>
                    <div className="bg-yellow-500/20 px-6 py-2 rounded-full font-mono font-bold text-yellow-400 text-2xl">
                        ¥{mvp?.lastTurnProfit || 0}
                    </div>
                </div>

                {/* Reputation Star */}
                <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-3xl p-8 border-2 border-pink-500 flex flex-col items-center text-center shadow-[0_0_50px_rgba(236,72,153,0.2)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-pink-500 text-white font-bold px-4 py-1 rounded-bl-xl">口碑王</div>
                    <Star size={64} className="text-pink-400 mb-4 animate-pulse"/>
                    <div className="text-3xl font-bold text-white mb-1">{star ? (star.shopName || star.name) : '-'}</div>
                    <div className="text-pink-200 text-lg mb-4">服务最棒</div>
                    <div className="flex items-center gap-2 bg-pink-500/20 px-6 py-2 rounded-full font-mono font-bold text-pink-400 text-2xl">
                        {star?.reputation || 0} <span className="text-sm">分</span>
                    </div>
                </div>
            </div>

            <div className="mt-12 text-gray-400 animate-pulse text-lg font-bold">
                等待老师开启下一轮进货...
            </div>
        </div>
    );
}

// Particle Component for Sales
const SalesParticle: React.FC<{ amount: number }> = ({ amount }) => {
    return (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none animate-float-up-fade">
            <div className="bg-green-500 text-white font-black text-xl px-3 py-1 rounded-full shadow-lg border-2 border-white flex items-center gap-1 whitespace-nowrap">
                <span>💰</span>
                <span>+{amount}</span>
            </div>
        </div>
    );
};

// 1. JUNIOR: "Sticker Town" Style
const JuniorShopCard: React.FC<{ player: PlayerState; index: number; salesDiff: number }> = ({ player, index, salesDiff }) => {
    if (!player) return null; // Safety check
    const isImage = player.shopLogo && typeof player.shopLogo === 'string' && player.shopLogo.startsWith('data:');
    const colors = [
        { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', accent: 'bg-red-400' },
        { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600', accent: 'bg-orange-400' },
        { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-600', accent: 'bg-yellow-400' },
        { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600', accent: 'bg-green-400' },
        { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', accent: 'bg-blue-400' },
        { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-600', accent: 'bg-purple-400' },
    ];
    const theme = colors[index % colors.length] || colors[0];
    
    // Status Logic
    const currentStock = (player.inventory || []).reduce((sum, p) => sum + p.stock, 0);
    const isSoldOut = currentStock < 3 && (player.status === 'playing' || player.status === 'waiting_close');
    const isStagnant = currentStock > 10;
    const isPlaying = player.status === 'playing';
    
    const queueLength = Math.max(0, (player.serverCustomerQueue || []).length - (player.processedCustomerCount || 0));
    const customerIcons = new Array(Math.min(3, queueLength)).fill('👤');

    return (
        <div className={`relative flex flex-col items-center rounded-2xl border-4 ${theme.border} ${theme.bg} shadow-sm overflow-hidden group transition-all duration-300 ${isSoldOut ? 'ring-4 ring-orange-400 scale-105 shadow-xl' : 'hover:scale-105'} ${salesDiff > 0 ? 'scale-105 ring-4 ring-green-400' : ''}`}>
            {salesDiff > 0 && <SalesParticle amount={salesDiff} />}
            {isSoldOut && (
                <div className="absolute top-0 right-0 bg-red-500 text-white text-xs px-3 py-1 rounded-bl-xl font-black z-20 flex items-center gap-1 animate-pulse">
                    <Flame size={12} className="fill-white"/> {currentStock === 0 ? '已售罄' : '即将售罄'}
                </div>
            )}
            {isStagnant && !isSoldOut && isPlaying && (
                <div className="absolute top-0 left-0 bg-gray-600 text-white text-[10px] px-2 py-1 rounded-br-xl font-bold z-20 flex items-center gap-1">
                    <AlertTriangle size={10}/> 库存积压
                </div>
            )}
            <div className="w-full aspect-[16/10] bg-white m-1 mb-0 rounded-t-xl overflow-hidden relative flex items-center justify-center border-b-2 border-dashed border-gray-100">
                {isImage ? (
                    <img src={player.shopLogo!} className="w-full h-full object-cover" alt="shop"/>
                ) : (
                    <div className="text-5xl transform group-hover:rotate-12 transition-transform duration-300 drop-shadow-md">
                        {player.shopLogo || '🏠'}
                    </div>
                )}
                {isPlaying && !isSoldOut && (
                    <div className={`absolute bottom-1 right-1 px-2 py-0.5 rounded text-[10px] font-bold border ${currentStock > 10 ? 'bg-red-100 text-red-600 border-red-200' : 'bg-white/80 text-gray-500 border-gray-200'}`}>
                        📦 {currentStock}
                    </div>
                )}
            </div>
            <div className="w-full p-2 text-center relative flex-1 flex flex-col justify-between">
                <div>
                    <div className="text-xs font-black text-gray-800 truncate px-1 mb-1">{player.shopName || '未命名店铺'}</div>
                    <div className="flex items-center justify-center gap-1 bg-white/60 mx-2 rounded-lg py-1 border border-white/50">
                        <span className="text-xs">💰</span>
                        <span className={`text-sm font-black ${theme.text}`}>¥{player.funds}</span>
                    </div>
                </div>
                {isPlaying && (
                    <div className="mt-2 flex justify-center text-[10px] text-gray-400 h-4 items-center">
                        {queueLength > 3 ? (
                            <span className="text-xs font-bold text-blue-500 animate-pulse">已有 {queueLength} 人排队</span>
                        ) : (
                            customerIcons.length > 0 ? (
                                <div className="flex -space-x-1 animate-slide-up">
                                    {customerIcons.map((_, i) => <span key={i}>👤</span>)}
                                </div>
                            ) : (
                                <span className="opacity-50">等待客流...</span>
                            )
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// 2. SENIOR: "Cyber Holographic" Style
const SeniorCyberCard: React.FC<{ player: PlayerState; index: number; salesDiff: number }> = ({ player, index, salesDiff }) => {
    if (!player) return null; // Safety check
    // DEFENSIVE CODING: Handle potential undefined values safely for Senior mode initialization
    const isImage = player.shopLogo && typeof player.shopLogo === 'string' && player.shopLogo.startsWith('data:');
    
    const getGlowColor = () => {
        if (index < 3) return 'border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.4)] bg-yellow-950/20'; // Top 3
        if ((player.funds || 0) > 2000) return 'border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)] bg-cyan-950/20';
        return 'border-slate-700 hover:border-blue-500/60';
    };

    const currentStock = (player.inventory || []).reduce((sum, p) => sum + p.stock, 0);
    const isSoldOut = currentStock < 3 && (player.status === 'playing' || player.status === 'waiting_close');
    const isStagnant = currentStock > 10;
    
    const queueLength = Math.max(0, (player.serverCustomerQueue || []).length - (player.processedCustomerCount || 0));

    return (
        <div className={`relative w-full aspect-[4/3] backdrop-blur-md rounded-lg border-2 ${getGlowColor()} overflow-hidden group transition-all duration-300 hover:z-20 hover:scale-110 ${salesDiff > 0 ? 'shadow-[0_0_30px_#22c55e] border-green-500' : ''}`}>
            
            {/* SALES PARTICLE ANIMATION */}
            {salesDiff > 0 && <SalesParticle amount={salesDiff} />}

            {/* Status Overlays */}
            {isSoldOut && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                    <div className="border-4 border-red-500 text-red-500 px-4 py-2 text-2xl font-black uppercase tracking-widest -rotate-12 animate-pulse">
                        {currentStock === 0 ? 'SOLD OUT' : 'LOW STOCK'}
                    </div>
                </div>
            )}
            {isStagnant && !isSoldOut && (
                <div className="absolute top-2 right-2 z-30 bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 px-2 py-0.5 text-[10px] font-mono animate-pulse">
                    ⚠️ HIGH STOCK ({currentStock})
                </div>
            )}

            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,255,255,0.03)_1px,transparent_1px)] bg-[size:100%_3px] pointer-events-none z-10"></div>
            
            <div className="flex justify-between items-center px-2 py-1 bg-black/60 border-b border-white/10 relative z-20">
                <div className="flex items-center gap-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${index < 3 ? 'bg-yellow-400 animate-pulse' : 'bg-green-500'}`}></div>
                    <span className="text-[9px] font-mono text-slate-400 tracking-wider">ID:{(player.id || '???').slice(-3)}</span>
                </div>
                <div className="text-[9px] font-mono text-cyan-400 flex items-center gap-1">
                    <Users size={10}/> {queueLength}
                </div>
            </div>

            <div className="relative h-2/3 w-full flex items-center justify-center bg-slate-900/40 overflow-hidden">
                {isImage ? (
                     <img src={player.shopLogo!} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="logo"/>
                ) : (
                    <div className="text-4xl relative z-10 filter drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">{player.shopLogo || '🏢'}</div>
                )}
            </div>

            <div className="absolute bottom-0 w-full p-2 bg-gradient-to-t from-black to-slate-900/80 border-t border-white/10 z-20">
                <div className="flex items-center justify-between mb-0.5">
                    <div className="text-xs font-bold text-slate-100 truncate pr-2 font-pro tracking-wide">{player.shopName || '未命名企业'}</div>
                </div>
                <div className="flex justify-between items-end">
                    <div className={`text-[10px] font-mono ${currentStock > 10 ? 'text-yellow-400' : 'text-slate-500'}`}>
                        Stock: {currentStock}
                    </div>
                    <div className="text-sm font-bold font-mono text-cyan-400 drop-shadow-sm group-hover:text-cyan-300">
                        ¥{player.funds?.toLocaleString() || 0}
                    </div>
                </div>
            </div>
        </div>
    );
};

const BigScreenView: React.FC<BigScreenViewProps> = ({ 
  ageGroup, 
  connectedPlayers, 
  roomCode, 
  eventName, 
  recentEvents,
  timeLeft,
  roundNumber,
  isRunning,
  isGameStarted,
  currentEvent,
  isRoundSummary = false,
  connectionStatus,
  aiStatus
}) => {
  const isJunior = ageGroup === AgeGroup.Junior;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevFundsRef = useRef<Record<string, number>>({});
  const [salesEvents, setSalesEvents] = useState<Record<string, number>>({}); // Map playerId -> amount diff
  const [showEventFlash, setShowEventFlash] = useState(false);
  const prevEventIdRef = useRef<string>(currentEvent.id);
  
  // New State for Aggregate Chart
  const [marketTrendData, setMarketTrendData] = useState<{time: string, value: number}[]>([]);
  // State for System Logs (Fake noise)
  const [systemLogs, setSystemLogs] = useState<string[]>([]);

  // --- SEPARATED LOGIC TO FIX RACE CONDITION ---

  // 1. Detect Event Change (Isolated)
  useEffect(() => {
      if (currentEvent.id !== prevEventIdRef.current) {
          setShowEventFlash(true);
          prevEventIdRef.current = currentEvent.id;
          const timer = setTimeout(() => setShowEventFlash(false), 3000); // 3s flash
          return () => clearTimeout(timer);
      }
  }, [currentEvent.id]); // Only dependency is Event ID

  // 2. Detect Sales (Fund Increase) & Update Market Trend
  useEffect(() => {
      const newSales: Record<string, number> = {};
      let hasChange = false;
      let totalFunds = 0;

      connectedPlayers.forEach(p => {
          const prev = prevFundsRef.current[p.id];
          if (prev !== undefined && p.funds > prev) {
              newSales[p.id] = p.funds - prev;
              hasChange = true;
          }
          prevFundsRef.current[p.id] = p.funds;
          totalFunds += p.funds;
      });

      if (hasChange) {
          setSalesEvents(prev => ({ ...prev, ...newSales }));
          // Clear animation trigger after 1.5s
          const timer = setTimeout(() => {
              setSalesEvents({});
          }, 1500);
          return () => clearTimeout(timer);
      }
      
      // Update Trend Chart every 2 seconds if game is running
      const now = new Date();
      if (isRunning && now.getSeconds() % 2 === 0) {
          setMarketTrendData(prev => {
              const newData = [...prev, { time: now.toLocaleTimeString(), value: totalFunds }];
              return newData.slice(-15); // Keep last 15 points
          });
      }

  }, [connectedPlayers, isRunning]); // Only dependency is Players & Running state

  // 3. Generate Fake System Noise if quiet
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
        const noise = [
            "正在同步区域客流数据...",
            "检测到北部商铺热度上升",
            "云端数据备份完成",
            "正在计算实时汇率...",
            "连接稳定性检查: 优",
            "AI 顾客意图分析中...",
            "更新市场库存索引...",
            "监测到大额交易潜力",
            "正在优化物流路径..."
        ];
        const randomMsg = noise[Math.floor(Math.random() * noise.length)];
        setSystemLogs(prev => [`[SYS] ${randomMsg}`, ...prev].slice(0, 3));
    }, 4000);
    return () => clearInterval(interval);
  }, [isRunning]);

  // Auto Scroll (Preserved)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || connectedPlayers.length < 16) return;
    let scrollAmount = 0;
    const speed = 0.3; 
    let animationId: number;
    let direction = 1;
    let pauseCounter = 0;
    const scroll = () => {
        if (!container) return;
        if (pauseCounter > 0) {
            pauseCounter--;
            animationId = requestAnimationFrame(scroll);
            return;
        }
        scrollAmount += speed * direction;
        if (scrollAmount >= container.scrollHeight - container.clientHeight) {
            direction = -1;
            pauseCounter = 120;
        } else if (scrollAmount <= 0) {
            direction = 1;
            pauseCounter = 120; 
        }
        container.scrollTop = scrollAmount;
        animationId = requestAnimationFrame(scroll);
    };
    if (container.scrollHeight > container.clientHeight) {
         animationId = requestAnimationFrame(scroll);
    }
    return () => cancelAnimationFrame(animationId);
  }, [connectedPlayers.length]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Simplified Theme definitions to reduce complexity and risk of CSS conflicts
  const theme = isJunior ? {
      bg: "bg-orange-50",
      pattern: "bg-[radial-gradient(#fbbf24_1px,transparent_1px)] [background-size:20px_20px]",
      header: "bg-white/90 border-b-4 border-orange-400 shadow-md",
      title: "text-orange-600 font-cartoon",
      timer: "bg-yellow-400 text-white border-4 border-white shadow-lg rounded-2xl",
      sidebar: "bg-white/80 border-r-4 border-orange-200",
      leaderboardItem: "bg-white border-2 border-orange-100 text-gray-700",
      gridContainer: "bg-orange-50/50"
  } : {
      bg: "bg-slate-950",
      pattern: "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-black to-black",
      header: "bg-black/80 border-b border-cyan-500/30 backdrop-blur-md shadow-[0_0_20px_rgba(6,182,212,0.15)]",
      title: "text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 font-pro tracking-widest uppercase",
      timer: "bg-black border border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)] rounded-xl",
      sidebar: "bg-slate-900/60 border-r border-cyan-900/30 backdrop-blur-sm",
      leaderboardItem: "bg-slate-900/80 border border-slate-800 text-slate-300 hover:bg-slate-800",
      gridContainer: "bg-slate-950/50"
  };

  // --- LOBBY VIEW ---
  if (!isGameStarted) {
      const baseUrl = window.location.href.split('?')[0]; 
      // CRITICAL: Append mode to URL for auto-detection on client side
      const joinUrl = `${baseUrl}?room=${roomCode}&mode=${isJunior ? 'junior' : 'senior'}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(joinUrl)}&bgcolor=${isJunior ? 'ffffff' : '0f172a'}&color=${isJunior ? '000000' : '38bdf8'}`;

      return (
          <div className={`h-full w-full flex flex-col items-center justify-center p-8 relative overflow-hidden ${theme.bg} ${theme.pattern}`}>
               {/* --- STATUS INDICATOR (Lobby) --- */}
               <div className="absolute top-6 right-6 flex gap-4">
                   {/* NET STATUS */}
                   <div className={`flex items-center gap-2 px-4 py-2 rounded-full border shadow-lg backdrop-blur-md transition-colors duration-500 ${
                       connectionStatus === 'connected' 
                       ? (isJunior ? 'bg-green-100 border-green-300 text-green-700' : 'bg-green-950/50 border-green-500 text-green-400')
                       : (isJunior ? 'bg-red-100 border-red-300 text-red-700' : 'bg-red-950/50 border-red-500 text-red-400')
                   }`}>
                       <div className={`w-3 h-3 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                       <span className="text-xs font-bold font-mono">NET: {connectionStatus.toUpperCase()}</span>
                   </div>
               </div>

               {isJunior && (
                   <>
                    <div className="absolute top-10 left-10 text-9xl opacity-20 animate-bounce delay-700">🎈</div>
                    <div className="absolute bottom-10 right-10 text-9xl opacity-20 animate-bounce">🦄</div>
                    <div className="absolute top-20 right-40 text-8xl opacity-10 animate-pulse">☁️</div>
                   </>
               )}
               <div className={`z-10 flex flex-col items-center max-w-6xl w-full`}>
                   <h1 className={`text-6xl md:text-8xl font-black mb-4 text-center ${theme.title}`}>{eventName}</h1>
                   <div className="flex flex-row gap-20 items-center bg-white/10 backdrop-blur-sm p-16 rounded-[3rem] border border-white/20 shadow-2xl">
                       <div className={`flex flex-col items-center bg-white p-6 rounded-3xl shadow-xl ${isJunior ? 'rotate-[-2deg] border-8 border-yellow-200' : 'border border-cyan-500/30'}`}>
                           <img src={qrUrl} alt="Join QR Code" className="w-72 h-72 object-contain rounded-xl" />
                       </div>
                       <div className="flex flex-col gap-8 text-center">
                           <div>
                               <div className={`text-2xl font-bold mb-4 uppercase tracking-wider ${isJunior ? 'text-gray-500' : 'text-slate-400'}`}>房间号 (Room Code)</div>
                               <div className={`text-[9rem] leading-none font-black tracking-widest ${isJunior ? 'text-indigo-600 drop-shadow-sm' : 'text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.8)] font-mono'}`}>{roomCode}</div>
                           </div>
                           <div className="flex items-center justify-center gap-6 text-4xl mt-4 text-white">
                               <div className="flex items-center gap-3 bg-white/50 px-8 py-4 rounded-full border border-white/30">
                                   <Users size={48} className={isJunior ? 'text-green-500' : 'text-cyan-500'}/>
                                   <span className={isJunior ? 'text-gray-700 font-bold' : 'text-white font-bold'}>{connectedPlayers.length}</span>
                               </div>
                           </div>
                           <div className="text-xl text-slate-500 animate-pulse font-bold mt-4">请扫码或输入房间号加入游戏</div>
                       </div>
                   </div>
               </div>
          </div>
      );
  }

  // --- MAIN GAME VIEW ---
  return (
    <div className={`h-full w-full flex flex-col font-sans overflow-hidden ${theme.bg} ${theme.pattern} relative`}>
      
      <style>{`
        @keyframes float-up-fade {
            0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
            20% { transform: translate(-50%, -80%) scale(1.2); opacity: 1; }
            100% { transform: translate(-50%, -200%) scale(1); opacity: 0; }
        }
        .animate-float-up-fade {
            animation: float-up-fade 1.5s ease-out forwards;
        }
      `}</style>

      {/* EVENT FLASH OVERLAY (NEWS BREAKING) */}
      {showEventFlash && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in zoom-in duration-300 pointer-events-none">
              <div className={`w-full max-w-4xl p-8 rounded-3xl border-4 text-center transform shadow-2xl ${isJunior ? 'bg-white border-yellow-400' : 'bg-slate-900 border-cyan-500'}`}>
                  <div className="text-6xl mb-4 animate-bounce">{currentEvent.icon || '📢'}</div>
                  <h2 className={`text-5xl font-black mb-4 uppercase tracking-widest ${isJunior ? 'text-yellow-500' : 'text-cyan-400'}`}>
                      市场突发新闻
                  </h2>
                  <div className={`text-4xl font-bold ${isJunior ? 'text-gray-800' : 'text-white'}`}>
                      {currentEvent.name}
                  </div>
                  <div className={`text-2xl mt-4 ${isJunior ? 'text-gray-500' : 'text-slate-400'}`}>
                      {currentEvent.description}
                  </div>
              </div>
          </div>
      )}

      {/* GLOBAL OVERLAYS (Report) */}
      {isRoundSummary && <RoundSummaryReport players={connectedPlayers} round={roundNumber} />}

      {/* HEADER */}
      <header className={`px-8 py-2 flex justify-between items-center z-50 shrink-0 ${theme.header}`}>
        <div className="flex items-center gap-6">
            <h1 className={`text-3xl font-black flex items-center gap-3 ${theme.title}`}>
                {isJunior ? <Store className="w-8 h-8"/> : <Globe className="w-8 h-8"/>}
                {eventName}
            </h1>
            <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold border ${isJunior ? 'bg-orange-100 text-orange-600 border-orange-200' : 'bg-cyan-900/30 text-cyan-400 border-cyan-500/30'}`}>
                <Clock size={16}/> 第 {roundNumber} 轮
            </div>
        </div>

        <div className="flex items-center gap-6">
            
            {/* --- STATUS INDICATORS (Game Mode) --- */}
            <div className={`flex items-center gap-4 px-4 py-2 rounded-xl border ${isJunior ? 'bg-white/50 border-gray-200' : 'bg-black/50 border-slate-700'}`}>
                {/* Network Status */}
                <div className="flex items-center gap-2" title="网络连接状态">
                    <Wifi size={14} className={connectionStatus === 'connected' ? (isJunior ? 'text-green-600' : 'text-green-400') : 'text-red-500'}/>
                    <div className={`w-2.5 h-2.5 rounded-full ${
                        connectionStatus === 'connected' 
                        ? 'bg-green-500 shadow-[0_0_8px_#22c55e] animate-pulse' 
                        : (connectionStatus === 'reconnecting' ? 'bg-yellow-500 animate-bounce' : 'bg-red-500')
                    }`}></div>
                    <span className={`text-[10px] font-mono font-bold ${isJunior ? 'text-gray-500' : 'text-slate-400'}`}>NET</span>
                </div>
                
                <div className={`w-[1px] h-4 ${isJunior ? 'bg-gray-300' : 'bg-slate-600'}`}></div>

                {/* AI Status */}
                <div className="flex items-center gap-2" title="AI服务状态">
                    <Bot size={14} className={aiStatus === 'idle' ? (isJunior ? 'text-green-600' : 'text-green-400') : 'text-blue-400'}/>
                    <div className={`w-2.5 h-2.5 rounded-full ${
                        aiStatus === 'idle' 
                        ? 'bg-green-500' 
                        : 'bg-blue-500 shadow-[0_0_12px_#3b82f6] animate-ping' // Fast Ping for processing
                    }`}></div>
                    <span className={`text-[10px] font-mono font-bold ${isJunior ? 'text-gray-500' : 'text-slate-400'}`}>AI</span>
                </div>
            </div>

            <div className={`flex items-center gap-4 px-8 py-3 font-mono text-4xl font-bold tracking-widest ${theme.timer}`}>
                {timeLeft < 30 && <span className="animate-ping text-red-500 mr-2">●</span>}
                <span className={timeLeft < 30 ? 'text-red-500' : ''}>{formatTime(timeLeft)}</span>
            </div>
        </div>
      </header>
      
      {/* 1. NEWS TICKER (Added) */}
      <NewsTicker ageGroup={ageGroup} />

      {/* CONTENT AREA */}
      <div className="flex-1 flex overflow-hidden relative z-10">
          
          {/* LEFT SIDEBAR: Leaderboard & Feed */}
          <div className={`w-[420px] flex flex-col z-20 shadow-2xl ${theme.sidebar}`}>
              
              {/* LEADERBOARD */}
              <div className="flex-[3] flex flex-col overflow-hidden border-b border-gray-200/10">
                  <div className={`p-5 flex items-center gap-2 font-black text-xl uppercase tracking-widest ${isJunior ? 'text-gray-700' : 'text-cyan-400 border-b border-cyan-500/20 bg-cyan-950/20'}`}>
                      <Trophy className={isJunior ? "text-yellow-500" : "text-cyan-400"} /> 
                      {isJunior ? '今日财富榜' : '商业精英榜'}
                  </div>
                  <div className="flex-1 overflow-y-hidden relative">
                      <div className="absolute inset-0 overflow-y-auto scrollbar-hide p-4 space-y-3" ref={scrollContainerRef}>
                          {[...connectedPlayers].sort((a,b) => b.funds - a.funds).map((player, idx) => (
                              <div key={player.id} className={`flex items-center p-3 rounded-xl shadow-sm transition-all duration-500 ${theme.leaderboardItem} ${idx < 3 ? 'scale-105 my-2 border-l-4' : 'opacity-90'} ${
                                  idx === 0 ? (isJunior ? 'border-yellow-400 bg-yellow-50' : 'border-yellow-500 bg-yellow-900/20') :
                                  idx === 1 ? (isJunior ? 'border-gray-300' : 'border-gray-500') :
                                  idx === 2 ? (isJunior ? 'border-orange-300' : 'border-orange-600') : ''
                              }`}>
                                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg mr-3 shadow-md relative ${
                                      idx === 0 ? 'bg-yellow-400 text-black' : 
                                      idx === 1 ? 'bg-gray-300 text-black' : 
                                      idx === 2 ? 'bg-orange-400 text-white' : 
                                      'bg-slate-700 text-slate-400'
                                  }`}>
                                      {idx + 1}
                                      {/* Rank Change Indicator (Simulated for demo as we sort every frame, but visuals help) */}
                                      {idx < 3 && <div className="absolute -top-1 -right-1 text-[8px] animate-bounce">🔥</div>}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <div className={`font-bold truncate text-base ${isJunior ? 'text-gray-800' : 'text-slate-200'}`}>{player.shopName || player.name}</div>
                                      <div className="text-[10px] opacity-60 flex gap-2">
                                          <span>{player.name}</span>
                                          <span>LV.{player.marketingLevel}</span>
                                      </div>
                                  </div>
                                  <div className={`font-mono font-bold text-lg ${isJunior ? 'text-green-600' : 'text-green-400'}`}>¥{player.funds?.toLocaleString() || 0}</div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>

              {/* NEWS FEED & LOGS */}
              <div className="flex-[3] flex flex-col bg-opacity-50 overflow-hidden relative">
                  <div className={`p-4 flex items-center justify-between font-bold text-sm uppercase tracking-wider ${isJunior ? 'text-blue-600 bg-blue-50 border-t border-blue-100' : 'text-blue-400 bg-slate-900 border-t border-slate-700'}`}>
                      <span className="flex items-center gap-2"><Activity size={16}/> 实时交易 (Real-Time)</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2 mask-gradient-b">
                      {[...recentEvents, ...systemLogs].sort().slice(0, 15).map((evt, i) => {
                          const isSys = evt.startsWith('[SYS]');
                          return (
                              <div key={i} className={`text-xs flex gap-2 animate-in slide-in-from-left-2 duration-300 ${i === 0 ? 'opacity-100 font-bold' : 'opacity-70'} ${isSys ? 'text-gray-500 font-mono scale-95' : isJunior ? 'text-gray-800' : 'text-slate-300'}`}>
                                  <span className="opacity-50 min-w-[35px] text-[9px] pt-0.5 font-mono">{new Date().toLocaleTimeString([], {minute:'2-digit', second:'2-digit'})}</span>
                                  <span className={isSys ? (isJunior ? 'text-gray-400' : 'text-slate-600') : ''}>{evt.replace('[SYS]', '>')}</span>
                              </div>
                          );
                      })}
                  </div>
                  
                  {/* 2. MARKET TREND CHART (Added at bottom of sidebar) */}
                  <div className={`h-40 p-4 border-t ${isJunior ? 'bg-orange-100/50 border-orange-200' : 'bg-slate-900/80 border-cyan-900/50'}`}>
                       <MarketTrendChart data={marketTrendData} isJunior={isJunior} />
                  </div>
              </div>
          </div>

          {/* MAIN GRID: Shops */}
          <div className={`flex-1 p-6 overflow-y-auto relative ${theme.gridContainer}`}>
              {/* Current Event Banner */}
              <div className={`mb-6 p-4 rounded-2xl flex items-center gap-4 animate-in slide-in-from-top duration-700 ${isJunior ? 'bg-white border-2 border-indigo-100 shadow-sm' : 'bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-indigo-500/30'}`}>
                  <div className={`text-4xl p-3 rounded-xl ${isJunior ? 'bg-indigo-100' : 'bg-indigo-500/20'}`}>{currentEvent.icon || '📢'}</div>
                  <div>
                      <div className={`text-xs font-bold uppercase tracking-widest mb-1 ${isJunior ? 'text-indigo-400' : 'text-indigo-300'}`}>当前市场风向 (Current Trend)</div>
                      <div className={`text-2xl font-black ${isJunior ? 'text-gray-800' : 'text-white'}`}>{currentEvent.name}</div>
                      <div className={`text-sm ${isJunior ? 'text-gray-500' : 'text-slate-400'}`}>{currentEvent.description}</div>
                  </div>
                  <div className="ml-auto flex gap-2">
                        {currentEvent.boostedCategories.map(cat => (
                            <span key={cat} className={`px-3 py-1 rounded-full text-xs font-bold border ${isJunior ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-indigo-950 text-indigo-300 border-indigo-800'}`}>
                                {CATEGORY_MAP[cat] || cat}
                            </span>
                        ))}
                  </div>
              </div>

              {/* Shop Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-20">
                  {connectedPlayers.map((player, index) => (
                      isJunior ? 
                        <JuniorShopCard key={player.id} player={player} index={index} salesDiff={salesEvents[player.id] || 0} /> : 
                        <SeniorCyberCard key={player.id} player={player} index={index} salesDiff={salesEvents[player.id] || 0} />
                  ))}
              </div>
          </div>
      </div>
    </div>
  );
};

export default BigScreenView;
