import { useEffect, useMemo, useState } from 'react';
import { db } from './firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import './App.css';

const LETTER_CONTENT = `致 親愛的 新進郵差們：\n\n歡迎加入本局。身為一名稱職的郵務人員，除了送達信件，更要擁有一雙洞察環境的眼睛。\n\n神祕郵差留下的信件中，隱藏著這座城市的交通安全關鍵。你需要破解信中隱含的交通謎題...\n\n準備好迎接挑戰了嗎？\n\n—— 郵務長敬上`;

const CHAPTERS = {
  1: {
    title: "第一章：神祕的街道縮影",
    diaryText: "老郵差日誌寫道：「1976年，阿明伯還沒出意外，他總說這間郵局的斜坡是他走過最溫柔的坡，長長的、慢慢的，像鋼琴的漸強符號。」",
    finalPrompt: "請幫我找出消失的斜率和真相吧",
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
  const [showLevelSelect, setShowLevelSelect] = useState(false);
  const [currentChapter, setCurrentChapter] = useState(1);
  const [displayedText, setDisplayedText] = useState("");
  const [showUI, setShowUI] = useState(false);
  const [userInput, setUserInput] = useState("");

  const [gameStartTime, setGameStartTime] = useState(null);
  const [questionStartTime, setQuestionStartTime] = useState(null);
  const [questionElapsedTime, setQuestionElapsedTime] = useState(0);
  const [totalElapsedTime, setTotalElapsedTime] = useState(0);

  const [isWrong, setIsWrong] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const [showChapterTransition, setShowChapterTransition] = useState(false);
  const [transitionMessage, setTransitionMessage] = useState("");
  const [isGameFinished, setIsGameFinished] = useState(false);

  const [textMode, setTextMode] = useState("typewriter");
  const [isTextVisible, setIsTextVisible] = useState(true);

  const [onlineCount, setOnlineCount] = useState(0);
  const [visibleLevelCount, setVisibleLevelCount] = useState(0);

  const [showDiaryDrawer, setShowDiaryDrawer] = useState(false);

  const onlineUserId = useMemo(() => {
    const stored = sessionStorage.getItem("trafficPuzzleUserId");
    if (stored) return stored;
    const newId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `user_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem("trafficPuzzleUserId", newId);
    return newId;
  }, []);

  useEffect(() => {
    if (showLevelSelect && !hasStartedGame) {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [showLevelSelect, hasStartedGame]);

  // 首頁信件 / 關卡文字
  useEffect(() => {
    setDisplayedText("");
    setShowUI(false);
    setIsWrong(false);
    setShowHint(false);
    setUserInput("");

    let interval;
    let timeout;
    let interval2;

    if (!hasStartedGame && !showLevelSelect) {
      setTextMode("typewriter");
      setIsTextVisible(true);

      let i = 0;
      interval = setInterval(() => {
        if (i < LETTER_CONTENT.length) {
          setDisplayedText(LETTER_CONTENT.slice(0, i + 1));
          i++;
        } else {
          clearInterval(interval);
          setShowUI(true);
        }
      }, 50);

      return () => clearInterval(interval);
    }

    if (!hasStartedGame && showLevelSelect) {
      setDisplayedText("");
      setShowUI(false);
      return;
    }

    if (hasStartedGame && currentChapter === 1) {
      const chapterData = CHAPTERS[1];
      setTextMode("typewriter");
      setIsTextVisible(true);

      let i = 0;
      interval = setInterval(() => {
        if (i < chapterData.diaryText.length) {
          setDisplayedText(chapterData.diaryText.slice(0, i + 1));
          i++;
        } else {
          clearInterval(interval);

          timeout = setTimeout(() => {
            setDisplayedText("");

            let j = 0;
            interval2 = setInterval(() => {
              if (j < chapterData.finalPrompt.length) {
                setDisplayedText(chapterData.finalPrompt.slice(0, j + 1));
                j++;
              } else {
                clearInterval(interval2);
                setShowUI(true);
              }
            }, 50);
          }, 1200);
        }
      }, 40);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
        clearInterval(interval2);
      };
    }

    setTextMode("typewriter");
    setIsTextVisible(true);

    const targetText = CHAPTERS[currentChapter].content;

    let i = 0;
    interval = setInterval(() => {
      if (i < targetText.length) {
        setDisplayedText(targetText.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
        setShowUI(true);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [hasStartedGame, showLevelSelect, currentChapter]);

  // 關卡點依序浮出
  useEffect(() => {
    if (!showLevelSelect || hasStartedGame) return;

    setVisibleLevelCount(0);
    const timers = [0, 1, 2, 3, 4].map((i) =>
      setTimeout(() => {
        setVisibleLevelCount(i + 1);
      }, 180 + i * 180)
    );

    return () => timers.forEach(clearTimeout);
  }, [showLevelSelect, hasStartedGame]);

  // 每題秒數 + 總秒數
  useEffect(() => {
    let interval;

    if (hasStartedGame && gameStartTime && questionStartTime && !isGameFinished) {
      interval = setInterval(() => {
        const now = Date.now();
        setQuestionElapsedTime(Math.floor((now - questionStartTime) / 1000));
        setTotalElapsedTime(Math.floor((now - gameStartTime) / 1000));
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [hasStartedGame, gameStartTime, questionStartTime, isGameFinished]);

  // 即時在線人數
  useEffect(() => {
    if (!hasStartedGame) return;

    const userRef = doc(db, "online_users", onlineUserId);
    const usersRef = collection(db, "online_users");

    const joinUser = async () => {
      try {
        await setDoc(userRef, {
          joinedAt: serverTimestamp()
        });
      } catch (e) {
        console.error("加入在線列表失敗：", e);
      }
    };

    joinUser();

    const unsubscribe = onSnapshot(
      usersRef,
      (snapshot) => {
        setOnlineCount(snapshot.size);
      },
      (error) => {
        console.error("監聽在線人數失敗：", error);
      }
    );

    const handleBeforeUnload = () => {
      deleteDoc(userRef).catch(() => {});
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      unsubscribe();
      deleteDoc(userRef).catch(() => {});
    };
  }, [hasStartedGame, onlineUserId]);

  const formatTime = (seconds) => {
    const mm = Math.floor(seconds / 60).toString().padStart(2, "0");
    const ss = (seconds % 60).toString().padStart(2, "0");
    return `${mm}:${ss}`;
  };

  const handleOpenLevelSelect = () => {
    setShowLevelSelect(true);
    setShowUI(false);
    setShowDiaryDrawer(false);
  };

  const handleStartGame = (level = 1) => {
    const now = Date.now();
    setHasStartedGame(true);
    setShowLevelSelect(false);
    setShowDiaryDrawer(false);
    setCurrentChapter(level);
    setGameStartTime(now);
    setQuestionStartTime(now);
    setQuestionElapsedTime(0);
    setTotalElapsedTime(0);
  };

  const handleLevelComplete = async () => {
    const chapterData = CHAPTERS[currentChapter];

    if (userInput.trim() === chapterData.answer) {
      try {
        await addDoc(collection(db, "learning_results"), {
          puzzle_id: `puzzle_0${currentChapter}`,
          time_seconds: questionElapsedTime,
          total_seconds: totalElapsedTime,
          timestamp: serverTimestamp()
        });
        console.log("Firebase 上傳成功");
      } catch (e) {
        console.error("Firebase 上傳失敗：", e);
      }

      setTransitionMessage(chapterData.nextMsg);
      setShowChapterTransition(true);
    } else {
      setIsWrong(true);
    }
  };

  const handleNextChapter = () => {
    if (CHAPTERS[currentChapter + 1]) {
      setShowChapterTransition(false);
      setCurrentChapter((prev) => prev + 1);
      setQuestionStartTime(Date.now());
      setQuestionElapsedTime(0);
    } else {
      setShowChapterTransition(false);
      setIsGameFinished(true);
    }
  };

  const levelClasses = (level, unlocked) => {
    const visible = visibleLevelCount >= level ? "visible" : "";
    const stateClass = unlocked ? "unlocked" : "locked";
    return `level-node-full ${stateClass} ${visible}`;
  };

  return (
    <div className={`main-container ${!hasStartedGame && showLevelSelect ? "level-select-mode" : ""}`}>
      {!hasStartedGame && !showLevelSelect ? (
        <>
          <div className={`card ${isWrong ? "wrong-glow" : ""}`}>
            <button
              className="diary-icon-btn"
              onClick={() => setShowDiaryDrawer(true)}
              aria-label="開啟日記側邊欄"
              title="日記"
            >
              📔
            </button>

            <h1 className="letter-title">💌 給新進郵差的一封信</h1>
            <div className="typewriter-text">{displayedText}</div>
            {showUI && (
              <button className="glow-btn" onClick={handleOpenLevelSelect}>
                開始探險吧
              </button>
            )}
          </div>

          {showDiaryDrawer && (
            <>
              <div
                className="drawer-overlay"
                onClick={() => setShowDiaryDrawer(false)}
              ></div>

              <aside className="diary-drawer">
                <div className="diary-drawer-header">
                  <h2 className="diary-drawer-title">破關記錄</h2>
                  <button
                    className="diary-close-btn"
                    onClick={() => setShowDiaryDrawer(false)}
                    aria-label="關閉側邊欄"
                  >
                    ✕
                  </button>
                </div>

                <div className="diary-drawer-content">
                  <div className="record-card">
                    <div className="record-title">目前內容預留區</div>
                    <div className="record-text">
                      之後你提供破關記錄格式後，我會幫你放進這裡。
                    </div>
                  </div>

                  <div className="record-card">
                    <div className="record-title">可顯示內容範例</div>
                    <div className="record-text">
                      - 破到第幾關
                      {"\n"}- 每關秒數
                      {"\n"}- 總秒數
                      {"\n"}- 破關日期
                    </div>
                  </div>
                </div>
              </aside>
            </>
          )}
        </>
      ) : !hasStartedGame && showLevelSelect ? (
        <div className="level-select-screen">
          <div className="level-select-header">
            <h1 className="level-select-title">選擇關卡</h1>
            <p className="level-select-subtitle">請選擇你要探索的路線</p>
          </div>

          <div className="level-map-full">
            <button
              className={`${levelClasses(1, true)} pos-1`}
              onClick={() => handleStartGame(1)}
            >
              1
            </button>

            <button className={`${levelClasses(2, false)} pos-2`} disabled>
              2
              <span className="lock-mark">🔒</span>
            </button>

            <button className={`${levelClasses(3, false)} pos-3`} disabled>
              3
              <span className="lock-mark">🔒</span>
            </button>

            <button className={`${levelClasses(4, false)} pos-4`} disabled>
              4
              <span className="lock-mark">🔒</span>
            </button>

            <button className={`${levelClasses(5, false)} pos-5`} disabled>
              5
              <span className="lock-mark">🔒</span>
            </button>
          </div>
        </div>
      ) : (
        <div className={`card ${isWrong ? "wrong-glow" : ""}`}>
          <div className="status-bar">
            <div className="timer-display">
              <span>⏰</span>
              <span>{formatTime(questionElapsedTime)}</span>
            </div>

            <div className="online-display">
              <span>👥</span>
              <span>{onlineCount}</span>
            </div>
          </div>

          <h1 className="puzzle-title">{CHAPTERS[currentChapter].title}</h1>

          {isWrong ? (
            <div className="error-area">
              <p className="error-text">需要小明給的提示嗎？</p>
              {!showHint ? (
                <button className="help-btn" onClick={() => setShowHint(true)}>
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
        </div>
      )}

      {showChapterTransition && (
        <div className="overlay">
          <div className="transition-card">
            <h2 className="puzzle-title">🎉 過關成功</h2>
            <div className="typewriter-text transition-text">{transitionMessage}</div>
            <button className="glow-btn" onClick={handleNextChapter}>
              確認
            </button>
          </div>
        </div>
      )}

      {isGameFinished && (
        <div className="overlay">
          <div className="transition-card">
            <h2 className="puzzle-title">🏆 恭喜完成</h2>
            <div className="typewriter-text transition-text">恭喜你完成了所有挑戰！</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;