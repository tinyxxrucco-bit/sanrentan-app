import { useState, useEffect, useRef } from 'react';
import { Ticket, User, RefreshCcw, Loader2, Home, Trophy, AlertTriangle } from 'lucide-react';

const GAS_URL = "https://script.google.com/macros/s/AKfycbwtX_AClKM75keMMOzh0yevYHrqgOoNuun_Atc20mjmFs-pUD2x9vEOwnmhx5O8626f/exec";

export default function App() {
  const [appState, setAppState] = useState('home');
  const [questionsData, setQuestionsData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [currentQ, setCurrentQ] = useState(null);
  
  const [selections, setSelections] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  const [guestName, setGuestName] = useState(() => {
    return localStorage.getItem('wedding_guest_name') || '';
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [ticketImage, setTicketImage] = useState(null);
  const ticketRef = useRef(null);
  const [currentDateStr, setCurrentDateStr] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    setIsLoading(true);
    fetch(GAS_URL)
      .then(res => res.json())
      .then(data => {
        setQuestionsData(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("読み込みエラー:", err);
        setIsLoading(false);
      });
  };

  const handleStartVoting = (qId) => {
    setCurrentQ(qId);
    const savedTicket = localStorage.getItem(`wedding_ticket_${qId}`);
    
    if (savedTicket) {
      setTicketImage(savedTicket);
      setAppState('ticket');
    } else {
      setSelections([]);
      setAppState('voting');
    }
  };

  const handleSelect = (option) => {
    if (selections.length >= 3 || selections.some(s => s.id === option.id)) return;
    setSelections([...selections, option]);
  };

  const processGenerate = async () => {
    setShowConfirmModal(false);
    setIsGenerating(true);

    localStorage.setItem('wedding_guest_name', guestName);
    
    const userSelections = selections.map(s => s.id);
    localStorage.setItem(`wedding_ans_${currentQ}`, JSON.stringify(userSelections));

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    setCurrentDateStr(`${year}.${month}.${day}`);

    await new Promise(resolve => setTimeout(resolve, 300));

    if (ticketRef.current) {
      try {
        const svgElement = ticketRef.current;
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const URL = window.URL || window.webkitURL || window;
        const blobURL = URL.createObjectURL(svgBlob);

        const image = new Image();
        image.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 1200;
          canvas.height = 700;
          const ctx = canvas.getContext('2d');
          ctx.scale(2, 2);
          ctx.drawImage(image, 0, 0);

          const imageData = canvas.toDataURL('image/png');
          setTicketImage(imageData);
          localStorage.setItem(`wedding_ticket_${currentQ}`, imageData);
          setAppState('ticket');
          URL.revokeObjectURL(blobURL);
          setIsGenerating(false);
        };
        image.onerror = (err) => {
          console.error("SVG変換エラー:", err);
          setIsGenerating(false);
        };
        image.src = blobURL;
      } catch (err) {
        console.error("生成処理エラー:", err);
        setIsGenerating(false);
      }
    }
  };

  const currentData = currentQ ? questionsData[currentQ] : null;

  const checkIsHit = () => {
    if (!currentData || currentData.status !== 'announced' || !currentData.answer) {
      return false;
    }
    const savedAns = localStorage.getItem(`wedding_ans_${currentQ}`);
    if (!savedAns) return false;
    
    const userAns = JSON.parse(savedAns).map(String);
    const correctAns = currentData.answer.map(String);
    return JSON.stringify(userAns) === JSON.stringify(correctAns);
  };

  const isAnnounced = currentData?.status === 'announced';
  const isHit = checkIsHit();

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 font-sans pb-10">
      
      {/* 画面1：トップページ */}
      {appState === 'home' && (
        <div className="max-w-md mx-auto pt-12 px-4 flex flex-col items-center">
          <div className="bg-emerald-800 text-white w-full py-6 rounded-t-xl text-center shadow-lg">
            <h1 className="text-2xl font-black mb-1">〇〇 & 〇〇</h1>
            <h2 className="text-xl font-bold tracking-widest">WEDDING STAKES</h2>
          </div>
          <div className="bg-white w-full p-6 rounded-b-xl shadow-lg mb-8 text-center">
            <p className="text-gray-600 font-bold mb-2">3連単を予想して豪華景品を GET!</p>
          </div>
          
          {isLoading ? (
            <div className="flex flex-col items-center text-emerald-600 my-10">
              <Loader2 className="animate-spin mb-2" size={32} />
              <p className="font-bold">オッズを取得中...</p>
            </div>
          ) : (
            <div className="w-full space-y-4">
              {Object.keys(questionsData).sort().map((qId) => {
                const isFinished = localStorage.getItem(`wedding_ticket_${qId}`);
                return (
                  <button 
                    key={qId}
                    onClick={() => handleStartVoting(qId)}
                    className={`w-full py-4 rounded-xl font-bold text-lg shadow-md border-b-4 flex items-center justify-center gap-2 active:translate-y-1 active:border-b-0 transition-all
                      ${isFinished ? 'bg-gray-300 border-gray-400 text-gray-700' : 'bg-emerald-500 border-emerald-700 text-white hover:bg-emerald-400'}`}
                  >
                    <Ticket size={24} />
                    {isFinished ? `${qId} の発券内容を確認` : `${qId} の予想をする`}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 画面2：投票画面 */}
      {appState === 'voting' && currentData && (
        <div className="max-w-md mx-auto pt-4 px-4">
          <button onClick={() => setAppState('home')} className="mb-4 text-emerald-600 font-bold flex items-center gap-1 text-sm bg-white px-3 py-1 rounded-full shadow-sm">
            <Home size={16}/> トップへ戻る
          </button>

          <div className="bg-white p-5 rounded-xl shadow-md border-t-4 border-emerald-500 mb-6 relative overflow-hidden">
             <div className="absolute top-0 right-0 bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1 rounded-bl-lg">
                {currentQ}
             </div>
            <h2 className="font-black text-lg mt-2 leading-relaxed">{currentData.question}</h2>
          </div>

          <div className="mb-3 flex justify-between items-end px-1">
            <h3 className="font-black text-xl text-emerald-800 bg-emerald-100 px-3 py-1 rounded-lg">
              {selections.length < 3 ? `第${selections.length + 1}着を選択` : '予想完了'}
            </h3>
            <button onClick={() => setSelections([])} className="text-sm font-bold text-gray-600 flex items-center gap-1 bg-white border-2 border-gray-300 px-4 py-2 rounded-lg active:bg-gray-100">
              <RefreshCcw size={14} /> やり直す
            </button>
          </div>

          <div className="space-y-2 mb-8">
            {currentData.options.map((option) => {
              const selectedIndex = selections.findIndex(s => s.id === option.id);
              const isSelected = selectedIndex !== -1;
              return (
                <button
                  key={option.id}
                  onClick={() => handleSelect(option)}
                  disabled={isSelected || selections.length >= 3}
                  className={`w-full text-left p-4 rounded-xl border-2 font-bold text-lg transition-all flex justify-between items-center shadow-sm
                    ${isSelected ? 'bg-emerald-50 border-emerald-500 text-emerald-900' : 'bg-white border-gray-200 hover:border-emerald-300'}`}
                >
                  <span className="flex items-center gap-4">
                    <span className={`w-10 h-10 flex items-center justify-center rounded-full text-xl shadow-inner
                      ${isSelected ? 'bg-emerald-500 text-white font-black' : 'bg-gray-100 text-gray-500 font-bold'}`}>
                      {option.id}
                    </span>
                    {option.text}
                  </span>
                  {isSelected && <span className="text-emerald-600 font-black text-2xl">{selectedIndex + 1}着</span>}
                </button>
              );
            })}
          </div>

          <div className="bg-white p-5 rounded-xl shadow-md mb-8 border border-gray-200">
            <label className="flex items-center gap-2 text-sm font-black text-gray-700 mb-3">
              <User size={18} /> お名前（ニックネーム可）
            </label>
            <input 
              type="text" 
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="例：田中 太郎"
              className="w-full border-2 border-gray-300 rounded-lg p-4 text-lg font-bold bg-gray-50 focus:bg-white focus:border-emerald-500 focus:outline-none transition-colors"
            />
          </div>

          <button 
            onClick={() => setShowConfirmModal(true)}
            disabled={selections.length < 3 || guestName === '' || isGenerating}
            className="w-full bg-red-600 disabled:bg-gray-300 text-white py-5 rounded-xl font-black text-xl shadow-lg border-b-4 border-red-800 disabled:border-gray-400 flex items-center justify-center gap-2 active:translate-y-1 active:border-b-0 transition-all mb-10"
          >
            {isGenerating ? <><Loader2 className="animate-spin" size={24} /> 馬券を印刷中...</> : <><Ticket size={24} /> 発券機へ送信</>}
          </button>
        </div>
      )}

      {/* 発券確認モーダル */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl border-2 border-gray-200 flex flex-col items-center">
            <div className="bg-amber-100 text-amber-800 p-3 rounded-full mb-3">
              <AlertTriangle size={32} />
            </div>
            
            <h3 className="font-black text-xl text-gray-900 mb-1">内容の確認</h3>
            <p className="text-xs text-red-600 font-bold mb-4 bg-red-50 px-3 py-1 rounded-full border border-red-200">
              ⚠️ 一度発券すると変更できません
            </p>

            <div className="w-full bg-gray-50 rounded-xl p-4 border border-gray-200 mb-6 space-y-2 text-left">
              <div className="text-xs font-bold text-gray-500 mb-1">【予想馬券内容】</div>
              {selections.map((s, idx) => (
                <div key={idx} className="flex items-center gap-2 font-bold text-gray-800 text-sm">
                  <span className="bg-emerald-600 text-white text-xs px-2 py-0.5 rounded font-black">{idx + 1}着</span>
                  <span>{s.id}. {s.text}</span>
                </div>
              ))}
              <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between items-center text-sm font-bold">
                <span className="text-gray-500 text-xs">購入者名:</span>
                <span className="text-gray-900 text-base">{guestName} 様</span>
              </div>
            </div>

            <div className="w-full flex gap-3">
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl text-sm transition-all"
              >
                修正する
              </button>
              <button 
                onClick={processGenerate}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-sm shadow-md transition-all active:scale-95"
              >
                発券する！
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 画面3：発券結果画面 */}
      {appState === 'ticket' && (
        <div className="max-w-md mx-auto pt-6 px-4 flex flex-col items-center">
          
          {isAnnounced ? (
            isHit ? (
              <div className="bg-red-100 border-l-4 border-red-500 text-red-800 p-4 w-full rounded-xl shadow-sm mb-6 font-bold text-sm flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Trophy size={20} className="text-red-600 shrink-0" />
                  <span>おめでとうございます！【的中】です！</span>
                </div>
                <p className="pl-7">景品交換までこの画面でお持ちください。</p>
              </div>
            ) : (
              <div className="bg-gray-100 border-l-4 border-gray-500 text-gray-700 p-4 w-full rounded-xl shadow-sm mb-6 font-bold text-sm">
                残念...。次のレースに期待しましょう！
              </div>
            )
          ) : (
            /* ★全端末で改行されないように最適化したバナーエリア★ */
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-900 px-3 py-3 w-full rounded-xl shadow-sm mb-6 flex items-center justify-between gap-1.5 overflow-hidden">
              <span className="font-bold text-[11px] min-[375px]:text-xs whitespace-nowrap leading-none shrink min-w-0">
                発券完了！結果発表まで少々お待ちください。
              </span>
              <button 
                onClick={fetchData} 
                className="text-[11px] bg-amber-600 hover:bg-amber-700 text-white font-bold px-2 py-1.5 rounded-lg flex items-center gap-1 shadow-sm active:scale-95 transition-all shrink-0 whitespace-nowrap"
              >
                <RefreshCcw size={11} className={isLoading ? "animate-spin" : ""} />
                <span>更新</span>
              </button>
            </div>
          )}
          
          {/* 馬券画像表示エリア */}
          <div className="relative w-full mb-6">
            <img src={ticketImage} alt="馬券" className="w-full rounded-sm shadow-xl border border-gray-300" />
            
            {isAnnounced && isHit && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-4 border-red-600/80 text-red-600/80 font-black text-5xl md:text-6xl px-6 py-2 rounded-2xl transform -rotate-12 bg-white/20 backdrop-blur-[1px] pointer-events-none select-none tracking-widest border-dashed">
                的中
              </div>
            )}
          </div>
          
          <button onClick={() => setAppState('home')} className="mb-6 w-full bg-white border-2 border-emerald-600 text-emerald-700 py-3 rounded-xl font-bold flex justify-center items-center gap-2 shadow-sm active:bg-gray-50">
            <Home size={18}/> 別の問題へ戻る
          </button>
        </div>
      )}

      {/* 隠しSVGレンダラー */}
      {appState === 'voting' && (
        <div className="absolute top-0 left-[-9999px]">
          <svg 
            ref={ticketRef} 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 600 350" 
            width="600" 
            height="350"
            style={{ fontFamily: '"Hiragino Kaku Gothic ProN", "ヒラギノ角ゴ ProN W6", "Meiryo", sans-serif' }}
          >
            <style>
              {`@import url('https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@700;900&display=swap');`}
            </style>

            <defs>
              <pattern id="jraStripes" width="4" height="4" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="4" stroke="#c4e2c4" strokeWidth="1.5" />
                <line x1="2" y1="0" x2="2" y2="4" stroke="#e3f2e3" strokeWidth="2.5" />
              </pattern>
              
              <pattern id="horseWatermarkPattern" width="120" height="90" patternUnits="userSpaceOnUse" patternTransform="rotate(-15)">
                <g fill="#2d6a2d" opacity="0.12" transform="translate(10, 10) scale(0.7)">
                  <path d="M25 8 C22 4, 15 2, 12 6 C10 8, 8 15, 6 22 C4 28, 1 35, 3 42 C5 48, 12 50, 18 48 C22 46, 26 42, 28 36 C30 32, 35 30, 42 32 C48 34, 55 32, 58 26 C60 22, 58 15, 52 12 C45 9, 27 10, 25 8 Z" />
                  <circle cx="12" cy="14" r="2" fill="#dcf0dc" />
                  <path d="M18 2 C16 0, 14 0, 13 3 C15 5, 17 5, 18 2 Z" />
                  <path d="M55 24 C60 26, 62 32, 60 38" stroke="#2d6a2d" strokeWidth="3" fill="none" strokeLinecap="round" />
                </g>
              </pattern>
            </defs>

            <rect width="600" height="350" fill="#dcf0dc" />
            <rect width="600" height="350" fill="url(#jraStripes)" />
            <rect width="600" height="350" fill="url(#horseWatermarkPattern)" />
            <rect x="0" y="0" width="140" height="350" fill="#aedbaa" opacity="0.3" />

            <text x="300" y="180" fontSize="220" fontFamily="serif" fontWeight="900" fill="#2d6a2d" opacity="0.08" textAnchor="middle" dominantBaseline="central" transform="rotate(-10 300 180)">寿</text>

            <rect x="20" y="15" width="60" height="24" fill="#ffffff" stroke="#000000" strokeWidth="1.5" />
            <text x="50" y="27" fontSize="13" fontWeight="bold" fill="#000000" textAnchor="middle" dominantBaseline="central">八芳園</text>
            <text x="95" y="27" fontSize="24" fontWeight="900" fill="#000000" dominantBaseline="central" letterSpacing="2">ウェディングS</text>
            <text x="560" y="26" fontSize="22" fontWeight="900" fill="#000000" dominantBaseline="central">☆</text>
            <line x1="20" y1="46" x2="580" y2="46" stroke="#000000" strokeWidth="2" />

            <rect x="20" y="56" width="50" height="34" fill="#000000" />
            <text x="45" y="73" fontSize="22" fontWeight="900" fill="#ffffff" textAnchor="middle" dominantBaseline="central">第1</text>
            <text x="78" y="73" fontSize="18" fontWeight="bold" fill="#000000" dominantBaseline="central">レース</text>
            <rect x="150" y="52" width="430" height="42" fill="#ffffff" stroke="#000000" strokeWidth="2" />
            <text x="365" y="73" fontSize="28" fontWeight="900" fill="#000000" letterSpacing="6" textAnchor="middle" dominantBaseline="central">おめでとう！</text>

            <rect x="20" y="108" width="580" height="165" fill="#ffffff" stroke="#000000" strokeWidth="2" />
            
            <rect x="20" y="108" width="60" height="165" fill="#fff5f5" stroke="#000000" strokeWidth="2" />
            <circle cx="50" cy="135" r="16" fill="none" stroke="#dc2626" strokeWidth="3" />
            <text x="50" y="135" fontSize="18" fontWeight="900" fill="#dc2626" textAnchor="middle" dominantBaseline="central">３</text>
            <circle cx="50" cy="190" r="16" fill="none" stroke="#dc2626" strokeWidth="3" />
            <text x="50" y="190" fontSize="18" fontWeight="900" fill="#dc2626" textAnchor="middle" dominantBaseline="central">連</text>
            <circle cx="50" cy="245" r="16" fill="none" stroke="#dc2626" strokeWidth="3" />
            <text x="50" y="245" fontSize="18" fontWeight="900" fill="#dc2626" textAnchor="middle" dominantBaseline="central">単</text>

            {selections.map((sel, idx) => {
              const yCenter = 135 + idx * 55;
              return (
                <g key={idx}>
                  <rect x="95" y={yCenter - 14} width="48" height="28" fill="#f3f4f6" stroke="#d1d5db" rx="2" />
                  <text x="119" y={yCenter} fontSize="15" fontWeight="bold" fill="#374151" textAnchor="middle" dominantBaseline="central">{idx + 1}着</text>
                  <text x="175" y={yCenter + 2} fontSize="38" fontWeight="900" fill="#000000" textAnchor="middle" dominantBaseline="central">{sel.id}</text>
                  <text x="215" y={yCenter} fontSize="20" fontWeight="900" fontFamily="'Zen Maru Gothic', sans-serif" fill="#000000" dominantBaseline="central">{sel.text}</text>
                  {idx < 2 && <line x1="80" y1={yCenter + 27} x2="590" y2={yCenter + 27} stroke="#d1d5db" strokeWidth="2" strokeDasharray="4 4" />}
                </g>
              );
            })}

            <rect x="20" y="285" width="105" height="32" fill="#ffffff" stroke="#000000" strokeWidth="2" />
            <text x="72" y="301" fontSize="18" fontWeight="900" fill="#000000" textAnchor="middle" dominantBaseline="central">★100円</text>

            <g transform="translate(140, 286)">
              <rect width="30" height="30" fill="#000000" opacity="0.8" />
              <rect x="3" y="3" width="8" height="8" fill="#ffffff" />
              <rect x="19" y="3" width="8" height="8" fill="#ffffff" />
              <rect x="3" y="19" width="8" height="8" fill="#ffffff" />
              <rect x="11" y="11" width="8" height="8" fill="#ffffff" />
            </g>

            <text x="320" y="303" fontSize="14" fontWeight="bold" fill="#000000" dominantBaseline="central">購入者：</text>
            <line x1="380" y1="313" x2="550" y2="313" stroke="#000000" strokeWidth="2" />
            <text x="465" y="301" fontSize="24" fontWeight="900" fill="#000000" textAnchor="middle" dominantBaseline="central">{guestName}</text>
            <text x="558" y="303" fontSize="16" fontWeight="bold" fill="#000000" dominantBaseline="central">様</text>

            <g transform="translate(20, 332)">
              <text x="0" y="6" fontSize="10" fontFamily="monospace" fill="#222222" fontWeight="bold">
                {currentDateStr || '2026.08.23'} 0101 8842 1209 3014
              </text>
              {[...Array(40)].map((_, i) => (
                <rect key={i} x={280 + i * 7} y="0" width={i % 3 === 0 ? 3 : 1.5} height="10" fill="#222222" opacity="0.75" />
              ))}
            </g>
          </svg>
        </div>
      )}
    </div>
  );
}