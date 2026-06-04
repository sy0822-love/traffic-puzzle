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
import { ref, set, onValue, onDisconnect, remove } from 'firebase/database';
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
import mysteryCityBg from "./assets/mystery-city-bg.png";
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
const CASE_FILES = [
  {
    id: "CASE-01",
    code: "FILE 01",
    title: "搶回走路專用道！",
    subtitle: "路上車子那麼多，行人到底要走哪？我們要一起找出為什麼路上沒有「走路專屬特區」，幫行人搶回可以安心散步的地面空間。",
    icon: "walk",
    theme: "green",
    levels: [1, 2, 3]
  },

  {
    id: "CASE-02",
    code: "FILE 02",
    title: "斑馬線真的是保命符？",
    subtitle: "別以為踩在斑馬線上就絕對安全！我們要睜大眼睛，找出隱藏在這些黑白條紋裡的危險陷阱，看看車子是不是真的會看到並讓路。",
    icon: "crosswalk",
    theme: "red",
    levels: [4]
  },

  {
    id: "CASE-03",
    code: "FILE 03",
    title: "路口的人車大塞車",
    subtitle: "綠燈一亮，轉彎的車子和直行的人全部擠在路口，差點撞成一團！我們要找出為什麼人跟車會在這裡「狹路相逢」、互不相讓。",
    icon: "car",
    theme: "yellow",
    levels: [5]
  }
];
const CHAPTERS = {
  1: {
    title: "1-1 烈日下的差事",
    content: ``,
    taskTitle: "【系統提示】",
    taskContent: `請拿出綠色解謎包
取出街區圖並打開劇情提示：`,
    answer: "1",
    concept: "一條合格的人行道，必須保留足夠寬度，並避免障礙物阻擋，才能讓行人、輪椅使用者與推嬰兒車的人安全通行。",
    nextMsg: "你完成了第一份街區調查，開始看見道路中被忽略的行人空間。"
  },

  2: {
    title: "1-2 狹縫中的選擇",
    content: ``,
    taskTitle: "【系統提示】",
    taskContent: `請拿出超商收據與信封袋，搭配劇情提示
推論出藏在其中的秘密吧！`,
    answer: "2",
    concept: "騎樓與人行空間雖然看似平常，卻常因停車、堆放物品或私人使用而壓縮通行寬度，使行人被迫在狹縫中移動。",
    nextMsg: "你找出了藏在收據與信封中的線索，也理解了狹窄通行空間背後的問題。"
  },

  3: {
    title: "1-3 消失的下班準星",
    content: ``,
    taskTitle: "【系統提示】",
    taskContent: `請拿出綠色解謎包中的劇情提示與圖卡
找出周邊隱藏的綠色怪獸傳達的訊息吧！`,
    answer: "3",
    concept: "人行道的存在是為了行人，而不是為了放置變電箱、路燈、公車站牌或其他障礙物。當障礙物佔據通行空間時，行人的安全路權就會被壓縮。",
    nextMsg: "你破解了綠色怪獸留下的訊息，也發現人行道上被忽略的障礙。"
  },

  4: {
    title: "2-1 碎裂的斑馬線",
    content: ``,
    taskTitle: "【系統提示】",
    taskContent: `請拿出綠色解謎包中的催繳通知信封與街區圖卡。
抬頭尋找黑匣子裡的奔跑行者，動手收攏這段不合理的危險長廊吧！`,
    answer: "4",
    concept: "斑馬線不是畫上去就代表安全。若穿越距離過長、號誌時間不足或視線不清，行人仍可能暴露在危險的道路環境中。",
    nextMsg: "你收攏了危險長廊，也看見斑馬線背後真正需要被修正的問題。"
  },

  5: {
    title: "3-1 暫定關卡",
    content: ``,
    taskTitle: "【系統提示】",
    taskContent: `此關卡內容暫定中，請依現場紙本任務提示進行操作，並在系統輸入答案完成挑戰。`,
    answer: "5",
    concept: "交通安全需要整體規劃，包含無障礙、路權、資訊設計與行人安全，而不是只解決單一問題。",
    nextMsg: "你完成了所有調查，城市的盲點正在被重新看見。"
  }
}

const LEVEL_FILES = [
  {
    id: 1,
    requiredLevel: null,
    code: "FILE 01",
    label: "1-1",
    icon: "🧭",
    title: "烈日下的差事",
    theme: "街區圖與劇情提示",
    desc: "拿出綠色解謎包，取出街區圖並打開劇情提示。"
  },
  {
    id: 2,
    requiredLevel: 1,
    code: "FILE 02",
    label: "1-2",
    icon: "🧾",
    title: "狹縫中的選擇",
    theme: "收據與信封袋推理",
    desc: "拿出超商收據與信封袋，搭配劇情提示推論秘密。"
  },
  {
    id: 3,
    requiredLevel: 2,
    code: "FILE 03",
    label: "1-3",
    icon: "🟢",
    title: "消失的下班準星",
    theme: "圖卡與隱藏訊息",
    desc: "拿出劇情提示與圖卡，找出綠色怪獸傳達的訊息。"
  },
  {
    id: 4,
    requiredLevel: 3,
    code: "FILE 04",
    label: "2-1",
    icon: "🚶",
    title: "碎裂的斑馬線",
    theme: "斑馬線與危險長廊",
    desc: "拿出催繳通知信封與街區圖卡，收攏不合理的危險長廊。"
  },
  {
    id: 5,
    requiredLevel: 4,
    code: "FILE 05",
    label: "3-1",
    icon: "🏙️",
    title: "暫定關卡",
    theme: "紙本任務提示",
    desc: "依照現場紙本任務提示進行操作。"
  }
];
const NOTEBOOK_PAGES = [
  {
    type: "cover",
    title: "FIELD RECORDS",
    subtitle: "城市交通筆記",
    content:
      "這本筆記會在你完成關卡後，留下每一關的交通安全知識重點。"
  },
  {
    type: "toc",
    title: "目錄",
    chapters: [
      {
        id: "case-01",
        code: "01",
        title: "搶回走路專用道！",
        bookPage: 2
      },
      {
        id: "case-02",
        code: "02",
        title: "斑馬線真的是保命符？",
        bookPage: 5
      },
      {
        id: "case-03",
        code: "03",
        title: "路口的人車大塞車",
        bookPage: 6
      }
    ]
  },
  {
    type: "level",
    chapterCode: "01",
    level: 1
  },
  {
    type: "level",
    chapterCode: "01",
    level: 2
  },
  {
    type: "level",
    chapterCode: "01",
    level: 3
  },
  {
    type: "level",
    chapterCode: "02",
    level: 4
  },
  {
    type: "level",
    chapterCode: "03",
    level: 5
  }
];

const NOTEBOOK_LEVEL_NOTES = {
  1: {
    title: "1-1 人行道的重要性",
    content:
      "你知道嗎？腳下看似普通的磚道，其實隱藏著都市的貼心設計：一條合格的人行道，必須留出至少 1.5 公尺寬度、且絕對不能有任何路燈或電箱阻擋的「步行通行空間」，才能讓坐輪椅或推嬰兒車的人安全通過喔！"
  },
  2: {
    title: "1-2 騎樓不停車",
    content:
      "腳下這片騎樓，是台灣都市最奇妙的灰色地帶：它承載著私人的產權，卻也肩負著大眾通行的義務，這份空間的複雜歸屬，其實正考驗著每個人用「讓步」去成就彼此的智慧。"
  },
  3: {
    title: "1-3 人行道上的障礙物",
    content:
      "人行道的存在是為了「人」，而不是為了擺放變電箱、路燈和公車站牌。當我們習慣在狹縫中與變電箱擦身而過時，其實已經默默讓出了原本屬於我們的安全路權。"
  },
  4: {
    title: "2-1 斑馬線安全性",
    content:
      "斑馬線不是絕對安全的保命符。真正的安全來自清楚視線、駕駛停讓、合理號誌，以及讓行人能被看見的道路設計。"
  },
  5: {
    title: "3-1 路口的人車衝突",
    content:
      "路口是行人與車輛最容易交會的地方。當轉彎車、直行行人與號誌時間沒有被妥善安排時，就容易形成危險的人車衝突。"
  }
};

function CaseFileIcon({ type }) {
  if (type === "walk") {

  return (
      <svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="21" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
        <path d="M21 13V24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M13 18L21 15L29 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M20 24L14 36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M22 24L30 36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M7 36H35" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
      </svg>
    );
  }

  if (type === "crosswalk") {
    return (
      <svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 34H34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M13 30L17 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M21 30V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M29 30L25 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="21" cy="9" r="3.5" stroke="currentColor" strokeWidth="2" />
        <path d="M15 16H27" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M10 24H32" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
      </svg>
    );
  }

  return (
    <svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 25L13 17C13.6 15.2 15.2 14 17.1 14H24.9C26.8 14 28.4 15.2 29 17L32 25" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M9 25H33V32H9V25Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="15" cy="32" r="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="27" cy="32" r="3" stroke="currentColor" strokeWidth="2" />
      <path d="M15 20H27" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.6" />
      <path d="M7 13L12 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
      <path d="M35 13L30 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}


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
  const [notebookView, setNotebookView] = useState("index");
  const [currentBookPage, setCurrentBookPage] = useState(0);
  const [selectedNotebookCase, setSelectedNotebookCase] = useState(null);
  const [expandedCaseId, setExpandedCaseId] = useState(null);

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
  if (userCode) {
    remove(ref(rtdb, `online_users/${userCode}/sessions/${onlineUserId}`))
      .catch((error) => {
        console.error("移除在線狀態失敗：", error);
      });
  }

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
  if (!userCode) {
    setOnlineCount(0);
    return;
  }

  const connectedRef = ref(rtdb, ".info/connected");
  const userSessionRef = ref(
    rtdb,
    `online_users/${userCode}/sessions/${onlineUserId}`
  );
  const onlineUsersRef = ref(rtdb, "online_users");

  const unsubscribeConnected = onValue(connectedRef, async (snapshot) => {
    if (snapshot.val() !== true) return;

    try {
      await onDisconnect(userSessionRef).remove();

      await set(userSessionRef, {
        online: true,
        userCode,
        userName,
        sessionId: onlineUserId,
        lastSeen: Date.now()
      });
    } catch (error) {
      console.error("設定即時在線狀態失敗：", error);
    }
  });

  const unsubscribeOnlineUsers = onValue(
    onlineUsersRef,
    (snapshot) => {
      const data = snapshot.val() || {};

      const activeAccountCount = Object.values(data).filter((user) => {
        return user?.sessions && Object.keys(user.sessions).length > 0;
      }).length;

      setOnlineCount(activeAccountCount);
    },
    (error) => {
      console.error("監聽在線人數失敗：", error);
    }
  );

  return () => {
    unsubscribeConnected();
    unsubscribeOnlineUsers();

    remove(userSessionRef).catch((error) => {
      console.error("清除在線狀態失敗：", error);
    });
  };
}, [userCode, userName, onlineUserId]);

  const formatTime = (seconds) => {
    const mm = Math.floor(seconds / 60).toString().padStart(2, "0");
    const ss = (seconds % 60).toString().padStart(2, "0");
    return `${mm}:${ss}`;
  };

  const handleOpenLevelSelect = () => 
  {
  setIsEnvelopeOpening(true);

  setAuthError("");
  setLoginCodeInput("");

  setShowDiaryDrawer(false);
  };

  const handleStartGame = (level = 1) => {
    const now = Date.now();
    const shouldStartTotalTimer = level === 1 || !gameStartTime;

    setHasStartedGame(true);
    setShowLevelSelect(false);
    setShowDiaryDrawer(false);
    setShowExitConfirm(false);
    setCurrentChapter(level);

    // 總計時：從點進第一關開始算，直到最後一關完成。
    // 若從其他關卡直接進入，視為測試情境，從當下開始。
    setGameStartTime(shouldStartTotalTimer ? now : gameStartTime);

    setQuestionStartTime(now);
    setQuestionElapsedTime(0);

    if (shouldStartTotalTimer) {
      setTotalElapsedTime(0);
    }

    setCardIndex(0);
    setIsPlayingCards(false);
    setHasPlayedChapter2Cards(false);
    setChapter2PromptReady(false);
    setStoryPhase("task");
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
  useEffect(() => {
  if (!userCode) {
    setUnlockedLevel(1);
    return;
  }

  const completedLevels = getCompletedRecords()
    .map((record) => Number(String(record.puzzle_id).replace("puzzle_0", "")))
    .filter((level) => Number.isFinite(level));

  const maxCompletedLevel = completedLevels.length
    ? Math.max(...completedLevels)
    : 0;

  const nextUnlockedLevel = Math.min(
    maxCompletedLevel + 1,
    Object.keys(CHAPTERS).length + 1
  );

  setUnlockedLevel((prev) => {
    if (prev === nextUnlockedLevel) return prev;
    return nextUnlockedLevel;
  });
}, [records, userCode]);

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
  const nextTotalSeconds = gameStartTime
    ? Math.max(0, Math.floor((now - gameStartTime) / 1000))
    : finalQuestionSeconds;

  let rankAtCompletion = null;

  try {
    const rankingQuery = query(
      collection(db, "learning_results"),
      where("puzzle_id", "==", puzzleId)
    );

    const rankingSnapshot = await getDocs(rankingQuery);

    const samePuzzleRecords = rankingSnapshot.docs.map((doc) => doc.data());

    const fasterCount = samePuzzleRecords.filter((record) => {
      return Number(record.time_seconds || Infinity) < finalQuestionSeconds;
    }).length;

    rankAtCompletion = fasterCount + 1;
  } catch (error) {
    console.error("計算即時排名失敗：", error);
  }

        const localRecord = {
          id: `local-${Date.now()}`,
          userCode,
          userName,
          puzzle_id: puzzleId,
          time_seconds: finalQuestionSeconds,
          total_seconds: nextTotalSeconds,
          rank_at_completion: rankAtCompletion,
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
          rank_at_completion: rankAtCompletion,
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
      setStoryPhase("task");
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
  );const openNotebook = () => {
    setNotebookView("index");
    setSelectedNotebookCase(null);
    setNotebookPage(1);
    setCurrentBookPage(0);
    setShowNotebook(true);
  };
  const goNotebookPrev = () => {
    setNotebookPage((prev) => Math.max(1, prev - 1));
  };

  const goNotebookNext = () => {
    setNotebookPage((prev) => Math.min(5, prev + 1));
  };

  const nextBookPage = () => {
    setCurrentBookPage((prev) =>
      Math.min(prev + 1, NOTEBOOK_PAGES.length - 1)
    );
  };

  const prevBookPage = () => {
    setCurrentBookPage((prev) =>
      Math.max(prev - 1, 0)
    );
  };

  const isNotebookLevelCompleted = (level) =>
    notebookCompletedRecords.some(
      (record) => record.puzzle_id === `puzzle_0${level}`
    );
  const getNotebookLevelRecord = (level) =>
  notebookCompletedRecords.find(
    (record) => record.puzzle_id === `puzzle_0${level}`
  );

  const jumpToNotebookPage = (targetPage) => {
    setCurrentBookPage(targetPage);
  };

  const renderNotebookPage = (page, side = "left") => {
    const pageRadius = side === "left" ? "22px 6px 6px 22px" : "6px 22px 22px 6px";
    const pageShadow =
      side === "left"
        ? "inset -18px 0 30px rgba(32, 24, 10, 0.14)"
        : "inset 18px 0 30px rgba(32, 24, 10, 0.12)";

    const basePageStyle = {
      minHeight: "520px",
      padding: side === "left" ? "34px 34px 30px 54px" : "34px",
      borderRadius: pageRadius,
      background:
        "linear-gradient(135deg, rgba(239, 222, 180, 0.96), rgba(207, 183, 134, 0.92))",
      boxShadow: pageShadow,
      color: "#173d35",
      position: "relative",
      overflow: "hidden"
    };

    const paperTexture = (
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.16,
          background:
            "repeating-linear-gradient(45deg, rgba(92,68,35,0.18) 0px, rgba(92,68,35,0.18) 1px, transparent 1px, transparent 9px)",
          pointerEvents: "none"
        }}
      />
    );

    const spiralBinding = null;

    if (!page) {
      return (
        <div className="field-book-page page-fade-slide" style={basePageStyle}>
          {paperTexture}
          {spiralBinding}
        </div>
      );
    }

    if (page.type === "blank") {
      return (
        <div
          className="field-book-page page-fade-slide"
          style={{
            ...basePageStyle,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          {paperTexture}
          {spiralBinding}
          <div
            style={{
              position: "relative",
              zIndex: 3,
              width: "100%",
              height: "100%",
              borderRadius: "18px",
              border: "1px dashed rgba(18,53,47,0.18)",
              opacity: 0.45
            }}
          />
        </div>
      );
    }

    if (page.type === "cover") {
      return (
        <div
          className="field-book-page page-fade-slide"
          style={{
            ...basePageStyle,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between"
          }}
        >
          {paperTexture}
          {spiralBinding}
          <div style={{ position: "relative", zIndex: 3 }}>
            <div style={{ fontSize: "13px", letterSpacing: "0.22em", fontWeight: 800, opacity: 0.72 }}>
              FIELD NOTEBOOK
            </div>
            <h1 style={{ margin: "24px 0 14px", fontSize: "46px", lineHeight: 1.03, color: "#12352f" }}>
              {page.title}
            </h1>
            <h3 style={{ margin: "30px 0 12px", fontSize: "24px", color: "#24483f" }}>
              {page.subtitle}
            </h3>
            <p style={{ fontSize: "17px", lineHeight: 1.85, color: "#3b5b52" }}>
              {page.content}
            </p>
          </div>
        </div>
      );
    }

    if (page.type === "toc") {
      return (
        <div className="field-book-page page-fade-slide" style={basePageStyle}>
          {paperTexture}
          {spiralBinding}
          <div style={{ position: "relative", zIndex: 3 }}>
            <h2 style={{ margin: "0 0 30px", textAlign: "center", fontSize: "36px", color: "#12352f" }}>
              {page.title}
            </h2>

            <div style={{ display: "grid", gap: "18px" }}>
              {page.chapters.map((chapter) => (
                <button
                  key={chapter.id}
                  onClick={() => jumpToNotebookPage(chapter.bookPage)}
                  style={{
                    width: "100%",
                    border: "1px solid rgba(18, 53, 47, 0.22)",
                    borderRadius: "999px",
                    padding: "16px 22px",
                    background: "rgba(255, 249, 231, 0.34)",
                    color: "#12352f",
                    boxShadow: "0 10px 20px rgba(35, 26, 10, 0.10)",
                    display: "flex",
                    alignItems: "center",
                    gap: "18px",
                    fontSize: "18px",
                    fontWeight: 800,
                    cursor: "pointer"
                  }}
                >
                  <span style={{ fontSize: "24px", letterSpacing: "0.08em" }}>{chapter.code}</span>
                  <span style={{ textAlign: "left" }}>{chapter.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (page.type === "level") {
    const note = NOTEBOOK_LEVEL_NOTES[page.level];
    const levelRecord = getNotebookLevelRecord(page.level);
    const hasRecord = Boolean(levelRecord);
      return (
        <div className="field-book-page field-book-record-page page-fade-slide" style={basePageStyle}>
          {paperTexture}
          {spiralBinding}
          <div style={{ position: "relative", zIndex: 3 }}>
            <div style={{ marginBottom: "22px" }}>
              <div style={{ fontSize: "13px", letterSpacing: "0.18em", fontWeight: 900, color: "#84612c" }}>
                CHAPTER {page.chapterCode}
              </div>
              <h2 style={{ margin: "8px 0 0", fontSize: "27px", lineHeight: 1.25, color: "#12352f" }}>
                {note.title}
              </h2>
            </div>

            {hasRecord ? (
              <article
                style={{
                  borderRadius: "17px",
                  padding: "17px 18px",
                  background: "rgba(255, 249, 231, 0.50)",
                  border: "1px solid rgba(18,53,47,0.18)",
                  boxShadow: "0 8px 18px rgba(44, 31, 13, 0.10)"
                }}
              >
                <div style={{ margin: "0 0 8px", fontSize: "11px", letterSpacing: "0.14em", fontWeight: 800, color: "#84612c" }}>
  CLEAR RECORD
</div>

<div style={{ marginBottom: "14px", fontSize: "14px", lineHeight: 1.8, color: "#36564d" }}>
  <div>作答時間：{formatTime(Number(levelRecord.time_seconds || 0))}</div>
  <div>
    當時排名：
    {levelRecord.rank_at_completion
      ? `第 ${levelRecord.rank_at_completion} 名`
      : "尚未記錄"}
  </div>
</div>

<div style={{ margin: "0 0 8px", fontSize: "11px", letterSpacing: "0.14em", fontWeight: 800, color: "#84612c" }}>
  KNOWLEDGE NOTE
</div>

<p style={{ margin: 0, fontSize: "15px", lineHeight: 1.76, color: "#36564d" }}>
  {note.content}
</p>
              </article>
            ) : (
              <div
                style={{
                  borderRadius: "17px",
                  padding: "18px",
                  background: "rgba(255, 249, 231, 0.22)",
                  border: "1px dashed rgba(18,53,47,0.22)",
                  color: "#6b6b57",
                  fontSize: "15px",
                  lineHeight: 1.7
                }}
              >
                完成此小關後，這裡才會出現知識重點。
              </div>
            )}
          </div>
        </div>
      );
    }

    return null;
  };



  return (
    <div className={`main-container unified-city-mode ${!hasStartedGame && !showLevelSelect ? "home-mode" : ""} ${!hasStartedGame && showLevelSelect ? "level-select-mode" : ""}`}>
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
              {showUI && !isEnvelopeOpening && (
              <button className="glow-btn hero-start-btn" onClick={handleOpenLevelSelect}>
              開始探險吧
              </button>
              )}
            </section>

            {isEnvelopeOpening && (
              <section className="hero-visual" aria-hidden="false">
                <div className={`envelope-stage ${isEnvelopeOpening ? "is-open" : ""}`}>
                  <div className="envelope-glow"></div>

                  <div className="floating-letter">
                    <div className="invite-card-content">
                      <div className="invite-card-badge">ACCESS CODE</div>

                      <h2 className="invite-card-title">玩家登入</h2>

                      <p className="invite-card-desc">
                        請輸入活動碼，開啟這次城市調查任務。
                      </p>

                      <input
                        type="text"
                        value={loginCodeInput}
                        onChange={(e) => setLoginCodeInput(e.target.value)}
                        placeholder="輸入活動碼"
                        className="invite-card-input"
                      />

                      <button
                        className="invite-card-btn"
                        onClick={handleLoginUser}
                      >
                        開啟任務
                      </button>

                      {authError && (
                        <div className="invite-card-error">
                          {authError}
                        </div>
                      )}
                    </div>
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
            {CASE_FILES.map((file, index) => {
              const firstLevel = file.levels[0];

              const levelMeta = LEVEL_FILES.find(
                (item) => item.id === firstLevel
              );

              const isUnlocked =
                !levelMeta?.requiredLevel ||
                unlockedLevel >= firstLevel;

              const isCompleted =
                file.levels.every((level) => unlockedLevel > level);

              const statusText = isCompleted
                ? "已完成"
                : isUnlocked
                ? "可開始"
                : "尚未解鎖";

              return (
                <button
                  key={file.id}
                  className={`mission-file-card ${file.theme} ${isUnlocked ? "unlocked" : "locked"} ${isCompleted ? "completed" : ""}`}
                  onClick={() => {
                    if (!isUnlocked) return;
                      handleStartGame(file.levels[0]);
                    }}
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
                    <CaseFileIcon type={file.icon} />
                  </div>

                  <div className="mission-file-label">{file.id}</div>
                  <h2 className="mission-file-title">{file.title}</h2>
                  <p className="mission-file-theme">{file.subtitle}</p>

                  <div className="mission-file-footer" aria-hidden="true">
                    <span>→</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className={`card ${currentChapter >= 1 ? "mission-style-card" : ""} ${isWrong ? "wrong-glow" : ""}`}>
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
          {CHAPTERS[currentChapter].taskTitle}
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
        <div
          className="field-notebook-overlay"
          onClick={() => setShowNotebook(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2000,
            background:
              "radial-gradient(circle at 50% 20%, rgba(43, 75, 64, 0.42), rgba(3, 13, 12, 0.86) 62%)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "22px",
            backdropFilter: "blur(5px)"
          }}
        >
          <div
            className="field-notebook-book"
            onClick={(event) => event.stopPropagation()}
            style={{
              position: "relative",
              width: "min(940px, 96vw)",
              minHeight: "600px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0",
              borderRadius: "28px",
              padding: "14px 14px 14px 24px",
              background:
                "linear-gradient(90deg, rgba(83,65,38,0.86) 0%, rgba(228,207,163,0.9) 3%, rgba(218,196,152,0.9) 48%, rgba(76,57,31,0.55) 50%, rgba(218,196,152,0.9) 52%, rgba(228,207,163,0.9) 97%, rgba(83,65,38,0.86) 100%)",
              boxShadow:
                "0 28px 85px rgba(0,0,0,0.44), 0 0 0 1px rgba(247,231,189,0.12)"
            }}
          >
            <button
              className="field-notebook-close"
              onClick={() => setShowNotebook(false)}
              aria-label="關閉闖關紀錄"
              style={{
                position: "absolute",
                top: "-14px",
                right: "-14px",
                zIndex: 5,
                width: "54px",
                height: "54px",
                borderRadius: "50%",
                border: "1px solid rgba(247,231,189,0.28)",
                background: "rgba(231,184,79,0.94)",
                color: "#11332d",
                fontSize: "32px",
                lineHeight: 1,
                cursor: "pointer",
                boxShadow: "0 12px 26px rgba(0,0,0,0.28)"
              }}
            >
              ×
            </button>

            <section
              className="field-notebook-left-page"
              style={{
                padding: 0,
                background: "transparent",
                border: "none",
                boxShadow: "none"
              }}
            >
              {renderNotebookPage(NOTEBOOK_PAGES[currentBookPage], "left")}
            </section>

            <section
              className="field-notebook-right-page"
              style={{
                position: "relative",
                padding: 0,
                background: "transparent",
                border: "none",
                boxShadow: "none"
              }}
            >
              {renderNotebookPage(NOTEBOOK_PAGES[currentBookPage + 1], "right")}

              <div
                className="field-book-controls"
                style={{
                  position: "absolute",
                  left: "32px",
                  right: "32px",
                  bottom: "24px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  pointerEvents: "none"
                }}
              >
                <button
                  className="field-book-nav"
                  onClick={prevBookPage}
                  disabled={currentBookPage === 0}
                  style={{
                    pointerEvents: "auto",
                    border: "1px solid rgba(247,231,189,0.18)",
                    borderRadius: "999px",
                    padding: "9px 16px",
                    background: currentBookPage === 0 ? "rgba(18,53,47,0.16)" : "rgba(18,53,47,0.92)",
                    color: currentBookPage === 0 ? "rgba(18,53,47,0.44)" : "#f7e7bd",
                    fontWeight: 900,
                    letterSpacing: "0.08em",
                    cursor: currentBookPage === 0 ? "default" : "pointer"
                  }}
                >
                  ← PREV
                </button>

                <button
                  className="field-book-nav"
                  onClick={nextBookPage}
                  disabled={currentBookPage >= NOTEBOOK_PAGES.length - 1}
                  style={{
                    pointerEvents: "auto",
                    border: "1px solid rgba(247,231,189,0.18)",
                    borderRadius: "999px",
                    padding: "9px 16px",
                    background: currentBookPage >= NOTEBOOK_PAGES.length - 1 ? "rgba(18,53,47,0.16)" : "rgba(18,53,47,0.92)",
                    color: currentBookPage >= NOTEBOOK_PAGES.length - 1 ? "rgba(18,53,47,0.44)" : "#f7e7bd",
                    fontWeight: 900,
                    letterSpacing: "0.08em",
                    cursor: currentBookPage >= NOTEBOOK_PAGES.length - 1 ? "default" : "pointer"
                  }}
                >
                  NEXT →
                </button>
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
