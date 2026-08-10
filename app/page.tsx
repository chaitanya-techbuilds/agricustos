"use client";

import { useState } from "react";
import CropUploader from "./components/CropUploader";
import FieldContext from "./components/FieldContext";
import WeatherPanel from "./components/WeatherPanel";
import AIAnalysis from "./components/AIAnalysis";

export default function Home() {
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

  const isReadyForAnalysis =
    cropImage !== null &&
    fieldData.crop.trim() !== "" &&
    fieldLocation.latitude !== null &&
    fieldLocation.longitude !== null;

  return (
    <main className="min-h-screen bg-[#f5f7f2] text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-700 text-xl text-white">
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
          </div>

          <div className="hidden items-center gap-6 text-sm text-slate-600 sm:flex">
            <span className="font-medium text-green-700">
              Dashboard
            </span>
            <span>Field History</span>
            <span>Alerts</span>
          </div>

          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold">
            C
          </div>
        </div>
      </header>

      {/* Main */}
      <section className="mx-auto max-w-7xl px-6 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <p className="mb-2 text-sm font-medium text-green-700">
            FIELD INTELLIGENCE
          </p>

          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Good morning, Farmer.
          </h2>

          <p className="mt-2 max-w-2xl text-slate-600">
            Connect crop observations, weather conditions, and AI
            guidance to decide what to do next.
          </p>
        </div>

        {/* Status cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Weather */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">
                WEATHER
              </span>

              <span className="text-xl">🌦️</span>
            </div>

            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold">
                {fieldLocation.latitude !== null ? "✓" : "--°"}
              </span>

              <span className="mb-1 text-sm text-slate-500">
                {fieldLocation.latitude !== null
                  ? "location connected"
                  : "awaiting location"}
              </span>
            </div>

            <p className="mt-3 text-sm text-slate-500">
              {fieldLocation.latitude !== null
                ? "Local weather intelligence is active."
                : "Capture your field location to connect weather data."}
            </p>
          </div>

          {/* Crop */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">
                CROP MONITORING
              </span>

              <span className="text-xl">🌱</span>
            </div>

            <div className="text-3xl font-bold">
              {cropImage ? "Ready" : "No analysis"}
            </div>

            <p className="mt-3 text-sm text-slate-500">
              {cropImage
                ? `${cropImage.name} selected.`
                : "Upload a crop image to begin."}
            </p>
          </div>

          {/* Alerts */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">
                FIELD ALERTS
              </span>

              <span className="text-xl">🔔</span>
            </div>

            <div className="text-3xl font-bold">0</div>

            <p className="mt-3 text-sm text-slate-500">
              No active alerts.
            </p>
          </div>
        </div>

        {/* Crop analysis */}
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <p className="text-sm font-semibold text-green-700">
              STEP 01
            </p>

            <h3 className="mt-1 text-2xl font-bold">
              Analyze your crop
            </h3>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Upload a clear photo of the affected crop or leaf.
              AgriCustos will combine the visual observation with
              field and environmental information.
            </p>
          </div>

          <CropUploader
            onFileChange={(file) => setCropImage(file)}
          />
        </div>

        {/* Field context */}
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

        {/* Weather */}
        <div className="mt-6">
          <WeatherPanel
            latitude={fieldLocation.latitude}
            longitude={fieldLocation.longitude}
          />
        </div>

        {/* Readiness */}
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

        {/* AI Analysis */}
        <AIAnalysis
          image={cropImage}
          crop={fieldData.crop}
          location={fieldData.location}
          latitude={fieldLocation.latitude}
          longitude={fieldLocation.longitude}
        />

        {/* Monitoring */}
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
                After an advisory, AgriCustos can monitor relevant
                weather changes and request a follow-up crop image
                when conditions require reassessment.
              </p>
            </div>

            <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
              ● Monitoring inactive
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto max-w-7xl px-6 py-8 text-center text-xs text-slate-400">
        AgriCustos • AI-powered agricultural decision support
      </footer>
    </main>
  );
}