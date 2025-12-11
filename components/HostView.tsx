
import React, { useState, useEffect } from 'react';
import { AgeGroup, PlayerState, MarketConfig } from '../types';
import { Users, Trophy, Store, Timer, ArrowLeft, Activity, TrendingUp, Settings, Mic, PlayCircle, PauseCircle, Send, BarChart3, Globe, QrCode, RefreshCw, XCircle, Sliders, FileText, Download, CheckCircle } from 'lucide-react';
import { speakAnnouncement, generateGameReport } from '../services/geminiService';

interface HostViewProps {
  ageGroup: AgeGroup;
  onBack: () => void;
  isPreview?: boolean;
  connectedPlayers: PlayerState[];
  roomCode: string;
  eventName: string;
  setEventName: (name: string) => void;
  onCreateRoom: () => string;
  onStartGame: () => void;
  recentEvents: string[];
  marketConfig: MarketConfig;
  onUpdateMarketConfig: (config: Partial<MarketConfig>) => void;
}

const SENIOR_RIVALS = [
  { name: "亚马逊自营", profit: 5000, marketShare: 40, avatar: "🦅" },
  { name: "沃尔玛商城", profit: 4200, marketShare: 30, avatar: "🛒" },
  { name: "优选严选", profit: 3500, marketShare: 15, avatar: "🎁" },
];

const HostView: React.FC<HostViewProps> = ({ ageGroup, onBack, isPreview = false, connectedPlayers = [], roomCode, eventName, setEventName, onCreateRoom, onStartGame, recentEvents, marketConfig, onUpdateMarketConfig }) => {
  const [timeLeft, setTimeLeft] = useState(marketConfig.roundDuration);
  const [isRunning, setIsRunning] = useState(false);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [activeTab, setActiveTab] = useState<'lobby' | 'dashboard' | 'controls'>('lobby');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [roundNumber, setRoundNumber] = useState(1);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  
  const isJunior = ageGroup === AgeGroup.Junior;
  
  // Sync timeLeft when config changes and not running
  useEffect(() => {
      if (!isRunning) {
          setTimeLeft(marketConfig.roundDuration);
      }
  }, [marketConfig.roundDuration, isRunning]);

  useEffect(() => {
    if (!isRunning) return;
    if (timeLeft === 0) {
        handleTimeUp();
        return;
    }
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [isRunning, timeLeft]);

  const handleStartGameClick = () => {
      onStartGame(); 
      setIsRunning(true);
      setActiveTab('dashboard');
  };

  const handleTimeUp = () => {
      setIsRunning(false);
      setIsTimeUp(true);
      // Removed automatic speech to prevent chaos. Use manual broadcast if needed.
  };

  const handleResetRound = () => {
      setIsTimeUp(false);
      setTimeLeft(marketConfig.roundDuration);
      setRoundNumber(prev => prev + 1);
      alert(`已重置时间，准备进入第 ${roundNumber + 1} 轮`);
  };

  const handleForceSettlement = () => {
      setIsRunning(false);
      setTimeLeft(0);
      handleTimeUp();
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleBroadcast = () => {
      if (!broadcastMsg) return;
      speakAnnouncement(broadcastMsg, ageGroup);
      setBroadcastMsg('');
  };

  const handleGlobalEvent = (event: string) => {
      const msg = `⚠️ 市场突发事件: ${event}`;
      speakAnnouncement(msg, ageGroup); // This is local manual trigger, acceptable
  };

  const handleExportReport = async () => {
      setIsGeneratingReport(true);
      const reportContent = await generateGameReport(connectedPlayers, eventName);
      
      const blob = new Blob([reportContent], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${eventName}_经营分析报告.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setIsGeneratingReport(false);
  };

  return (
    <div className="h-full bg-slate-900 text-white font-sans overflow-hidden flex flex-col relative">
      
      {isTimeUp && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
              <div className="text-8xl mb-4">🛑</div>
              <h2 className="text-6xl font-black text-red-500 mb-8 uppercase tracking-widest">Time's Up!</h2>
              <p className="text-2xl text-white mb-10">本轮交易时间已到，请停止所有操作</p>
              <button 
                  onClick={handleResetRound}
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold text-xl shadow-2xl flex items-center gap-2 transition-transform hover:scale-105"
              >
                  <RefreshCw /> 开启下一轮 (Reset Timer)
              </button>
          </div>
      )}

      <header className="bg-slate-800 border-b border-slate-700 p-4 flex justify-between items-center shadow-lg z-10 shrink-0">
        <div className="flex items-center gap-4">
            {!isPreview && (
                <button onClick={onBack} className="p-2 hover:bg-slate-700 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5 text-slate-400" />
                </button>
            )}
            <div>
                <h1 className="text-xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 flex items-center gap-2">
                    <Globe className="text-blue-400 w-5 h-5"/>
                    {eventName}
                </h1>
                <div className="text-xs text-slate-500 font-mono tracking-widest uppercase mt-0.5">Control Center</div>
            </div>
        </div>
        <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-5 py-2 rounded-lg border shadow-inner transition-colors ${timeLeft < 30 ? 'bg-red-950/50 border-red-500/50 animate-pulse' : 'bg-slate-950 border-slate-700'}`}>
                <span className="text-xs text-slate-400 mr-2">第 {roundNumber} 轮</span>
                {isRunning ? <PlayCircle className="text-green-500 w-5 h-5 animate-pulse"/> : <PauseCircle className="text-yellow-500 w-5 h-5"/>}
                <span className={`font-mono text-2xl font-bold ${timeLeft < 30 ? 'text-red-500' : 'text-white'}`}>{formatTime(timeLeft)}</span>
            </div>
            
            <div className="flex bg-slate-700 rounded-lg p-1">
                <button 
                    onClick={() => setActiveTab('lobby')}
                    className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'lobby' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>
                    房间
                </button>
                <button 
                    onClick={() => setActiveTab('dashboard')}
                    className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>
                    监控
                </button>
                <button 
                    onClick={() => setActiveTab('controls')}
                    className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'controls' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>
                    控制
                </button>
            </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden p-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
        
        {activeTab === 'lobby' && (
            <div className="h-full flex flex-col items-center justify-center animate-fade-in">
                <div className="bg-white/10 backdrop-blur-xl p-10 rounded-3xl border border-white/20 shadow-2xl text-center max-w-3xl w-full">
                    <h2 className="text-4xl font-bold mb-8 text-blue-300">👋 欢迎加入商业模拟挑战</h2>
                    
                    <div className="flex gap-10 justify-center items-center mb-10">
                        <div className="bg-white p-4 rounded-xl">
                             <QrCode className="w-48 h-48 text-slate-900"/>
                        </div>
                        <div className="text-left">
                            <div className="text-slate-400 text-sm mb-1 uppercase tracking-widest">Room Code</div>
                            <div className="text-8xl font-mono font-bold text-yellow-400 tracking-wider mb-4">{roomCode}</div>
                            <div className="flex items-center gap-2 text-xl text-white">
                                <Users />
                                <span>已连接玩家: <span className="font-bold text-green-400">{connectedPlayers.length}</span> 人</span>
                            </div>
                            <div className="text-sm text-slate-400 mt-2">
                                已就绪: <span className="text-green-400 font-bold">{connectedPlayers.filter(p => p.status === 'ready' || p.status === 'playing').length}</span> 人
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 max-h-48 overflow-y-auto p-4 bg-slate-900/50 rounded-xl mb-8">
                        {connectedPlayers.length === 0 ? (
                            <div className="col-span-4 text-slate-500 py-8 italic">等待玩家扫描二维码或输入房间号加入...</div>
                        ) : (
                            connectedPlayers.map((p, i) => (
                                <div key={i} className={`flex items-center gap-2 p-2 rounded-lg border transition-all animate-pop-in ${p.status === 'ready' ? 'bg-green-900/30 border-green-500/50' : 'bg-slate-800 border-slate-700'}`}>
                                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-sm font-bold relative">
                                        {p.avatar || p.name[0]}
                                        {p.status === 'ready' && <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5"><CheckCircle size={10} className="text-white"/></div>}
                                    </div>
                                    <div className="truncate text-sm flex-1 text-left">{p.name}</div>
                                    {p.status === 'ready' && <span className="text-[10px] text-green-400 font-bold">Ready</span>}
                                </div>
                            ))
                        )}
                    </div>

                    <button 
                        onClick={handleStartGameClick}
                        className="px-10 py-4 bg-green-600 hover:bg-green-500 rounded-full font-bold text-xl shadow-lg transition-all transform hover:scale-105"
                    >
                        开始游戏 (进入监控台) 🚀
                    </button>
                </div>
            </div>
        )}

        {activeTab === 'dashboard' && (
             <div className="h-full flex gap-6 animate-fade-in">
                <div className="flex-[2] flex flex-col gap-6 h-full">
                    <div className="bg-slate-800/80 backdrop-blur-md rounded-xl p-0 border border-slate-600 h-40 overflow-hidden relative shrink-0 shadow-xl">
                        <div className="bg-slate-700/50 px-4 py-2 border-b border-slate-600 flex justify-between items-center">
                             <h3 className="text-sm font-bold text-blue-400 uppercase flex items-center gap-2">
                                <Activity size={16}/> 实时交易快讯 (Real-Time)
                            </h3>
                            <div className="flex gap-1">
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                                <span className="text-xs text-red-400">LIVE</span>
                            </div>
                        </div>
                       
                        <div className="p-4 space-y-3">
                            {recentEvents.length === 0 && <div className="text-slate-500 text-sm">暂无市场动态...</div>}
                            {recentEvents.map((t, i) => (
                                <div key={i} className={`flex items-center gap-3 animate-fade-in ${i === 0 ? 'opacity-100 scale-100 translate-x-2' : 'opacity-60 scale-95'}`}>
                                    <span className="text-xs text-slate-500 font-mono">[{new Date().toLocaleTimeString()}]</span>
                                    <div className={`text-lg truncate font-medium ${i === 0 ? 'text-white' : 'text-slate-400'}`}>
                                        {t}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 bg-slate-800/50 backdrop-blur-md rounded-2xl border border-slate-700 p-6 relative overflow-y-auto shadow-2xl">
                        {isJunior ? (
                            <div className="h-full flex flex-col items-center justify-center text-center">
                                <h2 className="text-3xl font-bold mb-8 text-yellow-400 flex items-center gap-3">
                                    <Store className="w-8 h-8"/> 商业街繁荣度监控
                                </h2>
                                {connectedPlayers.length === 0 ? (
                                    <div className="text-slate-500">暂无店铺营业...</div>
                                ) : (
                                    <div className="grid grid-cols-3 gap-6 w-full">
                                        {connectedPlayers.map((p, i) => (
                                            <div key={i} className="bg-slate-700/80 rounded-xl p-4 flex flex-col items-center border-b-4 border-blue-500 hover:-translate-y-1 transition-transform duration-300">
                                                <div className="w-14 h-14 bg-slate-600 rounded-full mb-3 flex items-center justify-center text-2xl shadow-inner overflow-hidden">
                                                    {p.shopLogo?.startsWith('data:') ? <img src={p.shopLogo} className="w-full h-full object-cover"/> : (p.shopLogo || '🏠')}
                                                </div>
                                                <div className="font-bold text-lg truncate w-full">{p.shopName || p.name}</div>
                                                <div className="text-green-400 text-sm mt-1 bg-green-900/30 px-2 py-1 rounded-full">
                                                    资金: ¥{p.funds}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col">
                                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-white border-b border-slate-600 pb-4">
                                    <BarChart3 className="text-blue-500"/> 市场份额争夺战
                                </h2>
                                <div className="flex-1 flex flex-col justify-center gap-6">
                                    {SENIOR_RIVALS.map((rival, idx) => (
                                        <div key={idx} className="relative">
                                            <div className="flex justify-between items-end mb-2 px-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-2xl">{rival.avatar}</span>
                                                    <span className="font-bold text-lg">{rival.name}</span>
                                                </div>
                                                <span className="text-blue-400 font-mono font-bold text-xl">{rival.marketShare}%</span>
                                            </div>
                                            <div className="w-full bg-slate-700 h-6 rounded-full overflow-hidden shadow-inner">
                                                <div 
                                                    className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 relative" 
                                                    style={{width: `${rival.marketShare}%`}}
                                                >
                                                    <div className="absolute inset-0 bg-white/20 animate-shimmer"></div>
                                                </div>
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1 text-right">市值估值: ¥{rival.profit}M</div>
                                        </div>
                                    ))}
                                    
                                    <div className="relative mt-4 pt-4 border-t border-dashed border-slate-600">
                                        <div className="flex justify-between items-end mb-2 px-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-2xl">🎓</span>
                                                <span className="font-bold text-lg text-yellow-400">学生创业联盟 (玩家总和)</span>
                                            </div>
                                            <span className="text-yellow-400 font-mono font-bold text-xl">
                                                {connectedPlayers.length > 0 ? (15 + connectedPlayers.length * 2) : 0}%
                                            </span>
                                        </div>
                                        <div className="w-full bg-slate-700 h-6 rounded-full overflow-hidden shadow-inner">
                                            <div 
                                                className="h-full bg-gradient-to-r from-yellow-600 to-orange-400 relative" 
                                                style={{width: `${connectedPlayers.length > 0 ? (15 + connectedPlayers.length * 2) : 0}%`}}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1 bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-700 p-0 flex flex-col h-full shadow-2xl overflow-hidden">
                    <div className="p-5 border-b border-slate-600 bg-slate-800">
                         <h2 className="text-xl font-bold flex items-center gap-2 text-yellow-400">
                            <Trophy className="w-6 h-6" />
                            {isJunior ? '今日财富榜' : '商业精英榜'}
                        </h2>
                    </div>
                   
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 pr-2 scrollbar-hide">
                        {connectedPlayers.length === 0 && <div className="text-center text-slate-500 mt-10">暂无排名数据</div>}
                        {[...connectedPlayers].sort((a,b) => b.funds - a.funds).map((player, idx) => (
                            <div key={player.id} className="flex items-center p-4 bg-slate-700/40 rounded-xl hover:bg-slate-700/80 transition-colors border border-slate-700/50 hover:border-slate-500 group animate-slide-up">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg mr-4 shrink-0 shadow-lg ${
                                    idx === 0 ? 'bg-gradient-to-br from-yellow-300 to-yellow-600 text-black ring-2 ring-yellow-200' : 
                                    idx === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-black ring-2 ring-gray-200' : 
                                    idx === 2 ? 'bg-gradient-to-br from-orange-300 to-orange-600 text-black ring-2 ring-orange-200' : 
                                    'bg-slate-600 text-slate-300'
                                }`}>
                                    {idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold truncate text-lg group-hover:text-blue-300 transition-colors">{player.shopName || player.name}</div>
                                    <div className="text-xs text-slate-400 flex gap-2">
                                        <span>店长: {player.name}</span>
                                        <span className="text-slate-600">|</span>
                                        <span>Day {player.currentTurn}</span>
                                    </div>
                                </div>
                                <div className="font-mono text-green-400 font-bold text-xl ml-2">¥{player.funds}</div>
                            </div>
                        ))}
                    </div>
                </div>
             </div>
        )}

        {activeTab === 'controls' && (
            <div className="h-full bg-slate-800 rounded-2xl p-8 border border-slate-700 overflow-y-auto animate-fade-in">
                <div className="max-w-4xl mx-auto space-y-8">
                    
                    {/* Activity Settings */}
                    <div className="bg-slate-900 p-6 rounded-xl border border-slate-700 shadow-lg">
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-cyan-400 border-b border-slate-800 pb-2">
                            <Settings className="w-5 h-5"/> 活动设置 (Activity Config)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">活动名称</label>
                                <input 
                                    type="text" 
                                    value={eventName}
                                    onChange={(e) => setEventName(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-2">单轮时长 (秒)</label>
                                    <input 
                                        type="number" 
                                        value={marketConfig.roundDuration}
                                        onChange={(e) => onUpdateMarketConfig({ roundDuration: parseInt(e.target.value) || 180 })}
                                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-2">客流密度 (人/玩家/轮)</label>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="range" 
                                            min="1"
                                            max="20"
                                            step="1"
                                            value={marketConfig.customerSpawnRate || 8}
                                            onChange={(e) => onUpdateMarketConfig({ customerSpawnRate: parseInt(e.target.value) || 8 })}
                                            className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                        />
                                        <span className="w-8 text-right font-mono text-cyan-400">{marketConfig.customerSpawnRate || 8}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-1 flex justify-between px-1">
                                        <span>稀疏</span>
                                        <span>拥挤</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Difficulty Config */}
                    <div className="bg-slate-900 p-6 rounded-xl border border-slate-700 shadow-lg">
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-purple-400 border-b border-slate-800 pb-2">
                            <Sliders className="w-5 h-5"/> 市场环境配置 (难度调节)
                        </h3>
                        <div className="grid grid-cols-2 gap-8">
                             <div>
                                 <label className="block text-sm text-slate-400 mb-2">经济环境 (影响客户预算)</label>
                                 <div className="flex gap-2">
                                     <button 
                                        onClick={() => onUpdateMarketConfig({ economicBoom: true })}
                                        className={`flex-1 py-2 rounded-lg border text-sm font-bold ${marketConfig.economicBoom ? 'bg-green-900/50 border-green-500 text-green-300' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                                     >
                                         📈 繁荣 (预算高)
                                     </button>
                                     <button 
                                        onClick={() => onUpdateMarketConfig({ economicBoom: false })}
                                        className={`flex-1 py-2 rounded-lg border text-sm font-bold ${!marketConfig.economicBoom ? 'bg-red-900/50 border-red-500 text-red-300' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                                     >
                                         📉 萧条 (预算低)
                                     </button>
                                 </div>
                             </div>
                             <div>
                                 <label className="block text-sm text-slate-400 mb-2">客户挑剔度 (影响成交率)</label>
                                 <div className="flex gap-1">
                                    {['low', 'medium', 'high'].map((level) => (
                                        <button 
                                            key={level}
                                            onClick={() => onUpdateMarketConfig({ skepticismLevel: level as any })}
                                            className={`flex-1 py-2 rounded-lg border text-xs font-bold capitalize ${marketConfig.skepticismLevel === level ? 'bg-blue-900/50 border-blue-500 text-blue-300' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                                        >
                                            {level === 'low' ? '随和' : level === 'medium' ? '普通' : '挑剔'}
                                        </button>
                                    ))}
                                 </div>
                             </div>
                        </div>
                    </div>

                    {/* Game Flow Section */}
                    <div className="bg-slate-900 p-6 rounded-xl border border-slate-700 shadow-lg">
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-blue-400 border-b border-slate-800 pb-2">
                            <Settings className="w-5 h-5"/> 游戏流程总控
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="flex gap-4">
                                    <button onClick={() => setIsRunning(!isRunning)} 
                                        className={`flex-1 py-3 rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 ${isRunning ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-green-600 hover:bg-green-500'}`}>
                                        {isRunning ? <><PauseCircle/> 暂停计时</> : <><PlayCircle/> 开始/继续</>}
                                    </button>
                                    <button onClick={() => setTimeLeft(marketConfig.roundDuration)} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg shadow-lg font-bold text-slate-300">
                                        重置时间
                                    </button>
                                </div>
                                <div className="text-center text-xs text-slate-500">当前剩余: {formatTime(timeLeft)}</div>
                            </div>

                            <div className="flex flex-col justify-center">
                                <button 
                                    onClick={handleForceSettlement}
                                    className="w-full py-3 bg-red-900/40 border-2 border-red-800/50 hover:bg-red-900/70 text-red-200 rounded-lg font-bold flex items-center justify-center gap-2 transition-all hover:shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                                >
                                    <XCircle size={18}/>
                                    强制结束本轮 (Time's Up)
                                </button>
                                <p className="text-xs text-slate-500 text-center mt-2">点击将倒计时归零，并触发结算广播</p>
                            </div>
                        </div>
                    </div>

                    {/* Reports Section */}
                    <div className="bg-slate-900 p-6 rounded-xl border border-slate-700 shadow-lg">
                         <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-green-400 border-b border-slate-800 pb-2">
                            <FileText className="w-5 h-5"/> 数据报表 (Report)
                        </h3>
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-slate-400">生成整场活动的经营分析报告（Markdown格式），包含所有店铺数据。</p>
                            <button 
                                onClick={handleExportReport}
                                disabled={isGeneratingReport}
                                className={`px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all ${isGeneratingReport ? 'bg-slate-700 text-slate-500' : 'bg-green-600 hover:bg-green-500 text-white shadow-lg'}`}
                            >
                                {isGeneratingReport ? <RefreshCw className="animate-spin"/> : <Download/>}
                                {isGeneratingReport ? '生成中...' : '导出活动分析报告'}
                            </button>
                        </div>
                    </div>

                    {/* Communication System */}
                    <div className="bg-slate-900 p-6 rounded-xl border border-slate-700 shadow-lg">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-pink-400 border-b border-slate-800 pb-2">
                            <Mic className="w-5 h-5"/> 智能语音广播 (TTS)
                        </h3>
                        <div className="flex gap-4 mb-4">
                            <input 
                                type="text" 
                                value={broadcastMsg}
                                onChange={(e) => setBroadcastMsg(e.target.value)}
                                placeholder="输入通知内容..." 
                                className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                            />
                            <button onClick={handleBroadcast} className="bg-blue-600 hover:bg-blue-500 px-8 rounded-lg flex items-center font-bold shadow-lg shrink-0">
                                发送 <Send className="w-4 h-4 ml-2"/>
                            </button>
                        </div>
                    </div>

                    {/* Market Intervention */}
                    <div className="bg-slate-900 p-6 rounded-xl border border-slate-700 shadow-lg">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-yellow-400 border-b border-slate-800 pb-2">
                            <TrendingUp className="w-5 h-5"/> 宏观经济调控 (Event Trigger)
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <button onClick={() => handleGlobalEvent("消费热潮")} className="p-4 bg-slate-800 border border-slate-700 rounded-xl hover:bg-green-900/30 hover:border-green-500/50 transition-all text-center group">
                                <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">🔥</div>
                                <div className="font-bold text-green-400 text-sm">消费热潮</div>
                            </button>
                            <button onClick={() => handleGlobalEvent("经济萧条")} className="p-4 bg-slate-800 border border-slate-700 rounded-xl hover:bg-red-900/30 hover:border-red-500/50 transition-all text-center group">
                                <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">📉</div>
                                <div className="font-bold text-red-400 text-sm">经济寒冬</div>
                            </button>
                             <button onClick={() => handleGlobalEvent("网红探店")} className="p-4 bg-slate-800 border border-slate-700 rounded-xl hover:bg-purple-900/30 hover:border-purple-500/50 transition-all text-center group">
                                <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">📸</div>
                                <div className="font-bold text-purple-400 text-sm">网红探店</div>
                            </button>
                            <button onClick={() => handleGlobalEvent("原料涨价")} className="p-4 bg-slate-800 border border-slate-700 rounded-xl hover:bg-orange-900/30 hover:border-orange-500/50 transition-all text-center group">
                                <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">🏭</div>
                                <div className="font-bold text-orange-400 text-sm">原料涨价</div>
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        )}
      </main>
    </div>
  );
};

export default HostView;
