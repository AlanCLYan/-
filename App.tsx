
import React, { useState, useEffect } from 'react';
import { QUESTIONS, getRank } from './constants';
import { analyzeFriendship } from './services/geminiService';
import { firebaseService } from './services/firebaseService';
import { AppStep, QuizState, SavedRecord } from './types';

const ADMIN_PASSWORD = "2025";

const App: React.FC = () => {
  const [state, setState] = useState<QuizState>({
    currentStep: 'intro',
    currentIndex: 0,
    score: 0,
    selectedOption: null,
    showExplanation: false,
    userAnswers: [],
  });

  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [adminPassInput, setAdminPassInput] = useState("");
  const [loginError, setLoginError] = useState(false);
  const [records, setRecords] = useState<SavedRecord[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 初次載入或進入後台時更新資料
  const refreshRecords = async () => {
    setIsLoadingRecords(true);
    try {
      const data = await firebaseService.getAllRecords();
      setRecords(data);
    } catch (error) {
      console.error("Refresh Records Error:", error);
    } finally {
      setIsLoadingRecords(false);
    }
  };

  const currentQuestion = QUESTIONS[state.currentIndex];

  const handleStart = () => {
    setState(prev => ({ ...prev, currentStep: 'quiz' }));
  };

  // 優化儲存邏輯：背景儲存
  const saveToCloud = async (finalScore: number) => {
    const newRecord = {
      timestamp: new Date().toLocaleString('zh-TW'),
      score: finalScore,
      totalQuestions: QUESTIONS.length,
      rankTitle: getRank(finalScore).title
    };
    try {
      await firebaseService.saveRecord(newRecord);
    } catch (e) {
      console.warn("Cloud save deferred or failed:", e);
    }
  };

  const handleOptionClick = (idx: number) => {
    if (state.showExplanation) return;
    
    const isCorrect = idx === currentQuestion.correct;
    setState(prev => ({
      ...prev,
      selectedOption: idx,
      score: isCorrect ? prev.score + 1 : prev.score,
      showExplanation: true,
      userAnswers: [...prev.userAnswers, { questionId: currentQuestion.id, isCorrect }]
    }));
  };

  const handleNext = async () => {
    if (state.currentIndex < QUESTIONS.length - 1) {
      setState(prev => ({
        ...prev,
        currentIndex: prev.currentIndex + 1,
        selectedOption: null,
        showExplanation: false
      }));
    } else {
      // 關鍵修復：先換頁，再儲存
      const finalScore = state.score;
      setState(prev => ({ ...prev, currentStep: 'result' }));
      
      // 在背景儲存，不阻礙 UI 切換
      setIsSaving(true);
      saveToCloud(finalScore).finally(() => setIsSaving(false));
    }
  };

  const triggerAIAnalysis = async () => {
    setIsAnalyzing(true);
    setState(prev => ({ ...prev, currentStep: 'ai-analysis' }));
    const result = await analyzeFriendship(state.score, QUESTIONS.length);
    setAiAnalysis(result || "分析失敗，但你們的默契我們都看在眼底。");
    setIsAnalyzing(false);
  };

  const handleReset = () => {
    setState({
      currentStep: 'intro',
      currentIndex: 0,
      score: 0,
      selectedOption: null,
      showExplanation: false,
      userAnswers: [],
    });
    setAiAnalysis(null);
    setAdminPassInput("");
    setLoginError(false);
  };

  const handleAdminLogin = async () => {
    if (adminPassInput === ADMIN_PASSWORD) {
      setState(prev => ({ ...prev, currentStep: 'admin-dashboard' }));
      setLoginError(false);
      await refreshRecords();
    } else {
      setLoginError(true);
    }
  };

  const deleteRecord = async (id: string) => {
    const success = await firebaseService.deleteRecord(id);
    if (success) {
      setRecords(prev => prev.filter(r => r.id !== id));
    }
  };

  return (
    <div className="flex flex-col items-center justify-start sm:justify-center p-4 sm:p-8 min-h-screen transition-all duration-500 relative">
      
      {/* 右上角後台登入入口 */}
      {state.currentStep === 'intro' && (
        <div className="absolute top-6 right-6 z-50">
          <button 
            onClick={() => setState(prev => ({ ...prev, currentStep: 'admin-login' }))}
            className="flex items-center gap-2 px-4 py-2 bg-white/40 backdrop-blur-md rounded-full shadow-sm hover:bg-white transition-all text-slate-500 hover:text-indigo-600 border border-white/50 font-bold text-sm"
          >
            <span>🔒 管理後台</span>
          </button>
        </div>
      )}

      <div className="w-full max-w-xl bg-white/90 backdrop-blur-lg rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl border border-white/50 overflow-hidden flex flex-col my-4 sm:my-0">
        
        {state.currentStep === 'quiz' && (
          <div className="h-1.5 w-full bg-indigo-100/50">
            <div 
              className="h-full bg-indigo-600 transition-all duration-500 ease-out"
              style={{ width: `${((state.currentIndex + (state.showExplanation ? 1 : 0)) / QUESTIONS.length) * 100}%` }}
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto max-h-[85vh] scrollbar-hide">
          
          {state.currentStep === 'intro' && (
            <div className="p-8 sm:p-12 text-center animate-in fade-in zoom-in duration-700">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-indigo-600 text-white rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl rotate-3 animate-float">
                <span className="text-4xl sm:text-5xl">🎓</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black mb-4 text-slate-900 tracking-tight leading-tight">
                張詠婷專屬<br/><span className="text-indigo-600">時光記憶大考驗</span>
              </h1>
              <p className="text-slate-500 mb-10 text-base sm:text-lg leading-relaxed">
                這份考卷橫跨了 2022 到 2025 年，<br/>
                裝載了無數關於「群倫」的細節。<br/>
                詠婷，準備好證明你的友誼了嗎？
              </p>
              <button 
                onClick={handleStart}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 sm:py-5 rounded-2xl transition-all shadow-lg active:scale-95"
              >
                開始測驗
              </button>
            </div>
          )}

          {state.currentStep === 'admin-login' && (
            <div className="p-8 sm:p-12 animate-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-2xl font-bold mb-2 text-slate-900">雲端後台驗證</h2>
              <p className="text-slate-400 text-sm mb-8">請輸入密碼以同步最新的填答數據</p>
              <div className="space-y-6">
                <div>
                  <input 
                    type="password" 
                    value={adminPassInput}
                    onChange={(e) => {
                      setAdminPassInput(e.target.value);
                      setLoginError(false);
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                    className={`w-full p-5 rounded-2xl border-2 text-center text-2xl tracking-widest transition-all outline-none ${loginError ? 'border-rose-300 bg-rose-50' : 'border-slate-100 focus:border-indigo-500 focus:bg-white bg-slate-50'}`}
                    placeholder="••••"
                    autoFocus
                  />
                  {loginError && <p className="text-rose-500 text-xs mt-3 text-center font-bold">密碼錯誤，請檢查後再試</p>}
                </div>
                <div className="flex gap-3">
                  <button onClick={handleReset} className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-xl font-bold hover:bg-slate-200 transition-all">取消</button>
                  <button onClick={handleAdminLogin} className="flex-[2] bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg">登入後台</button>
                </div>
              </div>
            </div>
          )}

          {state.currentStep === 'admin-dashboard' && (
            <div className="p-6 sm:p-8 animate-in fade-in duration-500">
              <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
                <div className="flex flex-col">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    📊 雲端分析看板
                  </h2>
                  {isLoadingRecords && <span className="text-[10px] text-indigo-500 font-bold animate-pulse">SYNCING WITH FIREBASE...</span>}
                </div>
                <div className="flex gap-2">
                  <button onClick={refreshRecords} className="text-indigo-600 text-xs font-bold px-3 py-2 rounded-lg hover:bg-indigo-50">重整</button>
                  <button onClick={handleReset} className="bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-slate-800 transition-all">離開</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100">
                  <p className="text-[10px] text-indigo-400 font-bold uppercase mb-1">全球累積填答</p>
                  <p className="text-3xl font-black text-indigo-600">{records.length}</p>
                </div>
                <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100">
                  <p className="text-[10px] text-emerald-400 font-bold uppercase mb-1">平均正確率</p>
                  <p className="text-3xl font-black text-emerald-600">
                    {records.length > 0 
                      ? Math.round((records.reduce((acc, r) => acc + r.score, 0) / (records.length * QUESTIONS.length)) * 100)
                      : 0}%
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">雲端資料明細</h3>
                {records.length === 0 && !isLoadingRecords ? (
                  <div className="text-center py-16 bg-slate-50 rounded-2xl text-slate-400 border-2 border-dashed border-slate-200">
                    目前雲端尚無資料
                  </div>
                ) : (
                  records.map(record => (
                    <div key={record.id} className="group p-4 bg-white border border-slate-100 rounded-2xl hover:shadow-md transition-all">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">
                          {record.timestamp}
                        </span>
                        <button 
                          onClick={() => deleteRecord(record.id)}
                          className="text-slate-300 hover:text-rose-500 transition-colors"
                        >
                          <span className="text-sm">🗑️</span>
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-black text-slate-800">{record.score * 5} 分</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${record.score >= 15 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                              {record.score}/{record.totalQuestions}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">{record.rankTitle}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {state.currentStep === 'quiz' && (
            <div className="p-6 sm:p-10 animate-in slide-in-from-right-10 duration-500">
              <div className="flex justify-between items-center mb-8">
                <span className="text-[10px] sm:text-xs font-black tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg uppercase">
                  {currentQuestion.year}
                </span>
                <span className="text-slate-400 font-bold bg-slate-50 px-2 py-1 rounded-md text-[10px] sm:text-xs">
                  {state.currentIndex + 1} / {QUESTIONS.length}
                </span>
              </div>
              
              <h2 className="text-lg sm:text-xl font-bold mb-8 text-slate-900 leading-snug">
                {currentQuestion.question}
              </h2>

              <div className="space-y-3 sm:space-y-4">
                {currentQuestion.options.map((option, idx) => {
                  const isSelected = state.selectedOption === idx;
                  const isCorrect = idx === currentQuestion.correct;
                  const showResult = state.showExplanation;

                  return (
                    <button
                      key={idx}
                      onClick={() => handleOptionClick(idx)}
                      className={`w-full p-4 sm:p-5 rounded-2xl text-left border-2 transition-all duration-300 flex items-center justify-between group ${
                        !showResult 
                          ? 'border-slate-100 hover:border-indigo-400 hover:bg-indigo-50/30' 
                          : isCorrect
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-4 ring-emerald-500/10'
                            : isSelected
                              ? 'border-rose-500 bg-rose-50 text-rose-900 ring-4 ring-rose-500/10'
                              : 'border-slate-50 opacity-40 grayscale-[0.5]'
                      }`}
                      disabled={showResult}
                    >
                      <span className="font-bold text-sm sm:text-base leading-tight pr-4">{option}</span>
                      {showResult && isCorrect && <span className="text-xl">✅</span>}
                      {showResult && isSelected && !isCorrect && <span className="text-xl">❌</span>}
                    </button>
                  );
                })}
              </div>

              {state.showExplanation && (
                <div className="mt-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className={`p-5 rounded-2xl mb-6 shadow-sm border ${
                    state.selectedOption === currentQuestion.correct 
                      ? 'bg-emerald-100/50 border-emerald-200 text-emerald-900' 
                      : 'bg-rose-100/50 border-rose-200 text-rose-900'
                  }`}>
                    <p className="font-bold text-sm mb-1 uppercase tracking-wider opacity-60">時光回顧</p>
                    <p className="text-sm sm:text-base leading-relaxed font-medium">
                      {currentQuestion.explanation}
                    </p>
                  </div>
                  <button 
                    onClick={handleNext}
                    className="w-full bg-slate-900 text-white py-4 sm:py-5 rounded-2xl font-black text-lg hover:bg-slate-800 transition-all active:scale-[0.98] shadow-lg shadow-slate-200 flex items-center justify-center"
                  >
                    {state.currentIndex === QUESTIONS.length - 1 ? '揭曉總結' : '下一題'}
                  </button>
                </div>
              )}
            </div>
          )}

          {state.currentStep === 'result' && (
            <div className="p-10 text-center animate-in zoom-in duration-500">
              <div className="text-7xl mb-6 drop-shadow-lg">{getRank(state.score).icon}</div>
              <h2 className="text-6xl font-black mb-2 text-indigo-600 tracking-tighter">
                {state.score * 5}
              </h2>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-2">Final Score</p>
              {isSaving && <p className="text-[10px] text-indigo-400 animate-pulse font-bold mb-4 uppercase">Syncing memory to cloud...</p>}
              
              <div className="inline-block bg-indigo-50 text-indigo-600 px-6 py-2 rounded-full text-xl font-black mb-8">
                {getRank(state.score).title}
              </div>
              <p className="text-slate-500 mb-10 text-base sm:text-lg leading-relaxed max-w-xs mx-auto">
                詠婷，妳在 20 題中答對了 {state.score} 題。<br/>
                <span className="text-slate-800 font-medium italic mt-2 block">
                  「{getRank(state.score).description}」
                </span>
              </p>
              
              <div className="grid grid-cols-1 gap-4">
                <button 
                  onClick={triggerAIAnalysis}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-indigo-200 flex items-center justify-center gap-2 group transition-all active:scale-95"
                >
                  <span>🤖</span> 生成 Gemini 友誼分析報告
                </button>
                <button 
                  onClick={handleReset}
                  className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                >
                  回首頁重新測驗
                </button>
              </div>
            </div>
          )}

          {state.currentStep === 'ai-analysis' && (
            <div className="p-8 sm:p-10 text-center animate-in fade-in duration-700">
              <div className="mb-8 flex justify-center">
                 <div className={`w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center ${isAnalyzing ? 'animate-pulse' : ''} shadow-inner`}>
                   <span className="text-4xl">🤖</span>
                 </div>
              </div>
              
              <h3 className="text-xl font-black mb-6 text-slate-900">
                {isAnalyzing ? "正在解析你們的時光記憶..." : "Gemini 友誼鑑定證書"}
              </h3>

              {isAnalyzing ? (
                <div className="space-y-4 px-4">
                  <div className="h-3 bg-slate-100 rounded-full w-full animate-pulse" />
                  <div className="h-3 bg-slate-100 rounded-full w-5/6 mx-auto animate-pulse" />
                  <div className="h-3 bg-slate-100 rounded-full w-4/6 mx-auto animate-pulse" />
                  <p className="text-xs text-slate-400 mt-10 font-medium animate-bounce">正在回憶關於 2022 的小故事...</p>
                </div>
              ) : (
                <div className="bg-indigo-50/50 border-2 border-indigo-100 p-6 sm:p-8 rounded-[2rem] text-left mb-10 relative">
                  <span className="absolute -top-3 -left-1 text-5xl text-indigo-200 opacity-50 font-serif">“</span>
                  <p className="text-indigo-900 leading-loose text-base sm:text-lg whitespace-pre-wrap font-medium">
                    {aiAnalysis}
                  </p>
                  <div className="mt-8 pt-6 border-t border-indigo-100 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-indigo-400 tracking-widest uppercase">Verified by Gemi AI</span>
                      <span className="text-[10px] text-slate-400">Cloud Sync Active</span>
                    </div>
                    <span className="text-[10px] font-black bg-indigo-600 text-white px-2 py-1 rounded">OFFICIAL</span>
                  </div>
                </div>
              )}

              {!isAnalyzing && (
                <button 
                  onClick={handleReset}
                  className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg hover:bg-slate-800 shadow-xl active:scale-95"
                >
                  測驗結束，回到首頁
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      
      <footer className="mt-8 text-slate-400 text-[10px] sm:text-xs font-bold flex items-center gap-2 tracking-widest uppercase opacity-60">
        <span>Made for 詠婷 & 群倫</span>
        <span className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
        <span>Firebase Cloud Sync</span>
      </footer>
    </div>
  );
};

export default App;
