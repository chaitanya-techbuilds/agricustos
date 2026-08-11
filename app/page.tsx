"use client";

import { useEffect, useMemo, useState } from "react";
import CropUploader from "./components/CropUploader";
import FieldContext from "./components/FieldContext";
import WeatherPanel from "./components/WeatherPanel";
import AIAnalysis from "./components/AIAnalysis";

type View = "dashboard" | "history" | "alerts";

type UserProfile = {
  name: string;
};

type HistoryItem = {
  id: string;
  crop: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  result: string;
  severity: string;
  date: string;
};

type AlertItem = {
  id: string;
  title: string;
  message: string;
  severity: "HIGH" | "MODERATE" | "LOW";
  date: string;
};

const HISTORY_KEY = "agricustos_history";
const ALERTS_KEY = "agricustos_alerts";
const USER_KEY = "agricustos_user";

function Logo() {
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#dfe9e1]">
      <img
        src="/agricustos-mark.png"
        alt="AgriCustos"
        className="h-full w-full object-contain p-1"
      />
    </div>
  );
}

function Icon({
  name,
  size = 19,
}: {
  name:
    | "dashboard"
    | "history"
    | "alerts"
    | "user"
    | "leaf"
    | "location"
    | "weather"
    | "arrow"
    | "check"
    | "clock"
    | "logout"
    | "camera"
    | "spark";
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (name === "dashboard") {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    );
  }

  if (name === "history") {
    return (
      <svg {...common}>
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v5h5" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }

  if (name === "alerts") {
    return (
      <svg {...common}>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </svg>
    );
  }

  if (name === "user") {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c.8-4 3.5-6 8-6s7.2 2 8 6" />
      </svg>
    );
  }

  if (name === "leaf") {
    return (
      <svg {...common}>
        <path d="M20 4C10 4 5 8 5 15c0 3 2 5 5 5 7 0 10-7 10-16Z" />
        <path d="M4 20c3-5 7-8 12-10" />
      </svg>
    );
  }

  if (name === "location") {
    return (
      <svg {...common}>
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    );
  }

  if (name === "weather") {
    return (
      <svg {...common}>
        <path d="M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 8.5 4.5 4.5 0 0 0 7 18Z" />
      </svg>
    );
  }

  if (name === "arrow") {
    return (
      <svg {...common}>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </svg>
    );
  }

  if (name === "check") {
    return (
      <svg {...common}>
        <path d="m5 12 4 4L19 6" />
      </svg>
    );
  }

  if (name === "clock") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }

  if (name === "logout") {
    return (
      <svg {...common}>
        <path d="M10 17l5-5-5-5" />
        <path d="M15 12H3" />
        <path d="M21 3v18" />
      </svg>
    );
  }

  if (name === "camera") {
    return (
      <svg {...common}>
        <path d="M4 7h4l1.5-2h5L16 7h4v12H4V7Z" />
        <circle cx="12" cy="13" r="3.5" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="m12 2 1.5 6.5L20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5L12 2Z" />
    </svg>
  );
}

export default function Home() {
  const [view, setView] = useState<View>("dashboard");

  const [fieldLocation, setFieldLocation] = useState<{
    latitude: number | null;
    longitude: number | null;
  }>({
    latitude: null,
    longitude: null,
  });

  const [cropImage, setCropImage] = useState<File | null>(null);

  const [fieldData, setFieldData] = useState({
    crop: "",
    location: "",
  });

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  const [user, setUser] =
    useState<UserProfile | null>(null);

  const [loginOpen, setLoginOpen] =
    useState(false);

  const [profileOpen, setProfileOpen] =
    useState(false);

  const [nameInput, setNameInput] =
    useState("");

  useEffect(() => {
    try {
      const savedHistory =
        localStorage.getItem(HISTORY_KEY);

      const savedAlerts =
        localStorage.getItem(ALERTS_KEY);

      const savedUser =
        localStorage.getItem(USER_KEY);

      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }

      if (savedAlerts) {
        setAlerts(JSON.parse(savedAlerts));
      }

      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch {
      setHistory([]);
      setAlerts([]);
      setUser(null);
    }
  }, []);

  const isReadyForAnalysis =
    cropImage !== null &&
    fieldData.crop.trim() !== "" &&
    fieldLocation.latitude !== null &&
    fieldLocation.longitude !== null;

  const activeAlerts = alerts.length;

  const thisWeekCount = useMemo(() => {
    const now = Date.now();
    const week =
      7 * 24 * 60 * 60 * 1000;

    return history.filter((item) => {
      const date =
        new Date(item.date).getTime();

      return (
        !Number.isNaN(date) &&
        now - date <= week
      );
    }).length;
  }, [history]);

  const latestHistory =
    history.slice(0, 5);

  function navigate(nextView: View) {
    setView(nextView);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function login() {
    const cleanName =
      nameInput.trim();

    if (!cleanName) return;

    const newUser = {
      name: cleanName,
    };

    setUser(newUser);

    localStorage.setItem(
      USER_KEY,
      JSON.stringify(newUser)
    );

    setNameInput("");
    setLoginOpen(false);
  }

  function logout() {
    setUser(null);
    localStorage.removeItem(USER_KEY);
    setProfileOpen(false);
  }

  function saveAnalysis(result: any) {
    const now = new Date().toISOString();

    const firstCondition =
      result?.possible_conditions?.[0];

    const newHistory: HistoryItem = {
      id: `${Date.now()}`,
      crop:
        result?.crop ||
        fieldData.crop ||
        "Unknown crop",
      location:
        fieldData.location ||
        "Field location",
      latitude: fieldLocation.latitude,
      longitude: fieldLocation.longitude,
      result:
        firstCondition?.condition ||
        "Field analysis completed",
      severity:
        result?.severity ||
        "UNKNOWN",
      date: now,
    };

    const updatedHistory = [
      newHistory,
      ...history,
    ].slice(0, 50);

    setHistory(updatedHistory);

    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(updatedHistory)
    );

    if (
      result?.severity === "HIGH" ||
      result?.weather_assessment?.status ===
        "ACT_NOW"
    ) {
      const newAlert: AlertItem = {
        id: `${Date.now()}-alert`,
        title: "Field needs attention",
        message:
          result?.farmer_summary ||
          "The latest field analysis recommends closer monitoring.",
        severity:
          result?.severity === "HIGH"
            ? "HIGH"
            : "MODERATE",
        date: now,
      };

      const updatedAlerts = [
        newAlert,
        ...alerts,
      ].slice(0, 30);

      setAlerts(updatedAlerts);

      localStorage.setItem(
        ALERTS_KEY,
        JSON.stringify(updatedAlerts)
      );
    }
  }

  function clearAlerts() {
    setAlerts([]);
    localStorage.removeItem(ALERTS_KEY);
  }

  function formatDate(date: string) {
    const value = new Date(date);

    if (Number.isNaN(value.getTime())) {
      return "Recently";
    }

    return value.toLocaleDateString(
      undefined,
      {
        month: "short",
        day: "numeric",
        year: "numeric",
      }
    );
  }

  function timeAgo(date: string) {
    const value =
      new Date(date).getTime();

    if (Number.isNaN(value)) {
      return "Recently";
    }

    const minutes = Math.floor(
      (Date.now() - value) / 60000
    );

    if (minutes < 1) return "Just now";
    if (minutes < 60)
      return `${minutes} min ago`;

    const hours = Math.floor(
      minutes / 60
    );

    if (hours < 24)
      return `${hours} hr ago`;

    const days = Math.floor(
      hours / 24
    );

    return `${days} day${
      days === 1 ? "" : "s"
    } ago`;
  }

  function severityClass(
    severity: string
  ) {
    if (severity === "HIGH") {
      return "bg-red-50 text-red-700 ring-1 ring-red-100";
    }

    if (severity === "MODERATE") {
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-100";
    }

    return "bg-green-50 text-green-700 ring-1 ring-green-100";
  }

  return (
    <main className="min-h-screen bg-[#f6faf7] text-[#17231d]">

      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-[#dfe9e2] bg-white/95 backdrop-blur-xl">

        <div className="mx-auto flex h-[86px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-10">

          <button
            type="button"
            onClick={() =>
              navigate("dashboard")
            }
            className="flex items-center gap-4 text-left"
          >
            <Logo />

            <div>
              <div className="flex items-baseline leading-none">
                <span className="text-[28px] font-black tracking-[-0.055em] text-[#173b2b] sm:text-[31px]">
                  Agri
                </span>

                <span className="text-[28px] font-black tracking-[-0.055em] text-[#65b83f] sm:text-[31px]">
                  Custos
                </span>
              </div>

              <p className="mt-1 text-[9px] font-extrabold tracking-[0.22em] text-[#789080]">
                FIELD INTELLIGENCE
              </p>
            </div>
          </button>

          <nav className="hidden items-center gap-1 lg:flex">

            <button
              type="button"
              onClick={() =>
                navigate("dashboard")
              }
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                view === "dashboard"
                  ? "bg-[#edf7e9] text-[#397c2c]"
                  : "text-[#66756b] hover:bg-[#f5f8f5]"
              }`}
            >
              <Icon
                name="dashboard"
                size={17}
              />
              Dashboard
            </button>

            <button
              type="button"
              onClick={() =>
                navigate("history")
              }
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                view === "history"
                  ? "bg-[#edf7e9] text-[#397c2c]"
                  : "text-[#66756b] hover:bg-[#f5f8f5]"
              }`}
            >
              <Icon
                name="history"
                size={17}
              />
              History
            </button>

            <button
              type="button"
              onClick={() =>
                navigate("alerts")
              }
              className={`relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                view === "alerts"
                  ? "bg-[#edf7e9] text-[#397c2c]"
                  : "text-[#66756b] hover:bg-[#f5f8f5]"
              }`}
            >
              <Icon
                name="alerts"
                size={17}
              />
              Alerts

              {activeAlerts > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#dc5c52] px-1.5 text-[10px] font-bold text-white">
                  {activeAlerts}
                </span>
              )}
            </button>

            <div className="mx-3 h-7 w-px bg-[#e3eae5]" />

            {user ? (
              <button
                type="button"
                onClick={() =>
                  setProfileOpen(true)
                }
                className="flex items-center gap-2 rounded-xl bg-[#173b2b] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#0f2f21]"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#72bd4d] text-[10px] font-black">
                  {user.name
                    .charAt(0)
                    .toUpperCase()}
                </span>

                {user.name}
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  setLoginOpen(true)
                }
                className="flex items-center gap-2 rounded-xl bg-[#173b2b] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#0f2f21]"
              >
                <Icon
                  name="user"
                  size={16}
                />
                Login
              </button>
            )}
          </nav>

          <button
            type="button"
            onClick={() =>
              user
                ? setProfileOpen(true)
                : setLoginOpen(true)
            }
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[#edf7e9] font-bold text-[#397c2c] lg:hidden"
          >
            {user
              ? user.name
                  .charAt(0)
                  .toUpperCase()
              : "C"}
          </button>
        </div>

        {/* MOBILE NAV */}
        <div className="border-t border-[#edf1ee] bg-white px-4 py-2 lg:hidden">
          <div className="mx-auto flex max-w-xl gap-1">

            <button
              type="button"
              onClick={() =>
                navigate("dashboard")
              }
              className={`flex-1 rounded-lg py-2.5 text-xs font-bold ${
                view === "dashboard"
                  ? "bg-[#edf7e9] text-[#397c2c]"
                  : "text-[#718078]"
              }`}
            >
              Dashboard
            </button>

            <button
              type="button"
              onClick={() =>
                navigate("history")
              }
              className={`flex-1 rounded-lg py-2.5 text-xs font-bold ${
                view === "history"
                  ? "bg-[#edf7e9] text-[#397c2c]"
                  : "text-[#718078]"
              }`}
            >
              History
            </button>

            <button
              type="button"
              onClick={() =>
                navigate("alerts")
              }
              className={`flex-1 rounded-lg py-2.5 text-xs font-bold ${
                view === "alerts"
                  ? "bg-[#edf7e9] text-[#397c2c]"
                  : "text-[#718078]"
              }`}
            >
              Alerts
              {activeAlerts > 0 &&
                ` (${activeAlerts})`}
            </button>
          </div>
        </div>
      </header>

      {/* DASHBOARD */}
      {view === "dashboard" && (
        <section className="mx-auto max-w-[1440px] px-5 pb-16 pt-9 sm:px-8 lg:px-10">

          {/* WELCOME */}
          <div className="mb-7">
            <p className="text-[10px] font-extrabold tracking-[0.22em] text-[#57973d]">
              FIELD INTELLIGENCE
            </p>

            <h1 className="mt-2 text-[30px] font-black tracking-[-0.045em] text-[#173b2b] sm:text-[38px]">
              Good morning,{" "}
              {user?.name || "Farmer"}.
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-7 text-[#718078] sm:text-[15px]">
              Connect crop observations, field
              conditions, and AI guidance to make
              smarter decisions for your farm.
            </p>
          </div>

          {/* COMPACT HERO */}
          <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#123b2a] via-[#1b5137] to-[#397c40] shadow-[0_18px_45px_rgba(18,59,42,0.15)]">

            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(151,214,104,0.2),transparent_35%)]" />

            <div className="relative z-10 max-w-2xl px-7 py-8 sm:px-10 sm:py-9">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-[#c7ec9c] ring-1 ring-white/10">
                <Icon
                  name="spark"
                  size={20}
                />
              </div>

              <p className="mt-5 text-[9px] font-extrabold tracking-[0.2em] text-[#bce994]">
                SMART FARMING
              </p>

              <h2 className="mt-2 text-[29px] font-black leading-[1.08] tracking-[-0.04em] text-white sm:text-[38px]">
                Smart Analysis.
                <br />
                Better Decisions.
              </h2>

              <p className="mt-3 max-w-lg text-sm leading-6 text-[#dcebe1]">
                Crop observations, field context,
                and weather intelligence in one place.
              </p>

              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById(
                      "field-workspace"
                    )
                    ?.scrollIntoView({
                      behavior: "smooth",
                    })
                }
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-extrabold text-[#245d36] shadow-lg transition hover:-translate-y-0.5"
              >
                Start Field Analysis
                <Icon
                  name="arrow"
                  size={15}
                />
              </button>
            </div>

            <div className="pointer-events-none absolute right-[-20px] bottom-[-55px] hidden text-[170px] opacity-20 lg:block">
              🌾
            </div>
          </div>

          {/* STATS */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            <div className="rounded-[22px] border border-[#e2ebe4] bg-white p-5 shadow-[0_8px_25px_rgba(31,62,43,0.04)]">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#edf7e9] text-[#4d9637]">
                <Icon
                  name="leaf"
                  size={21}
                />
              </div>

              <p className="mt-5 text-3xl font-black text-[#203529]">
                {history.length}
              </p>

              <p className="mt-1 text-sm font-bold">
                Analyses Done
              </p>

              <p className="mt-1 text-xs text-[#849087]">
                Total field assessments
              </p>
            </div>

            <div className="rounded-[22px] border border-[#e2ebe4] bg-white p-5 shadow-[0_8px_25px_rgba(31,62,43,0.04)]">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef5fb] text-[#4e82ad]">
                <Icon
                  name="history"
                  size={21}
                />
              </div>

              <p className="mt-5 text-3xl font-black text-[#203529]">
                {thisWeekCount}
              </p>

              <p className="mt-1 text-sm font-bold">
                This Week
              </p>

              <p className="mt-1 text-xs text-[#849087]">
                Recent field activity
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate("alerts")
              }
              className="rounded-[22px] border border-[#e2ebe4] bg-white p-5 text-left shadow-[0_8px_25px_rgba(31,62,43,0.04)] transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff4e8] text-[#d28b35]">
                <Icon
                  name="alerts"
                  size={21}
                />
              </div>

              <p className="mt-5 text-3xl font-black text-[#203529]">
                {activeAlerts}
              </p>

              <p className="mt-1 text-sm font-bold">
                Active Alerts
              </p>

              <p className="mt-1 text-xs text-[#849087]">
                Items requiring attention
              </p>
            </button>

            <div className="rounded-[22px] border border-[#e2ebe4] bg-white p-5 shadow-[0_8px_25px_rgba(31,62,43,0.04)]">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef7f3] text-[#4b8c78]">
                <Icon
                  name="weather"
                  size={21}
                />
              </div>

              <p className="mt-5 text-3xl font-black text-[#203529]">
                {fieldLocation.latitude !== null
                  ? "ON"
                  : "—"}
              </p>

              <p className="mt-1 text-sm font-bold">
                Field Weather
              </p>

              <p className="mt-1 text-xs text-[#849087]">
                {fieldLocation.latitude !== null
                  ? "Location connected"
                  : "Waiting for location"}
              </p>
            </div>
          </div>

          {/* RECENT */}
          <div className="mt-6 rounded-[25px] border border-[#e2ebe4] bg-white p-6 shadow-[0_8px_25px_rgba(31,62,43,0.04)]">

            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-extrabold tracking-[0.2em] text-[#57973d]">
                  ACTIVITY
                </p>

                <h3 className="mt-1 text-xl font-black text-[#203529]">
                  Recent Field Analyses
                </h3>
              </div>

              <button
                type="button"
                onClick={() =>
                  navigate("history")
                }
                className="flex items-center gap-1 text-sm font-bold text-[#4b9137]"
              >
                View all
                <Icon
                  name="arrow"
                  size={14}
                />
              </button>
            </div>

            {latestHistory.length === 0 ? (
              <div className="mt-5 rounded-2xl bg-[#f7faf7] px-5 py-9 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#edf7e9] text-[#4d9637]">
                  <Icon
                    name="leaf"
                    size={23}
                  />
                </div>

                <p className="mt-3 font-bold">
                  No analyses yet
                </p>

                <p className="mt-1 text-sm text-[#849087]">
                  Your completed field analyses will
                  appear here automatically.
                </p>
              </div>
            ) : (
              <div className="mt-5 divide-y divide-[#edf1ee]">
                {latestHistory.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#edf7e9] text-[#4d9637]">
                      <Icon
                        name="leaf"
                        size={18}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-bold">
                        {item.crop}
                      </p>

                      <p className="truncate text-sm text-[#758279]">
                        {item.result}
                      </p>
                    </div>

                    <p className="flex items-center gap-1 text-sm text-[#758279]">
                      <Icon
                        name="location"
                        size={14}
                      />
                      {item.location}
                    </p>

                    <span
                      className={`w-fit rounded-full px-3 py-1 text-[10px] font-extrabold ${severityClass(
                        item.severity
                      )}`}
                    >
                      {item.severity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* WORKSPACE */}
          <div
            id="field-workspace"
            className="mt-10"
          >
            <div className="mb-6">
              <p className="text-[9px] font-extrabold tracking-[0.2em] text-[#57973d]">
                FIELD WORKSPACE
              </p>

              <h3 className="mt-2 text-2xl font-black text-[#203529]">
                Analyze your field
              </h3>

              <p className="mt-1 text-sm text-[#718078]">
                Upload an observation, provide field
                information, and let Field Intelligence
                evaluate the conditions.
              </p>
            </div>

            {/* STEP 1 */}
            <div className="rounded-[25px] border border-[#e2ebe4] bg-white p-6 shadow-[0_8px_25px_rgba(31,62,43,0.04)]">

              <div className="mb-6 flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#173b2b] text-sm font-black text-white">
                  01
                </div>

                <div>
                  <p className="text-[9px] font-extrabold tracking-[0.18em] text-[#57973d]">
                    CROP OBSERVATION
                  </p>

                  <h3 className="mt-1 text-xl font-black">
                    Upload crop image
                  </h3>

                  <p className="mt-1 text-sm text-[#7a877f]">
                    Use a clear image of the affected crop
                    or leaf.
                  </p>
                </div>
              </div>

              <CropUploader
                onFileChange={(file) =>
                  setCropImage(file)
                }
              />
            </div>

            {/* FIELD */}
            <div className="mt-5 rounded-[25px] border border-[#e2ebe4] bg-white p-6 shadow-[0_8px_25px_rgba(31,62,43,0.04)]">

              <div className="mb-6 flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#173b2b] text-sm font-black text-white">
                  02
                </div>

                <div>
                  <p className="text-[9px] font-extrabold tracking-[0.18em] text-[#57973d]">
                    FIELD CONTEXT
                  </p>

                  <h3 className="mt-1 text-xl font-black">
                    Field information
                  </h3>

                  <p className="mt-1 text-sm text-[#7a877f]">
                    Add your crop and connect the field
                    location.
                  </p>
                </div>
              </div>

              <FieldContext
                onContextChange={(data) => {
                  setFieldData({
                    crop: data.crop,
                    location: data.location,
                  });

                  setFieldLocation({
                    latitude: data.latitude,
                    longitude: data.longitude,
                  });
                }}
              />
            </div>

            {/* WEATHER */}
            <div className="mt-5 rounded-[25px] border border-[#e2ebe4] bg-white p-6 shadow-[0_8px_25px_rgba(31,62,43,0.04)]">

              <div className="mb-6 flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef7fb] text-[#4e82a2]">
                  <Icon
                    name="weather"
                    size={20}
                  />
                </div>

                <div>
                  <p className="text-[9px] font-extrabold tracking-[0.18em] text-[#57973d]">
                    ENVIRONMENT
                  </p>

                  <h3 className="mt-1 text-xl font-black">
                    Field weather
                  </h3>
                </div>
              </div>

              <WeatherPanel
                latitude={
                  fieldLocation.latitude
                }
                longitude={
                  fieldLocation.longitude
                }
              />
            </div>

            {/* READINESS */}
            <div className="mt-5 overflow-hidden rounded-[25px] border border-[#e2ebe4] bg-white shadow-[0_8px_25px_rgba(31,62,43,0.04)]">

              <div
                className={`h-1 ${
                  isReadyForAnalysis
                    ? "bg-[#65b83f]"
                    : "bg-[#dfe8e1]"
                }`}
              />

              <div className="p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

                  <div>
                    <p className="text-[9px] font-extrabold tracking-[0.18em] text-[#57973d]">
                      ANALYSIS READINESS
                    </p>

                    <h3 className="mt-2 text-xl font-black">
                      {isReadyForAnalysis
                        ? "Everything is ready."
                        : "Complete your field information."}
                    </h3>

                    <p className="mt-1 text-sm text-[#7a877f]">
                      {isReadyForAnalysis
                        ? "Your crop image, crop information and GPS location are ready."
                        : "AgriCustos needs a crop image, crop name and field location."}
                    </p>
                  </div>

                  <div
                    className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold ${
                      isReadyForAnalysis
                        ? "bg-[#edf8e9] text-[#397c2c]"
                        : "bg-[#f4f6f4] text-[#69766f]"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        isReadyForAnalysis
                          ? "bg-[#65b83f]"
                          : "bg-[#9ba69f]"
                      }`}
                    />

                    {isReadyForAnalysis
                      ? "Ready"
                      : "Waiting"}
                  </div>
                </div>
              </div>
            </div>

            {/* AI ANALYSIS */}
            <AIAnalysis
              image={cropImage}
              crop={fieldData.crop}
              location={fieldData.location}
              latitude={
                fieldLocation.latitude
              }
              longitude={
                fieldLocation.longitude
              }
              onAnalysisComplete={
                saveAnalysis
              }
            />

            {/* MONITORING */}
            <div className="mt-5 rounded-[25px] border border-[#dfe9e1] bg-[#f1f8ef] p-6">

              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#4d9637] shadow-sm">
                  <Icon
                    name="check"
                    size={20}
                  />
                </div>

                <div>
                  <p className="text-[9px] font-extrabold tracking-[0.18em] text-[#57973d]">
                    FIELD MONITORING
                  </p>

                  <h3 className="mt-1 text-lg font-black">
                    Keep your field on watch
                  </h3>

                  <p className="mt-1 text-sm text-[#718078]">
                    Recheck the field when conditions
                    change or when analysis recommends
                    follow-up.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* HISTORY */}
      {view === "history" && (
        <section className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-10">

          <div className="mb-8">
            <p className="text-[9px] font-extrabold tracking-[0.2em] text-[#57973d]">
              FIELD RECORDS
            </p>

            <h2 className="mt-2 text-3xl font-black text-[#203529] sm:text-4xl">
              Field History
            </h2>

            <p className="mt-2 text-sm text-[#718078]">
              Every completed analysis is saved locally
              in this browser.
            </p>
          </div>

          {history.length === 0 ? (
            <div className="rounded-[25px] border border-dashed border-[#d8e4db] bg-white px-6 py-16 text-center shadow-sm">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#edf7e9] text-[#4d9637]">
                <Icon
                  name="history"
                  size={28}
                />
              </div>

              <h3 className="mt-5 text-xl font-black">
                No analyses yet
              </h3>

              <p className="mt-2 text-sm text-[#7c8981]">
                Complete your first Field Intelligence
                analysis and it will appear here.
              </p>

              <button
                type="button"
                onClick={() =>
                  navigate("dashboard")
                }
                className="mt-6 rounded-xl bg-[#173b2b] px-5 py-3 text-sm font-bold text-white"
              >
                Start Analysis
              </button>
            </div>
          ) : (
            <div className="space-y-4">

              {history.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[25px] border border-[#e2ebe4] bg-white p-6 shadow-[0_8px_25px_rgba(31,62,43,0.04)]"
                >

                  <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">

                    <div className="flex items-center gap-4">

                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#edf7e9] text-[#4d9637]">
                        <Icon
                          name="leaf"
                          size={24}
                        />
                      </div>

                      <div>
                        <h3 className="font-black">
                          {item.crop}
                        </h3>

                        <p className="mt-1 text-sm text-[#718078]">
                          {item.result}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`w-fit rounded-full px-3 py-1.5 text-[10px] font-extrabold ${severityClass(
                        item.severity
                      )}`}
                    >
                      {item.severity}
                    </span>
                  </div>

                  <div className="mt-6 grid gap-5 border-t border-[#edf1ee] pt-5 sm:grid-cols-3">

                    <div>
                      <p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#9aa49e]">
                        Location
                      </p>

                      <p className="mt-2 flex items-center gap-1.5 text-sm font-bold">
                        <Icon
                          name="location"
                          size={14}
                        />
                        {item.location}
                      </p>
                    </div>

                    <div>
                      <p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#9aa49e]">
                        Coordinates
                      </p>

                      <p className="mt-2 text-sm font-bold">
                        {item.latitude !== null &&
                        item.longitude !== null
                          ? `${item.latitude.toFixed(
                              4
                            )}, ${item.longitude.toFixed(
                              4
                            )}`
                          : "Unavailable"}
                      </p>
                    </div>

                    <div>
                      <p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#9aa49e]">
                        Date
                      </p>

                      <p className="mt-2 text-sm font-bold">
                        {formatDate(item.date)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ALERTS */}
      {view === "alerts" && (
        <section className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-10">

          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">

            <div>
              <p className="text-[9px] font-extrabold tracking-[0.2em] text-[#57973d]">
                FIELD SAFETY
              </p>

              <h2 className="mt-2 text-3xl font-black text-[#203529] sm:text-4xl">
                Alerts
              </h2>

              <p className="mt-2 text-sm text-[#718078]">
                Important conditions detected by your
                field assessments.
              </p>
            </div>

            {alerts.length > 0 && (
              <button
                type="button"
                onClick={clearAlerts}
                className="rounded-xl border border-[#dfe8e2] bg-white px-4 py-2.5 text-sm font-bold text-[#65736b]"
              >
                Clear Alerts
              </button>
            )}
          </div>

          {alerts.length === 0 ? (
            <div className="rounded-[25px] border border-[#e3ebe5] bg-white px-6 py-16 text-center shadow-sm">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#edf7e9] text-[#4d9637]">
                <Icon
                  name="alerts"
                  size={28}
                />
              </div>

              <h3 className="mt-5 text-xl font-black">
                No active alerts
              </h3>

              <p className="mt-2 text-sm text-[#7c8981]">
                Important field attention items will
                appear here when detected.
              </p>
            </div>
          ) : (
            <div className="space-y-4">

              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-[25px] border border-[#e2ebe4] bg-white p-6 shadow-sm"
                >

                  <div className="flex gap-4">

                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#fff4e8] text-[#d28b35]">
                      <Icon
                        name="alerts"
                        size={20}
                      />
                    </div>

                    <div className="flex-1">

                      <div className="flex flex-col justify-between gap-3 sm:flex-row">

                        <div>
                          <h3 className="font-black">
                            {alert.title}
                          </h3>

                          <p className="mt-1 max-w-3xl text-sm leading-6 text-[#68766e]">
                            {alert.message}
                          </p>
                        </div>

                        <span
                          className={`w-fit rounded-full px-3 py-1.5 text-[10px] font-extrabold ${severityClass(
                            alert.severity
                          )}`}
                        >
                          {alert.severity}
                        </span>
                      </div>

                      <p className="mt-4 flex items-center gap-1 text-xs text-[#9aa49e]">
                        <Icon
                          name="clock"
                          size={13}
                        />
                        {timeAgo(alert.date)} ·{" "}
                        {formatDate(alert.date)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* LOGIN MODAL */}
      {loginOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#102319]/50 p-4 backdrop-blur-sm"
          onClick={() =>
            setLoginOpen(false)
          }
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-[28px] bg-white shadow-[0_30px_90px_rgba(10,35,22,0.3)]"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="bg-[#173b2b] px-7 py-7 text-white">

              <div className="flex items-center gap-4">
                <Logo />

                <div>
                  <p className="text-[9px] font-extrabold tracking-[0.2em] text-[#b9e68c]">
                    AGRICUSTOS
                  </p>

                  <h3 className="mt-1 text-2xl font-black">
                    Welcome back
                  </h3>
                </div>
              </div>
            </div>

            <div className="p-7">

              <p className="text-sm leading-6 text-[#718078]">
                Enter your name to personalize your
                AgriCustos dashboard.
              </p>

              <label className="mt-6 block text-sm font-bold text-[#34483b]">
                Your name
              </label>

              <input
                value={nameInput}
                onChange={(event) =>
                  setNameInput(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter"
                  ) {
                    login();
                  }
                }}
                placeholder="e.g. Chaitanya"
                autoFocus
                className="mt-2 w-full rounded-xl border border-[#dce6df] bg-[#fafcfb] px-4 py-3 text-sm outline-none transition placeholder:text-[#a2ada6] focus:border-[#65b83f] focus:ring-4 focus:ring-[#65b83f]/10"
              />

              <button
                type="button"
                onClick={login}
                disabled={!nameInput.trim()}
                className="mt-5 w-full rounded-xl bg-[#173b2b] px-5 py-3.5 text-sm font-extrabold text-white transition hover:bg-[#0f2f21] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue to Dashboard
              </button>

              <button
                type="button"
                onClick={() =>
                  setLoginOpen(false)
                }
                className="mt-3 w-full py-2 text-sm font-bold text-[#7a877f]"
              >
                Cancel
              </button>

              <p className="mt-5 text-center text-[11px] leading-5 text-[#a0aaa4]">
                This demo profile is stored only in
                this browser. It does not change your
                existing AI/backend system.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PROFILE MODAL */}
      {profileOpen && user && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#102319]/50 p-4 backdrop-blur-sm"
          onClick={() =>
            setProfileOpen(false)
          }
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-[28px] bg-white shadow-[0_30px_90px_rgba(10,35,22,0.3)]"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="bg-[#173b2b] px-7 py-7 text-white">

              <div className="flex items-center justify-between">

                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#65b83f] text-xl font-black">
                    {user.name
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div>
                    <p className="text-[9px] font-extrabold tracking-[0.2em] text-[#b9e68c]">
                      LOGGED IN
                    </p>

                    <h3 className="mt-1 text-2xl font-black">
                      {user.name}
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setProfileOpen(false)
                  }
                  className="text-2xl text-white/70 hover:text-white"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-7">

              <div className="grid grid-cols-2 gap-3">

                <div className="rounded-2xl bg-[#f6faf7] p-4">
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#9aa49e]">
                    Analyses
                  </p>

                  <p className="mt-2 text-2xl font-black text-[#203529]">
                    {history.length}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f6faf7] p-4">
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#9aa49e]">
                    Alerts
                  </p>

                  <p className="mt-2 text-2xl font-black text-[#203529]">
                    {alerts.length}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={logout}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-5 py-3.5 text-sm font-extrabold text-red-700 transition hover:bg-red-100"
              >
                <Icon
                  name="logout"
                  size={17}
                />
                Logout
              </button>

              <button
                type="button"
                onClick={() =>
                  setProfileOpen(false)
                }
                className="mt-3 w-full py-2 text-sm font-bold text-[#7a877f]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="border-t border-[#e2ebe4] bg-white">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-5 py-7 text-xs text-[#8a968f] sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg ring-1 ring-[#e4ece5]">
              <img
                src="/agricustos-mark.png"
                alt=""
                className="h-full w-full object-contain"
              />
            </div>

            <span>
              AgriCustos · Field Intelligence
            </span>
          </div>

          <span className="hidden sm:block">
            Smarter decisions for better fields.
          </span>
        </div>
      </footer>
    </main>
  );
}