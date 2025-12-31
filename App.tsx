
import React, { useState, useEffect } from 'react';
import { QUESTIONS, getRank } from './constants';
import { analyzeFriendship } from './services/geminiService';
import { AppStep, QuizState, SavedRecord } from './types';

const ADMIN_PASSWORD = "2025";
const STORAGE_KEY = "friendship_quiz_records";

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

  // Load records on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setRecords(JSON.parse(saved));
  }, []);

  const currentQuestion = QUESTIONS[state.currentIndex];

  const handleStart = () => {
    setState(prev => ({ ...prev, currentStep: 'quiz' }));
  };

  const saveRecord = (finalScore: number) => {
    const newRecord: SavedRecord = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleString('zh-TW'),
      score: finalScore,
      totalQuestions: QUESTIONS.length,
      rankTitle: getRank(finalScore).title
    };
    const updatedRecords = [newRecord, ...records];
    setRecords(updatedRecords);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRecords));
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

  const handleNext = () => {
    if (state.currentIndex < QUESTIONS.length - 1) {
      setState(prev => ({
        ...prev,
        currentIndex: prev.currentIndex + 1,
        selectedOption: null,
        showExplanation: false
      }));
    } else {
      const finalScore = state.score;
      saveRecord(finalScore);
      setState(prev => ({ ...prev, currentStep: 'result' }));
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

  const handleAdminLogin = () => {
    if (adminPassInput === ADMIN_PASSWORD) {
      setState(prev => ({ ...prev, currentStep: 'admin-dashboard' }));
      setLoginError(false);
    } else {
      setLoginError(true);
    }
  };

  const deleteRecord = (id: string) => {
    const updated = records.filter(r => r.id !== id);
    setRecords(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 sm:p-8 min-h-screen transition-all duration-500 relative">
      
      {/* Admin Entry Point */}
      {state.currentStep === 'intro' && (
        <button 
          onClick={() => setState(prev => ({ ...prev, currentStep: 'admin-login' }))}
          className="absolute top-6 right-6 w-10 h-10 bg-white/50 backdrop-blur rounded-full flex items-center justify-center shadow-sm hover:bg-white transition-all text-slate-400 hover:text-indigo-600 border border-white/50"
          aria-label="Admin Login"
        >
          <span className="text-lg">🔒</span>
        </button>
      )}

      <div className="w-full max-w-xl bg-white/80 backdrop-blur-md rounded-[2.5rem] shadow-2xl border border-white/50 overflow-hidden">
        
        {/* Progress Bar */}
        {state.currentStep === 'quiz' && (
          <div className="h-2 w-full bg-indigo-100">
            <div 
              className="h-full bg-indigo-600 transition-all duration-500 ease-out"
              style={{ width: `${((state.currentIndex + (state.showExplanation ? 1 : 0)) / QUESTIONS.length) * 100}%` }}
            />
          </div>
        )}

        {/* Intro Step */}
        {state.currentStep === 'intro' && (
          <div className="p-10 text-center animate-in fade-in zoom-in duration-700">
            <div className="w-24 h-24 bg-indigo-600 text-white rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-indigo-200 rotate-3 animate-float">
              <span className="text-5xl">🎓</span>
            </div>
            <h1 className="text-3xl font-black mb-4 text-slate-900 tracking-tight leading-tight">
              張詠婷專屬<br/><span className="text-indigo-600">時光記憶大考驗</span>
            </h1>
            <p className="text-slate-500 mb-10 text-lg leading-relaxed">
              這份考卷橫跨了 2022 到 2025 年，<br/>
              裝載了無數關於「群倫」的細節。<br/>
              詠婷，你準備好證明你的友誼了嗎？
            </p>
            <button 
              onClick={handleStart}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-5 rounded-2xl transition-all duration-300 transform hover:scale-[1.02] active:scale-95 shadow-lg"
            >
              開始考試
            </button>
          </div>
        )}

        {/* Admin Login */}
        {state.currentStep === 'admin-login' && (
          <div className="p-10 animate-in slide-in-from-top-4 duration-500">
            <h2 className="text-2xl font-bold mb-6 text-slate-900 flex items-center gap-2">
              管理員登入
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-2">請輸入存取密碼</label>
                <input 
                  type="password" 
                  value={adminPassInput}
                  onChange={(e) => {
                    setAdminPassInput(e.target.value);
                    setLoginError(false);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                  className={`w-full p-4 rounded-xl border-2 transition-all outline-none ${loginError ? 'border-rose-300 bg-rose-50' : 'border-slate-100 focus:border-indigo-500'}`}
                  placeholder="••••"
                />
                {loginError && <p className="text-rose-500 text-xs mt-2 font-bold">密碼錯誤，請再試一次</p>}
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={handleReset}
                  className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  取消
                </button>
                <button 
                  onClick={handleAdminLogin}
                  className="flex-[2] bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                >
                  登入後台
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Admin Dashboard */}
        {state.currentStep === 'admin-dashboard' && (
          <div className="p-8 max-h-[80vh] overflow-y-auto animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">後台紀錄平台</h2>
              <button 
                onClick={handleReset}
                className="text-indigo-600 text-sm font-bold bg-indigo-50 px-4 py-2 rounded-full hover:bg-indigo-100"
              >
                返回主頁
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                <p className="text-xs text-indigo-400 font-bold uppercase mb-1">總填答數</p>
                <p className="text-3xl font-black text-indigo-600">{records.length}</p>
              </div>
              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                <p className="text-xs text-emerald-400 font-bold uppercase mb-1">平均得分</p>
                <p className="text-3xl font-black text-emerald-600">
                  {records.length > 0 
                    ? Math.round((records.reduce((acc, r) => acc + r.score, 0) / records.length) * 5)
                    : 0}
                </p>
              </div>
            </div>

            {records.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <span className="text-4xl block mb-4">📭</span>
                目前尚無測驗紀錄
              </div>
            ) : (
              <div className="space-y-4">
                {records.map(record => (
                  <div key={record.id} className="group p-5 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-white hover:shadow-md transition-all relative">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-200 px-2 py-0.5 rounded uppercase">
                        {record.timestamp}
                      </span>
                      <button 
                        onClick={() => deleteRecord(record.id)}
                        className="opacity-0 group-hover:opacity-100 text-rose-500 text-xs font-bold hover:underline"
                      >
                        刪除
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-black text-slate-800">{record.score * 5} 分</p>
                        <p className="text-sm text-slate-500 font-medium">{record.rankTitle}</p>
                      </div>
                      <div className="text-slate-300 text-xs font-mono">
                        Correct: {record.score}/{record.totalQuestions}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quiz Step */}
        {state.currentStep === 'quiz' && (
          <div className="p-8 sm:p-10 animate-in slide-in-from-right-10 duration-500">
            <div className="flex justify-between items-center mb-8">
              <span className="text-sm font-black tracking-widest text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl uppercase">
                {currentQuestion.year}
              </span>
              <span className="text-slate-400 font-medium bg-slate-50 px-3 py-1 rounded-lg text-sm">
                Question {state.currentIndex + 1} / {QUESTIONS.length}
              </span>
            </div>
            
            <h2 className="text-xl sm:text-2xl font-bold mb-10 text-slate-900 leading-tight min-h-[4rem]">
              {currentQuestion.question}
            </h2>

            <div className="space-y-4">
              {currentQuestion.options.map((option, idx) => {
                const isSelected = state.selectedOption === idx;
                const isCorrect = idx === currentQuestion.correct;
                const showCorrect = state.showExplanation && isCorrect;
                const showWrong = state.showExplanation && isSelected && !isCorrect;

                return (
                  <button
                    key={idx}
                    onClick={() => handleOptionClick(idx)}
                    className={`w-full p-5 rounded-2xl text-left border-2 transition-all duration-300 flex items-center justify-between group ${
                      state.selectedOption === null 
                        ? 'border-slate-100 hover:border-indigo-400 hover:bg-indigo-50/50' 
                        : showCorrect
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-4 ring-emerald-500/10'
                          : showWrong
                            ? 'border-rose-500 bg-rose-50 text-rose-900 ring-4 ring-rose-500/10'
                            : 'border-slate-100 opacity-50 grayscale-[0.5]'
                    }`}
                    disabled={state.showExplanation}
                  >
                    <span className="font-semibold text-lg">{option}</span>
                    {state.showExplanation && isCorrect && <span className="text-2xl">✅</span>}
                    {state.showExplanation && isSelected && !isCorrect && <span className="text-2xl">❌</span>}
                  </button>
                );
              })}
            </div>

            {state.showExplanation && (
              <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className={`p-6 rounded-2xl mb-6 shadow-sm ${
                  state.selectedOption === currentQuestion.correct 
                    ? 'bg-emerald-100/50 border border-emerald-200 text-emerald-900' 
                    : 'bg-rose-100/50 border border-rose-200 text-rose-900'
                }`}>
                  <p className="font-bold text-lg mb-1">
                    {state.selectedOption === currentQuestion.correct ? '完美答對！' : '哎呀，記錯了...'}
                  </p>
                  <p className="opacity-90 leading-relaxed">
                    {currentQuestion.explanation}
                  </p>
                </div>
                <button 
                  onClick={handleNext}
                  className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg hover:bg-slate-800 transition-all transform hover:scale-[1.01] active:scale-95"
                >
                  {state.currentIndex === QUESTIONS.length - 1 ? '揭曉總分' : '下一題'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Result Step */}
        {state.currentStep === 'result' && (
          <div className="p-10 text-center animate-in zoom-in duration-500">
            <div className="text-7xl mb-4">{getRank(state.score).icon}</div>
            <h2 className="text-5xl font-black mb-4 text-indigo-600 drop-shadow-sm">
              {state.score * 5} <span className="text-2xl text-slate-400">/ 100</span>
            </h2>
            <div className="text-2xl font-bold mb-4 text-slate-800">{getRank(state.score).title}</div>
            <p className="text-slate-500 mb-10 text-lg leading-relaxed max-w-xs mx-auto">
              他在 20 題中答對了 {state.score} 題。<br/>
              {getRank(state.score).description}
            </p>
            
            <div className="grid grid-cols-1 gap-4">
              <button 
                onClick={triggerAIAnalysis}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-indigo-200 flex items-center justify-center gap-2 group transition-all"
              >
                <span>🤖</span> 啟動 Gemini AI 友誼分析
              </button>
              <button 
                onClick={handleReset}
                className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all"
              >
                再測一次
              </button>
            </div>
          </div>
        )}

        {/* AI Analysis Step */}
        {state.currentStep === 'ai-analysis' && (
          <div className="p-10 text-center animate-in fade-in duration-700">
            <div className="mb-8 flex justify-center">
               <div className={`w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center ${isAnalyzing ? 'animate-pulse' : ''}`}>
                 <span className="text-4xl">🤖</span>
               </div>
            </div>
            
            <h3 className="text-xl font-black mb-6 text-slate-900">
              {isAnalyzing ? "Gemini 正在回顧你們的點點滴滴..." : "Gemini 的友誼鑑定書"}
            </h3>

            {isAnalyzing ? (
              <div className="space-y-4">
                <div className="h-4 bg-slate-100 rounded-full w-full animate-pulse" />
                <div className="h-4 bg-slate-100 rounded-full w-5/6 animate-pulse" />
                <div className="h-4 bg-slate-100 rounded-full w-4/6 animate-pulse" />
                <p className="text-sm text-slate-400 mt-10 italic">正在提取關於 豆豆、Threads、紅樹林 的記憶...</p>
              </div>
            ) : (
              <div className="bg-indigo-50 border-2 border-indigo-100 p-8 rounded-[2rem] text-left mb-10 relative">
                <span className="absolute -top-4 -left-2 text-6xl text-indigo-200 opacity-50 font-serif">"</span>
                <p className="text-indigo-900 leading-loose text-lg whitespace-pre-wrap">
                  {aiAnalysis}
                </p>
                <div className="mt-8 pt-6 border-t border-indigo-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-400 tracking-widest uppercase">Certified by Gemi AI</span>
                  <span className="text-xs text-slate-400">2025.02 Memories</span>
                </div>
              </div>
            )}

            {!isAnalyzing && (
              <button 
                onClick={handleReset}
                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg hover:bg-slate-800 shadow-xl"
              >
                重回考卷首頁
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Footer Decoration */}
      <footer className="mt-12 text-slate-400 text-sm font-medium flex items-center gap-2">
        <span>Made with ❤️ for 詠婷 & 群倫</span>
        <span className="w-1 h-1 bg-slate-300 rounded-full" />
        <span>Powered by Gemini 3</span>
      </footer>
    </div>
  );
};

export default App;
