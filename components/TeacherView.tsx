import React, { useState, useEffect } from 'react';
import { AgeGroup, PlayerState, MarketConfig, GameEvent } from '../types';
import { Settings, PlayCircle, PauseCircle, RefreshCw, XCircle, FileText, Mic, Send, Globe, Dice5, Monitor, Rocket, X, Sliders, TrendingUp, Download, ChevronDown } from 'lucide-react';
import { speakAnnouncement, generateGameReport } from '../services/geminiService';
import { GAME_EVENTS } from '../constants';
import ReactMarkdown from 'react-markdown';
import { p2p } from '../services/p2p';
import BigScreenView from './BigScreenView';

interface TeacherViewProps {
  ageGroup: AgeGroup;
  connectedPlayers: PlayerState[];
  roomCode: string;
  eventName: string;
  setEventName: (name: string) => void;
  onStartGame: () => void;
  marketConfig: MarketConfig;
  onUpdateMarketConfig: (config: Partial<MarketConfig>) => void;
  timeLeft: number;
  isRunning: boolean;
  roundNumber: number;
  isGameStarted: boolean; 
  onToggleTimer: () => void;
  onResetRound: () => void;
  onForceSettlement: () => void;
  aiCustomerPoolCount: number;
  onGenerateAICustomers: (count: number, distributeNow: boolean, bias?: 'random' | 'easy' | 'hard' | 'chaos') => Promise<void>;
  currentEvent: GameEvent;
  onSetEvent: (event: GameEvent) => void;
  onTriggerRandomEvent?: () => void; 
  recentEvents: string[]; 
}

const TeacherView: React.FC<TeacherViewProps> = (props) => {
  const [showPanel, setShowPanel] = useState(true);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [reportModal, setReportModal] = useState(false);
  const [reportText, setReportText] = useState('');
  const [isGenReport, setIsGenReport] = useState(false);

  // Auto-hide panel when game starts to show the Big Screen clearly
  useEffect(() => {
      if (props.isGameStarted && props.roundNumber === 1 && props.timeLeft > 175) {
          setShowPanel(false);
      }
  }, [props.isGameStarted]);

  const handleBroadcast = () => {
      if (!broadcastMsg) return;
      speakAnnouncement(broadcastMsg, props.ageGroup);
      p2p.broadcastEvent(broadcastMsg);
      setBroadcastMsg('');
  };

  const handleReport = async () => {
      setIsGenReport(true);
      setReportModal(true);
      const txt = await generateGameReport(props.connectedPlayers, props.eventName);
      setReportText(txt);
      setIsGenReport(false);
  };

  const handleQuickIntervention = (type: string) => {
      const msg = `⚠️ 市场突发调控: ${type}`;
      speakAnnouncement(msg, props.ageGroup);
      p2p.broadcastEvent(msg);
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
        
        {/* BACKGROUND: THE BIG SCREEN (Always visible) */}
        <div className="absolute inset-0 z-0">
            <BigScreenView 
                ageGroup={props.ageGroup}
                connectedPlayers={props.connectedPlayers}
                roomCode={props.roomCode}
                eventName={props.eventName}
                recentEvents={props.recentEvents}
                timeLeft={props.timeLeft}
                roundNumber={props.roundNumber}
                isRunning={props.isRunning}
                isGameStarted={props.isGameStarted}
                currentEvent={props.currentEvent}
            />
        </div>

        {/* OVERLAY: CONTROL BUTTON */}
        <div className="absolute top-4 right-4 z-50">
            <button 
                onClick={() => setShowPanel(!showPanel)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold shadow-2xl transition-all border-2 ${showPanel ? 'bg-gray-900 text-white border-gray-700' : 'bg-white text-indigo-600 border-white hover:scale-105'}`}
            >
                {showPanel ? <X size={20}/> : <Settings size={20}/>}
                <span>{showPanel ? '关闭控制台' : '管理设置'}</span>
            </button>
        </div>

        {/* DRAWER: ADMIN PANEL (RESTORED FULL FUNCTIONALITY) */}
        <div className={`absolute top-0 right-0 h-full w-[550px] bg-slate-900/95 backdrop-blur-xl shadow-2xl z-40 transition-transform duration-300 ease-in-out border-l border-slate-700 flex flex-col text-slate-100 ${showPanel ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="p-6 pt-20 overflow-y-auto flex-1 space-y-6">
                
                {/* 1. HEADER & PRE-GAME */}
                {!props.isGameStarted && (
                    <div className="bg-indigo-900/40 border border-indigo-500/30 rounded-2xl p-6">
                        <h3 className="text-lg font-black text-indigo-300 mb-4 flex items-center gap-2"><Rocket size={20}/> 赛前设置</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase">活动名称</label>
                                <input 
                                    value={props.eventName} 
                                    onChange={(e) => props.setEventName(e.target.value)} 
                                    className="w-full mt-1 p-2 bg-slate-800 border border-slate-600 rounded-lg font-bold text-white focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase">初始资金</label>
                                    <div className="font-mono font-bold text-lg text-green-400 mt-1">
                                        {props.ageGroup === '6-12' ? '¥500' : '¥3000'}
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase">每轮时长(秒)</label>
                                    <input 
                                        type="number" 
                                        value={props.marketConfig.roundDuration}
                                        onChange={(e) => props.onUpdateMarketConfig({ roundDuration: Number(e.target.value) })}
                                        className="w-full mt-1 p-1 bg-slate-800 border border-slate-600 rounded font-mono font-bold text-white text-center"
                                    />
                                </div>
                            </div>
                            <button 
                                onClick={props.onStartGame} 
                                disabled={props.connectedPlayers.length === 0}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-lg shadow-lg mt-4 disabled:bg-slate-700 disabled:text-slate-500 transition-colors"
                            >
                                🚀 开始游戏 ({props.connectedPlayers.length}人)
                            </button>
                        </div>
                    </div>
                )}

                {/* 2. GAME CONTROLS (RESTORED) */}
                {props.isGameStarted && (
                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 shadow-sm">
                        <h3 className="text-lg font-black text-blue-300 mb-4 flex items-center gap-2"><Monitor size={20}/> 流程总控</h3>
                        <div className="flex items-center gap-4 mb-4">
                            <div className={`text-5xl font-mono font-black tracking-tighter ${props.timeLeft < 30 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                                {Math.floor(props.timeLeft / 60)}:{(props.timeLeft % 60).toString().padStart(2, '0')}
                            </div>
                            <div className="flex-1 space-y-2">
                                <button 
                                    onClick={props.onToggleTimer}
                                    className={`w-full py-2 rounded-lg font-bold flex items-center justify-center gap-2 text-white transition-colors ${props.isRunning ? 'bg-amber-600 hover:bg-amber-500' : 'bg-green-600 hover:bg-green-500'}`}
                                >
                                    {props.isRunning ? <><PauseCircle size={18}/> 暂停计时</> : <><PlayCircle size={18}/> 开始/继续</>}
                                </button>
                                <div className="flex gap-2">
                                    <button onClick={props.onResetRound} className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200 text-xs font-bold flex items-center justify-center gap-1" title="重置本轮时间">
                                        <RefreshCw size={14}/> 重置时间
                                    </button>
                                    <button onClick={props.onForceSettlement} className="flex-1 py-2 bg-red-900/40 border border-red-800 hover:bg-red-900/60 text-red-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1" title="立刻结束本轮">
                                        <XCircle size={14}/> 强制结算
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. DIFFICULTY & ECONOMY (RESTORED) */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-lg font-black text-purple-300 mb-6 flex items-center gap-2">
                        <Sliders size={20}/> 市场环境配置 (难度)
                    </h3>
                    <div className="space-y-6">
                         {/* Boom/Bust */}
                         <div>
                             <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">宏观经济 (影响预算)</label>
                             <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
                                 <button 
                                    onClick={() => props.onUpdateMarketConfig({ economicBoom: true })}
                                    className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${props.marketConfig.economicBoom ? 'bg-green-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                                 >
                                     📈 繁荣 (预算高)
                                 </button>
                                 <button 
                                    onClick={() => props.onUpdateMarketConfig({ economicBoom: false })}
                                    className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${!props.marketConfig.economicBoom ? 'bg-red-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                                 >
                                     📉 萧条 (预算低)
                                 </button>
                             </div>
                         </div>
                         
                         {/* Skepticism */}
                         <div>
                             <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">客户挑剔度 (成交难度)</label>
                             <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
                                {['low', 'medium', 'high'].map((level) => (
                                    <button 
                                        key={level}
                                        onClick={() => props.onUpdateMarketConfig({ skepticismLevel: level as any })}
                                        className={`flex-1 py-2 rounded-md text-xs font-bold capitalize transition-all ${props.marketConfig.skepticismLevel === level ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        {level === 'low' ? '随和' : level === 'medium' ? '普通' : '挑剔'}
                                    </button>
                                ))}
                             </div>
                         </div>

                         {/* Spawn Rate Slider */}
                         <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">客流密度 (人/玩家/轮)</label>
                                <span className="text-xs font-mono font-bold text-cyan-400">{props.marketConfig.baseCustomerCount || 3}</span>
                            </div>
                            <input 
                                type="range" 
                                min="1"
                                max="10"
                                step="1"
                                value={props.marketConfig.baseCustomerCount || 3}
                                onChange={(e) => props.onUpdateMarketConfig({ baseCustomerCount: parseInt(e.target.value) })}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                            />
                         </div>
                    </div>
                </div>

                {/* 4. EVENT MANAGEMENT (RESTORED QUICK ACTIONS) */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-lg font-black text-cyan-300 mb-4 flex items-center gap-2"><Globe size={20}/> 事件与调控</h3>
                    
                    {/* Current Event Banner */}
                    <div className="bg-cyan-900/20 p-3 rounded-xl border border-cyan-500/20 mb-4">
                        <div className="text-[10px] font-bold text-cyan-500 uppercase">当前生效</div>
                        <div className="font-bold text-cyan-100 text-base">{props.currentEvent.name}</div>
                    </div>

                    {/* Random Trigger */}
                    <button 
                        onClick={props.onTriggerRandomEvent}
                        className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 mb-6"
                    >
                        <Dice5 size={20}/> 🎲 触发随机事件 (推荐)
                    </button>

                    {/* Quick Interventions (RESTORED) */}
                    <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">宏观调控快捷键</label>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <button onClick={() => handleQuickIntervention("消费热潮")} className="p-3 bg-slate-700 hover:bg-green-900/50 border border-slate-600 hover:border-green-500/50 rounded-lg flex flex-col items-center gap-1 transition-colors">
                            <span className="text-lg">🔥</span>
                            <span className="text-xs font-bold text-green-300">消费热潮</span>
                        </button>
                        <button onClick={() => handleQuickIntervention("经济寒冬")} className="p-3 bg-slate-700 hover:bg-red-900/50 border border-slate-600 hover:border-red-500/50 rounded-lg flex flex-col items-center gap-1 transition-colors">
                            <span className="text-lg">📉</span>
                            <span className="text-xs font-bold text-red-300">经济寒冬</span>
                        </button>
                        <button onClick={() => handleQuickIntervention("网红探店")} className="p-3 bg-slate-700 hover:bg-purple-900/50 border border-slate-600 hover:border-purple-500/50 rounded-lg flex flex-col items-center gap-1 transition-colors">
                            <span className="text-lg">📸</span>
                            <span className="text-xs font-bold text-purple-300">网红探店</span>
                        </button>
                        <button onClick={() => handleQuickIntervention("原料涨价")} className="p-3 bg-slate-700 hover:bg-orange-900/50 border border-slate-600 hover:border-orange-500/50 rounded-lg flex flex-col items-center gap-1 transition-colors">
                            <span className="text-lg">🏭</span>
                            <span className="text-xs font-bold text-orange-300">原料涨价</span>
                        </button>
                    </div>

                    {/* Manual List */}
                    <details className="group border-t border-slate-700 pt-2">
                        <summary className="flex items-center justify-between text-xs font-bold text-slate-400 cursor-pointer p-2 hover:bg-slate-800 rounded-lg select-none">
                            <span>手动选择特定事件 (列表)</span>
                            <ChevronDown size={14} className="group-open:rotate-180 transition-transform"/>
                        </summary>
                        <div className="mt-2 grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                            {GAME_EVENTS.slice(0, 16).map(evt => (
                                <button key={evt.id} onClick={() => props.onSetEvent(evt)} className="text-left text-[10px] p-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded truncate transition-colors text-slate-300">
                                    {evt.name}
                                </button>
                            ))}
                        </div>
                    </details>
                </div>

                {/* 5. COMMUNICATION & REPORT */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-lg font-black text-pink-300 mb-4 flex items-center gap-2"><Mic size={20}/> 广播与报表</h3>
                    
                    <div className="flex gap-2 mb-4">
                        <input 
                            value={broadcastMsg}
                            onChange={(e) => setBroadcastMsg(e.target.value)}
                            placeholder="输入语音通知内容..."
                            className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:border-pink-500 focus:outline-none"
                        />
                        <button onClick={handleBroadcast} className="bg-pink-600 hover:bg-pink-500 text-white px-4 rounded-lg font-bold transition-colors"><Send size={16}/></button>
                    </div>
                    
                    <div className="flex gap-2 mb-6">
                        <button onClick={() => {speakAnnouncement("倒计时30秒！", props.ageGroup); p2p.broadcastEvent("倒计时30秒！")}} className="flex-1 py-1.5 bg-slate-700 hover:bg-slate-600 text-pink-200 text-xs font-bold rounded border border-slate-600">30s 提醒</button>
                        <button onClick={() => {speakAnnouncement("交易结束，请停止操作！", props.ageGroup); p2p.broadcastEvent("交易结束！")}} className="flex-1 py-1.5 bg-slate-700 hover:bg-slate-600 text-pink-200 text-xs font-bold rounded border border-slate-600">结束提醒</button>
                    </div>

                    <button onClick={handleReport} className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 border border-slate-600 transition-colors">
                        <FileText size={18}/> 生成全场经营报告
                    </button>
                </div>

            </div>
        </div>

        {/* REPORT MODAL */}
        {reportModal && (
            <div className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-8">
                <div className="bg-white w-full max-w-4xl h-5/6 rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                    <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2"><FileText size={20}/> 经营分析报告</h3>
                        <button onClick={() => setReportModal(false)} className="p-2 hover:bg-gray-200 rounded-full"><X/></button>
                    </div>
                    <div className="flex-1 p-8 overflow-y-auto prose max-w-none bg-white">
                        {isGenReport ? 
                            <div className="flex flex-col items-center justify-center h-full gap-4 text-indigo-600">
                                <RefreshCw className="animate-spin w-10 h-10"/> 
                                <p className="font-bold">AI 正在分析全场数据，请稍候...</p>
                            </div> 
                            : <ReactMarkdown>{reportText}</ReactMarkdown>
                        }
                    </div>
                    <div className="p-4 border-t bg-gray-50 flex justify-end">
                        <button onClick={() => setReportModal(false)} className="px-6 py-2 bg-slate-800 text-white rounded-lg font-bold">关闭</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default TeacherView;