
import React, { useState, useEffect, useRef } from 'react';
import { GameState, FoodItem, QuizResult, LeaderboardEntry, Difficulty } from './types.ts';
import { TOTAL_ROUNDS, FOOD_CATEGORIES } from './constants.ts';
import { generateFoodItem, verifyAnswer } from './services/geminiService.ts';
import { Button } from './components/Button.tsx';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const [currentRound, setCurrentRound] = useState(1);
  const [score, setScore] = useState(0);
  const [currentFood, setCurrentFood] = useState<FoodItem | null>(null);
  const [userGuess, setUserGuess] = useState("");
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [isFirstAttempt, setIsFirstAttempt] = useState(true);
  const [showHint, setShowHint] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userName, setUserName] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);

  const usedFoodNames = useRef<string[]>([]);
  const [queuedFood, setQueuedFood] = useState<FoodItem | null>(null);
  const isPreFetching = useRef(false);

  const loadingMessages = [
    "맛있는 냄새를 따라가는 중...",
    "신선한 재료로 요리를 완성하고 있어요.",
    "접시에 정성을 가득 담는 중입니다.",
    "전 세계 맛집 지도를 펼치고 있어요.",
    "주방장님이 최고의 비법 소스를 뿌리고 있습니다."
  ];

  useEffect(() => {
    const saved = localStorage.getItem('gourmet_leaderboard');
    if (saved) {
      try {
        setLeaderboard(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse leaderboard", e);
      }
    }
  }, []);

  const preFetchNextFood = async (targetDifficulty: Difficulty) => {
    if (isPreFetching.current) return;
    isPreFetching.current = true;
    try {
      const category = FOOD_CATEGORIES[Math.floor(Math.random() * FOOD_CATEGORIES.length)];
      const exclude = [...usedFoodNames.current];
      if (currentFood) exclude.push(currentFood.name);
      
      const food = await generateFoodItem(category, targetDifficulty, exclude);
      setQueuedFood(food);
    } catch (error) {
      console.error("Pre-fetch failed", error);
    } finally {
      isPreFetching.current = false;
    }
  };

  const saveToLeaderboard = (finalScore: number) => {
    const name = userName.trim() || "익명의 미식가";
    const newEntry: LeaderboardEntry = {
      name,
      score: finalScore,
      difficulty,
      date: new Date().toLocaleDateString('ko-KR')
    };
    const updated = [...leaderboard, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    setLeaderboard(updated);
    localStorage.setItem('gourmet_leaderboard', JSON.stringify(updated));
  };

  const startGame = async (selectedDifficulty: Difficulty) => {
    setDifficulty(selectedDifficulty);
    setScore(0);
    setCurrentRound(1);
    setQueuedFood(null);
    usedFoodNames.current = [];
    loadNextRound(selectedDifficulty, 1);
  };

  const loadNextRound = async (activeDifficulty: Difficulty = difficulty, roundNum: number = currentRound) => {
    setGameState(GameState.LOADING);
    setQuizResult(null);
    setUserGuess("");
    setIsFirstAttempt(true);
    setShowHint(false);
    
    setLoadingMessage(loadingMessages[Math.floor(Math.random() * loadingMessages.length)]);

    if (queuedFood) {
      setCurrentFood(queuedFood);
      usedFoodNames.current.push(queuedFood.name);
      setQueuedFood(null);
      setGameState(GameState.PLAYING);
      if (roundNum < TOTAL_ROUNDS) {
        preFetchNextFood(activeDifficulty);
      }
      return;
    }

    try {
      const category = FOOD_CATEGORIES[Math.floor(Math.random() * FOOD_CATEGORIES.length)];
      const food = await generateFoodItem(category, activeDifficulty, usedFoodNames.current);
      setCurrentFood(food);
      usedFoodNames.current.push(food.name);
      setGameState(GameState.PLAYING);
      
      if (roundNum < TOTAL_ROUNDS) {
        preFetchNextFood(activeDifficulty);
      }
    } catch (error) {
      console.error(error);
      setGameState(GameState.IDLE);
    }
  };

  const handleGuessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userGuess.trim() || !currentFood) return;

    setGameState(GameState.LOADING);
    setLoadingMessage("주방장이 채점 중입니다...");

    try {
      const result = await verifyAnswer(currentFood.name, userGuess);
      
      if (result.isCorrect) {
        setQuizResult(result);
        setScore(prev => prev + 1);
        setGameState(GameState.RESULT);
      } else {
        if (isFirstAttempt) {
          setIsFirstAttempt(false);
          setShowHint(true);
          setGameState(GameState.PLAYING);
          setUserGuess("");
        } else {
          setQuizResult(result);
          setGameState(GameState.RESULT);
        }
      }
    } catch (error) {
      setGameState(GameState.RESULT);
      setQuizResult({ isCorrect: false, feedback: "채점 중 오류가 발생했습니다." });
    }
  };

  const handleFinish = () => {
    saveToLeaderboard(score);
    setGameState(GameState.FINISHED);
  };

  const getDifficultyLabel = (diff: Difficulty) => {
    switch (diff) {
      case Difficulty.EASY: return "쉬움";
      case Difficulty.MEDIUM: return "중간";
      case Difficulty.HARD: return "어려움";
    }
  };

  const getDifficultyColor = (diff: Difficulty) => {
    switch (diff) {
      case Difficulty.EASY: return "bg-green-500 hover:bg-green-600 shadow-green-100";
      case Difficulty.MEDIUM: return "bg-orange-500 hover:bg-orange-600 shadow-orange-100";
      case Difficulty.HARD: return "bg-red-500 hover:bg-red-600 shadow-red-100";
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFBF0] flex flex-col items-center p-4 md:p-8 overflow-x-hidden relative">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-50px] right-[-50px] text-8xl opacity-10 rotate-12">🍔</div>
        <div className="absolute bottom-[-50px] left-[-50px] text-8xl opacity-10 -rotate-12">🥗</div>
      </div>

      <header className="w-full max-w-2xl mb-8 text-center relative z-10">
        <h1 className="text-4xl md:text-6xl font-black text-orange-600 mb-2 italic drop-shadow-sm tracking-tight">
          GOURMET <span className="text-amber-500 underline decoration-orange-200">QUEST</span>
        </h1>
        <p className="text-amber-800/70 font-bold bg-white/50 inline-block px-4 py-1 rounded-full backdrop-blur-sm">
          미식가를 위한 10단계 챌린지
        </p>
      </header>

      <main className="w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl shadow-orange-200/50 overflow-hidden relative border-4 border-orange-50 min-h-[600px] flex flex-col z-10">
        
        {(gameState === GameState.PLAYING || gameState === GameState.RESULT || gameState === GameState.LOADING) && (
          <div className="w-full h-3 bg-orange-100/50 flex overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all duration-1000 ease-out relative" 
              style={{ width: `${(currentRound / TOTAL_ROUNDS) * 100}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
            </div>
          </div>
        )}

        <div className="p-6 md:p-10 flex-1 flex flex-col">
          
          {gameState === GameState.IDLE && (
            <div className="text-center space-y-8 my-auto animate-in fade-in slide-in-from-bottom-6 duration-700">
              <div className="relative inline-block group">
                <div className="text-[10rem] drop-shadow-2xl transition-transform duration-500 group-hover:scale-110">🍛</div>
              </div>
              <div className="space-y-6">
                <h2 className="text-3xl md:text-4xl font-black text-slate-800 leading-tight">
                  <span className="text-orange-500">난이도</span>를 선택하세요!
                </h2>
                <div className="max-w-sm mx-auto space-y-4">
                  <input 
                    type="text" 
                    placeholder="닉네임을 입력하세요"
                    className="w-full px-6 py-4 rounded-2xl border-2 border-orange-100 focus:border-orange-500 outline-none text-center font-bold text-slate-700 transition-all shadow-inner"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => startGame(Difficulty.EASY)} className={`py-4 rounded-2xl text-white font-black transition-all active:scale-95 ${getDifficultyColor(Difficulty.EASY)}`}>쉬움</button>
                    <button onClick={() => startGame(Difficulty.MEDIUM)} className={`py-4 rounded-2xl text-white font-black transition-all active:scale-95 ${getDifficultyColor(Difficulty.MEDIUM)}`}>중간</button>
                    <button onClick={() => startGame(Difficulty.HARD)} className={`py-4 rounded-2xl text-white font-black transition-all active:scale-95 ${getDifficultyColor(Difficulty.HARD)}`}>어려움</button>
                  </div>
                  <button 
                    onClick={() => setGameState(GameState.RANKING)}
                    className="flex items-center justify-center gap-2 mx-auto text-orange-400 font-bold hover:text-orange-600 transition-colors py-2"
                  >
                    <span>🏆</span> 순위표 확인
                  </button>
                </div>
              </div>
            </div>
          )}

          {gameState === GameState.LOADING && (
            <div className="text-center space-y-12 my-auto py-10">
              <div className="relative mx-auto w-36 h-36">
                <div className="absolute inset-0 border-8 border-orange-50 rounded-full"></div>
                <div className="absolute inset-0 border-8 border-orange-500 rounded-full border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-5xl animate-bounce">🍳</div>
              </div>
              <p className="text-2xl font-black text-slate-700">{loadingMessage}</p>
            </div>
          )}

          {gameState === GameState.RANKING && (
            <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
              <h2 className="text-3xl font-black text-center text-slate-800 flex items-center justify-center gap-3">
                <span className="text-4xl">👑</span> 명예의 전당
              </h2>
              <div className="bg-orange-50/50 backdrop-blur-sm rounded-[2rem] p-6 space-y-3 border-2 border-orange-100 shadow-inner max-h-[400px] overflow-y-auto">
                {leaderboard.length === 0 ? (
                  <p className="text-center text-slate-400 py-16 font-medium">아직 등록된 전설이 없습니다.</p>
                ) : (
                  leaderboard.map((entry, idx) => (
                    <div key={idx} className={`flex items-center justify-between p-4 rounded-2xl transition-all ${idx === 0 ? 'bg-amber-100 border-2 border-amber-400' : 'bg-white border border-slate-100'}`}>
                      <div className="flex items-center gap-4">
                        <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${idx === 0 ? 'bg-amber-400 text-white' : 'bg-slate-100 text-slate-400'}`}>
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-black text-slate-800">{entry.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{entry.difficulty} • {entry.date}</p>
                        </div>
                      </div>
                      <div className="bg-orange-600/10 px-4 py-1 rounded-full">
                        <span className="text-xl font-black text-orange-600">{entry.score}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <Button onClick={() => setGameState(GameState.IDLE)} variant="secondary" className="w-full rounded-2xl py-4">홈으로</Button>
            </div>
          )}

          {(gameState === GameState.PLAYING || gameState === GameState.RESULT) && currentFood && (
            <div className="flex flex-col h-full space-y-6">
              <div className="relative">
                <div className="w-full aspect-video md:aspect-[4/3] rounded-[2rem] overflow-hidden shadow-2xl border-8 border-white bg-slate-100">
                  <img 
                    src={currentFood.imageUrl} 
                    className={`w-full h-full object-cover transition-all duration-1000 ${gameState === GameState.RESULT ? 'scale-100' : 'scale-110'}`}
                    alt="Food Quiz"
                  />
                  {gameState === GameState.RESULT && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-8 text-white">
                      <h3 className="text-4xl md:text-5xl font-black mb-3 tracking-tighter">{currentFood.name}</h3>
                      <p className="text-sm md:text-base opacity-90 font-medium bg-black/20 p-3 rounded-xl backdrop-blur-sm">{currentFood.description}</p>
                    </div>
                  )}
                </div>
                <div className="absolute top-6 left-6 bg-white/95 backdrop-blur-md px-5 py-2 rounded-2xl shadow-xl flex items-center gap-3">
                  <span className="bg-orange-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-sm">{currentRound}</span>
                  <span className="text-slate-500 text-xs font-black uppercase">{getDifficultyLabel(difficulty)}</span>
                </div>
              </div>

              {gameState === GameState.PLAYING ? (
                <div className="space-y-4">
                  {showHint && (
                    <div className="bg-amber-50 border-2 border-amber-200 p-5 rounded-2xl flex gap-4 items-start shadow-sm animate-in slide-in-from-left-4">
                      <span className="text-3xl">💡</span>
                      <div>
                        <p className="text-amber-900 font-black text-sm mb-1 uppercase tracking-tighter">셰프의 힌트</p>
                        <p className="text-amber-800 font-bold leading-snug">{currentFood.hint}</p>
                      </div>
                    </div>
                  )}
                  <form onSubmit={handleGuessSubmit} className="space-y-4">
                    <input
                      autoFocus
                      type="text"
                      value={userGuess}
                      onChange={(e) => setUserGuess(e.target.value)}
                      placeholder={showHint ? "다시 도전하세요!" : "정답은 무엇일까요?"}
                      className="w-full px-8 py-5 rounded-[1.5rem] border-3 border-orange-100 focus:border-orange-500 outline-none text-2xl font-bold bg-slate-50 shadow-inner"
                    />
                    <Button type="submit" className="w-full py-6 text-2xl rounded-[1.5rem] shadow-xl font-black italic">
                      {showHint ? "마지막 기회!" : "정답 확인"}
                    </Button>
                  </form>
                </div>
              ) : (
                <div className={`flex-1 p-8 rounded-[2rem] text-center space-y-6 ${quizResult?.isCorrect ? 'bg-green-50/50 border-3 border-green-200' : 'bg-red-50/50 border-3 border-red-200'}`}>
                  <div className="space-y-3">
                    <div className="text-8xl">{quizResult?.isCorrect ? '🌟' : '🍛'}</div>
                    <h3 className={`text-3xl font-black ${quizResult?.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                      {quizResult?.isCorrect ? '천재적인 미각!' : '아쉬운 결과예요!'}
                    </h3>
                    <p className="text-slate-700 font-bold">{quizResult?.feedback}</p>
                  </div>
                  <Button 
                    onClick={() => {
                      if (currentRound < TOTAL_ROUNDS) {
                        setCurrentRound(prev => prev + 1);
                        loadNextRound(difficulty, currentRound + 1);
                      } else {
                        handleFinish();
                      }
                    }} 
                    className={`w-full py-6 text-2xl rounded-2xl font-black ${quizResult?.isCorrect ? 'bg-green-500' : 'bg-red-500'}`}
                  >
                    {currentRound < TOTAL_ROUNDS ? '다음 라운드로' : '최종 점수 확인'}
                  </Button>
                </div>
              )}
            </div>
          )}

          {gameState === GameState.FINISHED && (
            <div className="text-center space-y-12 my-auto animate-in zoom-in-90 duration-700">
              <div className="relative inline-block">
                <div className="text-[12rem] drop-shadow-2xl">🏅</div>
                <div className="absolute top-0 right-0 bg-orange-600 text-white w-20 h-20 rounded-full flex flex-col items-center justify-center font-black text-2xl border-4 border-white shadow-2xl rotate-12">
                  {score}
                </div>
              </div>
              
              <div className="space-y-6">
                <h2 className="text-4xl font-black text-slate-800 tracking-tighter">도전이 끝났습니다!</h2>
                <div className="bg-gradient-to-b from-orange-50 to-white p-8 rounded-[3rem] border-3 border-orange-100">
                  <p className="text-2xl text-slate-700 font-black mb-4">
                    <span className="text-orange-600 underline">{userName || "미식가"}</span>님 (난이도: {getDifficultyLabel(difficulty)})
                  </p>
                  <p className="text-lg text-slate-600 font-bold italic">
                    {score === 10 ? '👑 전설적인 미식의 신입니다!' : 
                     score >= 7 ? '👨‍🍳 훌륭한 미식 지식을 가지셨군요.' : 
                     '🍙 다양한 맛을 더 경험해볼까요?'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <Button onClick={() => setGameState(GameState.IDLE)} className="w-full py-6 text-2xl rounded-3xl font-black">다시 도전하기</Button>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="mt-12 py-6 text-orange-900/40 text-[10px] font-black tracking-[0.3em] uppercase flex flex-col items-center gap-2">
        <div className="h-px w-20 bg-orange-200"></div>
        <span>© 2025 AI GOURMET QUEST</span>
      </footer>
    </div>
  );
};

export default App;
