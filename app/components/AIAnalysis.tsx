"use client";

import { useState } from "react";

type AIAnalysisProps = {
  image: File | null;
  crop: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
};

type AnalysisResult = {
  crop: string;
  observations: string[];
  possible_conditions: {
    condition: string;
    confidence_level: "HIGH" | "MEDIUM" | "LOW";
    reason: string;
  }[];
  severity: "LOW" | "MODERATE" | "HIGH" | "UNKNOWN";
  management_guidance: string[];
  weather_assessment: {
    status: "ACT_NOW" | "WAIT" | "MONITOR" | "EXPERT_REVIEW";
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

export default function AIAnalysis({
  image,
  crop,
  location,
  latitude,
  longitude,
}: AIAnalysisProps) {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(
    null
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function analyzeCrop() {
    if (!image) {
      setError("Please upload a crop image first.");
      return;
    }

    if (!crop.trim()) {
      setError("Please enter the crop name first.");
      return;
    }

    if (latitude === null || longitude === null) {
      setError("Please capture the field location first.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setAnalysis(null);

      // Get current + upcoming weather for the AI decision.
      const weatherUrl =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${latitude}` +
        `&longitude=${longitude}` +
        `&current=temperature_2m,relative_humidity_2m,rain,wind_speed_10m` +
        `&hourly=precipitation_probability,rain` +
        `&forecast_days=2` +
        `&timezone=auto`;

      const weatherResponse = await fetch(weatherUrl);

      if (!weatherResponse.ok) {
        throw new Error(
          "Unable to retrieve weather information."
        );
      }

      const weatherData = await weatherResponse.json();

      const next12HourRainProbability =
        weatherData.hourly?.precipitation_probability
          ?.slice(0, 12) ?? [];

      const next12HourRain =
        weatherData.hourly?.rain?.slice(0, 12) ?? [];

      const maxRainProbability =
        next12HourRainProbability.length > 0
          ? Math.max(...next12HourRainProbability)
          : 0;

      const totalForecastRain =
        next12HourRain.reduce(
          (sum: number, value: number) => sum + (value || 0),
          0
        );

      const weatherSummary = `
Current temperature: ${weatherData.current?.temperature_2m ?? "unknown"} °C
Current humidity: ${weatherData.current?.relative_humidity_2m ?? "unknown"} %
Rain currently: ${weatherData.current?.rain ?? "unknown"} mm
Wind speed: ${weatherData.current?.wind_speed_10m ?? "unknown"} km/h
Maximum precipitation probability over next 12 hours: ${maxRainProbability} %
Estimated rain over next 12 hours: ${totalForecastRain.toFixed(1)} mm
`;

      const formData = new FormData();

      formData.append("image", image);
      formData.append("crop", crop);
      formData.append("location", location);
      formData.append("weather", weatherSummary);

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "AI analysis failed."
        );
      }

      if (!result.analysis) {
        throw new Error(
          "The AI returned no analysis."
        );
      }

      setAnalysis(result.analysis);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to analyze the crop."
      );
    } finally {
      setLoading(false);
    }
  }

  const confidenceStyle = (level: string) => {
    if (level === "HIGH") {
      return "bg-green-100 text-green-800";
    }

    if (level === "MEDIUM") {
      return "bg-amber-100 text-amber-800";
    }

    return "bg-slate-100 text-slate-700";
  };

  const severityStyle = (severity: string) => {
    if (severity === "HIGH") {
      return "bg-red-100 text-red-800";
    }

    if (severity === "MODERATE") {
      return "bg-amber-100 text-amber-800";
    }

    if (severity === "LOW") {
      return "bg-green-100 text-green-800";
    }

    return "bg-slate-100 text-slate-700";
  };

  const weatherStyle = (status: string) => {
    if (status === "ACT_NOW") {
      return "bg-green-100 text-green-800";
    }

    if (status === "WAIT") {
      return "bg-amber-100 text-amber-800";
    }

    if (status === "EXPERT_REVIEW") {
      return "bg-red-100 text-red-800";
    }

    return "bg-blue-100 text-blue-800";
  };

  return (
    <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm font-semibold text-green-700">
            STEP 02
          </p>

          <h3 className="mt-1 text-2xl font-bold">
            AI Field Analysis
          </h3>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            AgriCustos evaluates the crop image together with field
            context and upcoming weather conditions.
          </p>
        </div>

        <button
          type="button"
          onClick={analyzeCrop}
          disabled={loading}
          className="rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Analyzing..." : "Analyze Crop"}
        </button>
      </div>

      {/* Status */}
      {loading && (
        <div className="mt-6 rounded-2xl bg-green-50 p-5">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-green-200 border-t-green-700" />

            <div>
              <p className="font-semibold text-green-800">
                Analyzing field conditions...
              </p>

              <p className="mt-1 text-xs text-green-700">
                Checking the crop image, location context, and
                upcoming weather.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
          <p className="font-semibold text-red-800">
            Analysis unavailable
          </p>

          <p className="mt-1 text-sm text-red-700">
            {error}
          </p>
        </div>
      )}

      {/* Results */}
      {analysis && !loading && (
        <div className="mt-8 space-y-6">
          {/* Farmer summary */}
          <div className="rounded-2xl bg-slate-900 p-6 text-white">
            <p className="text-sm font-semibold text-green-300">
              FARMER SUMMARY
            </p>

            <p className="mt-3 text-lg leading-8">
              {analysis.farmer_summary}
            </p>
          </div>

          {/* Condition + severity */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Severity
              </p>

              <span
                className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${severityStyle(
                  analysis.severity
                )}`}
              >
                {analysis.severity}
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Crop
              </p>

              <p className="mt-3 font-semibold">
                {analysis.crop}
              </p>
            </div>
          </div>

          {/* Observations */}
          <div>
            <h4 className="text-lg font-bold">
              What the AI observed
            </h4>

            <ul className="mt-3 space-y-2">
              {analysis.observations.map(
                (observation, index) => (
                  <li
                    key={index}
                    className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700"
                  >
                    {observation}
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Possible conditions */}
          <div>
            <h4 className="text-lg font-bold">
              Possible crop conditions
            </h4>

            <div className="mt-3 space-y-3">
              {analysis.possible_conditions.map(
                (condition, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-slate-200 p-5"
                  >
                    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                      <p className="font-semibold">
                        {condition.condition}
                      </p>

                      <span
                        className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${confidenceStyle(
                          condition.confidence_level
                        )}`}
                      >
                        {condition.confidence_level} confidence
                      </span>
                    </div>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {condition.reason}
                    </p>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Management */}
          <div>
            <h4 className="text-lg font-bold">
              Recommended management
            </h4>

            <div className="mt-3 space-y-3">
              {analysis.management_guidance.map(
                (guidance, index) => (
                  <div
                    key={index}
                    className="flex gap-3 rounded-xl bg-green-50 p-4"
                  >
                    <span className="font-bold text-green-700">
                      {index + 1}.
                    </span>

                    <p className="text-sm leading-6 text-green-900">
                      {guidance}
                    </p>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Weather decision */}
          <div className="rounded-2xl border border-slate-200 p-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Weather-aware action
                </p>

                <p className="mt-2 text-xl font-bold">
                  {analysis.weather_assessment.action_window}
                </p>
              </div>

              <span
                className={`w-fit rounded-full px-3 py-1 text-sm font-semibold ${weatherStyle(
                  analysis.weather_assessment.status
                )}`}
              >
                {analysis.weather_assessment.status}
              </span>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-600">
              {analysis.weather_assessment.reason}
            </p>
          </div>

          {/* Follow-up */}
          <div className="rounded-2xl bg-blue-50 p-5">
            <p className="text-sm font-semibold text-blue-900">
              🔔 Follow-up monitoring
            </p>

            <p className="mt-2 text-sm leading-6 text-blue-800">
              {analysis.follow_up.reason}
            </p>

            {analysis.follow_up.recommended &&
              analysis.follow_up.interval_hours > 0 && (
                <div className="mt-4 inline-flex rounded-xl bg-white px-4 py-3 text-sm font-semibold text-blue-900">
                  Check again in{" "}
                  {analysis.follow_up.interval_hours} hours
                </div>
              )}
          </div>

          {/* Uncertainty */}
          {analysis.uncertainties.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <p className="font-semibold text-amber-900">
                ⚠️ Important uncertainty
              </p>

              <ul className="mt-3 space-y-2">
                {analysis.uncertainties.map(
                  (item, index) => (
                    <li
                      key={index}
                      className="text-sm leading-6 text-amber-800"
                    >
                      • {item}
                    </li>
                  )
                )}
              </ul>
            </div>
          )}

          {/* Expert review */}
          {analysis.expert_review.recommended && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
              <p className="font-semibold text-red-900">
                👨‍🌾 Expert review recommended
              </p>

              <p className="mt-2 text-sm leading-6 text-red-800">
                {analysis.expert_review.reason}
              </p>
            </div>
          )}

          {/* AI disclaimer */}
          <div className="border-t border-slate-200 pt-5">
            <p className="text-xs leading-5 text-slate-500">
              AgriCustos provides AI-assisted decision support, not
              a guaranteed diagnosis. Confidence describes the
              AI's confidence in its interpretation, not guaranteed
              treatment success. Always follow locally approved
              agricultural guidance and product labels where
              applicable.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}