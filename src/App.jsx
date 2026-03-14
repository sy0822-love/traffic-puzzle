import { useState, useEffect } from 'react';
import { db } from './firebase.js';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import './App.css';

const LETTER_CONTENT = `致 親愛的 新進郵差們：\n\n歡迎加入本局。身為一名稱職的郵務人員，除了送達信件，更要擁有一雙洞察環境的眼睛。\n\n神祕郵差留下的信件中，隱藏著這座城市的交通安全關鍵。你需要破解信中隱含的交通謎題...\n\n準備好迎接挑戰了嗎？\n\n—— 郵務長敬上`;

const CHAPTERS = {
  1: {
    title: "第一章：神祕的街道縮影",
    content: "你來到了一個路口，發現行人過馬路時總是戰戰兢兢。\n「縮短距離、擴大視距」，這項手段是？",
    answer: "1234",
    nextMsg: "你好像越來越靠近真相了呢！接下來請你幫我看看...."
  },
  2: {
    title: "第二章：消失的行人庇護",
    content: "這是一個左轉車輛頻繁的路口，行人常在路中間進退兩難。\n「提供停等空間，並讓車輛轉彎半徑加大」，這項工程是？",
    answer: "1234",
    nextMsg: "太棒了！你的觀察力果然過人，真相就在不遠處了。"
  }
};

function App() {
  const [hasStartedGame, setHasStartedGame] = useState(false);
  const [currentChapter, setCurrentChapter] = useState(1);
  const [displayedText, setDisplayedText] = useState("");
  const [showUI, setShowUI] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [startTime, setStartTime] = useState(null); // 整體開始時間
  const [chapterStartTime, setChapterStartTime] = useState(null); // 單章開始時間
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isWrong, setIsWrong] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // 打字機效果：每章節開始時重啟
  useEffect(() => {
    let i = 0;
    const targetText = hasStartedGame ? CHAPTERS[currentChapter].content : LETTER_CONTENT;

    setDisplayedText("");
    setShowUI(false);
    setIsWrong(false);
    setShowHint(false);
    setUserInput("");

    const timer = setInterval(() => {
      if (i < targetText.length) {
        setDisplayedText(targetText.slice(0, i + 1));
        i++;
      } else {
        clearInterval(timer);
        setShowUI(true);
      }
    }, 50);

    return () => clearInterval(timer);
  }, [hasStartedGame, currentChapter]);

  // 計時系統
  useEffect(() => {
    let interval;
    if (hasStartedGame && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [hasStartedGame, startTime]);

  const formatTime = (seconds) => {
    const mm = Math.floor(seconds / 60).toString().padStart(2, '0');
    const ss = (seconds % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const handleStartGame = () => {
    const now = Date.now();
    setHasStartedGame(true);
    setStartTime(now);
    setChapterStartTime(now);
  };

  const handleLevelComplete = async () => {
    const chapterData = CHAPTERS[currentChapter];

    // ✅ 分支 A：答對 1234
    if (userInput.trim() === chapterData.answer) {
      const chapterTimeSpent = chapterStartTime
        ? Math.floor((Date.now() - chapterStartTime) / 1000)
        : 0;

      try {
        await addDoc(collection(db, "learning_results"), {
          puzzle_id: `puzzle_0${currentChapter}`,
          time_seconds: chapterTimeSpent,
          timestamp: serverTimestamp()
        });

        // 先彈出過關訊息，再跳轉章節，符合你的規格
        alert(chapterData.nextMsg);

        if (CHAPTERS[currentChapter + 1]) {
          setCurrentChapter(currentChapter + 1);
          setChapterStartTime(Date.now());
        } else {
          alert("恭喜你完成了所有挑戰！");
        }
      } catch (e) {
        console.error("Firebase 上傳失敗：", e);
        alert("資料上傳失敗，請檢查 Firebase 設定或網路連線。");
      }
    } else {
      // ✅ 分支 B：答錯觸發紅光與提示
      setIsWrong(true);
    }
  };

  return (
    <div className="main-container">
      <div className={`card ${isWrong ? 'wrong-glow' : ''}`}>
        {!hasStartedGame ? (
          <>
            <h1 className="letter-title">💌 給新進郵差的一封信</h1>
            <div className="typewriter-text">{displayedText}</div>
            {showUI && (
              <button
                className="glow-btn"
                onClick={handleStartGame}
              >
                開始探險吧
              </button>
            )}
          </>
        ) : (
          <>
            <div className="timer-display">
              <span>⏰</span> {formatTime(elapsedTime)}
            </div>

            <h1 className="puzzle-title">{CHAPTERS[currentChapter].title}</h1>

            {isWrong ? (
              <div className="error-area">
                <p className="error-text">需要小明給的提示嗎？</p>
                {!showHint ? (
                  <button
                    className="help-btn"
                    onClick={() => setShowHint(true)}
                  >
                    請幫幫我
                  </button>
                ) : (
                  <>
                    <p className="hint-text">不告訴你</p>
                    <button
                      className="glow-btn"
                      onClick={() => {
                        setIsWrong(false);
                        setShowHint(false);
                        setUserInput("");
                      }}
                    >
                      重新輸入
                    </button>
                  </>
                )}
              </div>
            ) : (
              <>
                <div className="typewriter-text">{displayedText}</div>
                {showUI && (
                  <div className="input-area">
                    <input
                      type="text"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      placeholder="在此輸入解答..."
                    />
                    <button className="glow-btn" onClick={handleLevelComplete}>
                      確認提交
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;