import { useEffect, useMemo, useState } from 'react';
// ===== Firebase 設定 =====
import { db, rtdb } from './firebase';
// ===== Firestore（紀錄作答）=====
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
  where
} from 'firebase/firestore';
// ===== Realtime DB（在線人數）=====
import { ref, set, onValue, onDisconnect } from 'firebase/database';
import './App.css';

// ===== 活動碼白名單（主辦方控制）=====
// 未來要加 20 組
const ALLOWED_ACCESS_CODES = {
  KWA1116: {
    userName: "KWA1116 玩家",
    userCode: "KWA1116"
  },
  WSN1208: {
    userName: "WSN1208 玩家",
    userCode: "WSN1208"
  }
};

// ===== 首頁信件內容 =====
const LETTER_CONTENT = `致 親愛的 新進郵差們：\n\n歡迎加入本局。身為一名稱職的郵務人員，除了送達信件，更要擁有一雙洞察環境的眼睛。\n\n神祕郵差留下的信件中，隱藏著這座城市的交通安全關鍵。你需要破解信中隱含的交通謎題...\n\n準備好迎接挑戰了嗎？\n\n—— 郵務長敬上`;

const CHAPTERS = {
  1: {
    title: "【老差事隨筆：石階上的倔強】",
    content: `正午熱浪捲過郵局老石階，盲眼的阿明伯在那兒。他曾是玩音樂的，即便坐在輪椅上，那身訂製西裝依舊燙得挺拔，連汗浸透了背脊，頸標也沒歪半分。

這棟老房子沒坡道，幾級石階橫在那像斷崖。家屬想代勞，他枯瘦的手卻死死按住信封，指節泛白——那信，他非得親手遞進櫃檯。

我們幾個老骨頭使勁，連人帶車硬生生抬過石階。金屬輪子磕碰石板，在大廳迴盪出刺耳的破音，像極了他那把走音卻不肯低頭的琴。

信遞過來了，手在顫。那一刻我才明白，他跨過的不是石階，而是那份不教人看輕的、最後的體面。`,
    answer: "1234",
    nextMsg: "你好像越來越靠近真相了呢！接下來請你幫我看看...."
  },
  2: {
    title: "第二章：消失的行人庇護",
    content:
      "這是一個左轉車輛頻繁的路口，行人常在路中間進退兩難。\n「提供停等空間，並讓車輛轉彎半徑加大」，這項工程是？",
    answer: "1234",
    nextMsg: "太棒了！你的觀察力果然過人，真相就在不遠處了。"
  }
};

function App() {
  
// ===== 遊戲流程控制 =====
  const [hasStartedGame, setHasStartedGame] = useState(false);
  const [showLevelSelect, setShowLevelSelect] = useState(false);
  const [currentChapter, setCurrentChapter] = useState(1);
// ===== 畫面顯示 ===== 
  const [displayedText, setDisplayedText] = useState("");
  const [showUI, setShowUI] = useState(false);
// ===== 玩家輸入 =====
  const [userInput, setUserInput] = useState("");
// ===== 計時系統 =====
  const [gameStartTime, setGameStartTime] = useState(null);
  const [questionStartTime, setQuestionStartTime] = useState(null);
  const [questionElapsedTime, setQuestionElapsedTime] = useState(0);
  const [totalElapsedTime, setTotalElapsedTime] = useState(0);
// ===== 錯誤提示 =====
  const [isWrong, setIsWrong] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const [showChapterTransition, setShowChapterTransition] = useState(false);
  const [transitionMessage, setTransitionMessage] = useState("");
  const [isGameFinished, setIsGameFinished] = useState(false);

  const [onlineCount, setOnlineCount] = useState(0);
  const [visibleLevelCount, setVisibleLevelCount] = useState(0);
// ===== UI 狀態 =====
  const [showDiaryDrawer, setShowDiaryDrawer] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
// ===== 使用者登入資訊 =====
  const [userName, setUserName] = useState(() => localStorage.getItem("trafficPuzzleUserName") || "");
  const [userCode, setUserCode] = useState(() => localStorage.getItem("trafficPuzzleUserCode") || "");
  const [loginCodeInput, setLoginCodeInput] = useState("");
  const [authError, setAuthError] = useState("");
// ===== 作答紀錄 ===== 
  const [records, setRecords] = useState([]);
// ===== 關卡解鎖（localStorage）=====
  const STORAGE_KEY = "trafficPuzzleUnlockedLevel";
  const [unlockedLevel, setUnlockedLevel] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? Number(saved) : 1;
  });
// ===== 登入邏輯（活動碼驗證）=====
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, unlockedLevel);
  }, [unlockedLevel]);

  const saveUserSession = (name, code) => {
    localStorage.setItem("trafficPuzzleUserName", name);
    localStorage.setItem("trafficPuzzleUserCode", code);
    setUserName(name);
    setUserCode(code);
  };

  const handleLoginUser = async () => {
    const trimmedCode = loginCodeInput.trim().toUpperCase();

    if (!trimmedCode) {
      setAuthError("請輸入活動碼");
      return;
    }

    const matchedUser = ALLOWED_ACCESS_CODES[trimmedCode];

    if (!matchedUser) {
      setAuthError("活動碼錯誤，請重新確認");
      return;
    }

    saveUserSession(matchedUser.userName, matchedUser.userCode);
    setAuthError("");
  };

  const handleLogoutUser = () => {
    localStorage.removeItem("trafficPuzzleUserName");
    localStorage.removeItem("trafficPuzzleUserCode");
    setUserName("");
    setUserCode("");
    setLoginCodeInput("");
    setAuthError("");
    setShowDiaryDrawer(false);
    setShowLevelSelect(false);
    setHasStartedGame(false);
  };

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

  useEffect(() => {
    const fetchRecords = async () => {
      if (!userCode) {
        setRecords([]);
        return;
      }

      try {
        const q = query(
          collection(db, "learning_results"),
          where("userCode", "==", userCode)
        );

        const snapshot = await getDocs(q);

        const data = snapshot.docs
          .map((item) => ({
            id: item.id,
            ...item.data()
          }))
          .sort((a, b) => {
            const aTime = a.timestamp?.seconds || 0;
            const bTime = b.timestamp?.seconds || 0;
            return bTime - aTime;
          });

        setRecords(data);
      } catch (error) {
        console.error("讀取個人紀錄失敗：", error);
      }
    };

    fetchRecords();
  }, [userCode]);

  // 首頁信件 / 關卡文字
  useEffect(() => {
    setDisplayedText("");
    setShowUI(false);
    setIsWrong(false);
    setShowHint(false);
    setUserInput("");

    let interval;

    if (!userCode) return;

    if (!hasStartedGame && !showLevelSelect) {
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
      setDisplayedText(CHAPTERS[1].content);
      setShowUI(true);
      return;
    }

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
  }, [userCode, hasStartedGame, showLevelSelect, currentChapter]);

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

  // 即時在線人數（Realtime Database）
  useEffect(() => {
    if (!hasStartedGame) return;

    const connectedRef = ref(rtdb, ".info/connected");
    const userStatusRef = ref(rtdb, `online_users/${onlineUserId}`);
    const onlineUsersRef = ref(rtdb, "online_users");

    const unsubscribeConnected = onValue(connectedRef, async (snapshot) => {
      if (snapshot.val() !== true) return;

      try {
        await onDisconnect(userStatusRef).remove();

        await set(userStatusRef, {
          online: true,
          joinedAt: Date.now()
        });
      } catch (error) {
        console.error("設定即時在線狀態失敗：", error);
      }
    });

    const unsubscribeOnlineUsers = onValue(
      onlineUsersRef,
      (snapshot) => {
        const data = snapshot.val();
        setOnlineCount(data ? Object.keys(data).length : 0);
      },
      (error) => {
        console.error("監聽在線人數失敗：", error);
      }
    );

    return () => {
      unsubscribeConnected();
      unsubscribeOnlineUsers();
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
    setShowExitConfirm(false);
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
          userCode: userCode,
          userName: userName,
          puzzle_id: `puzzle_0${currentChapter}`,
          time_seconds: questionElapsedTime,
          total_seconds: totalElapsedTime,
          timestamp: serverTimestamp()
        });
        console.log("Firebase 上傳成功");

        setRecords((prev) => [
          {
            id: `local-${Date.now()}`,
            userCode,
            userName,
            puzzle_id: `puzzle_0${currentChapter}`,
            time_seconds: questionElapsedTime,
            total_seconds: totalElapsedTime,
            timestamp: { seconds: Math.floor(Date.now() / 1000) }
          },
          ...prev
        ]);
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
      const nextChapter = currentChapter + 1;

      setUnlockedLevel((prev) => Math.max(prev, nextChapter));

      setShowChapterTransition(false);
      setCurrentChapter(nextChapter);
      setQuestionStartTime(Date.now());
      setQuestionElapsedTime(0);
    } else {
      setShowChapterTransition(false);
      setIsGameFinished(true);
    }
  };

  const handleExitToLevelSelect = () => {
    setHasStartedGame(false);
    setShowLevelSelect(true);
    setShowExitConfirm(false);
    setIsWrong(false);
    setShowHint(false);
    setUserInput("");
    setDisplayedText("");
    setShowUI(false);
    setQuestionElapsedTime(0);
  };

  const levelClasses = (level, unlocked) => {
    const visible = visibleLevelCount >= level ? "visible" : "";
    const stateClass = unlocked ? "unlocked" : "locked";
    return `level-node-full ${stateClass} ${visible}`;
  };

  return (
    <div className={`main-container ${!hasStartedGame && showLevelSelect ? "level-select-mode" : ""}`}>
      {!userCode ? (
        <div className="card" style={{ maxWidth: "680px" }}>
          <h1 className="letter-title">🪪 玩家登入</h1>

          <p
            style={{
              fontSize: "17px",
              lineHeight: "1.7",
              color: "#5a4c3c",
              marginBottom: "18px",
              textAlign: "left",
              whiteSpace: "pre-wrap"
            }}
          >
            請輸入主辦方提供的活動碼。只有有效活動碼才能進入作答頁面，系統也會依照活動碼紀錄各自的作答結果。
          </p>

          <div className="input-area">
            <input
              type="text"
              value={loginCodeInput}
              onChange={(e) => setLoginCodeInput(e.target.value)}
              placeholder="輸入主辦方提供的活動碼"
            />
            <button className="glow-btn" onClick={handleLoginUser}>
              登入
            </button>
          </div>

          {authError && (
            <div
              style={{
                marginTop: "14px",
                color: "#c0392b",
                fontSize: "16px",
                fontWeight: "bold"
              }}
            >
              {authError}
            </div>
          )}
        </div>
      ) : !hasStartedGame && !showLevelSelect ? (
        <>
          <div className={`card ${isWrong ? "wrong-glow" : ""}`}>
            <button
              style={{
                position: "absolute",
                top: "18px",
                left: "20px"
              }}
              className="back-cancel-btn"
              onClick={handleLogoutUser}
              aria-label="切換帳號"
              title="切換帳號"
            >
              切換帳號
            </button>

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
                    <div className="record-title">目前玩家</div>
                    <div className="record-text">
                      名稱：{userName}{"\n"}
                      登入碼：{userCode}
                    </div>
                  </div>

                  {records.length === 0 ? (
                    <div className="record-card">
                      <div className="record-title">尚無破關紀錄</div>
                      <div className="record-text">
                        完成關卡後，這裡會顯示你的秒數、總時間與日期。
                      </div>
                    </div>
                  ) : (
                    records.map((rec) => (
                      <div className="record-card" key={rec.id}>
                        <div className="record-title">
                          第 {rec.puzzle_id?.replace("puzzle_0", "")} 關
                        </div>
                        <div className="record-text">
                          秒數：{rec.time_seconds}s{"\n"}
                          總時間：{rec.total_seconds}s{"\n"}
                          日期：
                          {rec.timestamp?.toDate
                            ? rec.timestamp.toDate().toLocaleString()
                            : rec.timestamp?.seconds
                            ? new Date(rec.timestamp.seconds * 1000).toLocaleString()
                            : "載入中"}
                        </div>
                      </div>
                    ))
                  )}
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
            {[1, 2, 3, 4, 5].map((level) => (
              <button
                key={level}
                className={`${levelClasses(level, unlockedLevel >= level)} pos-${level}`}
                onClick={() => handleStartGame(level)}
                disabled={unlockedLevel < level}
              >
                {level}
                {unlockedLevel < level && <span className="lock-mark">🔒</span>}
              </button>
            ))}
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
                  <button
                    className="back-page-btn"
                    onClick={() => setShowExitConfirm(true)}
                  >
                    回上頁
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {showExitConfirm && (
        <div className="overlay transition-overlay">
          <div className="transition-card float-in-card">
            <h2 className="puzzle-title">⚠️ 確認返回</h2>
            <div className="typewriter-text transition-text">
              跳出即須重新挑戰，確定嗎？
            </div>

            <div className="modal-action-row">
              <button
                className="back-cancel-btn"
                onClick={() => setShowExitConfirm(false)}
              >
                繼續
              </button>

              <button
                className="glow-btn"
                onClick={handleExitToLevelSelect}
              >
                確定
              </button>
            </div>
          </div>
        </div>
      )}

      {showChapterTransition && (
        <div className="overlay transition-overlay">
          <div className="transition-card float-in-card">
            <h2 className="puzzle-title">🎉 過關成功</h2>
            <div className="typewriter-text transition-text">{transitionMessage}</div>
            <button className="glow-btn" onClick={handleNextChapter}>
              確認
            </button>
          </div>
        </div>
      )}

      {isGameFinished && (
        <div className="overlay transition-overlay">
          <div className="transition-card float-in-card">
            <h2 className="puzzle-title">🏆 恭喜完成</h2>
            <div className="typewriter-text transition-text">
              恭喜你完成了所有挑戰！
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;