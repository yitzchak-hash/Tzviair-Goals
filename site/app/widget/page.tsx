"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./widget.css";

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

const CLOUD_SYNC_INTERVAL_MS = 5000;
const WIDGET_MESSAGE_SOURCE = "tzviair-goals-widget";

const translations = {
  he: {
    boardLabel: "היעדים של צבי־אייר",
    completed: "הושלמו",
    inProgress: "בתהליך",
    notStarted: "טרם התחיל",
    notStartedPlural: "טרם התחילו",
    workTime: "זמן עבודה",
    targetTimeShort: "יעד",
    remaining: "נותרו",
    overTarget: "מעבר ליעד",
    startGoal: "התחל",
    finishGoal: "סיים",
    startTimerFor: "התחל טיימר עבור",
    finish: "סיים את",
    openBoard: "פתיחת הלוח המלא",
    noGoals: "אין יעדים בלוח כרגע",
    outOf: "מתוך",
    cloudSaved: "מסונכרן",
    cloudSyncing: "שומר...",
    cloudOffline: "ממתין לחיבור",
    moreGoals: "יעדים נוספים",
  },
  en: {
    boardLabel: "TzviAir Goals",
    completed: "Completed",
    inProgress: "In progress",
    notStarted: "Not started",
    notStartedPlural: "Not started",
    workTime: "Work time",
    targetTimeShort: "Target",
    remaining: "Remaining",
    overTarget: "Over target",
    startGoal: "Start",
    finishGoal: "Finish",
    startTimerFor: "Start timer for",
    finish: "Finish",
    openBoard: "Open the full board",
    noGoals: "No goals on the board yet",
    outOf: "of",
    cloudSaved: "Synced",
    cloudSyncing: "Saving...",
    cloudOffline: "Waiting for connection",
    moreGoals: "more goals",
  },
} as const;

type Language = keyof typeof translations;
type GoalStatus = "not-started" | "in-progress" | "completed";
type SyncStatus = "connecting" | "syncing" | "saved" | "offline";
type WidgetView = "board" | "dashboard";

type Goal = {
  id: string;
  title: string;
  status: GoalStatus;
  startedAt: number | null;
  elapsedMs: number;
  completedAt: number | null;
  targetMs?: number | null;
};

type CloudState = {
  version: number;
  goals: Goal[] | null;
  updatedAt: number;
};

type WidgetOptions = {
  view: WidgetView;
  language: Language;
  interactive: boolean;
  max: number;
  transparent: boolean;
  linkToBoard: boolean;
  showHeader: boolean;
};

function currentTimestamp() {
  return Date.now();
}

const defaultOptions: WidgetOptions = {
  view: "board",
  language: "he",
  interactive: false,
  max: 0,
  transparent: false,
  linkToBoard: true,
  showHeader: true,
};

function parseWidgetOptions(search: string): WidgetOptions {
  const params = new URLSearchParams(search);
  const max = Number.parseInt(params.get("max") ?? "0", 10);
  return {
    view: params.get("view") === "dashboard" ? "dashboard" : "board",
    language: params.get("lang") === "en" ? "en" : "he",
    interactive: params.get("interactive") === "1",
    max: Number.isFinite(max) && max > 0 ? max : 0,
    transparent: params.get("theme") === "transparent",
    linkToBoard: params.get("link") !== "0",
    showHeader: params.get("title") !== "0",
  };
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

function displayGoalTitle(goal: Goal, language: Language) {
  const builtInIndex = initialGoals.findIndex(
    (_, index) => goal.id === `tzviair-goal-${index + 1}`,
  );

  return builtInIndex >= 0 && goal.title === initialGoals[builtInIndex].he
    ? initialGoals[builtInIndex][language]
    : goal.title;
}

function postToParent(payload: Record<string, unknown>) {
  if (typeof window === "undefined" || window.parent === window) return;
  window.parent.postMessage({ source: WIDGET_MESSAGE_SOURCE, ...payload }, "*");
}

export default function GoalsWidget() {
  const [options, setOptions] = useState<WidgetOptions>(defaultOptions);
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("connecting");
  const [mounted, setMounted] = useState(false);
  const goalsRef = useRef<Goal[]>([]);
  const pendingSaveRef = useRef<Goal[] | null>(null);
  const saveRunningRef = useRef(false);
  const lastServerUpdatedAtRef = useRef(0);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const text = translations[options.language];
  const direction = options.language === "he" ? "rtl" : "ltr";

  useEffect(() => {
    // The query string decides the embed variant after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOptions(parseWidgetOptions(window.location.search));
    setMounted(true);
  }, []);

  useEffect(() => {
    document.documentElement.lang = options.language;
    document.documentElement.dir = direction;
    document.documentElement.classList.add("goals-widget-root");
    if (options.transparent) {
      document.documentElement.classList.add("goals-widget-transparent");
    } else {
      document.documentElement.classList.remove("goals-widget-transparent");
    }
  }, [direction, options.language, options.transparent]);

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
    if (!mounted) return;

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
          } else if (!goalsRef.current.length) {
            goalsRef.current = state.goals;
            setGoals(state.goals);
          }
        } else {
          goalsRef.current = [];
          setGoals([]);
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
  }, [flushPendingSave, mounted]);

  const hasRunningTimer = (goals ?? []).some(
    (goal) => goal.status === "in-progress",
  );

  useEffect(() => {
    if (!hasRunningTimer) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [hasRunningTimer]);

  // The host page (Job Manager board/dashboard) sizes the iframe from these
  // messages, so every layout change must be reported.
  useEffect(() => {
    if (!mounted || typeof ResizeObserver === "undefined") return;

    const reportHeight = () => {
      const height = Math.ceil(
        shellRef.current?.getBoundingClientRect().height ??
          document.documentElement.scrollHeight,
      );
      postToParent({ type: "resize", height });
    };

    reportHeight();
    const observer = new ResizeObserver(reportHeight);
    if (shellRef.current) observer.observe(shellRef.current);
    return () => observer.disconnect();
  }, [mounted, goals, options]);

  const completedCount = (goals ?? []).filter(
    (goal) => goal.status === "completed",
  ).length;
  const inProgressCount = (goals ?? []).filter(
    (goal) => goal.status === "in-progress",
  ).length;
  const notStartedCount = (goals ?? []).filter(
    (goal) => goal.status === "not-started",
  ).length;
  const totalCount = goals?.length ?? 0;
  const progress =
    totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  useEffect(() => {
    if (!mounted || goals === null) return;
    postToParent({
      type: "state",
      total: totalCount,
      completed: completedCount,
      inProgress: inProgressCount,
      notStarted: notStartedCount,
    });
  }, [
    mounted,
    goals,
    totalCount,
    completedCount,
    inProgressCount,
    notStartedCount,
  ]);

  const orderedGoals = useMemo(() => {
    if (!goals) return [];
    const active = goals.filter((goal) => goal.status !== "completed");
    const closed = goals
      .filter((goal) => goal.status === "completed")
      .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
    return [...active, ...closed];
  }, [goals]);

  const visibleGoals =
    options.max > 0 ? orderedGoals.slice(0, options.max) : orderedGoals;
  const hiddenCount = orderedGoals.length - visibleGoals.length;

  function elapsedFor(goal: Goal) {
    if (goal.status === "in-progress" && goal.startedAt) {
      return goal.elapsedMs + Math.max(0, now - goal.startedAt);
    }
    return goal.elapsedMs;
  }

  function startGoal(goalId: string) {
    const startedAt = currentTimestamp();
    setNow(startedAt);
    applySharedGoals(
      goalsRef.current.map((goal) =>
        goal.id === goalId && goal.status === "not-started"
          ? { ...goal, status: "in-progress", startedAt }
          : goal,
      ),
    );
  }

  function finishGoal(goalId: string) {
    const finishedAt = currentTimestamp();
    applySharedGoals(
      goalsRef.current.map((goal) => {
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
      }),
    );
  }

  const statusLabel = (goal: Goal) =>
    goal.status === "completed"
      ? text.completed
      : goal.status === "in-progress"
        ? text.inProgress
        : text.notStarted;

  function renderTile(goal: Goal) {
    const goalTitle = displayGoalTitle(goal, options.language);
    const elapsed = elapsedFor(goal);
    const targetDelta = (goal.targetMs ?? 0) - elapsed;

    return (
      <article className={`gw-tile gw-${goal.status}`} key={goal.id}>
        <div className="gw-tile-top">
          <span className="gw-state">
            {goal.status === "completed" ? (
              <i className="gw-check" aria-hidden="true">
                ✓
              </i>
            ) : goal.status === "in-progress" ? (
              <i className="gw-pulse" aria-hidden="true" />
            ) : null}
            {statusLabel(goal)}
          </span>
          {goal.status !== "completed" || goal.elapsedMs > 0 ? (
            <span className="gw-timer" aria-label={text.workTime}>
              {formatElapsed(elapsed)}
            </span>
          ) : null}
        </div>

        <h3 className="gw-title">{goalTitle}</h3>

        {goal.targetMs && goal.status !== "completed" ? (
          <p className={`gw-target ${targetDelta < 0 ? "gw-target-over" : ""}`}>
            {text.targetTimeShort} {formatElapsed(goal.targetMs)} ·{" "}
            {targetDelta >= 0 ? text.remaining : text.overTarget}{" "}
            {formatElapsed(Math.abs(targetDelta))}
          </p>
        ) : null}

        {options.interactive && goal.status !== "completed" ? (
          <div className="gw-actions">
            {goal.status === "not-started" ? (
              <button
                className="gw-button gw-start"
                type="button"
                onClick={() => startGoal(goal.id)}
                aria-label={`${text.startTimerFor} ${goalTitle}`}
              >
                <span aria-hidden="true">▶</span> {text.startGoal}
              </button>
            ) : (
              <button
                className="gw-button gw-finish"
                type="button"
                onClick={() => finishGoal(goal.id)}
                aria-label={`${text.finish} ${goalTitle}`}
              >
                <span aria-hidden="true">✓</span> {text.finishGoal}
              </button>
            )}
          </div>
        ) : null}
      </article>
    );
  }

  return (
    <div
      className={`gw-shell gw-view-${options.view} ${
        options.transparent ? "gw-transparent" : ""
      }`}
      dir={direction}
      ref={shellRef}
    >
      {options.showHeader ? (
        <header className="gw-header">
          <img className="gw-logo" src="/tzviair-logo.png" alt="TzviAir" />
          <span className="gw-board-label">{text.boardLabel}</span>
          <span
            className={`gw-sync gw-sync-${syncStatus}`}
            aria-live="polite"
            title={
              syncStatus === "saved"
                ? text.cloudSaved
                : syncStatus === "offline"
                  ? text.cloudOffline
                  : text.cloudSyncing
            }
          >
            <i aria-hidden="true" />
          </span>
          {options.linkToBoard ? (
            <a
              className="gw-open-board"
              href="/"
              target="_blank"
              rel="noreferrer"
            >
              {text.openBoard} ↗
            </a>
          ) : null}
        </header>
      ) : null}

      {options.view === "dashboard" ? (
        <div className="gw-summary" role="group" aria-label={text.boardLabel}>
          <div className="gw-progress">
            <strong>{completedCount}</strong>
            <span>
              {text.outOf} {totalCount} {text.completed}
            </span>
            <div className="gw-progress-track" aria-hidden="true">
              <span style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="gw-summary-stats">
            <span className="gw-stat gw-stat-complete">
              <strong>{completedCount}</strong> {text.completed}
            </span>
            <span className="gw-stat gw-stat-open">
              <strong>{inProgressCount}</strong> {text.inProgress}
            </span>
            <span className="gw-stat gw-stat-waiting">
              <strong>{notStartedCount}</strong> {text.notStartedPlural}
            </span>
          </div>
        </div>
      ) : null}

      {goals !== null && orderedGoals.length === 0 ? (
        <p className="gw-empty">{text.noGoals}</p>
      ) : (
        <div className="gw-grid">{visibleGoals.map(renderTile)}</div>
      )}

      {hiddenCount > 0 ? (
        <p className="gw-more">
          +{hiddenCount} {text.moreGoals}
        </p>
      ) : null}
    </div>
  );
}
