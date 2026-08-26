"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const initialGoals = [
  {
    he: "לסגור את פרויקט חברון",
    en: "Close the Hebron project",
  },
  {
    he: "לסגור את פרויקט מאור התורה",
    en: "Close the Maor HaTorah project",
  },
  {
    he: "לסגור את פרויקט אלעד",
    en: "Close the Elad project",
  },
  {
    he: "לסגור את פרויקט כרמים",
    en: "Close the Kramim project",
  },
  {
    he: "לסגור את פרויקט נתניה וולפסון",
    en: "Close the Netanya Wolfson project",
  },
  {
    he: "לסגור את פרויקט מתכנסת רמות",
    en: "Close the Mitkaneset Ramot project",
  },
  {
    he: "לסגור את פרויקט קריית גת — אלף יחידות דיור",
    en: "Close the Kiryat Gat project — 1,000 housing units",
  },
];

const STORAGE_KEY = "tzviair-project-goals-v2";
const LEGACY_STORAGE_KEY = "tzviair-project-goals";
const LANGUAGE_KEY = "tzviair-goals-language";
const CLOUD_SYNC_INTERVAL_MS = 5000;

const translations = {
  he: {
    languageButton: "English",
    settings: "הגדרות",
    closeSettings: "סגירת הגדרות",
    boardLabel: "לוח היעדים של צבי־אייר",
    headline: "מתחילים. מודדים. מסיימים חזק.",
    progressSummary: "סיכום התקדמות",
    overallProgress: "התקדמות כללית",
    outOf: "מתוך",
    projectsCompleted: "פרויקטים הושלמו",
    completed: "הושלמו",
    projects: "פרויקטים",
    inProgress: "בתהליך",
    activeTimers: "עם טיימר פעיל",
    notStartedPlural: "טרם התחילו",
    waitingToStart: "ממתינים להתחלה",
    dailyWork: "עבודה שוטפת",
    activeGoals: "יעדים פעילים",
    notStarted: "טרם התחיל",
    workTime: "זמן עבודה",
    startGoal: "התחל יעד",
    finishGoal: "סיים והעבר לסגורים",
    startTimerFor: "התחל טיימר עבור",
    finish: "סיים את",
    allActiveDone: "כל היעדים הפעילים הושלמו",
    addFromSettings: "אפשר להוסיף יעד חדש דרך ההגדרות.",
    successArchive: "ארכיון הצלחות",
    closedGoals: "יעדים שנסגרו",
    goalsCompleted: "יעדים הושלמו",
    completionDate: "מועד סגירה",
    reopen: "החזר לפעילות",
    reset: "אפס יעד וטיימר",
    resetLabel: "אפס את היעד והטיימר עבור",
    noClosedGoals: "כאן יופיעו היעדים לאחר שתתחילו ותסיימו אותם.",
    settingsTitle: "הגדרות הלוח",
    settingsDescription: "כאן אפשר להוסיף יעדים חדשים בלי להעמיס על מסך הטלוויזיה.",
    addGoal: "הוספת יעד חדש",
    newGoalName: "שם היעד החדש",
    newGoalPlaceholder: "כתבו כאן יעד חדש...",
    targetTime: "זמן יעד",
    targetTimeShort: "יעד",
    hours: "שעות",
    minutes: "דקות",
    remaining: "נותרו",
    overTarget: "מעבר ליעד",
    add: "הוסף יעד",
    manageGoals: "ניהול וסידור יעדים",
    manageGoalsDescription: "ערכו, סדרו או מחקו יעדים. כל שינוי נשמר לכל המחשבים.",
    edit: "עריכה",
    save: "שמור",
    cancel: "ביטול",
    moveUp: "העבר למעלה",
    moveDown: "העבר למטה",
    delete: "מחק",
    deleteConfirm: "למחוק את היעד הזה? הפעולה תישמר בכל המחשבים.",
    noTarget: "ללא זמן יעד",
    localStorageNote: "היעדים נשמרים בענן המשותף וגם כגיבוי בדפדפן הזה.",
    cloudSaved: "מסונכרן בענן",
    cloudSyncing: "שומר בענן...",
    cloudOffline: "ממתין לחיבור",
    sharedBoard: "לוח משותף לכל המחשבים",
    footer: "מכוונים גבוה, מסיימים חזק",
    celebration: "כל הכבוד! עוד יעד הושלם",
    completedBeforeTimer: "הושלם לפני הוספת מדידת הזמן",
  },
  en: {
    languageButton: "עברית",
    settings: "Settings",
    closeSettings: "Close settings",
    boardLabel: "TzviAir Goals Board",
    headline: "Start. Measure. Finish strong.",
    progressSummary: "Progress summary",
    overallProgress: "Overall progress",
    outOf: "of",
    projectsCompleted: "projects completed",
    completed: "Completed",
    projects: "Projects",
    inProgress: "In progress",
    activeTimers: "with active timers",
    notStartedPlural: "Not started",
    waitingToStart: "waiting to begin",
    dailyWork: "Current work",
    activeGoals: "Active goals",
    notStarted: "Not started",
    workTime: "Work time",
    startGoal: "Start goal",
    finishGoal: "Finish and close",
    startTimerFor: "Start timer for",
    finish: "Finish",
    allActiveDone: "All active goals are complete",
    addFromSettings: "Add a new goal from Settings.",
    successArchive: "Success archive",
    closedGoals: "Closed goals",
    goalsCompleted: "goals completed",
    completionDate: "Completed",
    reopen: "Reopen and continue",
    reset: "Reset goal and timer",
    resetLabel: "Reset the goal and timer for",
    noClosedGoals: "Completed goals will appear here.",
    settingsTitle: "Board settings",
    settingsDescription: "Add new goals here without cluttering the TV dashboard.",
    addGoal: "Add a new goal",
    newGoalName: "New goal name",
    newGoalPlaceholder: "Type a new goal...",
    targetTime: "Target time",
    targetTimeShort: "Target",
    hours: "Hours",
    minutes: "Minutes",
    remaining: "Remaining",
    overTarget: "Over target",
    add: "Add goal",
    manageGoals: "Manage and reorder goals",
    manageGoalsDescription: "Edit, reorder, or delete goals. Every change is shared across computers.",
    edit: "Edit",
    save: "Save",
    cancel: "Cancel",
    moveUp: "Move up",
    moveDown: "Move down",
    delete: "Delete",
    deleteConfirm: "Delete this goal? The change will be saved on every computer.",
    noTarget: "No target time",
    localStorageNote: "Goals are saved in the shared cloud with a browser backup.",
    cloudSaved: "Cloud synced",
    cloudSyncing: "Saving to cloud...",
    cloudOffline: "Waiting for connection",
    sharedBoard: "Shared across all computers",
    footer: "Aim high. Finish strong.",
    celebration: "Great work! Another goal completed",
    completedBeforeTimer: "Completed before time tracking was added",
  },
} as const;

type Language = keyof typeof translations;
type GoalStatus = "not-started" | "in-progress" | "completed";
type SyncStatus = "connecting" | "syncing" | "saved" | "offline";

type Goal = {
  id: string;
  title: string;
  status: GoalStatus;
  startedAt: number | null;
  elapsedMs: number;
  completedAt: number | null;
  targetMs?: number | null;
};

type Celebration = {
  id: number;
};

type CloudState = {
  version: number;
  goals: Goal[] | null;
  updatedAt: number;
};

function currentTimestamp() {
  return Date.now();
}

function createInitialGoals(legacyCompleted?: boolean[]): Goal[] {
  return initialGoals.map((title, index) => ({
    id: `tzviair-goal-${index + 1}`,
    title: title.he,
    status: legacyCompleted?.[index] ? "completed" : "not-started",
    startedAt: null,
    elapsedMs: 0,
    completedAt: null,
  }));
}

function isStoredGoal(value: unknown): value is Goal {
  if (!value || typeof value !== "object") return false;
  const goal = value as Partial<Goal>;
  return (
    typeof goal.id === "string" &&
    typeof goal.title === "string" &&
    ["not-started", "in-progress", "completed"].includes(goal.status ?? "") &&
    (typeof goal.startedAt === "number" || goal.startedAt === null) &&
    typeof goal.elapsedMs === "number" &&
    (typeof goal.completedAt === "number" || goal.completedAt === null) &&
    (goal.targetMs === undefined ||
      goal.targetMs === null ||
      (typeof goal.targetMs === "number" && goal.targetMs >= 0))
  );
}

function isCloudState(value: unknown): value is CloudState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<CloudState>;
  return (
    typeof state.version === "number" &&
    typeof state.updatedAt === "number" &&
    (state.goals === null ||
      (Array.isArray(state.goals) && state.goals.every(isStoredGoal)))
  );
}

function cloudTestHeaders(): Record<string, string> {
  if (
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("cloud-test") === "1"
  ) {
    return { "x-tzviair-test-board": "1" };
  }
  return {};
}

async function readCloudState() {
  const response = await fetch("/api/goals", {
    cache: "no-store",
    headers: { Accept: "application/json", ...cloudTestHeaders() },
  });
  if (!response.ok) throw new Error("Unable to read shared goals.");

  const state: unknown = await response.json();
  if (!isCloudState(state)) throw new Error("Invalid shared goals response.");
  return state;
}

async function writeCloudState(goals: Goal[]) {
  const response = await fetch("/api/goals", {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...cloudTestHeaders(),
    },
    body: JSON.stringify({ goals }),
  });
  if (!response.ok) throw new Error("Unable to save shared goals.");

  const state: unknown = await response.json();
  if (!isCloudState(state) || !state.goals) {
    throw new Error("Invalid shared goals response.");
  }
  return state;
}

function formatElapsed(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function targetFromInputs(hours: string, minutes: string) {
  const totalMinutes =
    Math.max(0, Number.parseInt(hours, 10) || 0) * 60 +
    Math.max(0, Number.parseInt(minutes, 10) || 0);
  return totalMinutes > 0 ? totalMinutes * 60_000 : null;
}

function targetInputParts(targetMs?: number | null) {
  const totalMinutes = Math.max(0, Math.round((targetMs ?? 0) / 60_000));
  return {
    hours: String(Math.floor(totalMinutes / 60)),
    minutes: String(totalMinutes % 60),
  };
}

function formatCompletedAt(
  timestamp: number | null,
  language: Language,
  fallback: string,
) {
  if (!timestamp) return fallback;

  return new Intl.DateTimeFormat(language === "he" ? "he-IL" : "en-US", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(timestamp);
}

function displayGoalTitle(goal: Goal, language: Language) {
  const builtInIndex = initialGoals.findIndex(
    (_, index) => goal.id === `tzviair-goal-${index + 1}`,
  );

  return builtInIndex >= 0 && goal.title === initialGoals[builtInIndex].he
    ? initialGoals[builtInIndex][language]
    : goal.title;
}

function Fireworks({
  celebration,
  message,
}: {
  celebration: Celebration;
  message: string;
}) {
  const bursts = [
    { x: "24%", y: "31%", delay: "0s" },
    { x: "50%", y: "20%", delay: "0.24s" },
    { x: "76%", y: "35%", delay: "0.1s" },
    { x: "36%", y: "60%", delay: "0.42s" },
    { x: "67%", y: "62%", delay: "0.34s" },
  ];

  return (
    <div className="celebration-layer" aria-live="polite">
      <p className="celebration-message">{message}</p>
      <div className="fireworks" aria-hidden="true">
        {bursts.map((burst, burstIndex) => (
          <span
            className="firework-burst"
            key={`${celebration.id}-${burstIndex}`}
            style={
              {
                "--burst-x": burst.x,
                "--burst-y": burst.y,
                "--burst-delay": burst.delay,
              } as React.CSSProperties
            }
          >
            {Array.from({ length: 16 }, (_, sparkIndex) => (
              <i
                className="firework-spark"
                key={sparkIndex}
                style={
                  {
                    "--spark-index": sparkIndex,
                    "--spark-color": [
                      "#00bce7",
                      "#ffb600",
                      "#ff7a00",
                      "#18468f",
                    ][sparkIndex % 4],
                  } as React.CSSProperties
                }
              />
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const [goals, setGoals] = useState<Goal[]>(() => createInitialGoals());
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalHours, setNewGoalHours] = useState("0");
  const [newGoalMinutes, setNewGoalMinutes] = useState("0");
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editGoalTitle, setEditGoalTitle] = useState("");
  const [editGoalHours, setEditGoalHours] = useState("0");
  const [editGoalMinutes, setEditGoalMinutes] = useState("0");
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const [language, setLanguage] = useState<Language>("he");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [ready, setReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("connecting");
  const goalsRef = useRef(goals);
  const hadStoredGoalsRef = useRef(false);
  const migrationAttemptedRef = useRef(false);
  const pendingSaveRef = useRef<Goal[] | null>(null);
  const saveRunningRef = useRef(false);
  const lastServerUpdatedAtRef = useRef(0);
  const text = translations[language];
  const direction = language === "he" ? "rtl" : "ltr";

  const flushPendingSave = useCallback(async () => {
    if (saveRunningRef.current || !pendingSaveRef.current) return;

    saveRunningRef.current = true;
    setSyncStatus("syncing");

    while (pendingSaveRef.current) {
      const goalsToSave: Goal[] = pendingSaveRef.current;
      try {
        const state = await writeCloudState(goalsToSave);
        lastServerUpdatedAtRef.current = state.updatedAt;
        if (pendingSaveRef.current === goalsToSave) {
          pendingSaveRef.current = null;
        }
      } catch {
        setSyncStatus("offline");
        break;
      }
    }

    saveRunningRef.current = false;
    if (!pendingSaveRef.current) setSyncStatus("saved");
  }, []);

  const applySharedGoals = useCallback(
    (nextGoals: Goal[]) => {
      goalsRef.current = nextGoals;
      setGoals(nextGoals);
      pendingSaveRef.current = nextGoals;
      void flushPendingSave();
    },
    [flushPendingSave],
  );

  useEffect(() => {
    try {
      const savedLanguage = window.localStorage.getItem(LANGUAGE_KEY);
      if (savedLanguage === "he" || savedLanguage === "en") {
        // Browser storage is the external source of truth during hydration.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLanguage(savedLanguage);
      }

      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.every(isStoredGoal)) {
          hadStoredGoalsRef.current = true;
          goalsRef.current = parsed;
          setGoals(parsed);
          setReady(true);
          return;
        }
      }

      const legacySaved = window.localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacySaved) {
        const parsedLegacy: unknown = JSON.parse(legacySaved);
        if (
          Array.isArray(parsedLegacy) &&
          parsedLegacy.length === initialGoals.length
        ) {
          const migratedGoals = createInitialGoals(parsedLegacy.map(Boolean));
          hadStoredGoalsRef.current = true;
          goalsRef.current = migratedGoals;
          setGoals(migratedGoals);
        }
      }
    } catch {
      // The tracker still works if browser storage is unavailable.
    }
    setReady(true);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = direction;
    try {
      window.localStorage.setItem(LANGUAGE_KEY, language);
    } catch {
      // The language switch still works if browser storage is unavailable.
    }
  }, [direction, language]);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
    } catch {
      // Saving progress is a convenience, not a requirement.
    }
  }, [goals, ready]);

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;

    async function synchronize() {
      if (pendingSaveRef.current) {
        await flushPendingSave();
        return;
      }
      if (saveRunningRef.current) return;

      try {
        const state = await readCloudState();
        if (cancelled) return;

        if (state.goals) {
          if (state.updatedAt > lastServerUpdatedAtRef.current) {
            lastServerUpdatedAtRef.current = state.updatedAt;
            goalsRef.current = state.goals;
            setGoals(state.goals);
          }
          setSyncStatus("saved");
          return;
        }

        if (
          hadStoredGoalsRef.current &&
          !migrationAttemptedRef.current
        ) {
          migrationAttemptedRef.current = true;
          pendingSaveRef.current = goalsRef.current;
          await flushPendingSave();
          return;
        }

        setSyncStatus("saved");
      } catch {
        if (!cancelled) setSyncStatus("offline");
      }
    }

    const syncOnFocus = () => void synchronize();
    const syncWhenVisible = () => {
      if (document.visibilityState === "visible") void synchronize();
    };

    void synchronize();
    const interval = window.setInterval(
      () => void synchronize(),
      CLOUD_SYNC_INTERVAL_MS,
    );
    window.addEventListener("focus", syncOnFocus);
    document.addEventListener("visibilitychange", syncWhenVisible);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", syncOnFocus);
      document.removeEventListener("visibilitychange", syncWhenVisible);
    };
  }, [flushPendingSave, ready]);

  const hasRunningTimer = goals.some((goal) => goal.status === "in-progress");

  useEffect(() => {
    if (!hasRunningTimer) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [hasRunningTimer]);

  useEffect(() => {
    if (!celebration) return;
    const timeout = window.setTimeout(() => setCelebration(null), 2400);
    return () => window.clearTimeout(timeout);
  }, [celebration]);

  useEffect(() => {
    if (!settingsOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSettingsOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [settingsOpen]);

  const activeGoals = useMemo(
    () => goals.filter((goal) => goal.status !== "completed"),
    [goals],
  );
  const closedGoals = useMemo(
    () =>
      goals
        .filter((goal) => goal.status === "completed")
        .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0)),
    [goals],
  );
  const startedCount = goals.filter(
    (goal) => goal.status === "in-progress",
  ).length;
  const notStartedCount = goals.filter(
    (goal) => goal.status === "not-started",
  ).length;
  const completedCount = closedGoals.length;
  const progress =
    goals.length === 0 ? 0 : Math.round((completedCount / goals.length) * 100);

  function elapsedFor(goal: Goal) {
    if (goal.status === "in-progress" && goal.startedAt) {
      return goal.elapsedMs + Math.max(0, now - goal.startedAt);
    }
    return goal.elapsedMs;
  }

  function addGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = newGoalTitle.trim();
    if (!title) return;

    const nextGoals: Goal[] = [
      ...goalsRef.current,
      {
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `goal-${currentTimestamp()}`,
        title,
        status: "not-started",
        startedAt: null,
        elapsedMs: 0,
        completedAt: null,
        targetMs: targetFromInputs(newGoalHours, newGoalMinutes),
      },
    ];
    applySharedGoals(nextGoals);
    setNewGoalTitle("");
    setNewGoalHours("0");
    setNewGoalMinutes("0");
  }

  function beginEditingGoal(goal: Goal) {
    const parts = targetInputParts(goal.targetMs);
    setEditingGoalId(goal.id);
    setEditGoalTitle(displayGoalTitle(goal, language));
    setEditGoalHours(parts.hours);
    setEditGoalMinutes(parts.minutes);
  }

  function cancelEditingGoal() {
    setEditingGoalId(null);
    setEditGoalTitle("");
    setEditGoalHours("0");
    setEditGoalMinutes("0");
  }

  function saveGoalEdits(event: FormEvent<HTMLFormElement>, goalId: string) {
    event.preventDefault();
    const title = editGoalTitle.trim();
    if (!title) return;

    const nextGoals: Goal[] = goalsRef.current.map((goal) =>
      goal.id === goalId
        ? {
            ...goal,
            title,
            targetMs: targetFromInputs(editGoalHours, editGoalMinutes),
          }
        : goal,
    );
    applySharedGoals(nextGoals);
    cancelEditingGoal();
  }

  function moveGoal(goalId: string, direction: -1 | 1) {
    const currentIndex = goalsRef.current.findIndex((goal) => goal.id === goalId);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= goalsRef.current.length) {
      return;
    }

    const nextGoals = [...goalsRef.current];
    [nextGoals[currentIndex], nextGoals[nextIndex]] = [
      nextGoals[nextIndex],
      nextGoals[currentIndex],
    ];
    applySharedGoals(nextGoals);
  }

  function deleteGoal(goalId: string) {
    if (!window.confirm(text.deleteConfirm)) return;
    applySharedGoals(goalsRef.current.filter((goal) => goal.id !== goalId));
    if (editingGoalId === goalId) cancelEditingGoal();
  }

  function startGoal(goalId: string) {
    const startedAt = currentTimestamp();
    setNow(startedAt);
    const nextGoals: Goal[] = goalsRef.current.map((goal) =>
        goal.id === goalId && goal.status === "not-started"
          ? { ...goal, status: "in-progress", startedAt }
          : goal,
    );
    applySharedGoals(nextGoals);
  }

  function finishGoal(goalId: string) {
    const finishedAt = currentTimestamp();
    const finishingGoal = goalsRef.current.find((goal) => goal.id === goalId);
    if (!finishingGoal || finishingGoal.status !== "in-progress") return;

    const nextGoals: Goal[] = goalsRef.current.map((goal) => {
        if (goal.id !== goalId || goal.status !== "in-progress") return goal;
        return {
          ...goal,
          status: "completed",
          elapsedMs:
            goal.elapsedMs +
            (goal.startedAt ? Math.max(0, finishedAt - goal.startedAt) : 0),
          startedAt: null,
          completedAt: finishedAt,
        };
      });
    applySharedGoals(nextGoals);
    setCelebration({ id: finishedAt });
  }

  function reopenGoal(goalId: string) {
    const restartedAt = currentTimestamp();
    setNow(restartedAt);
    const nextGoals: Goal[] = goalsRef.current.map((goal) =>
        goal.id === goalId && goal.status === "completed"
          ? {
              ...goal,
              status: "in-progress",
              startedAt: restartedAt,
              completedAt: null,
            }
          : goal,
    );
    applySharedGoals(nextGoals);
  }

  function resetGoal(goalId: string) {
    const nextGoals: Goal[] = goalsRef.current.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              status: "not-started",
              startedAt: null,
              elapsedMs: 0,
              completedAt: null,
            }
          : goal,
    );
    applySharedGoals(nextGoals);
  }

  return (
    <main className="site-shell" dir={direction}>
      {celebration ? (
        <Fireworks celebration={celebration} message={text.celebration} />
      ) : null}

      <header className="brand-header">
        <div className="brand-stripe" aria-hidden="true" />
        <div className="top-controls" dir={direction}>
          <span
            className={`sync-indicator sync-${syncStatus}`}
            title={text.sharedBoard}
            aria-live="polite"
          >
            <i aria-hidden="true" />
            {syncStatus === "saved"
              ? text.cloudSaved
              : syncStatus === "offline"
                ? text.cloudOffline
                : text.cloudSyncing}
          </span>
          <button
            className="language-button"
            type="button"
            onClick={() =>
              setLanguage((current) => (current === "he" ? "en" : "he"))
            }
          >
            <span aria-hidden="true">文</span>
            {text.languageButton}
          </button>
          <button
            className="settings-button"
            type="button"
            onClick={() => setSettingsOpen(true)}
          >
            <span aria-hidden="true">⚙</span>
            {text.settings}
          </button>
        </div>

        <div className="brand-header-inner">
          <img
            className="brand-logo"
            src="/tzviair-logo.png"
            alt="TzviAir"
          />
          <div className="hero-copy">
            <p className="eyebrow">{text.boardLabel}</p>
            <h1>{text.headline}</h1>
          </div>
        </div>
      </header>

      <section className="content">
        <section className="summary-grid" aria-label={text.progressSummary}>
          <article className="summary-card">
            <span className="summary-label">{text.overallProgress}</span>
            <p className="summary-main">
              <strong>{completedCount}</strong> {text.outOf} {goals.length}{" "}
              {text.projectsCompleted}
            </p>
            <div className="progress-track" aria-hidden="true">
              <span style={{ width: `${progress}%` }} />
            </div>
          </article>

          <article className="metric-card metric-complete">
            <span>{text.completed}</span>
            <strong>{completedCount}</strong>
            <small>{text.projects}</small>
          </article>

          <article className="metric-card metric-open">
            <span>{text.inProgress}</span>
            <strong>{startedCount}</strong>
            <small>{text.activeTimers}</small>
          </article>

          <article className="metric-card metric-percent">
            <span>{text.notStartedPlural}</span>
            <strong>{notStartedCount}</strong>
            <small>{text.waitingToStart}</small>
          </article>
        </section>

        <section className="goals-section" aria-labelledby="goals-heading">
          <div className="section-heading">
            <div>
              <span className="section-kicker">{text.dailyWork}</span>
              <h2 id="goals-heading">{text.activeGoals}</h2>
            </div>
            <p>
              {startedCount} {text.inProgress} · {notStartedCount}{" "}
              {text.notStartedPlural}
            </p>
          </div>

          {activeGoals.length > 0 ? (
            <div className="goals-grid">
              {activeGoals.map((goal, index) => {
                const goalTitle = displayGoalTitle(goal, language);
                const elapsed = elapsedFor(goal);
                const targetDelta = (goal.targetMs ?? 0) - elapsed;
                return (
                  <article
                    className={`goal-card goal-${goal.status}`}
                    key={goal.id}
                  >
                    <div className="goal-card-top">
                      <span className="goal-number">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="goal-state">
                        {goal.status === "in-progress"
                          ? text.inProgress
                          : text.notStarted}
                      </span>
                    </div>

                    <h3 className="goal-text">{goalTitle}</h3>

                    <div className="goal-timer" aria-live="off">
                      <span>{text.workTime}</span>
                      <strong>{formatElapsed(elapsed)}</strong>
                    </div>

                    {goal.targetMs ? (
                      <div
                        className={`goal-target ${targetDelta < 0 ? "goal-target-over" : ""}`}
                      >
                        <span>
                          {text.targetTimeShort} {formatElapsed(goal.targetMs)}
                        </span>
                        <strong>
                          {targetDelta >= 0 ? text.remaining : text.overTarget}{" "}
                          {formatElapsed(Math.abs(targetDelta))}
                        </strong>
                      </div>
                    ) : null}

                    <div className="goal-card-bottom">
                      {goal.status === "not-started" ? (
                        <button
                          className="goal-control-button start-control"
                          type="button"
                          onClick={() => startGoal(goal.id)}
                          aria-label={`${text.startTimerFor} ${goalTitle}`}
                        >
                          <span aria-hidden="true">▶</span>
                          {text.startGoal}
                        </button>
                      ) : (
                        <button
                          className="goal-control-button finish-control"
                          type="button"
                          onClick={() => finishGoal(goal.id)}
                          aria-label={`${text.finish} ${goalTitle}`}
                        >
                          <span aria-hidden="true">✓</span>
                          {text.finishGoal}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <span aria-hidden="true">★</span>
              <strong>{text.allActiveDone}</strong>
              <p>{text.addFromSettings}</p>
            </div>
          )}
        </section>

        <section className="closed-section" aria-labelledby="closed-heading">
          <div className="section-heading">
            <div>
              <span className="section-kicker">{text.successArchive}</span>
              <h2 id="closed-heading">{text.closedGoals}</h2>
            </div>
            <p>
              {closedGoals.length} {text.goalsCompleted}
            </p>
          </div>

          {closedGoals.length > 0 ? (
            <div className="closed-goals-grid">
              {closedGoals.map((goal) => {
                const goalTitle = displayGoalTitle(goal, language);
                return (
                  <article className="closed-goal-card" key={goal.id}>
                    <div className="goal-card-top">
                      <span className="closed-check" aria-hidden="true">
                        ✓
                      </span>
                      <span className="goal-state">{text.completed}</span>
                    </div>
                    <h3>{goalTitle}</h3>
                    <div className="closed-goal-meta">
                      <div>
                        <span>{text.workTime}</span>
                        <strong>{formatElapsed(elapsedFor(goal))}</strong>
                      </div>
                      <div>
                        <span>{text.completionDate}</span>
                        <strong>
                          {formatCompletedAt(
                            goal.completedAt,
                            language,
                            text.completedBeforeTimer,
                          )}
                        </strong>
                      </div>
                      {goal.targetMs ? (
                        <div>
                          <span>{text.targetTime}</span>
                          <strong>{formatElapsed(goal.targetMs)}</strong>
                        </div>
                      ) : null}
                    </div>
                    <div className="closed-actions">
                      <button
                        type="button"
                        onClick={() => reopenGoal(goal.id)}
                      >
                        {text.reopen}
                      </button>
                      <button
                        className="reset-button"
                        type="button"
                        onClick={() => resetGoal(goal.id)}
                        aria-label={`${text.resetLabel} ${goalTitle}`}
                      >
                        {text.reset}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="closed-empty">{text.noClosedGoals}</div>
          )}
        </section>
      </section>

      <footer>
        <span>TzviAir</span>
        <span aria-hidden="true">•</span>
        <span>{text.footer}</span>
      </footer>

      {settingsOpen ? (
        <div
          className="settings-backdrop"
          role="presentation"
          onMouseDown={() => setSettingsOpen(false)}
        >
          <section
            className="settings-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
            dir={direction}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="settings-close"
              type="button"
              aria-label={text.closeSettings}
              onClick={() => setSettingsOpen(false)}
            >
              ×
            </button>
            <span className="section-kicker">{text.settings}</span>
            <h2 id="settings-title">{text.settingsTitle}</h2>
            <p>{text.settingsDescription}</p>

            <div className="settings-form-block">
              <h3>{text.addGoal}</h3>
              <form className="add-goal-form" onSubmit={addGoal}>
                <div className="goal-name-field">
                  <label htmlFor="new-goal">{text.newGoalName}</label>
                  <input
                    id="new-goal"
                    type="text"
                    value={newGoalTitle}
                    onChange={(event) => setNewGoalTitle(event.target.value)}
                    maxLength={120}
                    placeholder={text.newGoalPlaceholder}
                    autoComplete="off"
                    autoFocus
                  />
                </div>
                <div className="target-time-fields">
                  <span>{text.targetTime}</span>
                  <label>
                    <span>{text.hours}</span>
                    <input
                      type="number"
                      min="0"
                      max="999"
                      value={newGoalHours}
                      onChange={(event) => setNewGoalHours(event.target.value)}
                      inputMode="numeric"
                    />
                  </label>
                  <label>
                    <span>{text.minutes}</span>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={newGoalMinutes}
                      onChange={(event) => setNewGoalMinutes(event.target.value)}
                      inputMode="numeric"
                    />
                  </label>
                </div>
                <button type="submit" disabled={!newGoalTitle.trim()}>
                  <span aria-hidden="true">+</span>
                  {text.add}
                </button>
              </form>
            </div>

            <div className="settings-manage-block">
              <div className="settings-manage-heading">
                <div>
                  <h3>{text.manageGoals}</h3>
                  <p>{text.manageGoalsDescription}</p>
                </div>
                <span>{goals.length}</span>
              </div>

              <div className="settings-goal-list">
                {goals.map((goal, index) => {
                  const goalTitle = displayGoalTitle(goal, language);
                  const isEditing = editingGoalId === goal.id;

                  return (
                    <article className="settings-goal-row" key={goal.id}>
                      {isEditing ? (
                        <form
                          className="edit-goal-form"
                          onSubmit={(event) => saveGoalEdits(event, goal.id)}
                        >
                          <label>
                            <span>{text.newGoalName}</span>
                            <input
                              type="text"
                              value={editGoalTitle}
                              onChange={(event) =>
                                setEditGoalTitle(event.target.value)
                              }
                              maxLength={120}
                              autoFocus
                            />
                          </label>
                          <div className="target-time-fields compact-time-fields">
                            <span>{text.targetTime}</span>
                            <label>
                              <span>{text.hours}</span>
                              <input
                                type="number"
                                min="0"
                                max="999"
                                value={editGoalHours}
                                onChange={(event) =>
                                  setEditGoalHours(event.target.value)
                                }
                              />
                            </label>
                            <label>
                              <span>{text.minutes}</span>
                              <input
                                type="number"
                                min="0"
                                max="59"
                                value={editGoalMinutes}
                                onChange={(event) =>
                                  setEditGoalMinutes(event.target.value)
                                }
                              />
                            </label>
                          </div>
                          <div className="edit-form-actions">
                            <button type="submit">{text.save}</button>
                            <button type="button" onClick={cancelEditingGoal}>
                              {text.cancel}
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="settings-goal-summary">
                            <span className="settings-goal-position">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <div>
                              <strong>{goalTitle}</strong>
                              <small>
                                {goal.targetMs
                                  ? `${text.targetTime}: ${formatElapsed(goal.targetMs)}`
                                  : text.noTarget}
                              </small>
                            </div>
                          </div>
                          <div className="settings-goal-actions">
                            <button
                              type="button"
                              onClick={() => moveGoal(goal.id, -1)}
                              disabled={index === 0}
                              aria-label={`${text.moveUp}: ${goalTitle}`}
                              title={text.moveUp}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() => moveGoal(goal.id, 1)}
                              disabled={index === goals.length - 1}
                              aria-label={`${text.moveDown}: ${goalTitle}`}
                              title={text.moveDown}
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              onClick={() => beginEditingGoal(goal)}
                            >
                              {text.edit}
                            </button>
                            <button
                              className="delete-goal-button"
                              type="button"
                              onClick={() => deleteGoal(goal.id)}
                            >
                              {text.delete}
                            </button>
                          </div>
                        </>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>

            <p className="settings-note">
              <span aria-hidden="true">●</span>
              {text.localStorageNote}
            </p>
          </section>
        </div>
      ) : null}
    </main>
  );
}
