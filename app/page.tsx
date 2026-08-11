"use client";

import { useEffect, useState } from "react";
import CropUploader from "./components/CropUploader";
import FieldContext from "./components/FieldContext";
import WeatherPanel from "./components/WeatherPanel";
import AIAnalysis from "./components/AIAnalysis";

type HistoryItem = {
  id: string;
  crop: string;
  location: string;
  date: string;
  summary: string;
  severity: string;
  condition: string;
};

type AlertItem = {
  id: string;
  title: string;
  message: string;
  severity: "HIGH" | "MODERATE" | "LOW";
  date: string;
};

type AnalysisResult = {
  crop: string;
  observations: string[];
  possible_conditions: {
    condition: string;
    confidence_level:
      | "HIGH"
      | "MEDIUM"
      | "LOW";
    reason: string;
  }[];
  severity:
    | "LOW"
    | "MODERATE"
    | "HIGH"
    | "UNKNOWN";
  management_guidance: string[];
  weather_assessment: {
    status:
      | "ACT_NOW"
      | "WAIT"
      | "MONITOR"
      | "EXPERT_REVIEW";
    reason: string;
    action_window: string;
  };
  follow_up: {
    recommended: boolean;
    interval_hours: number;
    reason: string;
  };
  uncertainties: string[];
  expert_review: {
    recommended: boolean;
    reason: string;
  };
  farmer_summary: string;
};

export default function Home() {
  const [fieldLocation, setFieldLocation] =
    useState<{
      latitude: number | null;
      longitude: number | null;
    }>({
      latitude: null,
      longitude: null,
    });

  const [cropImage, setCropImage] =
    useState<File | null>(null);

  const [fieldData, setFieldData] =
    useState({
      crop: "",
      location: "",
    });

  const [activePanel, setActivePanel] =
    useState<
      "history" | "alerts" | "profile" | null
    >(null);

  const [history, setHistory] =
    useState<HistoryItem[]>([]);

  const [alerts, setAlerts] =
    useState<AlertItem[]>([]);

  const [profileName, setProfileName] =
    useState("Farmer");

  const [profileSaved, setProfileSaved] =
    useState(false);

  const isReadyForAnalysis =
    cropImage !== null &&
    fieldData.crop.trim() !== "" &&
    fieldLocation.latitude !== null &&
    fieldLocation.longitude !== null;

  /*
   * Load saved dashboard data.
   */

  useEffect(() => {
    try {
      const savedHistory =
        localStorage.getItem(
          "agricustos-history"
        );

      const savedAlerts =
        localStorage.getItem(
          "agricustos-alerts"
        );

      const savedName =
        localStorage.getItem(
          "agricustos-profile-name"
        );

      if (savedHistory) {
        setHistory(
          JSON.parse(savedHistory)
        );
      }

      if (savedAlerts) {
        setAlerts(
          JSON.parse(savedAlerts)
        );
      }

      if (savedName) {
        setProfileName(savedName);
      }
    } catch {
      // Ignore invalid local browser data.
    }
  }, []);

  function saveProfile() {
    const name =
      profileName.trim() || "Farmer";

    localStorage.setItem(
      "agricustos-profile-name",
      name
    );

    setProfileName(name);
    setProfileSaved(true);

    setTimeout(() => {
      setProfileSaved(false);
    }, 2000);
  }

  function clearHistory() {
    localStorage.removeItem(
      "agricustos-history"
    );

    setHistory([]);
  }

  function clearAlerts() {
    localStorage.removeItem(
      "agricustos-alerts"
    );

    setAlerts([]);
  }

  /*
   * Called automatically when AIAnalysis finishes.
   */

  function handleAnalysisComplete(
    analysis: AnalysisResult
  ) {
    const now = new Date();
    const date = now.toLocaleString();

    const primaryCondition =
      analysis.possible_conditions?.[0]
        ?.condition ||
      "Field condition detected";

    /*
     * HISTORY
     */

    const historyItem: HistoryItem = {
      id: `${Date.now()}`,
      crop:
        analysis.crop ||
        fieldData.crop,
      location:
        fieldData.location ||
        "Field location",
      date,
      summary:
        analysis.farmer_summary ||
        "Field assessment completed.",
      severity:
        analysis.severity ||
        "UNKNOWN",
      condition:
        primaryCondition,
    };

    const existingHistory: HistoryItem[] =
      JSON.parse(
        localStorage.getItem(
          "agricustos-history"
        ) || "[]"
      );

    const updatedHistory = [
      historyItem,
      ...existingHistory,
    ].slice(0, 20);

    localStorage.setItem(
      "agricustos-history",
      JSON.stringify(updatedHistory)
    );

    setHistory(updatedHistory);

    /*
     * ALERTS
     *
     * We only create an alert when there
     * is a meaningful reason to do so.
     */

    const shouldAlert =
      analysis.severity === "HIGH" ||
      analysis.weather_assessment?.status ===
        "ACT_NOW" ||
      analysis.expert_review?.recommended;

    if (shouldAlert) {
      const alertSeverity: AlertItem["severity"] =
        analysis.severity === "HIGH"
          ? "HIGH"
          : analysis.severity ===
              "MODERATE"
            ? "MODERATE"
            : "LOW";

      const alertItem: AlertItem = {
        id: `${Date.now()}-alert`,
        title:
          analysis.severity === "HIGH"
            ? "High-priority field condition"
            : analysis.weather_assessment
                  ?.status === "ACT_NOW"
              ? "Action window detected"
              : "Field reassessment recommended",
        message:
          analysis.farmer_summary ||
          analysis.weather_assessment
            ?.reason ||
          "Review the latest field assessment.",
        severity: alertSeverity,
        date,
      };

      const existingAlerts: AlertItem[] =
        JSON.parse(
          localStorage.getItem(
            "agricustos-alerts"
          ) || "[]"
        );

      const updatedAlerts = [
        alertItem,
        ...existingAlerts,
      ].slice(0, 10);

      localStorage.setItem(
        "agricustos-alerts",
        JSON.stringify(updatedAlerts)
      );

      setAlerts(updatedAlerts);
    }

    /*
     * Automatically open alerts when
     * something important was detected.
     */

    if (shouldAlert) {
      setActivePanel("alerts");
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {/* HEADER */}

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <button
            type="button"
            onClick={() =>
              setActivePanel(null)
            }
            className="flex items-center gap-3 text-left"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-xl">
              🌱
            </div>

            <div>
              <h1 className="text-lg font-bold tracking-tight">
                AgriCustos
              </h1>

              <p className="text-xs text-slate-500">
                AI Field Intelligence
              </p>
            </div>
          </button>

          <div className="hidden items-center gap-2 sm:flex">
            <button
              type="button"
              onClick={() =>
                setActivePanel(null)
              }
              className="rounded-lg px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-50"
            >
              Dashboard
            </button>

            <button
              type="button"
              onClick={() =>
                setActivePanel("history")
              }
              className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
            >
              Field History
            </button>

            <button
              type="button"
              onClick={() =>
                setActivePanel("alerts")
              }
              className="relative rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
            >
              Alerts

              {alerts.length > 0 && (
                <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
                  {alerts.length}
                </span>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={() =>
              setActivePanel("profile")
            }
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold transition hover:bg-green-100 hover:text-green-800"
            aria-label="Open farmer profile"
          >
            {profileName
              .trim()
              .charAt(0)
              .toUpperCase() || "F"}
          </button>
        </div>

        {/* MOBILE NAV */}

        <div className="flex gap-2 border-t border-slate-100 px-6 py-3 sm:hidden">
          <button
            type="button"
            onClick={() =>
              setActivePanel(null)
            }
            className="rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700"
          >
            Dashboard
          </button>

          <button
            type="button"
            onClick={() =>
              setActivePanel("history")
            }
            className="rounded-lg px-3 py-2 text-xs text-slate-600"
          >
            History
          </button>

          <button
            type="button"
            onClick={() =>
              setActivePanel("alerts")
            }
            className="rounded-lg px-3 py-2 text-xs text-slate-600"
          >
            Alerts
          </button>
        </div>
      </header>

      {/* MAIN */}

      <section className="mx-auto max-w-7xl px-6 py-8">
        {/* FIELD HISTORY */}

        {activePanel === "history" && (
          <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-semibold text-green-700">
                  FIELD HISTORY
                </p>

                <h2 className="mt-1 text-2xl font-bold">
                  Previous field assessments
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Your recent AgriCustos field
                  assessments are stored on this
                  device.
                </p>
              </div>

              {history.length > 0 && (
                <button
                  type="button"
                  onClick={clearHistory}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Clear history
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="mt-6 rounded-2xl bg-slate-50 p-8 text-center">
                <div className="text-3xl">
                  🌱
                </div>

                <p className="mt-3 font-semibold">
                  No field assessments yet
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Completed analyses will appear
                  here automatically.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 p-5"
                  >
                    <div className="flex flex-col justify-between gap-3 sm:flex-row">
                      <div>
                        <p className="font-bold">
                          {item.crop}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {item.location} •{" "}
                          {item.date}
                        </p>
                      </div>

                      <span className="h-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
                        {item.severity}
                      </span>
                    </div>

                    <p className="mt-4 text-sm leading-6 text-slate-700">
                      {item.summary}
                    </p>

                    <p className="mt-3 text-xs font-semibold text-green-700">
                      Primary signal:{" "}
                      {item.condition}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ALERTS */}

        {activePanel === "alerts" && (
          <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-semibold text-green-700">
                  FIELD ALERTS
                </p>

                <h2 className="mt-1 text-2xl font-bold">
                  Action alerts
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Priority signals generated from
                  your field assessments.
                </p>
              </div>

              {alerts.length > 0 && (
                <button
                  type="button"
                  onClick={clearAlerts}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Clear alerts
                </button>
              )}
            </div>

            {alerts.length === 0 ? (
              <div className="mt-6 rounded-2xl bg-green-50 p-8 text-center">
                <div className="text-3xl">
                  🔔
                </div>

                <p className="mt-3 font-semibold text-green-900">
                  No active field alerts
                </p>

                <p className="mt-1 text-sm text-green-700">
                  Important field signals will
                  appear here automatically.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="rounded-2xl border border-slate-200 p-5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-bold">
                        {alert.title}
                      </p>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          alert.severity ===
                          "HIGH"
                            ? "bg-red-100 text-red-800"
                            : alert.severity ===
                                "MODERATE"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-green-100 text-green-800"
                        }`}
                      >
                        {alert.severity}
                      </span>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {alert.message}
                    </p>

                    <p className="mt-3 text-xs text-slate-400">
                      {alert.date}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PROFILE */}

        {activePanel === "profile" && (
          <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-green-700">
              FIELD PROFILE
            </p>

            <h2 className="mt-1 text-2xl font-bold">
              Farmer profile
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Personalize your AgriCustos dashboard.
            </p>

            <div className="mt-6 max-w-md">
              <label className="text-sm font-semibold text-slate-700">
                Display name
              </label>

              <input
                value={profileName}
                onChange={(event) =>
                  setProfileName(
                    event.target.value
                  )
                }
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-green-500"
                placeholder="Farmer"
              />

              <button
                type="button"
                onClick={saveProfile}
                className="mt-3 rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white hover:bg-green-800"
              >
                Save profile
              </button>

              {profileSaved && (
                <p className="mt-3 text-sm font-medium text-green-700">
                  ✓ Profile saved
                </p>
              )}
            </div>
          </div>
        )}

        {/* WELCOME */}

        <div className="mb-8">
          <p className="mb-2 text-sm font-medium text-green-700">
            FIELD INTELLIGENCE
          </p>

          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Good morning,{" "}
            {profileName || "Farmer"}.
          </h2>

          <p className="mt-2 max-w-2xl text-slate-600">
            Connect crop observations, weather
            conditions, and AI guidance to decide
            what to do next.
          </p>
        </div>

        {/* STATUS CARDS */}

        <div className="grid gap-4 md:grid-cols-3">
          {/* WEATHER */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">
                WEATHER
              </span>

              <span className="text-xl">
                🌦️
              </span>
            </div>

            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold">
                {fieldLocation.latitude !==
                null
                  ? "✓"
                  : "--°"}
              </span>

              <span className="mb-1 text-sm text-slate-500">
                {fieldLocation.latitude !==
                null
                  ? "location connected"
                  : "awaiting location"}
              </span>
            </div>

            <p className="mt-3 text-sm text-slate-500">
              {fieldLocation.latitude !==
              null
                ? "Local weather intelligence is active."
                : "Capture your field location to connect weather data."}
            </p>
          </div>

          {/* CROP */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">
                CROP MONITORING
              </span>

              <span className="text-xl">
                🌱
              </span>
            </div>

            <div className="text-3xl font-bold">
              {cropImage
                ? "Ready"
                : "No analysis"}
            </div>

            <p className="mt-3 text-sm text-slate-500">
              {cropImage
                ? `${cropImage.name} selected.`
                : "Upload a crop image to begin."}
            </p>
          </div>

          {/* ALERTS */}

          <button
            type="button"
            onClick={() =>
              setActivePanel("alerts")
            }
            className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-green-300 hover:shadow-md"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">
                FIELD ALERTS
              </span>

              <span className="text-xl">
                🔔
              </span>
            </div>

            <div className="text-3xl font-bold">
              {alerts.length}
            </div>

            <p className="mt-3 text-sm text-slate-500">
              {alerts.length > 0
                ? "Review priority field signals."
                : "No active alerts."}
            </p>
          </button>
        </div>

        {/* CROP UPLOAD */}

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <p className="text-sm font-semibold text-green-700">
              STEP 01
            </p>

            <h3 className="mt-1 text-2xl font-bold">
              Analyze your crop
            </h3>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Upload a clear photo of the affected
              crop or leaf. AgriCustos will combine
              the visual observation with field and
              environmental information.
            </p>
          </div>

          <CropUploader
            onFileChange={(file) =>
              setCropImage(file)
            }
          />
        </div>

        {/* FIELD CONTEXT */}

        <div className="mt-6">
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

        <div className="mt-6">
          <WeatherPanel
            latitude={fieldLocation.latitude}
            longitude={fieldLocation.longitude}
          />
        </div>

        {/* READINESS */}

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold text-green-700">
                ANALYSIS READINESS
              </p>

              <h3 className="mt-1 text-xl font-bold">
                {isReadyForAnalysis
                  ? "Everything needed is ready."
                  : "Complete the field information."}
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {isReadyForAnalysis
                  ? "Crop image, crop information, and GPS location are ready for AI analysis."
                  : "AgriCustos needs a crop photo, crop name, and field location before analysis."}
              </p>
            </div>

            <div
              className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                isReadyForAnalysis
                  ? "bg-green-100 text-green-800"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {isReadyForAnalysis
                ? "✓ Ready"
                : "● Waiting for data"}
            </div>
          </div>
        </div>

        {/* AI ANALYSIS */}

        <AIAnalysis
          image={cropImage}
          crop={fieldData.crop}
          location={fieldData.location}
          latitude={fieldLocation.latitude}
          longitude={fieldLocation.longitude}
          onAnalysisComplete={
            handleAnalysisComplete
          }
        />

        {/* MONITORING */}

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold text-green-700">
                CONTINUOUS MONITORING
              </p>

              <h3 className="mt-1 text-xl font-bold">
                Your field stays on watch
              </h3>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                After an advisory, AgriCustos can
                monitor relevant weather changes and
                request a follow-up crop image when
                conditions require reassessment.
              </p>
            </div>

            <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
              ● Monitoring active
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}

      <footer className="mx-auto max-w-7xl px-6 py-8 text-center text-xs text-slate-400">
        AgriCustos • AI-powered agricultural
        decision support
      </footer>
    </main>
  );
}