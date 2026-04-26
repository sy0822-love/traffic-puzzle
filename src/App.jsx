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
import card01 from './assets/card-01.png';
import card02 from './assets/card-02.png';
import card03 from './assets/card-03.png';
import card04 from './assets/card-04.png';
import card05 from './assets/card-05.png';
import card06 from './assets/card-06.png';
import card07 from './assets/card-07.png';
import card08 from './assets/card-08.png';
import card09 from './assets/card-09.png';
import card10 from './assets/card-10.png';

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

const LETTER_CONTENT = `致 親愛的 新進郵差們：\n\n歡迎加入本局。身為一名稱職的郵務人員，除了送達信件，更要擁有一雙洞察環境的眼睛。\n\n神祕郵差留下的信件中，隱藏著這座城市的交通安全關鍵。你需要破解信中隱含的交通謎題...\n\n準備好迎接挑戰了嗎？\n\n—— 郵務長敬上`;

const CHAPTER2_CARDS = [
  card01,
  card02,
  card03,
  card04,
  card05,
  card06,
  card07,
  card08,
  card09,
  card10
];

const CHAPTERS = {
  1: {
    title: "【1-1 劇情：斷裂的終點】",
    content: `七月十四．正午。
又是個悶得發慌的中午後。我坐在櫃檯邊，看見阿明伯出現在郵局門口。他是個讀書人，學音樂的，偏偏一雙眼瞧不見。那天熱得連狗都懶得叫，他卻穿著筆挺的西裝，坐在輪椅上。

郵局門前那幾級高得嚇人的老石階，對他來說就像南天門一樣難跨。他那雙枯瘦的手死死按著信封，指節泛白，非要自己到櫃檯前。我看著他西裝被汗浸了一圈，心裡納悶：是什麼樣的信，非得要一個看不見的人，跨過這幾級『不存在的路』才能寄出去？`,
    taskTitle: "【實體操作提示】",
    taskContent: `請取出配件包中的「量測用直尺」與「坡道設計圖（折紙）」。
使用直尺測量實體道具（郵局模型）中石階的總高度。
請根據坡道設計紙，嘗試摺疊出合乎比例的設計，揭開這個被我們視而不見的殘酷真相。`,
    answer: "1",
    nextMsg: "你開始意識到這個問題的本質了..."
  },
  2: {
    title: "【1-2 劇情：剝離冷漠的偽裝】",
    content: `最後，我們幾個老骨頭使了把勁，連人帶輪椅把他抬過那幾層疊疊的階梯。金屬輪子磕碰石階的聲音，在空蕩蕩的大廳裡迴盪，聽著像是在跟這間沒坡道的老房子賭氣。

他終於親手把信遞過來了。但我看著那張地圖，才明白阿明伯眼中的世界更令人窒息。變電箱像巨大的墓碑，機車如同鏽蝕的鎖鏈，將路勒得密不透風。這些我們習以為常的『便利』，全成了他的路障。如果不親手剝開這些冷漠，我們永遠看不見通往公平的生路。`,
    taskTitle: "【實體操作指引】",
    taskContent: `請取出「Level 1：混亂街景圖」與「障礙物貼紙組」。
請親手撕下那些擋路的機車、變電箱與違規招牌貼紙。
當偽裝被剝離，請注視底層露出的斑駁痕跡，並在系統輸入你發現的答案。`,
    answer: "2",
    nextMsg: "你看見了被遮蔽的真相..."
  },
  3: {
    title: "【2-1 劇情：霓虹下的盲點】",
    content: `九月二十．雨後傍晚。
日記這頁我畫了一個被圈起來的紅十字。我想起那個叫小娟的女孩，每天這時間她都趕著最後一班公車。這路口是城市的『心臟』，但我看著卻像絞肉機。

燈號像瘋了似地閃爍，路標在廣告夾縫中求生。小娟站在斑馬線邊緣，臉色慘白。路口太快了，號誌跳動的速度快得像在嘲笑行人。在這個路口，『慢』就是一種原罪。我看見她手忙腳亂地對著地圖，卻發現大腦根本跟不上那種超載的頻率。`,
    taskTitle: "【實體操作提示】",
    taskContent: `請取出配件包中的「10 張文字路標卡牌」。
接下來系統將進入高速閃現模式，請在混亂中捕捉小娟賴以生存的號誌。`,
    answer: "1234567890",
    nextMsg: "你成功抓住了混亂中的秩序..."
  }
};

function App() {
  const [hasStartedGame, setHasStartedGame] = useState(false);
  const [showLevelSelect, setShowLevelSelect] = useState(false);
  const [currentChapter, setCurrentChapter] = useState(1);

  const [displayedText, setDisplayedText] = useState("");
  const [showUI, setShowUI] = useState(false);
  const [storyPhase, setStoryPhase] = useState("story");

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

  const [onlineCount, setOnlineCount] = useState(0);
  const [visibleLevelCount, setVisibleLevelCount] = useState(0);

  const [showDiaryDrawer, setShowDiaryDrawer] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const [userName, setUserName] = useState(() => localStorage.getItem("trafficPuzzleUserName") || "");
  const [userCode, setUserCode] = useState(() => localStorage.getItem("trafficPuzzleUserCode") || "");
  const [loginCodeInput, setLoginCodeInput] = useState("");
  const [authError, setAuthError] = useState("");

  const [records, setRecords] = useState([]);

  const STORAGE_KEY = "trafficPuzzleUnlockedLevel";
  const [unlockedLevel, setUnlockedLevel] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? Number(saved) : 1;
  });

  const [cardIndex, setCardIndex] = useState(0);
  const [isPlayingCards, setIsPlayingCards] = useState(false);
  const [hasPlayedChapter2Cards, setHasPlayedChapter2Cards] = useState(false);
  const [chapter2PromptReady, setChapter2PromptReady] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, unlockedLevel);
  }, [unlockedLevel]);

  // ===== 第二關卡牌播放動畫 =====
  useEffect(() => {
    if (!hasStartedGame || currentChapter !== 3) return;
    if (storyPhase !== "task") return;
    if (!chapter2PromptReady || hasPlayedChapter2Cards) return;

    setCardIndex(0);
    setIsPlayingCards(true);
    setShowUI(false);
    setIsWrong(false);
    setShowHint(false);
    setUserInput("");

    let i = 0;

    const interval = setInterval(() => {
      setCardIndex(i);
      i++;

      if (i >= CHAPTER2_CARDS.length) {
        clearInterval(interval);

        setTimeout(() => {
          setIsPlayingCards(false);
          setShowUI(true);
          setHasPlayedChapter2Cards(true);
        }, 120);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [hasStartedGame, currentChapter, storyPhase, chapter2PromptReady, hasPlayedChapter2Cards]);

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
    setShowLoginModal(false);
    setShowLevelSelect(true);
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

    if (hasStartedGame) {
      const chapterData = CHAPTERS[currentChapter];
      const targetText =
        storyPhase === "story"
          ? chapterData.content
          : `${chapterData.taskTitle}\n${chapterData.taskContent}`;

      if (currentChapter === 3 && storyPhase === "task") {
        if (isPlayingCards) {
          setDisplayedText("");
          setShowUI(false);
          return;
        }

        setDisplayedText(targetText);

        if (!chapter2PromptReady && !hasPlayedChapter2Cards) {
          const timer = setTimeout(() => {
            setChapter2PromptReady(true);
          }, 900);

          return () => clearTimeout(timer);
        }

        if (hasPlayedChapter2Cards) {
          setShowUI(true);
        } else {
          setShowUI(false);
        }

        return;
      }

      setDisplayedText(targetText);
      setShowUI(true);
      return;
    }

    return () => clearInterval(interval);
  }, [
    userCode,
    hasStartedGame,
    showLevelSelect,
    currentChapter,
    storyPhase,
    isPlayingCards,
    hasPlayedChapter2Cards,
    chapter2PromptReady
  ]);

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
    setShowLoginModal(true);
    setAuthError("");
    setLoginCodeInput("");
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
    setCardIndex(0);
    setIsPlayingCards(false);
    setHasPlayedChapter2Cards(false);
    setChapter2PromptReady(false);
    setStoryPhase("story");
  };

  const handleStoryContinue = () => {
    setStoryPhase("task");
    setShowUI(false);
    setUserInput("");
    setIsWrong(false);
    setShowHint(false);
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
      setStoryPhase("story");
      setCardIndex(0);
      setIsPlayingCards(false);
      setHasPlayedChapter2Cards(false);
      setChapter2PromptReady(false);
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
    setStoryPhase("story");
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

          <h1 className="puzzle-title">
            {storyPhase === "story"
              ? CHAPTERS[currentChapter].title
              : CHAPTERS[currentChapter].taskTitle}
          </h1>

          {isPlayingCards && currentChapter === 3 && (
            <div className="card-display">
              <img
                src={CHAPTER2_CARDS[cardIndex]}
                alt={`chapter-2-card-${cardIndex + 1}`}
                className="card-image"
              />
            </div>
          )}

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
              {!isPlayingCards && (
                <>
                  <div className="typewriter-text">{displayedText}</div>

                  {showUI && storyPhase === "story" && (
                    <div className="input-area">
                      <button className="glow-btn" onClick={handleStoryContinue}>
                        繼續
                      </button>
                    </div>
                  )}

                  {showUI && storyPhase === "task" && (
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
            </>
          )}
        </div>
      )}

      {showLoginModal && (
        <div className="overlay transition-overlay">
          <div className="transition-card float-in-card">
            <h2 className="puzzle-title">🪪 玩家登入</h2>

            <div style={{
              fontSize: "17px",
              lineHeight: "1.7",
              color: "#5a4c3c",
              marginBottom: "18px",
              textAlign: "left",
              whiteSpace: "pre-wrap"
            }}>
              請輸入主辦方提供的活動碼。只有有效活動碼才能進入作答頁面。
            </div>

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
              <button
                className="back-cancel-btn"
                onClick={() => {
                  setShowLoginModal(false);
                  setAuthError("");
                  setLoginCodeInput("");
                }}
              >
                取消
              </button>
            </div>

            {authError && (
              <div style={{
                marginTop: "14px",
                color: "#c0392b",
                fontSize: "16px",
                fontWeight: "bold"
              }}>
                {authError}
              </div>
            )}
          </div>
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