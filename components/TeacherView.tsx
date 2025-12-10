
import React, { useState } from 'react';
import { AgeGroup, PlayerState, MarketConfig, GameEvent } from '../types';
import { Settings, PlayCircle, PauseCircle, RefreshCw, XCircle, FileText, Download, Mic, Send, TrendingUp, Users, Rocket, Truck, Package, CheckCircle, Info, Bot, Zap, Globe, AlertTriangle, Skull, Dice5, Percent, ArrowUp, ArrowDown, Crown, Star, Volume2, X, Database, Layers, Edit3 } from 'lucide-react';
import { speakAnnouncement, generateGameReport } from '../services/geminiService';
import { GAME_EVENTS } from '../constants';
import ReactMarkdown from 'react-markdown';
import { p2p } from '../services/p2p';

interface TeacherViewProps {
  ageGroup: AgeGroup;
  connectedPlayers: PlayerState[];
  roomCode: string;
  eventName: string;
  setEventName: (name: string) => void;
  onStartGame: () => void;
  marketConfig: MarketConfig;
  onUpdateMarketConfig: (config: Partial<MarketConfig>) => void;
  
  // Game Flow Props
  timeLeft: number;
  isRunning: boolean;
  roundNumber: number;
  isGameStarted: boolean; 
  onToggleTimer: () => void;
  onResetRound: () => void;
  onForceSettlement: () => void;

  // New AI Props
  aiCustomerPoolCount: number;
  onGenerateAICustomers: (count: number, distributeNow: boolean, bias?: 'random' | 'easy' | 'hard' | 'chaos') => Promise<void>;
  
  // Event Props
  currentEvent: GameEvent;
  onSetEvent: (event: GameEvent) => void;
  onTriggerRandomEvent?: () => void; 
}

// Preset Messages for 1-Click Broadcast
const BROADCAST_PRESETS = [
    { label: "🔔 倒计时 30秒", text: "各位店长请注意，本轮交易还有最后 30 秒！请抓紧时间！" },
    { label: "⏰ 倒计时 10秒", text: "最后 10 秒倒计时！10，9，8，7，6，5，4，3，2，1！" },
    { label: "🛑 交易结束", text: "时间到！本轮交易结束，请所有店长停止操作，准备结算。" },
    { label: "👋 欢迎家长", text: "热烈欢迎各位家长莅临指导！我们的商业模拟挑战赛马上开始。" },
    { label: "👏 鼓励大家", text: "大家都做得非常棒！继续保持这个势头，争取成为今天的商业大亨！" },
    { label: "⚠️ 保持安静", text: "请各位小店长保持安静，专注于自己的店铺经营。" },
];

const TeacherView: React.FC<TeacherViewProps> = ({ 
  ageGroup, 
  connectedPlayers, 
  roomCode, 
  eventName, 
  setEventName, 
  onStartGame, 
  marketConfig, 
  onUpdateMarketConfig,
  timeLeft,
  isRunning,
  roundNumber,
  isGameStarted,
  onToggleTimer,
  onResetRound,
  onForceSettlement,
  aiCustomerPoolCount,
  onGenerateAICustomers,
  currentEvent,
  onSetEvent,
  onTriggerRandomEvent
}) => {
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isGeneratingCustomers, setIsGeneratingCustomers] = useState(false);
  
  // Mass Generation State
  const [massGenProgress, setMassGenProgress] = useState(0); // 0 to 100
  const [isMassGenerating, setIsMassGenerating] = useState(false);
  
  // Report Modal State
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportAnalysis, setReportAnalysis] = useState('');

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleBroadcast = (textOverride?: string) => {
      const msg = textOverride || broadcastMsg;
      if (!msg) return;
      // 1. Play local TTS for teacher
      speakAnnouncement(msg, ageGroup);
      // 2. Send text to students/screen (They will see it in the log, they can implemented local TTS if needed)
      p2p.broadcastEvent(msg);
      
      if (!textOverride) setBroadcastMsg('');
  };

  const handleGlobalEventChange = (event: GameEvent) => {
      onSetEvent(event);
      const msg = `📢 全局事件更新: ${event.name}！${event.description}`;
      speakAnnouncement(msg, ageGroup);
      p2p.broadcastEvent(msg);
  };

  // Generate Report and Show Modal
  const handleViewReport = async () => {
      if (connectedPlayers.length === 0) {
          alert("暂无玩家数据");
          return;
      }
      setIsGeneratingReport(true);
      setShowReportModal(true);
      // Generate textual analysis
      const analysis = await generateGameReport(connectedPlayers, eventName);
      setReportAnalysis(analysis);
      setIsGeneratingReport(false);
  };

  // Download Report
  const handleDownloadReport = () => {
      const blob = new Blob([reportAnalysis], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${eventName}_经营分析报告.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  }

  // Single Batch Generation
  const handleManualAIGen = async (distribute: boolean, bias: 'random' | 'easy' | 'hard' | 'chaos' = 'random') => {
      if(isGeneratingCustomers || isMassGenerating) return;
      setIsGeneratingCustomers(true);
      await onGenerateAICustomers(5, distribute, bias); 
      setIsGeneratingCustomers(false);
  }

  // Mass Generation (50 Customers)
  const handleMassGen = async () => {
      if(isGeneratingCustomers || isMassGenerating) return;
      setIsMassGenerating(true);
      setMassGenProgress(0);
      
      const BATCH_SIZE = 10;
      const TOTAL_BATCHES = 5; // Generate 50 total
      
      try {
          for (let i = 0; i < TOTAL_BATCHES; i++) {
              // Generate 10 at a time
              await onGenerateAICustomers(BATCH_SIZE, false, 'random');
              setMassGenProgress(Math.round(((i + 1) / TOTAL_BATCHES) * 100));
          }
      } catch (e) {
          console.error("Mass gen failed", e);
      } finally {
          setIsMassGenerating(false);
          setMassGenProgress(0);
      }
  };

  const readyCount = connectedPlayers.filter(p => p.status === 'ready' || p.status === 'playing').length;

  // Calculate Stats for Report Modal
  const sortedByProfit = [...connectedPlayers].sort((a,b) => b.totalProfit - a.totalProfit);
  const mvpPlayer = sortedByProfit[0];
  const sortedByRep = [...connectedPlayers].sort((a,b) => b.reputation - a.reputation);
  const starPlayer = sortedByRep[0];
  const totalMarketValue = connectedPlayers.reduce((acc, p) => acc + p.totalProfit, 0);

  return (
    <div className="h-full bg-gray-100 text-gray-900 font-sans overflow-y-auto p-8 relative">
      
      {/* --- REPORT MODAL --- */}
      {showReportModal && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-8 animate-in fade-in zoom-in duration-300">
              <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
                  <button onClick={() => setShowReportModal(false)} className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-full z-10">
                      <X size={24}/>
                  </button>
                  
                  {/* Modal Header */}
                  <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-white shrink-0">
                      <div className="flex items-center gap-3 mb-2">
                          <TrendingUp size={32} className="text-yellow-300"/>
                          <h2 className="text-3xl font-black tracking-wider">全场经营总览数据大屏</h2>
                      </div>
                      <p className="opacity-80">适用于活动总结复盘，向家长展示学习成果</p>
                  </div>

                  {/* Modal Content */}
                  <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
                      
                      {/* 1. Key Metrics Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                          {/* MVP */}
                          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-6 rounded-2xl border border-yellow-200 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
                              <div className="absolute top-0 right-0 bg-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">PROFIT KING</div>
                              <Crown size={48} className="text-yellow-500 mb-2 drop-shadow-sm"/>
                              <div className="text-sm text-yellow-700 font-bold uppercase tracking-wider mb-1">全场 MVP (利润最高)</div>
                              <div className="text-2xl font-black text-gray-900 mb-2">{mvpPlayer ? (mvpPlayer.shopName || mvpPlayer.name) : '暂无数据'}</div>
                              <div className="text-3xl font-mono font-black text-yellow-600">¥{mvpPlayer?.totalProfit.toLocaleString() || 0}</div>
                          </div>

                          {/* Star */}
                          <div className="bg-gradient-to-br from-pink-50 to-red-50 p-6 rounded-2xl border border-pink-200 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
                              <div className="absolute top-0 right-0 bg-pink-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">POPULARITY</div>
                              <Star size={48} className="text-pink-500 mb-2 drop-shadow-sm"/>
                              <div className="text-sm text-pink-700 font-bold uppercase tracking-wider mb-1">人气王 (口碑最佳)</div>
                              <div className="text-2xl font-black text-gray-900 mb-2">{starPlayer ? (starPlayer.shopName || starPlayer.name) : '暂无数据'}</div>
                              <div className="text-3xl font-mono font-black text-pink-600">{starPlayer?.reputation || 100} <span className="text-lg">分</span></div>
                          </div>

                          {/* Market Value */}
                          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center text-center justify-center">
                              <div className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-2">本次活动创造总价值</div>
                              <div className="text-4xl font-mono font-black text-indigo-600">¥{totalMarketValue.toLocaleString()}</div>
                              <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full mt-2 font-bold">
                                  {connectedPlayers.length} 位小CEO共同创造
                              </div>
                          </div>
                      </div>

                      {/* 2. AI Analysis Text */}
                      <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
                          <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                              <h3 className="text-xl font-bold flex items-center gap-2 text-indigo-700">
                                  <Bot className="w-6 h-6"/> AI 智能经营点评
                              </h3>
                              <button onClick={handleDownloadReport} className="text-sm text-gray-500 hover:text-indigo-600 flex items-center gap-1 font-bold">
                                  <Download size={14}/> 下载完整报告
                              </button>
                          </div>
                          <div className="prose max-w-none text-gray-600 leading-relaxed">
                              {isGeneratingReport ? (
                                  <div className="flex items-center gap-3 text-gray-400 py-8">
                                      <RefreshCw className="animate-spin"/> 正在分析全场交易数据，生成专业评语...
                                  </div>
                              ) : (
                                  <ReactMarkdown>{reportAnalysis || "点评生成失败，请重试。"}</ReactMarkdown>
                              )}
                          </div>
                      </div>

                  </div>
              </div>
          </div>
      )}

      {/* Header */}
      <header className="mb-8 flex justify-between items-center">
          <div>
              <h1 className="text-3xl font-bold text-gray-800">老师管理后台 (Teacher Dashboard)</h1>
              <p className="text-gray-500 mt-1">控制游戏流程、设置难度与生成报表</p>
          </div>
          <div className="bg-white px-6 py-3 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
              <div className="text-right">
                  <div className="text-xs text-gray-400 uppercase font-bold">Room Code</div>
                  <div className="text-2xl font-mono font-bold text-indigo-600">{roomCode}</div>
              </div>
              <div className="h-8 w-px bg-gray-200"></div>
              <div className="flex items-center gap-2 text-gray-600">
                  <Users size={20}/>
                  <span className="font-bold">{connectedPlayers.length}</span> 学生在线
              </div>
          </div>
      </header>

      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* 1. Game Flow Control */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-indigo-600 border-b pb-2">
                <Settings className="w-5 h-5"/> 游戏流程控制
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Timer Section / Start Game Section */}
                <div className="col-span-2 space-y-6">
                    {!isGameStarted ? (
                        <div className="h-full flex flex-col justify-center items-start gap-4 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                            <h4 className="font-bold text-indigo-900 flex items-center gap-2"><Rocket size={20}/> 准备阶段</h4>
                            <div className="w-full bg-white rounded-lg p-3 border border-indigo-100 flex justify-between items-center">
                                <span className="text-sm text-gray-600">玩家就绪情况:</span>
                                <div className="flex items-center gap-2">
                                    <span className={`text-2xl font-bold ${readyCount === connectedPlayers.length && readyCount > 0 ? 'text-green-500' : 'text-indigo-600'}`}>
                                        {readyCount} / {connectedPlayers.length}
                                    </span>
                                    {readyCount === connectedPlayers.length && readyCount > 0 && <CheckCircle size={20} className="text-green-500"/>}
                                </div>
                            </div>
                            <p className="text-sm text-indigo-700">请确认所有学生都已加入房间并完成店铺设置（状态变为 Ready）。点击下方按钮将正式开始游戏。</p>
                            <button 
                                onClick={onStartGame}
                                className="w-full px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xl shadow-lg flex items-center justify-center gap-3 transition-transform hover:scale-105"
                            >
                                <Rocket size={24}/> 正式开始游戏 (Start Game)
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-6">
                                <div className={`font-mono text-6xl font-bold tabular-nums ${timeLeft < 30 && isRunning ? 'text-red-500' : 'text-gray-800'}`}>
                                    {formatTime(timeLeft)}
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={onToggleTimer} 
                                        className={`px-6 py-3 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-all text-white ${isRunning ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-600 hover:bg-green-700'}`}>
                                        {isRunning ? <><PauseCircle/> 暂停计时</> : <><PlayCircle/> 开始/继续</>}
                                    </button>
                                    <button onClick={onResetRound} className="px-6 py-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-bold flex items-center gap-2">
                                        <RefreshCw size={18}/> 重置时间
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="inline-block w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                                <span className="text-sm text-gray-500 font-bold">第 {roundNumber} 轮交易进行中... (游戏已启动)</span>
                            </div>
                        </>
                    )}
                </div>

                {/* Emergency Control */}
                {isGameStarted && (
                    <div className="flex flex-col justify-center bg-red-50 p-4 rounded-xl border border-red-100">
                        <button 
                            onClick={onForceSettlement}
                            className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-md"
                        >
                            <XCircle size={20}/>
                            强制结束本轮 (Time's Up)
                        </button>
                        <p className="text-xs text-red-600/70 text-center mt-2">点击将倒计时归零，并触发结算广播</p>
                    </div>
                )}
            </div>
        </div>
        
        {/* NEW: AI Customer Generation Control (DIRECTOR MODE) */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><Bot size={120} /></div>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-violet-600 border-b pb-2 relative z-10">
                <Bot className="w-5 h-5"/> AI 导演控制台 (AI Director Mode)
            </h3>
            
            {/* Mass Generation Panel */}
            <div className="bg-gradient-to-r from-violet-50 to-indigo-50 p-4 rounded-xl border border-violet-100 mb-6 relative z-10">
                <div className="flex justify-between items-center mb-2">
                     <div className="flex items-center gap-2 text-sm font-bold text-violet-800">
                         <Database size={16}/> 智能顾客缓冲池 (Customer Pool)
                     </div>
                     <div className="text-xs text-violet-600 bg-white px-2 py-1 rounded-full border border-violet-100 shadow-sm">
                         建议保持 50+ 库存以应对高峰
                     </div>
                </div>
                <div className="flex items-end gap-4">
                     <div className="flex-1">
                         <div className="text-4xl font-mono font-black text-violet-600 leading-none mb-1">{aiCustomerPoolCount}</div>
                         <div className="text-xs text-gray-500">当前待命顾客数</div>
                     </div>
                     <div className="flex-1">
                          {isMassGenerating ? (
                              <div className="space-y-1">
                                  <div className="flex justify-between text-xs font-bold text-violet-600">
                                      <span>批量生成中...</span>
                                      <span>{massGenProgress}%</span>
                                  </div>
                                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                                      <div className="h-full bg-violet-500 transition-all duration-300" style={{width: `${massGenProgress}%`}}></div>
                                  </div>
                              </div>
                          ) : (
                              <button 
                                onClick={handleMassGen}
                                className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-bold text-sm shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all"
                              >
                                  <Layers size={16}/> 🚀 一键备货 (50人)
                              </button>
                          )}
                     </div>
                </div>
            </div>

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 border-t border-gray-100 pt-4">
                
                {/* 1. Single Fill Status */}
                <div className="flex flex-col justify-center">
                    <p className="text-xs text-gray-500 mb-2">
                        少量补充 (每点一次生成5人)：
                    </p>
                    <button 
                        onClick={() => handleManualAIGen(false)}
                        disabled={isGeneratingCustomers || isMassGenerating}
                        className={`w-full py-2 px-4 rounded-lg font-bold border-2 flex items-center justify-center gap-2 transition-all text-sm ${isGeneratingCustomers ? 'bg-gray-100 border-gray-200 text-gray-400' : 'bg-white border-violet-200 text-violet-600 hover:bg-violet-50'}`}
                    >
                        {isGeneratingCustomers ? <RefreshCw className="animate-spin" size={14}/> : <RefreshCw size={14}/>}
                        {isGeneratingCustomers ? '生成中...' : '补充 5 位到后台'}
                    </button>
                </div>
                
                {/* 2. Manual Spawn (Director) */}
                <div className="space-y-3">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-1"><Zap size={14} className="text-orange-500"/> 立即派发 (强制空投给全员)</label>
                    <div className="grid grid-cols-3 gap-3">
                        <button 
                             onClick={() => handleManualAIGen(true, 'easy')}
                             disabled={isGeneratingCustomers || isMassGenerating}
                             className="flex flex-col items-center justify-center p-3 rounded-xl bg-green-50 border border-green-200 hover:bg-green-100 transition-all active:scale-95"
                        >
                            <span className="text-2xl">😊</span>
                            <span className="text-xs font-bold text-green-700 mt-1">友好团</span>
                        </button>
                        <button 
                             onClick={() => handleManualAIGen(true, 'hard')}
                             disabled={isGeneratingCustomers || isMassGenerating}
                             className="flex flex-col items-center justify-center p-3 rounded-xl bg-orange-50 border border-orange-200 hover:bg-orange-100 transition-all active:scale-95"
                        >
                            <span className="text-2xl">😡</span>
                            <span className="text-xs font-bold text-orange-700 mt-1">挑战团</span>
                        </button>
                        <button 
                             onClick={() => handleManualAIGen(true, 'chaos')}
                             disabled={isGeneratingCustomers || isMassGenerating}
                             className="flex flex-col items-center justify-center p-3 rounded-xl bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-all active:scale-95"
                        >
                            <span className="text-2xl">👻</span>
                            <span className="text-xs font-bold text-purple-700 mt-1">捣乱团</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {/* 2. Global Event Controller */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-cyan-600 border-b pb-2">
                <Globe className="w-5 h-5"/> 全局事件控制器 (Event Context)
            </h3>
            <div className="space-y-4">
                <div className="bg-cyan-50 p-4 rounded-xl border border-cyan-100 flex justify-between items-center relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="text-xs text-cyan-600 font-bold uppercase tracking-wider">当前生效事件</div>
                        <div className="text-xl font-black text-cyan-900 flex items-center gap-2">
                            <span className="text-2xl">{currentEvent.icon}</span> {currentEvent.name}
                        </div>
                        <div className="text-sm text-cyan-700 mt-1">{currentEvent.description}</div>
                    </div>
                    <div className="text-right relative z-10">
                        <div className="text-[10px] text-cyan-500 uppercase font-bold">加成商品</div>
                        <div className="flex gap-1 mt-1 justify-end">
                            {currentEvent.boostedCategories.map(c => <span key={c} className="bg-white px-2 py-1 rounded text-xs text-cyan-600 font-bold shadow-sm">{c}</span>)}
                        </div>
                    </div>
                    {/* Add visual flair for random mode */}
                    <div className="absolute right-0 top-0 opacity-10 text-9xl rotate-12 -translate-y-4 translate-x-4">
                        {currentEvent.icon}
                    </div>
                </div>

                {/* Event Selection Controls */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-bold text-gray-700">手动选择事件 (共 {GAME_EVENTS.length} 个)</label>
                        <button 
                            onClick={onTriggerRandomEvent}
                            className="px-4 py-2 rounded-lg border-2 border-indigo-500 bg-indigo-600 text-white hover:bg-indigo-500 transition-all flex items-center gap-2 shadow-md active:scale-95 text-sm font-bold"
                        >
                            <Dice5 size={16}/> 智能随机抽取 (Smart Random)
                        </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 max-h-80 overflow-y-auto p-1 border border-gray-100 rounded-xl bg-gray-50/50">
                        {GAME_EVENTS.map((evt, idx) => {
                            // Simple visual categorization based on index ranges from constants.ts
                            let catLabel = "";
                            let catColor = "text-gray-400";
                            
                            if (idx < 10) { catLabel = "初级"; catColor = "text-green-500"; }
                            else if (idx < 20) { catLabel = "中级"; catColor = "text-blue-500"; }
                            else if (idx < 30) { catLabel = "高级"; catColor = "text-red-500"; }
                            else if (idx < 40) { catLabel = "趣味"; catColor = "text-orange-500"; } // New Junior
                            else { catLabel = "宏观"; catColor = "text-purple-500"; } // New Senior

                            return (
                                <button 
                                    key={evt.id}
                                    onClick={() => handleGlobalEventChange(evt)}
                                    className={`p-2 rounded-lg border text-left transition-all flex flex-col gap-1 active:scale-95 relative group ${currentEvent.id === evt.id ? 'bg-cyan-600 text-white border-cyan-600 shadow-md ring-2 ring-cyan-200' : 'bg-white border-slate-200 hover:border-cyan-300 hover:bg-cyan-50'}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="text-xl">{evt.icon}</div>
                                        <span className={`text-[9px] px-1 rounded border bg-white/80 ${currentEvent.id === evt.id ? 'text-cyan-800 border-transparent' : `${catColor} border-gray-100`}`}>
                                            {catLabel}
                                        </span>
                                    </div>
                                    <div className="font-bold text-xs truncate w-full">{evt.name}</div>
                                    <div className={`text-[9px] truncate w-full ${currentEvent.id === evt.id ? 'text-cyan-100' : 'text-gray-400'}`}>
                                        {evt.description}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>

        {/* 3. Configuration & Reports (Simplified) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-purple-600 border-b pb-2">
                    <TrendingUp className="w-5 h-5"/> 基础运营配置
                </h3>
                <div className="space-y-6">
                        {/* Game Name Update */}
                        <div>
                             <label className="block text-sm font-bold text-gray-600 mb-2 flex items-center gap-1"><Edit3 size={14}/> 活动/游戏名称</label>
                             <input 
                                type="text"
                                value={eventName}
                                onChange={(e) => setEventName(e.target.value)}
                                className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                                placeholder="请输入活动名称 (显示在大屏左上角)"
                             />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-600 mb-2">每轮时长与客流</label>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-gray-400">单轮时长 (分钟)</label>
                                    <input 
                                        type="number" 
                                        min="1"
                                        step="0.5"
                                        value={marketConfig.roundDuration / 60}
                                        onChange={(e) => onUpdateMarketConfig({ roundDuration: Math.floor((parseFloat(e.target.value) || 3) * 60) })}
                                        className="w-full bg-gray-50 border border-gray-300 rounded px-2 py-1 text-center font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400">固定客流 (手牌)</label>
                                    <input 
                                        type="number" 
                                        min="1" max="10"
                                        value={marketConfig.baseCustomerCount || 3}
                                        onChange={(e) => onUpdateMarketConfig({ baseCustomerCount: parseInt(e.target.value) })}
                                        className="w-full bg-gray-50 border border-gray-300 rounded px-2 py-1 text-center font-bold"
                                    />
                                </div>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 bg-orange-50 p-3 rounded-xl border border-orange-100">
                            <div>
                                <label className="block text-sm font-bold text-orange-800 flex items-center gap-1 mb-1">
                                    <Package size={14}/> 仓储费率
                                </label>
                                <div className="flex items-center gap-1">
                                    <input 
                                        type="number" step="0.1" min="0"
                                        value={marketConfig.storageFeeRate || 1.0}
                                        onChange={(e) => onUpdateMarketConfig({ storageFeeRate: parseFloat(e.target.value) })}
                                        className="w-16 bg-white border border-orange-200 rounded px-1 py-0.5 text-center font-bold text-orange-700 text-sm"
                                    />
                                    <span className="text-xs text-orange-600">元/件</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-orange-800 flex items-center gap-1 mb-1">
                                    <Truck size={14}/> 物流费率
                                </label>
                                <div className="flex items-center gap-1">
                                    <input 
                                        type="number" step="0.1" min="0"
                                        value={marketConfig.logisticsFeeRate || 0.5}
                                        onChange={(e) => onUpdateMarketConfig({ logisticsFeeRate: parseFloat(e.target.value) })}
                                        className="w-16 bg-white border border-orange-200 rounded px-1 py-0.5 text-center font-bold text-orange-700 text-sm"
                                    />
                                    <span className="text-xs text-orange-600">元/件</span>
                                </div>
                            </div>
                        </div>
                </div>
            </div>

            {/* Price Fluctuation & Upgrade Config */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-green-600 border-b pb-2">
                    <Percent className="w-5 h-5"/> 价格波动与成本控制
                </h3>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                            <label className="text-xs font-bold text-red-700 flex items-center gap-1 mb-1">
                                <ArrowUp size={12}/> 热门商品涨价幅度
                            </label>
                            <input 
                                type="range" min="0" max="1" step="0.1"
                                value={marketConfig.hotItemSurcharge ?? 0.2}
                                onChange={(e) => onUpdateMarketConfig({ hotItemSurcharge: parseFloat(e.target.value) })}
                                className="w-full h-2 bg-red-200 rounded-lg appearance-none cursor-pointer accent-red-600"
                            />
                            <div className="text-right text-sm font-bold text-red-600 mt-1">
                                +{Math.round((marketConfig.hotItemSurcharge ?? 0.2) * 100)}%
                            </div>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                            <label className="text-xs font-bold text-green-700 flex items-center gap-1 mb-1">
                                <ArrowDown size={12}/> 冷门商品打折幅度
                            </label>
                            <input 
                                type="range" min="0" max="0.9" step="0.1"
                                value={marketConfig.coldItemDiscount ?? 0.2}
                                onChange={(e) => onUpdateMarketConfig({ coldItemDiscount: parseFloat(e.target.value) })}
                                className="w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                            />
                            <div className="text-right text-sm font-bold text-green-600 mt-1">
                                -{Math.round((marketConfig.coldItemDiscount ?? 0.2) * 100)}%
                            </div>
                        </div>
                    </div>

                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                        <label className="text-xs font-bold text-yellow-800 flex items-center gap-1 mb-2">
                            <TrendingUp size={12}/> 店铺升级费用倍率 (Upgrade Cost Multiplier)
                        </label>
                        <div className="flex items-center gap-3">
                            <input 
                                type="range" min="0.5" max="3.0" step="0.5"
                                value={marketConfig.upgradeCostMultiplier ?? 1.0}
                                onChange={(e) => onUpdateMarketConfig({ upgradeCostMultiplier: parseFloat(e.target.value) })}
                                className="flex-1 h-2 bg-yellow-200 rounded-lg appearance-none cursor-pointer accent-yellow-600"
                            />
                            <span className="font-mono font-bold text-yellow-700 w-12 text-center">
                                {marketConfig.upgradeCostMultiplier ?? 1.0}x
                            </span>
                        </div>
                        <p className="text-[10px] text-yellow-600 mt-1">
                            调节倍率可控制玩家扩张速度。例如 0.5x 代表半价升级。
                        </p>
                    </div>
                </div>
            </div>

            {/* Actions & Reports */}
            <div className="space-y-8 md:col-span-2">
                 {/* Communication (UPDATED) */}
                 <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-pink-600 border-b pb-2">
                        <Mic className="w-5 h-5"/> 智能场控广播台 (AI Broadcast)
                    </h3>
                    
                    {/* 1. Quick Presets */}
                    <div className="mb-4">
                        <label className="text-xs font-bold text-gray-500 mb-2 block uppercase">一键播报 (快捷键)</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                            {BROADCAST_PRESETS.map((preset, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleBroadcast(preset.text)}
                                    className="px-3 py-2 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-lg text-xs font-bold border border-pink-200 transition-all active:scale-95 flex flex-col items-center gap-1 text-center h-full justify-center shadow-sm"
                                >
                                    <Volume2 size={14}/>
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 2. Manual Input */}
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={broadcastMsg}
                            onChange={(e) => setBroadcastMsg(e.target.value)}
                            placeholder="输入自定义语音广播内容..." 
                            className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-pink-500 outline-none"
                            onKeyDown={(e) => e.key === 'Enter' && handleBroadcast()}
                        />
                        <button onClick={() => handleBroadcast()} className="bg-pink-600 hover:bg-pink-700 text-white px-6 rounded-lg font-bold flex items-center">
                            <Send size={16}/>
                        </button>
                    </div>
                </div>

                {/* Reports (UPDATED) */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-green-600 border-b pb-2">
                        <FileText className="w-5 h-5"/> 全场经营分析大屏 (Data Center)
                    </h3>
                    <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
                        <div className="text-sm text-gray-500 flex-1">
                            生成可视化的全场经营战报，包含MVP、人气王及AI智能点评，适合投屏给家长观看。
                        </div>
                        <button 
                            onClick={handleViewReport}
                            disabled={isGeneratingReport}
                            className={`w-full md:w-auto px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${isGeneratingReport ? 'bg-gray-100 text-gray-400' : 'bg-green-600 hover:bg-green-700 text-white shadow-lg transform hover:scale-105'}`}
                        >
                            {isGeneratingReport ? <RefreshCw className="animate-spin"/> : <TrendingUp/>}
                            {isGeneratingReport ? 'AI 正在分析全场数据...' : '查看经营总览 (View Dashboard)'}
                        </button>
                    </div>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default TeacherView;
