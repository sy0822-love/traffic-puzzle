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
    concept: "無障礙坡道需要符合安全比例，否則看似短短幾階的高度，也會變成輪椅使用者難以跨越的斷點。",
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
    concept: "街道上的機車、變電箱與違規招牌，會壓縮行人空間，讓原本應該安全通行的路變成障礙。",
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
    answer: "3",
    concept: "交通資訊過多、出現太快或擺放混亂時，會造成資訊過載，使行人難以及時做出正確判斷。",
    nextMsg: "你成功抓住了混亂中的秩序..."
  },
  4: {
    title: "【3-1 劇情：被迫繞遠的路】",
    content: `有些路看起來通往同一個方向，真正走上去才知道差別。對行動不便的人來說，一次不合理的繞路，不只是多花幾分鐘，而是體力、時間與尊嚴的消耗。

當城市只替速度最快的人設計路線，其他人的需求就會被推到邊角。那些被迫繞遠的軌跡，其實都是城市沒有被看見的缺口。`,
    taskTitle: "【實體操作提示】",
    taskContent: `請觀察實體路線圖，找出最不友善的繞行路徑。
請比較直接路線與替代路線的差異，並輸入你得到的答案。`,
    answer: "4",
    concept: "交通設計不能只追求最快路徑，也需要照顧不同族群的移動成本與可達性。",
    nextMsg: "你看見了繞路背後被忽略的成本..."
  },
  5: {
    title: "【4-1 劇情：城市的回信】",
    content: `當最後一封信被打開時，郵袋裡不再只是線索，而是這座城市給出的回信。每一個坡道、每一條人行道、每一次號誌等待，都在回答同一個問題：這座城市願不願意讓所有人安全抵達？

真正的交通安全，不只是避免事故，而是讓每一個人都能被考慮、被尊重、被接住。`,
    taskTitle: "【實體操作提示】",
    taskContent: `請回顧前面所有任務中發現的問題。
整理你認為最重要的交通安全觀念，並輸入最後答案完成挑戰。`,
    answer: "5",
    concept: "交通安全需要整體規劃，包含無障礙、路權、資訊設計與行人安全，而不是只解決單一問題。",
    nextMsg: "你完成了所有調查，城市的盲點正在被重新看見。"
  }
}

const LEVEL_FILES = [
  { id: 1, code: "FILE 01", label: "1-1", icon: "🧭", title: "斷裂的終點", theme: "無障礙坡道調查", desc: "量測郵局石階高度，摺出合乎比例的坡道設計。" },
  { id: 2, code: "FILE 02", label: "1-2", icon: "🚧", title: "剝離冷漠的偽裝", theme: "街道障礙辨識", desc: "撕下混亂街景中的障礙物，找出被遮蔽的答案。" },
  { id: 3, code: "FILE 03", label: "2-1", icon: "🧠", title: "霓虹下的盲點", theme: "記憶與號誌挑戰", desc: "觀察高速閃現的路標卡牌，在混亂中捕捉順序。" },
  { id: 4, code: "FILE 04", label: "3-1", icon: "🛣️", title: "被迫繞遠的路", theme: "可達性與路線成本", desc: "比較不同移動路徑，理解繞路背後的交通不平等。" },
  { id: 5, code: "FILE 05", label: "4-1", icon: "🏙️", title: "城市的回信", theme: "整體交通安全回顧", desc: "整合所有任務線索，完成最後的城市安全觀念挑戰。" }
];

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
  const [wrongChapters, setWrongChapters] = useState({});

  const [showChapterTransition, setShowChapterTransition] = useState(false);
  const [transitionMessage, setTransitionMessage] = useState("");
  const [isGameFinished, setIsGameFinished] = useState(false);

  const [onlineCount, setOnlineCount] = useState(0);
  const [visibleLevelCount, setVisibleLevelCount] = useState(0);

  const [showDiaryDrawer, setShowDiaryDrawer] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isEnvelopeOpening, setIsEnvelopeOpening] = useState(false);

  const [userName, setUserName] = useState(() => localStorage.getItem("trafficPuzzleUserName") || "");
  const [userCode, setUserCode] = useState(() => localStorage.getItem("trafficPuzzleUserCode") || "");
  const [loginCodeInput, setLoginCodeInput] = useState("");
  const [authError, setAuthError] = useState("");

  const [records, setRecords] = useState([]);
  const [showNotebook, setShowNotebook] = useState(false);
  const [notebookPage, setNotebookPage] = useState(1);

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
    setIsEnvelopeOpening(true);
    setAuthError("");
    setLoginCodeInput("");
    setShowDiaryDrawer(false);

    setTimeout(() => {
      setShowLoginModal(true);
    }, 1250);
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

  const getUniqueRecords = (sourceRecords = records) => {
    const map = new Map();

    sourceRecords.forEach((record) => {
      if (!record?.puzzle_id || map.has(record.puzzle_id)) return;
      map.set(record.puzzle_id, record);
    });

    return Array.from(map.values()).sort((a, b) => {
      const aLevel = Number(String(a.puzzle_id).replace("puzzle_0", ""));
      const bLevel = Number(String(b.puzzle_id).replace("puzzle_0", ""));
      return aLevel - bLevel;
    });
  };

  const getCompletedRecords = () => getUniqueRecords(records).filter((record) => {
    const level = Number(String(record.puzzle_id).replace("puzzle_0", ""));
    return CHAPTERS[level];
  });

  const handleLevelComplete = async () => {
    const chapterData = CHAPTERS[currentChapter];
    const trimmedAnswer = userInput.trim();

    if (trimmedAnswer === chapterData.answer) {
      const now = Date.now();
      const finalQuestionSeconds = questionStartTime
        ? Math.max(0, Math.floor((now - questionStartTime) / 1000))
        : questionElapsedTime;

      setQuestionElapsedTime(finalQuestionSeconds);
      setQuestionStartTime(null);

      const puzzleId = `puzzle_0${currentChapter}`;
      const alreadyPassed = records.some((record) => record.puzzle_id === puzzleId);
      const wasWrongBeforeCorrect = Boolean(wrongChapters[currentChapter]);
      let nextRecords = records;

      if (!alreadyPassed) {
        const existingCompleted = getUniqueRecords(records);
        const nextTotalSeconds = existingCompleted.reduce(
          (sum, record) => sum + Number(record.time_seconds || 0),
          0
        ) + finalQuestionSeconds;

        const localRecord = {
          id: `local-${Date.now()}`,
          userCode,
          userName,
          puzzle_id: puzzleId,
          time_seconds: finalQuestionSeconds,
          total_seconds: nextTotalSeconds,
          wrong: wasWrongBeforeCorrect,
          timestamp: { seconds: Math.floor(now / 1000) }
        };

        nextRecords = [localRecord, ...records];
        setRecords(nextRecords);
        setTotalElapsedTime(nextTotalSeconds);

        try {
          await addDoc(collection(db, "learning_results"), {
            userCode,
            userName,
            puzzle_id: puzzleId,
            time_seconds: finalQuestionSeconds,
            total_seconds: nextTotalSeconds,
            wrong: wasWrongBeforeCorrect,
            timestamp: serverTimestamp()
          });
          console.log("Firebase 上傳成功");
        } catch (e) {
          console.error("Firebase 上傳失敗：", e);
        }
      }

      setTransitionMessage(chapterData.nextMsg);
      setShowChapterTransition(true);
      return;
    }

    setWrongChapters((prev) => ({
      ...prev,
      [currentChapter]: true
    }));
    setIsWrong(true);
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
    setQuestionStartTime(null);
    setStoryPhase("story");
  };

  const getResultStats = () => {
    const completedRecords = getCompletedRecords();
    const completedCount = completedRecords.length;
    const completionRate = Math.round((completedCount / 5) * 100);
    const longestRecord = completedRecords.length
      ? completedRecords.reduce((max, record) =>
          Number(record.time_seconds || 0) > Number(max.time_seconds || 0) ? record : max
        )
      : null;
    const wrongRecords = completedRecords.filter((record) => record.wrong);

    return {
      completedRecords,
      completedCount,
      completionRate,
      longestRecord,
      wrongRecords
    };
  };

  const handleDownloadResult = () => {
    const { completedRecords, completionRate, longestRecord, wrongRecords } = getResultStats();
    const canvas = document.createElement("canvas");
    const scale = 2;
    canvas.width = 900 * scale;
    canvas.height = 1200 * scale;
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);

    ctx.fillStyle = "#06231f";
    ctx.fillRect(0, 0, 900, 1200);

    const gradient = ctx.createLinearGradient(0, 0, 900, 1200);
    gradient.addColorStop(0, "rgba(67, 209, 175, 0.28)");
    gradient.addColorStop(1, "rgba(216, 160, 71, 0.18)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 900, 1200);

    ctx.fillStyle = "#f6fffb";
    ctx.font = "bold 48px sans-serif";
    ctx.fillText("Traffic Puzzle 挑戰成果", 70, 95);

    ctx.fillStyle = "#f0d58a";
    ctx.font = "bold 30px sans-serif";
    ctx.fillText(`完成率：${completionRate}%`, 70, 155);

    ctx.fillStyle = "rgba(237,255,248,0.88)";
    ctx.font = "24px sans-serif";
    ctx.fillText(`最卡關：${longestRecord ? `第${String(longestRecord.puzzle_id).replace("puzzle_0", "")}關（${longestRecord.time_seconds}s）` : "尚無"}`, 70, 205);

    let y = 280;
    ctx.fillStyle = "#9fe7d5";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText("每關時間", 70, y);
    y += 42;

    completedRecords.forEach((record) => {
      const level = Number(String(record.puzzle_id).replace("puzzle_0", ""));
      const barWidth = Math.min(560, Math.max(24, Number(record.time_seconds || 0) * 18));

      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(70, y - 22, 620, 28);
      ctx.fillStyle = "#d8a047";
      ctx.fillRect(70, y - 22, barWidth, 28);
      ctx.fillStyle = "#f6fffb";
      ctx.font = "22px sans-serif";
      ctx.fillText(`第${level}關  ${record.time_seconds}s${record.wrong ? "  曾答錯" : ""}`, 710, y);
      y += 54;
    });

    y += 30;
    ctx.fillStyle = "#f0d58a";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText("錯題觀念回顧", 70, y);
    y += 42;

    if (wrongRecords.length === 0) {
      ctx.fillStyle = "rgba(237,255,248,0.82)";
      ctx.font = "22px sans-serif";
      ctx.fillText("本次挑戰沒有留下錯題紀錄。", 70, y);
    } else {
      wrongRecords.forEach((record) => {
        const level = Number(String(record.puzzle_id).replace("puzzle_0", ""));
        const concept = CHAPTERS[level]?.concept || "請回顧該關交通安全觀念。";
        ctx.fillStyle = "#f6fffb";
        ctx.font = "bold 22px sans-serif";
        ctx.fillText(`第${level}關`, 70, y);
        y += 30;
        ctx.fillStyle = "rgba(237,255,248,0.78)";
        ctx.font = "20px sans-serif";
        const words = concept.split("");
        let line = "";
        const maxWidth = 740;
        words.forEach((char) => {
          const testLine = line + char;
          if (ctx.measureText(testLine).width > maxWidth) {
            ctx.fillText(line, 70, y);
            y += 28;
            line = char;
          } else {
            line = testLine;
          }
        });
        if (line) ctx.fillText(line, 70, y);
        y += 48;
      });
    }

    const link = document.createElement("a");
    link.download = "traffic-puzzle-result.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleFinishChallenge = () => {
    setIsGameFinished(false);
    setHasStartedGame(false);
    setShowLevelSelect(false);
    setShowChapterTransition(false);
    setShowDiaryDrawer(false);
    setShowExitConfirm(false);
    setIsWrong(false);
    setShowHint(false);
    setUserInput("");
    setDisplayedText("");
    setShowUI(false);
    setQuestionElapsedTime(0);
    setQuestionStartTime(null);
    setStoryPhase("story");
    setIsEnvelopeOpening(false);
    setShowNotebook(false);
    setNotebookPage(1);
  };

  const levelClasses = (level, unlocked) => {
    const visible = visibleLevelCount >= level ? "visible" : "";
    const stateClass = unlocked ? "unlocked" : "locked";
    return `level-node-full ${stateClass} ${visible}`;
  };


  const notebookCompletedRecords = getCompletedRecords();
  const notebookCompletedCount = notebookCompletedRecords.length;
  const notebookCurrentFile = LEVEL_FILES.find((file) => file.id === notebookPage) || LEVEL_FILES[0];
  const notebookCurrentRecord = notebookCompletedRecords.find(
    (record) => record.puzzle_id === `puzzle_0${notebookPage}`
  );

  const openNotebook = () => {
    setNotebookPage(Math.min(Math.max(notebookCompletedCount || 1, 1), 5));
    setShowNotebook(true);
  };

  const goNotebookPrev = () => {
    setNotebookPage((prev) => Math.max(1, prev - 1));
  };

  const goNotebookNext = () => {
    setNotebookPage((prev) => Math.min(5, prev + 1));
  };

  return (
    <div className={`main-container ${!hasStartedGame && showLevelSelect ? "level-select-mode" : ""} ${!hasStartedGame && !showLevelSelect ? "home-mode" : ""}`}>
      {!hasStartedGame && !showLevelSelect ? (
        <>
          <div className={`home-hero ${isEnvelopeOpening ? "home-hero-opening" : ""}`}>
            <button
              className="diary-icon-btn hero-diary-btn"
              onClick={() => setShowDiaryDrawer(true)}
              aria-label="開啟日記側邊欄"
              title="日記"
            >
              📔
            </button>

            <section className="hero-copy">
              <div className="hero-kicker">Traffic Puzzle Web App</div>
              <h1 className="hero-title">致新進郵差的一封信</h1>
              <div className="typewriter-text hero-letter-text">{displayedText}</div>
              {showUI && (
                <button className="glow-btn hero-start-btn" onClick={handleOpenLevelSelect}>
                  開始探險吧
                </button>
              )}
            </section>

            <section className="hero-visual" aria-hidden="true">
              <div className={`envelope-stage ${isEnvelopeOpening ? "is-open" : ""}`}>
                <div className="envelope-glow"></div>
                <div className="floating-letter">
                  <div className="floating-letter-pattern"></div>
                  <div className="floating-letter-postmark">POST</div>
                  <div className="floating-letter-symbol">✉</div>
                  <div className="floating-letter-caption">Traffic Puzzle</div>
                  <div className="floating-letter-route">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <div className="floating-letter-line long"></div>
                  <div className="floating-letter-line"></div>
                  <div className="floating-letter-line short"></div>
                </div>
                <div className="envelope-body">
                  <div className="envelope-back"></div>
                  <div className="envelope-flap"></div>
                  <div className="envelope-front-left"></div>
                  <div className="envelope-front-right"></div>
                  <div className="envelope-seal"></div>
                </div>
              </div>
            </section>
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
        <div className="level-select-screen mission-files-screen">
          <button className="field-notebook-trigger" onClick={openNotebook} aria-label="開啟闖關紀錄">
            <span className="field-notebook-art" aria-hidden="true">
              <span className="field-notebook-art-cover"></span>
              <span className="field-notebook-art-pages"></span>
              <span className="field-notebook-art-band"></span>
            </span>
            <span className="field-notebook-label">闖關紀錄</span>
          </button>
          <div className="level-select-header mission-files-header">
            <div className="mission-kicker">CONFIDENTIAL CITY CASES</div>
            <h1 className="level-select-title">任務檔案</h1>
            <p className="level-select-subtitle">請選擇你要開啟的調查信件</p>
          </div>

          <div className="mission-files-grid">
            {LEVEL_FILES.map((file, index) => {
              const isUnlocked = unlockedLevel >= file.id && Boolean(CHAPTERS[file.id]);
              const isCompleted = unlockedLevel > file.id;
              const statusText = isCompleted ? "已完成" : isUnlocked ? "可開始" : "未解封";

              return (
                <button
                  key={file.id}
                  className={`mission-file-card ${isUnlocked ? "unlocked" : "locked"} ${isCompleted ? "completed" : ""}`}
                  onClick={() => handleStartGame(file.id)}
                  disabled={!isUnlocked}
                  style={{ animationDelay: `${0.12 + index * 0.1}s` }}
                >
                  <div className="mission-file-topline">
                    <span>{file.code}</span>
                    <span className="mission-status">
                      <span className="mission-status-dot"></span>
                      {statusText}
                    </span>
                  </div>

                  <div className="mission-file-seal" aria-hidden="true">
                    {isUnlocked ? file.icon : "🔒"}
                  </div>

                  <div className="mission-file-label">{file.label}</div>
                  <h2 className="mission-file-title">{file.title}</h2>
                  <p className="mission-file-theme">{file.theme}</p>
                  <p className="mission-file-desc">{file.desc}</p>

                  <div className="mission-file-footer" aria-hidden="true">
                    <span>→</span>
                  </div>
                </button>
              );
            })}
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
                  setIsEnvelopeOpening(false);
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



      {showNotebook && (
        <div className="field-notebook-overlay" onClick={() => setShowNotebook(false)}>
          <div className="field-notebook-book" onClick={(event) => event.stopPropagation()}>
            <button
              className="field-notebook-close"
              onClick={() => setShowNotebook(false)}
              aria-label="關閉闖關紀錄"
            >
              ×
            </button>

            <section className="field-notebook-left-page">
              <div className="field-notebook-badge">FIELD RECORD</div>
              <div className="field-notebook-drawn-book" aria-hidden="true">
                <span className="drawn-book-cover"></span>
                <span className="drawn-book-page"></span>
                <span className="drawn-book-ribbon"></span>
              </div>
              <h2>闖關紀錄</h2>
              <p>即時記錄你的任務進度、劇情線索與每關通關時間。</p>
              <div className="field-notebook-progress-small">
                <span>目前進度</span>
                <strong>{notebookCompletedCount}/5</strong>
              </div>
              <div className="field-notebook-progress-track">
                <span style={{ width: `${Math.round((notebookCompletedCount / 5) * 100)}%` }}></span>
              </div>
            </section>

            <section className="field-notebook-right-page">
              <div className="field-notebook-page-head">
                <button onClick={goNotebookPrev} disabled={notebookPage === 1}>‹</button>
                <div>
                  <span>PAGE {notebookPage}/5</span>
                  <h3>{notebookCurrentFile.label}｜{notebookCurrentFile.title}</h3>
                </div>
                <button onClick={goNotebookNext} disabled={notebookPage === 5}>›</button>
              </div>

              <div className={`field-notebook-status ${notebookCurrentRecord ? "done" : "pending"}`}>
                {notebookCurrentRecord ? `已完成・${notebookCurrentRecord.time_seconds}s` : "尚未完成"}
              </div>

              <div className="field-notebook-entry">
                <h4>劇情紀錄</h4>
                <p>{CHAPTERS[notebookPage]?.title || notebookCurrentFile.title}</p>
              </div>

              <div className="field-notebook-entry">
                <h4>觀念筆記</h4>
                <p>{CHAPTERS[notebookPage]?.concept || "完成此關後，這裡會留下你的觀念紀錄。"}</p>
              </div>

              <div className="field-notebook-entry compact">
                <h4>五頁索引</h4>
                <div className="field-notebook-page-dots">
                  {[1, 2, 3, 4, 5].map((level) => {
                    const hasRecord = notebookCompletedRecords.some((record) => record.puzzle_id === `puzzle_0${level}`);
                    return (
                      <button
                        key={level}
                        className={`${notebookPage === level ? "active" : ""} ${hasRecord ? "done" : ""}`}
                        onClick={() => setNotebookPage(level)}
                      >
                        {level}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>
        </div>
      )}

      {isGameFinished && (() => {
        const { completedRecords, completedCount, completionRate, longestRecord, wrongRecords } = getResultStats();

        return (
          <div className="result-screen" id="result-screen">
            <div className="result-panel">
              <div className="result-kicker">MISSION COMPLETE</div>
              <h1 className="result-title">挑戰成果回顧</h1>
              <p className="result-subtitle">
                這份回顧整理了你的通關時間、完成進度，以及曾經答錯的觀念。
              </p>

              <div className="result-summary-grid">
                <div className="result-summary-card">
                  <span>完成進度</span>
                  <strong>{completedCount}/5</strong>
                </div>
                <div className="result-summary-card">
                  <span>完成率</span>
                  <strong>{completionRate}%</strong>
                </div>
                <div className="result-summary-card">
                  <span>最卡關</span>
                  <strong>
                    {longestRecord
                      ? `第${String(longestRecord.puzzle_id).replace("puzzle_0", "")}關`
                      : "尚無"}
                  </strong>
                </div>
              </div>

              <section className="result-section">
                <h2>每關作答時間</h2>
                <div className="result-bars">
                  {[1, 2, 3, 4, 5].map((level) => {
                    const record = completedRecords.find((item) => item.puzzle_id === `puzzle_0${level}`);
                    const seconds = Number(record?.time_seconds || 0);
                    const maxSeconds = Math.max(...completedRecords.map((item) => Number(item.time_seconds || 0)), 1);
                    const width = record ? Math.max(10, Math.round((seconds / maxSeconds) * 100)) : 0;

                    return (
                      <div className="result-bar-row" key={level}>
                        <div className="result-bar-label">第{level}關</div>
                        <div className="result-bar-track">
                          <div className="result-bar-fill" style={{ width: `${width}%` }}></div>
                        </div>
                        <div className="result-bar-value">{record ? `${seconds}s` : "未完成"}</div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="result-section">
                <h2>錯題觀念回顧</h2>
                {wrongRecords.length === 0 ? (
                  <div className="result-concept-card success">
                    本次挑戰沒有留下錯題紀錄，代表你在首次通關前沒有答錯。
                  </div>
                ) : (
                  <div className="result-concepts">
                    {wrongRecords.map((record) => {
                      const level = Number(String(record.puzzle_id).replace("puzzle_0", ""));
                      return (
                        <div className="result-concept-card" key={record.puzzle_id}>
                          <strong>第{level}關曾答錯</strong>
                          <p>{CHAPTERS[level]?.concept || "請回顧該關交通安全觀念。"}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <div className="result-actions">
                <button className="glow-btn" onClick={handleDownloadResult}>📸 保存圖片</button>
                <button className="back-cancel-btn" onClick={handleFinishChallenge}>🏁 已結束挑戰</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default App;