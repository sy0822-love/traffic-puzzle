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
import mysteryCityBg from "./assets/mystery-city-bg.png";
const ALLOWED_ACCESS_CODES = {
  KWA1116: {
    userName: "KWA1116 玩家",
    userCode: "KWA1116"
  },
  WSN1208: {
    userName: "WSN1208 玩家",
    userCode: "WSN1208"
  },
  TEST0706: {
    userName: "TEST0706 測試玩家",
    userCode: "TEST0706"
  },
  DEMOJUDGE: {
    userName: "評審 Demo 玩家",
    userCode: "DEMOJUDGE"
  },
  TRAFFIC09161: {
    userName: "TRAFFIC09161 測試玩家",
    userCode: "TRAFFIC09161"
  },
  TRAFFIC09162: {
    userName: "TRAFFIC09162 測試玩家",
    userCode: "TRAFFIC09162"
  },
  TRAFFIC0919: {
    userName: "TRAFFIC0919 測試玩家",
    userCode: "TRAFFIC0919"
  }
};

const LETTER_CONTENT = `在台灣的行人，最常遇到的 3 種危險狀況：

1. 通行空間被占用，行人被迫走到車道上與車爭道。

2. 通行空間設計不良，缺乏連續、寬敞且安全的人行空間可供通行。

3. 駕駛人缺乏停讓行人、行人優先通行的意識。`;

const DEMO_MODE = true;
const DEMO_END_LEVEL = 4;
const TIMING_RULE_VERSION = "v1-login-new-run-first-level-start";

const DEMO_WRONG_HINT = "別灰心～再根據劇情卡找到更細的脈絡吧？";

const DEMO_KNOWLEDGE_POINTS = {
  1: "在沒有人行道或騎樓、又遇到停放車輛或雜物阻擋時，應先確認前後方來車，再選擇安全方式繞越障礙物。",
  2: "理解路邊私人雜物與車輛占用通行空間，會迫使行人進入車道；改善方向應回到連續、安全的人行空間與行人號誌。",
  3: "能依觀察結果辨認號誌顏色順序，建立對紅、黃、綠交通號誌的基本辨識與觀察能力。",
  4: "透過觀察小綠人與線索解出 8 碼密碼，連結交通安全觀察與臺灣智慧運輸相關資訊。"
};
const CASE_FILES = [
  {
    id: "CASE-01",
    code: "FILE 01",
    title: "找回安全的行走空間！",
    subtitle: "從沒有完整人行空間、路邊雜物與停車占用開始，觀察行人為什麼會被迫靠近車道，找出更安全的通行方式。",
    icon: "walk",
    theme: "green",
    levels: [1, 2]
  },

  {
    id: "CASE-02",
    code: "FILE 02",
    title: "號誌裡藏著什麼線索？",
    subtitle: "觀察信封、交通號誌與小綠人的細節，依序破解顏色與密碼，找出藏在城市裡的交通線索。",
    icon: "crosswalk",
    theme: "red",
    levels: [3, 4]
  },

  {
    id: "CASE-03",
    code: "FILE 03",
    title: "路口的人車大塞車",
    subtitle: "後續關卡規劃中。",
    icon: "car",
    theme: "yellow",
    levels: [5]
  }
];
const CHAPTERS = {
  1: {
    title: "1-1：道路被擋住時怎麼辦？",
    content: ``,
    taskTitle: "任務問題",
    taskContent: `在生活中遇到沒有人行道或騎樓的道路，又遇到停放的車輛或雜物時，我們該怎麼應對呢？

提示：先確認前後方車輛，再想想要怎麼安全通過。`,
    answer: "繞越",
    acceptedAnswers: ["繞越", "先確認前後方車輛再繞越", "確認前後方車輛再繞越", "確認車輛後繞越", "安全繞越"],
    concept: DEMO_KNOWLEDGE_POINTS[1],
    nextMsg: "答對了！遇到障礙物時，先確認前後方來車，再選擇安全方式繞越，不要直接走進車流中。"
  },

  2: {
    title: "1-2：被占用的行走空間",
    content: ``,
    taskTitle: "任務問題",
    taskContent: `路邊堆滿了居民的私人雜物和車輛，讓人只能走到車道上，非常危險。

我們應該怎麼做，才能讓人安心走路呢？似乎有什麼文字悄悄出現了呢？`,
    answer: "號誌",
    acceptedAnswers: ["號誌", "行人號誌"],
    concept: DEMO_KNOWLEDGE_POINTS[2],
    nextMsg: "答對了！下一個地點，請找一個有行人號誌的地方，繼續尋找下一條線索。"
  },

  3: {
    title: "2-1：信封的顏色順序",
    content: ``,
    taskTitle: "任務問題",
    taskContent: `根據你的觀察，信封的排序從左到右到底是什麼顏色呢？

請依照順序輸入三個顏色。`,
    answer: "紅黃綠",
    acceptedAnswers: ["紅黃綠", "紅、黃、綠", "紅 黃 綠", "紅，黃，綠"],
    concept: DEMO_KNOWLEDGE_POINTS[3],
    nextMsg: "答對了！從左到右的順序是「紅、黃、綠」；也可以把它和交通號誌從上到下的顏色順序連結起來。"
  },

  4: {
    title: "2-2：小綠人的 8 碼密碼",
    content: ``,
    taskTitle: "任務問題",
    taskContent: `觀察小綠人後，好像可以得到一串密碼……請問這串密碼是多少呢？

提示：共有 8 碼。`,
    answer: "20190925",
    acceptedAnswers: ["20190925", "2019/09/25", "2019-09-25", "2019 09 25"],
    concept: DEMO_KNOWLEDGE_POINTS[4],
    nextMsg: "答對了！這組密碼是 20190925，對應中華郵政於 2019 年 9 月 25 日發行的臺灣智慧運輸建設郵票。"
  },

  5: {
    title: "3-1：暫定關卡",
    content: ``,
    taskTitle: "系統提示",
    taskContent: `此關卡內容暫定中，請依現場紙本任務提示進行操作，並在系統輸入答案完成挑戰。`,
    answer: "5",
    concept: "交通安全需要整體規劃，包含無障礙、路權、資訊設計與行人安全，而不是只解決單一問題。",
    nextMsg: "你完成了所有調查，城市的盲點正在被重新看見。"
  }
};

const LEVEL_FILES = [
  {
    id: 1,
    requiredLevel: null,
    code: "FILE 01",
    label: "1-1",
    icon: "🚶",
    title: "道路被擋住時怎麼辦？",
    theme: "道路障礙與安全繞越",
    desc: "觀察沒有人行道或騎樓時，遇到停放車輛與雜物該如何安全通過。"
  },
  {
    id: 2,
    requiredLevel: 1,
    code: "FILE 02",
    label: "1-2",
    icon: "🚧",
    title: "被占用的行走空間",
    theme: "通行空間與行人號誌",
    desc: "找出路邊雜物與車輛占用造成的危險，破解隱藏文字。"
  },
  {
    id: 3,
    requiredLevel: 2,
    code: "FILE 03",
    label: "2-1",
    icon: "🚦",
    title: "信封的顏色順序",
    theme: "信封排序與號誌觀察",
    desc: "根據信封線索，判斷從左到右的正確顏色順序。"
  },
  {
    id: 4,
    requiredLevel: 3,
    code: "FILE 04",
    label: "2-2",
    icon: "🚶",
    title: "小綠人的 8 碼密碼",
    theme: "小綠人與智慧運輸線索",
    desc: "觀察小綠人的線索，找出正確的八碼密碼。"
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
      "完成關卡後，這本筆記會留下每一關的遊玩時間、作答狀態、完成時間與學習紀錄。"
  },
  {
    type: "toc",
    title: "目錄",
    chapters: [
      {
        id: "case-01",
        code: "01",
        title: "找回安全的行走空間！",
        bookPage: 2
      },
      {
        id: "case-02",
        code: "02",
        title: "號誌裡藏著什麼線索？",
        bookPage: 4
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
    type: "chapter",
    id: "case-01",
    code: "01",
    title: "找回安全的行走空間！",
    levels: [1, 2]
  },
  {
    type: "blank"
  },
  {
    type: "chapter",
    id: "case-02",
    code: "02",
    title: "號誌裡藏著什麼線索？",
    levels: [3, 4]
  },
  {
    type: "blank"
  },
  {
    type: "chapter",
    id: "case-03",
    code: "03",
    title: "路口的人車大塞車",
    levels: [5]
  },
  {
    type: "blank"
  }
];

const MOBILE_NOTEBOOK_PAGES = NOTEBOOK_PAGES.filter((page) => page.type !== "blank");

const NOTEBOOK_LEVEL_NOTES = {
  1: {
    title: "1-1 道路被擋住時怎麼辦？",
    content:
      "你發現當道路沒有完整的人行道或騎樓，又被停放車輛、雜物阻擋時，行人很容易被迫靠近車流。安全通過前，應先確認前後方來車，再選擇安全方式繞越障礙物。"
  },
  2: {
    title: "1-2 被占用的行走空間",
    content:
      "你注意到私人雜物與車輛占用通行空間，會讓行人被迫走入車道。真正安心的步行環境，需要保留連續、安全的通行空間，並搭配清楚的行人號誌與道路引導。"
  },
  3: {
    title: "2-1 信封的顏色順序",
    content:
      "你透過觀察信封破解出紅、黃、綠的順序，也把線索和交通號誌連結起來。仔細觀察號誌與環境，是判斷道路狀況與安全通行的重要能力。"
  },
  4: {
    title: "2-2 小綠人的 8 碼密碼",
    content:
      "你從小綠人的線索中解出 20190925。這組日期也連結到中華郵政於 2019 年 9 月 25 日發行的臺灣智慧運輸建設郵票，讓交通觀察延伸到智慧運輸與城市設計。"
  },
  5: {
    title: "3-1 路口的人車大塞車",
    content:
      "你成功辨認出路口中轉彎車與直行行人的衝突來源。也學到：交通安全需要從號誌、動線、視線與路權一起規劃，而不是只處理單一設施或單一問題。"
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



function TrafficPromptIllustration({ level }) {
  const commonStyle = {
    width: "clamp(76px, 12vw, 104px)",
    height: "clamp(76px, 12vw, 104px)",
    opacity: 0.82,
    filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.22))"
  };

  const shell = (children) => (
    <svg
      viewBox="0 0 160 160"
      style={commonStyle}
      aria-hidden="true"
      focusable="false"
    >
      <circle
        cx="80"
        cy="80"
        r="62"
        fill="rgba(8, 45, 40, 0.62)"
        stroke="rgba(240, 213, 138, 0.52)"
        strokeWidth="2"
      />
      <circle
        cx="80"
        cy="80"
        r="51"
        fill="none"
        stroke="rgba(159, 231, 213, 0.16)"
        strokeWidth="1.5"
        strokeDasharray="3 8"
      />
      {children}
    </svg>
  );

  // 1-1｜線索觀察：放大鏡＋折線路徑
  if (level === 1) {
    return shell(
      <>
        <path
          d="M43 96C52 88 55 72 68 68C80 64 88 75 96 70C104 65 105 53 116 48"
          fill="none"
          stroke="#9fe7d5"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="46" cy="96" r="5" fill="#f0d58a" />
        <circle cx="116" cy="48" r="5" fill="#f0d58a" />
        <circle
          cx="82"
          cy="77"
          r="24"
          fill="rgba(255,255,255,0.03)"
          stroke="#f0d58a"
          strokeWidth="6"
        />
        <path
          d="M99 95L119 115"
          stroke="#f0d58a"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path
          d="M72 77H92M82 67V87"
          stroke="#9fe7d5"
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.9"
        />
      </>
    );
  }

  // 1-2｜線索解碼：信封＋鑰匙孔
  if (level === 2) {
    return shell(
      <>
        <rect
          x="44"
          y="51"
          width="72"
          height="58"
          rx="12"
          fill="rgba(255,255,255,0.035)"
          stroke="#f0d58a"
          strokeWidth="5"
        />
        <path
          d="M49 58L80 82L111 58"
          fill="none"
          stroke="#9fe7d5"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M49 103L69 83M111 103L91 83"
          fill="none"
          stroke="#9fe7d5"
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.82"
        />
        <circle cx="80" cy="88" r="9" fill="#f0d58a" />
        <path
          d="M80 95V105"
          stroke="#173f36"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M102 43L111 34M112 47L124 43"
          stroke="#f0d58a"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </>
    );
  }

  // 1-3｜拼圖推理：拼圖塊＋隱藏線索
  if (level === 3) {
    return shell(
      <>
        <path
          d="M53 54H72C72 44 79 38 87 38C96 38 103 45 103 54H111C117 54 122 59 122 65V79H113C104 79 98 86 98 94C98 103 105 110 113 110H122V116C122 122 117 127 111 127H91V118C91 109 84 103 76 103C67 103 60 110 60 118V127H53C47 127 42 122 42 116V96H51C60 96 66 89 66 81C66 72 59 65 51 65H42V65C42 59 47 54 53 54Z"
          fill="rgba(255,255,255,0.035)"
          stroke="#f0d58a"
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <path
          d="M77 71L84 78L96 64"
          fill="none"
          stroke="#9fe7d5"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="101" cy="101" r="4" fill="#9fe7d5" />
        <circle cx="111" cy="91" r="3" fill="#f0d58a" />
      </>
    );
  }

  // 2-1｜路徑判讀：節點＋秘密路線
  return shell(
    <>
      <path
        d="M43 101C56 101 57 80 71 80C85 80 86 58 103 58C112 58 116 65 117 73"
        fill="none"
        stroke="#9fe7d5"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="7 8"
      />
      <circle cx="43" cy="101" r="8" fill="#f0d58a" />
      <circle cx="72" cy="80" r="8" fill="#173f36" stroke="#f0d58a" strokeWidth="4" />
      <circle cx="103" cy="58" r="8" fill="#173f36" stroke="#f0d58a" strokeWidth="4" />
      <path
        d="M111 92L121 102L139 80"
        fill="none"
        stroke="#f0d58a"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M48 45H69M48 54H61"
        stroke="#9fe7d5"
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.8"
      />
    </>
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
  const [attemptCounts, setAttemptCounts] = useState({});

  const [showChapterTransition, setShowChapterTransition] = useState(false);
  const [transitionMessage, setTransitionMessage] = useState("");
  const [isGameFinished, setIsGameFinished] = useState(false);
  const [finalRank, setFinalRank] = useState(null);
  const [reportImageUrl, setReportImageUrl] = useState("");

  const [onlineCount, setOnlineCount] = useState(0);
  const [visibleLevelCount, setVisibleLevelCount] = useState(0);
  const [isMobileLayout, setIsMobileLayout] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 768px)").matches
      : false
  );
  const notebookPagesForLayout = isMobileLayout
    ? MOBILE_NOTEBOOK_PAGES
    : NOTEBOOK_PAGES;

  const [showDiaryDrawer, setShowDiaryDrawer] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isEnvelopeOpening, setIsEnvelopeOpening] = useState(false);

  const [userName, setUserName] = useState(() => localStorage.getItem("trafficPuzzleUserName") || "");
  const [userCode, setUserCode] = useState(() => localStorage.getItem("trafficPuzzleUserCode") || "");
  const [loginCodeInput, setLoginCodeInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [gameSessionId, setGameSessionId] = useState("");
  const [isCompletedViewer, setIsCompletedViewer] = useState(false);

  const [records, setRecords] = useState([]);
  const [showNotebook, setShowNotebook] = useState(false);
  const [notebookPage, setNotebookPage] = useState(1);
  const [notebookView, setNotebookView] = useState("index");
  const [currentBookPage, setCurrentBookPage] = useState(0);
  const [selectedNotebookCase, setSelectedNotebookCase] = useState(null);
  const [expandedCaseId, setExpandedCaseId] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const syncLayout = (event) => setIsMobileLayout(event.matches);

    setIsMobileLayout(mediaQuery.matches);
    mediaQuery.addEventListener?.("change", syncLayout);

    return () => mediaQuery.removeEventListener?.("change", syncLayout);
  }, []);

  const STORAGE_KEY = "trafficPuzzleUnlockedLevel";
  const [unlockedLevel, setUnlockedLevel] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? Number(saved) : 1;
  });


  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, unlockedLevel);
  }, [unlockedLevel]);


  const saveUserSession = (name, code) => {
    localStorage.setItem("trafficPuzzleUserName", name);
    localStorage.setItem("trafficPuzzleUserCode", code);
    setUserName(name);
    setUserCode(code);
  };

  const createGameSessionId = () => {
    return typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `run_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  };

  const getUserGameData = async (code) => {
    const q = query(
      collection(db, "learning_results"),
      where("userCode", "==", code)
    );

    const snapshot = await getDocs(q);
    const allRecords = snapshot.docs
      .map((item) => ({
        id: item.id,
        ...item.data()
      }))
      .sort((a, b) => {
        const aTime = a.timestamp?.seconds || 0;
        const bTime = b.timestamp?.seconds || 0;
        return bTime - aTime;
      });

    // 只認明確的整場完成標記。
    const completedRecord = allRecords.find(
      (item) => item.game_completed === true
    );

    return {
      completed: Boolean(completedRecord),
      completedSessionId: completedRecord?.session_id || "",
      records: allRecords
    };
  };

  const resetRunForNewLogin = (newSessionId) => {
    sessionStorage.setItem("trafficPuzzleGameSessionId", newSessionId);
    localStorage.setItem(STORAGE_KEY, "1");

    setGameSessionId(newSessionId);
    setIsCompletedViewer(false);
    setRecords([]);
    setUnlockedLevel(1);
    setCurrentChapter(1);
    setWrongChapters({});
    setAttemptCounts({});

    setGameStartTime(null);
    setQuestionStartTime(null);
    setQuestionElapsedTime(0);
    setTotalElapsedTime(0);

    setHasStartedGame(false);
    setIsGameFinished(false);
    setShowChapterTransition(false);
    setShowExitConfirm(false);
    setIsWrong(false);
    setShowHint(false);
    setUserInput("");
    setStoryPhase("task");
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

    // 重要規則：只要活動碼在白名單內，就一定允許登入。
    // Firebase 的完成狀態只用來決定「能否進入關卡作答」，不能阻擋登入。
    saveUserSession(matchedUser.userName, matchedUser.userCode);
    setAuthError("");

    try {
      const gameData = await getUserGameData(matchedUser.userCode);

      if (gameData.completed) {
        // 已完成者：登入後立刻把 Firestore 的完整歷史紀錄放進 records。
        // 不再等待另一個 useEffect 二次查詢，避免重登時卡片與 Notebook 短暫/永久空白。
        sessionStorage.removeItem("trafficPuzzleGameSessionId");
        setGameSessionId(gameData.completedSessionId);
        setIsCompletedViewer(true);
        setRecords(gameData.records);
        setHasStartedGame(false);
        setCurrentChapter(1);
        setGameStartTime(null);
        setQuestionStartTime(null);
        setQuestionElapsedTime(0);
        setTotalElapsedTime(0);
      } else {
        // 未完成者：每次重新登入建立全新 run，從第一關與 00:00 重新開始。
        const newSessionId = createGameSessionId();
        resetRunForNewLogin(newSessionId);
        saveUserSession(matchedUser.userName, matchedUser.userCode);
      }
    } catch (error) {
      // Firebase 查詢失敗不再阻擋登入。
      // 先讓玩家進入任務頁；錯誤只記錄在 Console，避免有效活動碼完全無法登入。
      console.error("檢查活動碼完成狀態失敗，但仍允許登入：", error);

      const newSessionId = createGameSessionId();
      resetRunForNewLogin(newSessionId);
      saveUserSession(matchedUser.userName, matchedUser.userCode);
    }

    setAuthError("");
    setShowLoginModal(false);
    setShowLevelSelect(true);
  };

  const handleLogoutUser = () => {
    localStorage.removeItem("trafficPuzzleUserName");
    localStorage.removeItem("trafficPuzzleUserCode");
    sessionStorage.removeItem("trafficPuzzleGameSessionId");
    setUserName("");
    setUserCode("");
    setGameSessionId("");
    setIsCompletedViewer(false);
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

      if (!isCompletedViewer && !gameSessionId) {
        setRecords([]);
        return;
      }

      try {
        const gameData = await getUserGameData(userCode);
        const allData = gameData.records;

        if (isCompletedViewer) {
          // 已完成者永遠顯示此活動碼的完整歷史紀錄。
          setRecords(allData);
        } else {
          // 尚未完成的新 run，只顯示本次 session，避免接回上一次未完成進度。
          setRecords(
            allData.filter((item) => item.session_id === gameSessionId)
          );
        }
      } catch (error) {
        console.error("讀取個人紀錄失敗：", error);
        // 已完成者若登入時已成功載入 records，後續暫時讀取失敗時不要把畫面清空。
      }
    };

    fetchRecords();
  }, [userCode, gameSessionId, isCompletedViewer]);

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
          : chapterData.taskContent;

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
    storyPhase
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

  useEffect(() => {
    const calculateFinalRank = async () => {
      if (!isGameFinished || !userCode) return;

      try {
        const snapshot = await getDocs(collection(db, "learning_results"));
        const completedByUser = new Map();

        snapshot.docs.forEach((docItem) => {
          const data = docItem.data();
          if (data?.game_completed !== true) return;

          const totalSeconds = Number(data.total_seconds);
          if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return;

          const code = String(data.userCode || "").trim();
          if (!code) return;

          const current = completedByUser.get(code);
          if (!current || totalSeconds < current.total_seconds) {
            completedByUser.set(code, {
              userCode: code,
              total_seconds: totalSeconds
            });
          }
        });

        const ranking = Array.from(completedByUser.values()).sort(
          (a, b) => a.total_seconds - b.total_seconds
        );
        const index = ranking.findIndex((item) => item.userCode === userCode);
        setFinalRank(index >= 0 ? index + 1 : null);
      } catch (error) {
        console.error("計算同梯次名次失敗：", error);
        setFinalRank(null);
      }
    };

    calculateFinalRank();
  }, [isGameFinished, userCode]);

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

    setHasStartedGame(true);
    setShowLevelSelect(false);
    setShowDiaryDrawer(false);
    setShowExitConfirm(false);
    setCurrentChapter(level);
    setStoryPhase("task");

    if (isCompletedViewer) {
      // 已完成玩家可以進入關卡「查看內容」，但不啟動任何作答計時。
      setGameStartTime(null);
      setQuestionStartTime(null);
      setQuestionElapsedTime(0);
      setTotalElapsedTime(0);
      return;
    }

    const shouldStartTotalTimer = !gameStartTime;

    // 計時規則 v1：
    // 1. 每次有效活動碼「重新登入」都建立全新 session，舊未完成 session 不續接。
    // 2. 總時間從該 session 第一次真正進入關卡時開始。
    // 3. 同一 session 內回任務頁再進入，總時間持續累計、不歸零。
    // 4. 各關時間每次進入該關時重新開始，直到答對為止。
    setGameStartTime(shouldStartTotalTimer ? now : gameStartTime);
    setQuestionStartTime(now);
    setQuestionElapsedTime(0);

    if (shouldStartTotalTimer) {
      setTotalElapsedTime(0);
    }
  };

  const handleStoryContinue = () => {
    setStoryPhase("task");
    setShowUI(false);
    setUserInput("");
    setIsWrong(false);
    setShowHint(false);
  };

  const getRecordLevel = (record) => {
    const explicitLevel = Number(record?.level_number);
    if (Number.isFinite(explicitLevel) && explicitLevel > 0) {
      return explicitLevel;
    }

    const match = String(record?.puzzle_id || "").match(/(\d+)$/);
    return match ? Number(match[1]) : 0;
  };

  const getUniqueRecords = (sourceRecords = records) => {
    const map = new Map();

    sourceRecords.forEach((record) => {
      const level = getRecordLevel(record);
      if (!level || map.has(level)) return;
      map.set(level, record);
    });

    return Array.from(map.entries())
      .sort(([aLevel], [bLevel]) => aLevel - bLevel)
      .map(([, record]) => record);
  };

  const getCompletedRecords = () =>
    getUniqueRecords(records).filter((record) => CHAPTERS[getRecordLevel(record)]);

  const getCompletedLevelSet = () => {
    return new Set(
      getCompletedRecords()
        .map((record) => getRecordLevel(record))
        .filter(Boolean)
    );
  };

  const isCaseUnlockedByRecords = (fileIndex, completedLevelSet) => {
    if (fileIndex === 0) return true;
    const previousFile = CASE_FILES[fileIndex - 1];
    return previousFile.levels.every((level) => completedLevelSet.has(level));
  };

  const normalizePuzzleAnswer = (value) =>
    String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[\s、，,。．.\/\-]/g, "");

  const isPuzzleAnswerCorrect = (chapterData, value) => {
    const accepted = Array.isArray(chapterData.acceptedAnswers)
      ? chapterData.acceptedAnswers
      : [chapterData.answer];
    const normalizedInput = normalizePuzzleAnswer(value);
    return accepted.some(
      (answer) => normalizePuzzleAnswer(answer) === normalizedInput
    );
  };

  const handleLevelComplete = async () => {
    if (isCompletedViewer) {
      return;
    }

    const chapterData = CHAPTERS[currentChapter];
    const trimmedAnswer = userInput.trim();
    const currentAttemptCount = Number(attemptCounts[currentChapter] || 0) + 1;

    setAttemptCounts((prev) => ({
      ...prev,
      [currentChapter]: currentAttemptCount
    }));

    if (isPuzzleAnswerCorrect(chapterData, trimmedAnswer)) {
      const now = Date.now();
      const finalQuestionSeconds = questionStartTime
        ? Math.max(0, Math.floor((now - questionStartTime) / 1000))
        : questionElapsedTime;

      setQuestionElapsedTime(finalQuestionSeconds);
      setQuestionStartTime(null);

      const puzzleId = `puzzle_0${currentChapter}`;
      const isFinalLevel = DEMO_MODE
        ? currentChapter >= DEMO_END_LEVEL
        : !CHAPTERS[currentChapter + 1];
      const alreadyPassed = records.some((record) => getRecordLevel(record) === currentChapter);
      const wasWrongBeforeCorrect = Boolean(wrongChapters[currentChapter]);
      let nextRecords = records;

      if (!alreadyPassed) {
        const nextTotalSeconds = gameStartTime
          ? Math.max(0, Math.floor((now - gameStartTime) / 1000))
          : finalQuestionSeconds;

        const runStartedAtMs = gameStartTime || now;
        const levelStartedAtMs = questionStartTime || Math.max(0, now - finalQuestionSeconds * 1000);

        const localRecord = {
          id: `local-${Date.now()}`,
          userCode,
          userName,
          session_id: gameSessionId,
          game_completed: isFinalLevel,
          completed: isFinalLevel,

          timing_rule_version: TIMING_RULE_VERSION,
          run_started_at: new Date(runStartedAtMs).toISOString(),
          level_started_at: new Date(levelStartedAtMs).toISOString(),
          level_completed_at: new Date(now).toISOString(),

          puzzle_id: puzzleId,
          level_number: currentChapter,
          level_title: chapterData.title,
          case_id:
            CASE_FILES.find((file) => file.levels.includes(currentChapter))?.id || "",

          time_seconds: finalQuestionSeconds,
          total_seconds: nextTotalSeconds,

          wrong: wasWrongBeforeCorrect,
          wrong_attempts: Math.max(0, currentAttemptCount - 1),
          attempt_count: currentAttemptCount,
          first_try_correct: currentAttemptCount === 1,
          answer_status: currentAttemptCount === 1 ? "first_try" : "correct_after_wrong",

          completed_at: new Date(now).toISOString(),
          completed_date: new Date(now).toLocaleDateString("zh-TW"),
          completed_time: new Date(now).toLocaleTimeString("zh-TW"),

          timestamp: { seconds: Math.floor(now / 1000) }
        };

        nextRecords = [localRecord, ...records];
        setRecords(nextRecords);
        setTotalElapsedTime(nextTotalSeconds);

        try {
          await addDoc(collection(db, "learning_results"), {
          userCode,
          userName,
          session_id: gameSessionId,
          game_completed: isFinalLevel,
          completed: isFinalLevel,

          timing_rule_version: TIMING_RULE_VERSION,
          run_started_at: new Date(runStartedAtMs).toISOString(),
          level_started_at: new Date(levelStartedAtMs).toISOString(),
          level_completed_at: new Date(now).toISOString(),

          puzzle_id: puzzleId,
          level_number: currentChapter,
          level_title: chapterData.title,
          case_id:
            CASE_FILES.find((file) => file.levels.includes(currentChapter))?.id || "",

          time_seconds: finalQuestionSeconds,
          total_seconds: nextTotalSeconds,

          wrong: wasWrongBeforeCorrect,
          wrong_attempts: Math.max(0, currentAttemptCount - 1),
          attempt_count: currentAttemptCount,
          first_try_correct: currentAttemptCount === 1,
          answer_status: currentAttemptCount === 1 ? "first_try" : "correct_after_wrong",

          completed_at: new Date(now).toISOString(),
          completed_date: new Date(now).toLocaleDateString("zh-TW"),
          completed_time: new Date(now).toLocaleTimeString("zh-TW"),

          timestamp: serverTimestamp()
        });

          if (isFinalLevel) {
            // 最終關完成後立即切成唯讀模式，避免同一頁面再次作答。
            setIsCompletedViewer(true);
          }

          console.log("Firebase 上傳成功", {
            userCode,
            session_id: gameSessionId,
            level: currentChapter,
            time_seconds: finalQuestionSeconds,
            total_seconds: nextTotalSeconds,
            timing_rule_version: TIMING_RULE_VERSION
          });
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
    if (DEMO_MODE && currentChapter >= DEMO_END_LEVEL) {
      setUnlockedLevel((prev) => Math.max(prev, DEMO_END_LEVEL + 1));
      setShowChapterTransition(false);
      setIsGameFinished(true);
      return;
    }

    if (CHAPTERS[currentChapter + 1]) {
      const nextChapter = currentChapter + 1;

      setUnlockedLevel((prev) => Math.max(prev, nextChapter));

      setShowChapterTransition(false);
      setCurrentChapter(nextChapter);
      setQuestionStartTime(Date.now());
      setQuestionElapsedTime(0);
      setStoryPhase("task");
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
    setStoryPhase("task");
  };

  const getResultStats = () => {
    const completedRecords = getCompletedRecords();
    const completedCount = completedRecords.length;
    const completionRate = Math.round((completedCount / DEMO_END_LEVEL) * 100);
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
    const demoLevels = [1, 2, 3, 4];
    const completedRecords = getUniqueRecords(records).filter((record) => {
      const level = Number(String(record.puzzle_id).replace("puzzle_0", ""));
      return demoLevels.includes(level);
    });

    const finalRecord = completedRecords.find(
      (record) => record.puzzle_id === `puzzle_0${DEMO_END_LEVEL}`
    );

    const totalSeconds = Number(finalRecord?.total_seconds || totalElapsedTime || 0);
    const wrongRecords = completedRecords.filter((record) => record.wrong);

    const levelRows = demoLevels.map((level) => {
      const record = completedRecords.find(
        (item) => item.puzzle_id === `puzzle_0${level}`
      );

      return {
        level,
        title: CHAPTERS[level]?.title || `第 ${level} 關`,
        time: Number(record?.time_seconds || 0),
        wrong: Boolean(record?.wrong),
        attempts: Number(record?.attempt_count || (record?.wrong ? 2 : record ? 1 : 0)),
        completed: Boolean(record),
        concept: CHAPTERS[level]?.concept || DEMO_KNOWLEDGE_POINTS[level] || ""
      };
    });

    const completedCount = levelRows.filter((item) => item.completed).length;
    const totalAttempts = levelRows.reduce((sum, item) => sum + Number(item.attempts || 0), 0);
    const answerAccuracy = totalAttempts > 0
      ? Math.round((completedCount / totalAttempts) * 100)
      : 0;
    const accuracyText = `${answerAccuracy}%`;
    const maxTime = Math.max(...levelRows.map((item) => item.time || 0), 1);

    const canvas = document.createElement("canvas");
    const scale = 2;
    const width = 1080;
    const height = 1500;
    canvas.width = width * scale;
    canvas.height = height * scale;

    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);

    const roundRect = (x, y, w, h, r) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.fill();
    };

    const wrapText = (value, x, y, maxWidth, lineHeight, maxLines = 2) => {
      const chars = String(value || "").split("");
      let line = "";
      let currentY = y;
      let lines = 0;

      for (const char of chars) {
        const testLine = line + char;
        if (ctx.measureText(testLine).width > maxWidth && line) {
          ctx.fillText(line, x, currentY);
          line = char;
          currentY += lineHeight;
          lines += 1;
          if (lines >= maxLines - 1) break;
        } else {
          line = testLine;
        }
      }

      if (line) ctx.fillText(line, x, currentY);
      return currentY + lineHeight;
    };

    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, "#0f332e");
    bg.addColorStop(1, "#061917");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "#f4ead0";
    roundRect(72, 70, 936, 1360, 42);

    ctx.fillStyle = "#fffaf0";
    roundRect(108, 108, 864, 1288, 32);

    ctx.fillStyle = "#173f36";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText("TRAFFIC PUZZLE CLEAR REPORT", 152, 176);

    ctx.font = "bold 60px sans-serif";
    ctx.fillText("闖關結果紀錄表", 152, 258);

    ctx.fillStyle = "#52655d";
    ctx.font = "24px sans-serif";
    ctx.fillText(`${userName || userCode || "玩家"} 的交通安全學習成果`, 152, 304);

    const stats = [
      ["同梯次名次", finalRank ? `第 ${finalRank} 名` : "計算中"],
      ["總遊玩時間", formatTime(totalSeconds)],
      ["答題正確率", accuracyText]
    ];

    let statX = 152;
    stats.forEach(([label, value], idx) => {
      ctx.fillStyle = idx === 1 ? "#d7a246" : "#173f36";
      roundRect(statX, 354, 240, 118, 22);
      ctx.fillStyle = idx === 1 ? "#173f36" : "#f7e7bd";
      ctx.font = "20px sans-serif";
      ctx.fillText(label, statX + 26, 396);
      ctx.font = "bold 38px sans-serif";
      ctx.fillText(value, statX + 26, 448);
      statX += 270;
    });

    ctx.fillStyle = "#173f36";
    ctx.font = "bold 34px sans-serif";
    ctx.fillText("學習趨勢表", 152, 554);

    // Table header
    ctx.fillStyle = "#e8d6aa";
    roundRect(152, 584, 776, 58, 16);
    ctx.fillStyle = "#173f36";
    ctx.font = "bold 22px sans-serif";
    ctx.fillText("關卡", 182, 622);
    ctx.fillText("時間", 508, 622);
    ctx.fillText("狀態", 690, 622);

    let y = 660;
    levelRows.forEach((item) => {
      ctx.fillStyle = "#fbf6e8";
      roundRect(152, y, 776, 78, 16);

      ctx.fillStyle = "#173f36";
      ctx.font = "bold 22px sans-serif";
      ctx.fillText(item.title, 182, y + 48);

      ctx.fillStyle = "#52655d";
      ctx.font = "22px sans-serif";
      ctx.fillText(item.completed ? formatTime(item.time) : "--", 508, y + 48);
      ctx.fillText(item.completed ? (item.wrong ? "曾答錯" : "首次答對") : "未完成", 690, y + 48);

      const barWidth = item.completed ? Math.max(36, Math.round((item.time / maxTime) * 180)) : 0;
      ctx.fillStyle = "#d7a246";
      roundRect(182, y + 62, barWidth, 8, 4);

      y += 92;
    });

    ctx.fillStyle = "#173f36";
    ctx.font = "bold 34px sans-serif";
    ctx.fillText("知識點摘要", 152, 1080);

    let ky = 1130;
    levelRows.forEach((item) => {
      ctx.fillStyle = item.completed ? "#173f36" : "#9b8b6a";
      ctx.beginPath();
      ctx.arc(172, ky - 8, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#f7e7bd";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(166, ky - 8);
      ctx.lineTo(171, ky - 3);
      ctx.lineTo(180, ky - 14);
      ctx.stroke();

      ctx.fillStyle = "#36564d";
      ctx.font = "21px sans-serif";
      wrapText(item.concept, 202, ky, 680, 30, 2);
      ky += 74;
    });

    ctx.fillStyle = "#d7a246";
    roundRect(152, 1320, 776, 42, 21);
    ctx.fillStyle = "#173f36";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText("交通安全意識完成記錄", 410, 1348);

    const dataUrl = canvas.toDataURL("image/png");
    const fileName = `${userCode || "player"}_traffic_puzzle_report.png`;

    setReportImageUrl(dataUrl);

    const link = document.createElement("a");
    link.download = fileName;
    link.href = dataUrl;
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
    setStoryPhase("task");
    setIsEnvelopeOpening(false);
    setShowNotebook(false);
    setNotebookPage(1);
    setReportImageUrl("");
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
    (record) => getRecordLevel(record) === notebookPage
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
    const step = isMobileLayout ? 1 : 2;
    const maxPage = isMobileLayout
      ? notebookPagesForLayout.length - 1
      : notebookPagesForLayout.length - 2;

    setCurrentBookPage((prev) => Math.min(prev + step, maxPage));
  };

  const prevBookPage = () => {
    const step = isMobileLayout ? 1 : 2;
    setCurrentBookPage((prev) => Math.max(prev - step, 0));
  };

  const isNotebookLevelCompleted = (level) =>
    notebookCompletedRecords.some(
      (record) => getRecordLevel(record) === level
    );

  const jumpToNotebookPage = (targetPage) => {
    if (!isMobileLayout) {
      setCurrentBookPage(targetPage);
      return;
    }

    const target = NOTEBOOK_PAGES[targetPage];
    const mobileIndex = MOBILE_NOTEBOOK_PAGES.findIndex((page) => page === target);
    setCurrentBookPage(mobileIndex >= 0 ? mobileIndex : 0);
  };

  const renderNotebookPage = (page, side = "left") => {
    const pageRadius = side === "left" ? "22px 6px 6px 22px" : "6px 22px 22px 6px";
    const pageShadow =
      side === "left"
        ? "inset -18px 0 30px rgba(32, 24, 10, 0.14)"
        : "inset 18px 0 30px rgba(32, 24, 10, 0.12)";

    const basePageStyle = {
      minHeight: "520px",
      // 預留底部導覽按鈕空間，避免手機版內容過長時與 PREV / NEXT 重疊
      padding: side === "left" ? "34px 34px 124px 54px" : "34px 34px 124px 34px",
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

    const spiralBinding = side === "left" ? (
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "6px",
          top: "16px",
          bottom: "16px",
          width: "28px",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          pointerEvents: "none"
        }}
      >
        {Array.from({ length: 13 }).map((_, index) => (
          <div
            key={index}
            style={{
              position: "relative",
              width: "24px",
              height: "14px"
            }}
          >
            <span
              style={{
                position: "absolute",
                left: "0px",
                top: "0px",
                width: "10px",
                height: "12px",
                border: "2px solid #1e1e1e",
                borderRight: "none",
                borderRadius: "10px 0 0 10px",
                background: "transparent"
              }}
            />
            <span
              style={{
                position: "absolute",
                left: "8px",
                top: "0px",
                width: "10px",
                height: "12px",
                border: "2px solid #1e1e1e",
                borderLeft: "none",
                borderRadius: "0 10px 10px 0",
                background: "transparent"
              }}
            />
          </div>
        ))}
      </div>
    ) : null;

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

    if (page.type === "chapter") {
      return (
        <div className="field-book-page field-book-record-page page-fade-slide" style={basePageStyle}>
          {paperTexture}
          {spiralBinding}
          <div style={{ position: "relative", zIndex: 3 }}>
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "13px", letterSpacing: "0.18em", fontWeight: 900, color: "#84612c" }}>
                CHAPTER {page.code}
              </div>
              <h2 style={{ margin: "8px 0 0", fontSize: "27px", lineHeight: 1.25, color: "#12352f" }}>
                {page.title}
              </h2>
            </div>

            <div style={{ display: "grid", gap: "13px" }}>
              {page.levels.filter((level) => isNotebookLevelCompleted(level)).length > 0 ? (
                page.levels
                  .filter((level) => isNotebookLevelCompleted(level))
                  .map((level) => {
                    const note = NOTEBOOK_LEVEL_NOTES[level];
                    const record = notebookCompletedRecords.find(
                      (item) => getRecordLevel(item) === level
                    );
                    const attempts = Number(record?.attempt_count || (record?.wrong ? 2 : 1));
                    const answerLabel = record?.first_try_correct
                      ? "首次答對"
                      : record?.wrong
                      ? "修正後答對"
                      : "已完成";

                    return (
                      <article
                        key={level}
                        style={{
                          borderRadius: "17px",
                          padding: "16px 18px",
                          background: "rgba(255, 249, 231, 0.50)",
                          border: "1px solid rgba(18,53,47,0.18)",
                          boxShadow: "0 8px 18px rgba(44, 31, 13, 0.10)"
                        }}
                      >
                        <div style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "12px",
                          alignItems: "center",
                          marginBottom: "8px"
                        }}>
                          <div>
                            <div style={{ margin: "0 0 4px", fontSize: "11px", letterSpacing: "0.14em", fontWeight: 800, color: "#84612c" }}>
                              PLAY RECORD
                            </div>
                            <h3 style={{ margin: 0, fontSize: "18px", color: "#12352f" }}>
                              {note.title}
                            </h3>
                          </div>
                          <span style={{
                            flex: "0 0 auto",
                            fontSize: "12px",
                            fontWeight: 900,
                            borderRadius: "999px",
                            padding: "5px 9px",
                            background: "rgba(18, 53, 47, 0.14)",
                            color: "#12352f"
                          }}>
                            已記錄
                          </span>
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                            gap: "8px 12px",
                            margin: "12px 0 12px",
                            padding: "11px 12px",
                            borderRadius: "12px",
                            background: "rgba(18,53,47,0.07)",
                            color: "#36564d",
                            fontSize: "13px",
                            lineHeight: 1.55
                          }}
                        >
                          <span><strong>本關耗時：</strong>{formatTime(Number(record?.time_seconds || 0))}</span>
                          <span><strong>累計時間：</strong>{formatTime(Number(record?.total_seconds || 0))}</span>
                          <span><strong>作答狀態：</strong>{answerLabel}</span>
                          <span><strong>作答次數：</strong>{attempts} 次</span>
                          <span style={{ gridColumn: "1 / -1" }}>
                            <strong>完成時間：</strong>{record?.completed_date || "--"} {record?.completed_time || ""}
                          </span>
                        </div>

                        <p style={{ margin: 0, fontSize: "15px", lineHeight: 1.72, color: "#36564d" }}>
                          {note.content}
                        </p>
                      </article>
                    );
                  })
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
                  這一章尚無遊玩紀錄。完成對應關卡後，這裡會顯示詳細闖關資料。
                </div>
              )}
            </div>
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
              <h1 className="hero-title">你能找出城市裡被忽略的危險嗎？</h1>
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
              const completedLevelSet = getCompletedLevelSet();

              // 關卡解鎖以 Firebase / records 的實際破關紀錄為主，
              // 不再只依賴 localStorage 的 unlockedLevel，避免換裝置或重新登入後卡片又被鎖住。
              const unlockedByRecords = isCaseUnlockedByRecords(index, completedLevelSet);
              const unlockedByLocalProgress = index === 0 || unlockedLevel >= firstLevel;
              const isUnlocked = unlockedByRecords || unlockedByLocalProgress;

              const isCompleted = file.levels.every((level) =>
                completedLevelSet.has(level)
              );

              // 已完成玩家仍可點進已解鎖卡片查看內容，只是作答區會鎖住。
              const canEnterLevel = isUnlocked;

              const statusText = isCompletedViewer
                ? (isUnlocked ? "僅查看紀錄" : "尚未解鎖")
                : isCompleted
                ? "已完成"
                : isUnlocked
                ? "可開始"
                : "尚未解鎖";

              return (
                <button
                  key={file.id}
                  className={`mission-file-card ${file.theme} ${canEnterLevel ? "unlocked" : "locked"} ${isCompleted ? "completed" : ""}`}
                  onClick={() => {
                    if (!canEnterLevel) return;
                    handleStartGame(file.levels[0]);
                  }}
                  disabled={!canEnterLevel}
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

                  <div
                    className="mission-file-level-list"
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "8px",
                      margin: "12px 0 14px"
                    }}
                  >
                    {file.levels.map((level) => {
                      const meta = LEVEL_FILES.find((item) => item.id === level);
                      const done = completedLevelSet.has(level);

                      return (
                        <span
                          key={level}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "6px 10px",
                            borderRadius: "999px",
                            border: "1px solid rgba(255,255,255,0.18)",
                            background: done
                              ? "rgba(236, 197, 105, 0.20)"
                              : "rgba(255,255,255,0.08)",
                            fontSize: "13px",
                            fontWeight: 800,
                            letterSpacing: "0.04em"
                          }}
                        >
                          <span>{done ? "✓" : "○"}</span>
                          <span>{meta?.label || `第 ${level} 關`}</span>
                        </span>
                      );
                    })}
                  </div>

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
            {CHAPTERS[currentChapter].title}
          </h1>


          {isWrong ? (
            <div className="error-area">
              <p className="error-text">答案還不太對喔！</p>
              {!showHint ? (
                <button className="help-btn" onClick={() => setShowHint(true)}>
                  查看提示
                </button>
              ) : (
                <>
                  <p className="hint-text">{DEMO_WRONG_HINT}</p>
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
                  {storyPhase === "task" ? (
                    <div
                      className="physical-task-panel"
                      style={{
                        position: "relative",
                        marginTop: "10px",
                        padding: "26px 24px 104px",
                        borderRadius: "30px",
                        background: "linear-gradient(180deg, rgba(255,255,255,0.11), rgba(255,255,255,0.06))",
                        border: "1px solid rgba(255,255,255,0.14)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 14px 36px rgba(0,0,0,0.12)",
                        textAlign: "left",
                        overflow: "hidden",
                        minHeight: "260px"
                      }}
                    >
                      <div
                        style={{
                          fontSize: "clamp(1.25rem, 3.2vw, 1.75rem)",
                          fontWeight: 900,
                          color: "#f5f2ea",
                          marginBottom: "18px",
                          letterSpacing: "0.02em"
                        }}
                      >
                        【{CHAPTERS[currentChapter].taskTitle}】
                      </div>

                      <div
                        style={{
                          fontSize: "clamp(1.12rem, 2.8vw, 1.45rem)",
                          lineHeight: 1.95,
                          color: "rgba(255,255,255,0.95)",
                          whiteSpace: "pre-line",
                          maxWidth: "78%"
                        }}
                      >
                        {CHAPTERS[currentChapter].taskContent}
                      </div>

                      <div
                        style={{
                          position: "absolute",
                          right: "12px",
                          bottom: "8px",
                          pointerEvents: "none"
                        }}
                      >
                        <TrafficPromptIllustration level={currentChapter} />
                      </div>
                    </div>
                  ) : (
                    <div className="typewriter-text">{displayedText}</div>
                  )}

                  {showUI && storyPhase === "story" && (
                    <div className="input-area">
                      <button className="glow-btn" onClick={handleStoryContinue}>
                        繼續
                      </button>
                    </div>
                  )}

                  {showUI && storyPhase === "task" && (
                    <div className="input-area">
                      {isCompletedViewer ? (
                        <>
                          <div
                            style={{
                              width: "100%",
                              padding: "15px 18px",
                              borderRadius: "16px",
                              border: "1px solid rgba(240, 199, 104, 0.35)",
                              background: "rgba(240, 199, 104, 0.10)",
                              color: "#f7e9bd",
                              fontWeight: 800,
                              lineHeight: 1.65,
                              textAlign: "center"
                            }}
                          >
                            🔒 此活動碼已完成全部任務，目前為唯讀模式。你可以查看關卡內容與闖關紀錄，但不能再次作答。
                          </div>
                          <button
                            className="back-page-btn"
                            onClick={handleExitToLevelSelect}
                          >
                            回任務檔案
                          </button>
                        </>
                      ) : (
                        <>
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
                        </>
                      )}
                    </div>
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
        <div
          className="overlay transition-overlay"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 3000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "22px",
            background: "rgba(3, 16, 14, 0.58)",
            backdropFilter: "blur(6px)"
          }}
        >
          <div
            className="transition-card float-in-card"
            style={{
              width: "min(88vw, 430px)",
              borderRadius: "30px",
              padding: "42px 34px 36px",
              textAlign: "center",
              background:
                "linear-gradient(145deg, rgba(255, 250, 235, 0.98), rgba(232, 213, 171, 0.96))",
              border: "1px solid rgba(247, 231, 189, 0.7)",
              boxShadow:
                "0 26px 70px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.65)"
            }}
          >
            <h2
              className="puzzle-title"
              style={{
                margin: "0 0 18px",
                textAlign: "center",
                fontSize: "clamp(2rem, 7vw, 2.8rem)",
                lineHeight: 1.15,
                color: "#173f36",
                fontFamily:
                  "'Noto Serif TC', 'Songti TC', 'PMingLiU', serif",
                fontWeight: 900,
                letterSpacing: "0.08em"
              }}
            >
              過關成功
            </h2>

            <div
              className="typewriter-text transition-text"
              style={{
                margin: "0 auto 30px",
                maxWidth: "320px",
                textAlign: "center",
                fontSize: "clamp(1.05rem, 4.4vw, 1.22rem)",
                lineHeight: 1.85,
                color: "#3b5b52",
                whiteSpace: "pre-wrap"
              }}
            >
              {transitionMessage}
            </div>

            <button
              className="glow-btn"
              onClick={handleNextChapter}
              style={{
                width: "min(100%, 310px)",
                borderRadius: "999px",
                padding: "16px 22px",
                background:
                  "linear-gradient(135deg, #123b34, #1f5a4e)",
                color: "#f7e7bd",
                border: "1px solid rgba(247, 231, 189, 0.45)",
                boxShadow:
                  "0 14px 30px rgba(11, 47, 39, 0.38), inset 0 1px 0 rgba(255,255,255,0.15)",
                fontSize: "1.18rem",
                fontWeight: 900,
                letterSpacing: "0.08em"
              }}
            >
              繼續闖關
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
              {renderNotebookPage(notebookPagesForLayout[currentBookPage], "left")}
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
              {renderNotebookPage(isMobileLayout ? null : notebookPagesForLayout[currentBookPage + 1], "right")}

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
                  disabled={currentBookPage >= (isMobileLayout ? notebookPagesForLayout.length - 1 : notebookPagesForLayout.length - 2)}
                  style={{
                    pointerEvents: "auto",
                    border: "1px solid rgba(247,231,189,0.18)",
                    borderRadius: "999px",
                    padding: "9px 16px",
                    background: currentBookPage >= (isMobileLayout ? notebookPagesForLayout.length - 1 : notebookPagesForLayout.length - 2) ? "rgba(18,53,47,0.16)" : "rgba(18,53,47,0.92)",
                    color: currentBookPage >= (isMobileLayout ? notebookPagesForLayout.length - 1 : notebookPagesForLayout.length - 2) ? "rgba(18,53,47,0.44)" : "#f7e7bd",
                    fontWeight: 900,
                    letterSpacing: "0.08em",
                    cursor: currentBookPage >= (isMobileLayout ? notebookPagesForLayout.length - 1 : notebookPagesForLayout.length - 2) ? "default" : "pointer"
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
        const demoLevels = [1, 2, 3, 4];
        const completedRecords = getUniqueRecords(records).filter((record) => {
          const level = Number(String(record.puzzle_id).replace("puzzle_0", ""));
          return demoLevels.includes(level);
        });

        const finalRecord = completedRecords.find(
          (record) => record.puzzle_id === `puzzle_0${DEMO_END_LEVEL}`
        );

        const demoTotalSeconds = Number(finalRecord?.total_seconds || totalElapsedTime || 0);
        const wrongRecords = completedRecords.filter((record) => record.wrong);

        const levelRows = demoLevels.map((level) => {
          const record = completedRecords.find(
            (item) => item.puzzle_id === `puzzle_0${level}`
          );

          return {
            level,
            title: CHAPTERS[level]?.title || `第 ${level} 關`,
            time: Number(record?.time_seconds || 0),
            wrong: Boolean(record?.wrong),
            attempts: Number(record?.attempt_count || (record?.wrong ? 2 : record ? 1 : 0)),
            completed: Boolean(record),
            concept: CHAPTERS[level]?.concept || DEMO_KNOWLEDGE_POINTS[level] || ""
          };
        });

        const completedCount = levelRows.filter((item) => item.completed).length;
        const totalAttempts = levelRows.reduce((sum, item) => sum + Number(item.attempts || 0), 0);
        const answerAccuracy = totalAttempts > 0
          ? Math.round((completedCount / totalAttempts) * 100)
          : 0;
        const maxTime = Math.max(...levelRows.map((item) => item.time || 0), 1);

        return (
          <div
            className="result-screen"
            id="result-screen"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 4000,
              minHeight: "100vh",
              overflowY: "auto",
              overflowX: "hidden",
              WebkitOverflowScrolling: "touch",
              padding: "24px 14px 42px",
              background:
                "radial-gradient(circle at top, rgba(220, 167, 77, 0.24), transparent 34%), linear-gradient(135deg, #0a2a26, #061917)",
              display: "block"
            }}
          >
            <div
              className="result-panel"
              style={{
                width: "min(560px, 94vw)",
                margin: "0 auto",
                borderRadius: "34px",
                padding: "22px",
                background: "linear-gradient(135deg, #fff8e8, #e7d1a4)",
                color: "#173f36",
                boxShadow: "0 28px 90px rgba(0,0,0,0.42)"
              }}
            >
              <div
                style={{
                  borderRadius: "26px",
                  padding: "24px 18px",
                  background: "rgba(255,255,255,0.52)",
                  border: "1px solid rgba(23,63,54,0.12)"
                }}
              >
                <div style={{ fontSize: "12px", letterSpacing: "0.16em", fontWeight: 900, color: "#a36f2f" }}>
                  TRAFFIC PUZZLE · CLEAR REPORT
                </div>

                <h1 style={{ margin: "10px 0 6px", fontSize: "clamp(2rem, 9vw, 3rem)", lineHeight: 1.15, color: "#173f36" }}>
                  闖關結果紀錄表
                </h1>

                <p style={{ margin: 0, color: "#52655d", fontSize: "16px", lineHeight: 1.7 }}>
                  {userName || userCode || "玩家"} 的交通安全學習成果
                </p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr",
                    gap: "12px",
                    marginTop: "22px"
                  }}
                >
                  <div style={{ borderRadius: "20px", padding: "18px", background: "#173f36", color: "#f4efe3" }}>
                    <div style={{ fontSize: "13px", opacity: 0.82 }}>同梯次名次</div>
                    <strong style={{ fontSize: "32px" }}>{finalRank ? `第 ${finalRank} 名` : "計算中"}</strong>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div style={{ borderRadius: "20px", padding: "16px", background: "#d9a246", color: "#173f36" }}>
                      <div style={{ fontSize: "13px", opacity: 0.82 }}>總遊玩時間</div>
                      <strong style={{ fontSize: "26px" }}>{formatTime(demoTotalSeconds)}</strong>
                    </div>

                    <div style={{ borderRadius: "20px", padding: "16px", background: "#e8eee5", color: "#173f36" }}>
                      <div style={{ fontSize: "13px", opacity: 0.82 }}>答題正確率</div>
                      <strong style={{ fontSize: "26px" }}>{answerAccuracy}%</strong>
                    </div>
                  </div>
                </div>

                <section style={{ marginTop: "26px" }}>
                  <h2 style={{ margin: "0 0 12px", color: "#173f36", fontSize: "24px" }}>學習趨勢表</h2>

                  <div
                    style={{
                      borderRadius: "18px",
                      overflow: "hidden",
                      border: "1px solid rgba(23,63,54,0.14)",
                      background: "rgba(255,255,255,0.42)"
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.5fr 0.8fr 0.9fr",
                        gap: "8px",
                        padding: "12px 14px",
                        background: "rgba(23,63,54,0.12)",
                        color: "#173f36",
                        fontWeight: 900,
                        fontSize: "14px"
                      }}
                    >
                      <span>關卡</span>
                      <span>時間</span>
                      <span>狀態</span>
                    </div>

                    {levelRows.map((item) => (
                      <div
                        key={item.level}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1.5fr 0.8fr 0.9fr",
                          gap: "8px",
                          padding: "13px 14px",
                          borderTop: "1px solid rgba(23,63,54,0.10)",
                          color: "#36564d",
                          fontSize: "14px",
                          lineHeight: 1.55
                        }}
                      >
                        <strong style={{ color: "#173f36" }}>{item.title}</strong>
                        <span>{item.completed ? formatTime(item.time) : "--"}</span>
                        <span>{item.completed ? `${item.wrong ? "修正後答對" : "首次答對"} · ${item.attempts}次` : "未完成"}</span>

                        <div style={{ gridColumn: "1 / -1", height: "7px", borderRadius: "999px", background: "rgba(23,63,54,0.10)", overflow: "hidden" }}>
                          <div
                            style={{
                              width: item.completed ? `${Math.max(12, Math.round((item.time / maxTime) * 100))}%` : "0%",
                              height: "100%",
                              borderRadius: "999px",
                              background: item.wrong ? "#a96a42" : "#d9a246"
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section style={{ marginTop: "26px" }}>
                  <h2 style={{ margin: "0 0 12px", color: "#173f36", fontSize: "24px" }}>知識點摘要</h2>

                  <div style={{ display: "grid", gap: "12px" }}>
                    {levelRows.map((item) => (
                      <div
                        key={item.level}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "28px 1fr",
                          gap: "10px",
                          alignItems: "flex-start",
                          padding: "14px",
                          borderRadius: "16px",
                          background: "rgba(255,255,255,0.48)",
                          border: "1px solid rgba(23,63,54,0.10)"
                        }}
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            width: "22px",
                            height: "22px",
                            marginTop: "2px",
                            borderRadius: "50%",
                            background: item.completed ? "#173f36" : "rgba(23,63,54,0.18)",
                            color: "#f7e7bd",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "13px",
                            fontWeight: 900,
                            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)"
                          }}
                        >
                          ✓
                        </span>

                        <div>
                          <strong style={{ display: "block", marginBottom: "5px", color: "#173f36" }}>{item.title}</strong>
                          <p style={{ margin: 0, color: "#52655d", lineHeight: 1.7, fontSize: "15px" }}>
                            {item.concept}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>

            <div
              className="result-actions"
              style={{
                width: "min(560px, 94vw)",
                margin: "20px auto 0",
                display: "grid",
                gap: "12px"
              }}
            >
              <button
                className="glow-btn"
                onClick={handleDownloadResult}
                style={{
                  borderRadius: "18px",
                  background: "linear-gradient(135deg, #123b34, #1f5a4e)",
                  color: "#f7e7bd",
                  border: "1px solid rgba(247,231,189,0.35)",
                  padding: "16px 20px",
                  fontWeight: 900,
                  letterSpacing: "0.06em"
                }}
              >
                儲存闖關記錄表
              </button>

              <button className="back-cancel-btn" onClick={handleFinishChallenge}>
                已結束挑戰
              </button>
            </div>

            {reportImageUrl && (
              <div
                style={{
                  width: "min(94vw, 460px)",
                  margin: "22px auto 0",
                  textAlign: "center",
                  color: "#f4efe3"
                }}
              >
                <p style={{ margin: "0 0 12px", fontWeight: 800, lineHeight: 1.6 }}>
                  圖片已生成。手機可長按下方圖片儲存，電腦可直接下載 PNG。
                </p>
                <img
                  src={reportImageUrl}
                  alt="闖關記錄表"
                  style={{
                    width: "100%",
                    borderRadius: "18px",
                    boxShadow: "0 18px 50px rgba(0,0,0,0.42)",
                    border: "1px solid rgba(255,255,255,0.18)"
                  }}
                />
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

export default App;