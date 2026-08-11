"use client";

import { useState } from "react";

type AnalysisResult = {
  crop: string;

  observations: string[];

  possible_conditions: {
    condition: string;
    confidence_level: "HIGH" | "MEDIUM" | "LOW";
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

type AIAnalysisProps = {
  image: File | null;
  crop: string;
  location: string;
  latitude: number | null;
  longitude: number | null;

  onAnalysisComplete?: (
    result: AnalysisResult
  ) => void;
};

/* =========================================================
   FAST IMAGE PREPARATION
   ========================================================= */

async function prepareImage(
  file: File
): Promise<File> {
  /*
   * Small images don't need processing.
   */
  if (
    file.size <= 1_500_000 &&
    file.type.startsWith("image/")
  ) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const image = new Image();

    const objectUrl =
      URL.createObjectURL(file);

    image.onload = () => {
      try {
        const MAX_SIZE = 1280;

        let width = image.naturalWidth;
        let height = image.naturalHeight;

        /*
         * Resize only if necessary.
         */
        if (
          width > MAX_SIZE ||
          height > MAX_SIZE
        ) {
          if (width > height) {
            height =
              Math.round(
                (height / width) *
                  MAX_SIZE
              );

            width = MAX_SIZE;
          } else {
            width =
              Math.round(
                (width / height) *
                  MAX_SIZE
              );

            height = MAX_SIZE;
          }
        }

        const canvas =
          document.createElement("canvas");

        canvas.width = width;
        canvas.height = height;

        const context =
          canvas.getContext("2d");

        if (!context) {
          URL.revokeObjectURL(
            objectUrl
          );

          resolve(file);
          return;
        }

        context.drawImage(
          image,
          0,
          0,
          width,
          height
        );

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(
              objectUrl
            );

            if (!blob) {
              resolve(file);
              return;
            }

            const optimizedFile =
              new File(
                [blob],
                "crop-analysis.jpg",
                {
                  type: "image/jpeg",
                  lastModified:
                    Date.now(),
                }
              );

            resolve(
              optimizedFile
            );
          },
          "image/jpeg",
          0.82
        );
      } catch {
        URL.revokeObjectURL(
          objectUrl
        );

        resolve(file);
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(
        objectUrl
      );

      resolve(file);
    };

    image.src = objectUrl;
  });
}

/* =========================================================
   MAIN COMPONENT
   ========================================================= */

export default function AIAnalysis({
  image,
  crop,
  location,
  latitude,
  longitude,
  onAnalysisComplete,
}: AIAnalysisProps) {
  const [analysis, setAnalysis] =
    useState<AnalysisResult | null>(
      null
    );

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [progress, setProgress] =
    useState("");

  const [progressStep, setProgressStep] =
    useState(0);

  /* =======================================================
     ANALYZE
     ======================================================= */

  async function analyzeCrop() {
    if (loading) return;
    if (!image) {
      setError(
        "Please upload a crop image first."
      );
      return;
    }

    if (!crop.trim()) {
      setError(
        "Please enter the crop name first."
      );
      return;
    }

    if (
      latitude === null ||
      longitude === null
    ) {
      setError(
        "Please capture the field location first."
      );
      return;
    }

    const totalStart =
      performance.now();

    try {
      setLoading(true);
      setError("");
      setAnalysis(null);

      /*
       * -----------------------------------------------------
       * STEP 1
       * Start image compression and weather request
       * AT THE SAME TIME.
       *
       * This saves time because both operations happen
       * concurrently.
       * -----------------------------------------------------
       */

      setProgress(
        "Preparing your crop image..."
      );

      setProgressStep(1);

      const imagePromise =
        prepareImage(image);

      const weatherUrl =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${latitude}` +
        `&longitude=${longitude}` +
        `&current=temperature_2m,relative_humidity_2m,rain,wind_speed_10m` +
        `&hourly=precipitation_probability,rain` +
        `&forecast_days=2` +
        `&timezone=auto`;

      const weatherPromise =
        fetch(weatherUrl);

      /*
       * Wait for both.
       */
      const [
        optimizedImage,
        weatherResponse,
      ] = await Promise.all([
        imagePromise,
        weatherPromise,
      ]);

      /*
       * -----------------------------------------------------
       * STEP 2
       * Weather
       * -----------------------------------------------------
       */

      setProgress(
        "Connecting field weather..."
      );

      setProgressStep(2);

      if (!weatherResponse.ok) {
        throw new Error(
          "Unable to retrieve weather information."
        );
      }

      const weatherData =
        await weatherResponse.json();

      const next12HourRainProbability =
        weatherData.hourly
          ?.precipitation_probability
          ?.slice(0, 12) ?? [];

      const next12HourRain =
        weatherData.hourly
          ?.rain
          ?.slice(0, 12) ?? [];

      const maxRainProbability =
        next12HourRainProbability.length >
        0
          ? Math.max(
              ...next12HourRainProbability
            )
          : 0;

      const totalForecastRain =
        next12HourRain.reduce(
          (
            sum: number,
            value: number
          ) =>
            sum + (value || 0),
          0
        );

      const weatherSummary = `
Current temperature: ${
        weatherData.current
          ?.temperature_2m ??
        "unknown"
      } °C

Current humidity: ${
        weatherData.current
          ?.relative_humidity_2m ??
        "unknown"
      } %

Rain currently: ${
        weatherData.current
          ?.rain ?? "unknown"
      } mm

Wind speed: ${
        weatherData.current
          ?.wind_speed_10m ??
        "unknown"
      } km/h

Maximum precipitation probability over next 12 hours: ${maxRainProbability} %

Estimated rain over next 12 hours: ${totalForecastRain.toFixed(
        1
      )} mm
`;

      /*
       * -----------------------------------------------------
       * STEP 3
       * Send to existing backend.
       *
       * IMPORTANT:
       * /api/analyze is NOT changed.
       * -----------------------------------------------------
       */

      setProgress(
        "Field Intelligence is analyzing..."
      );

      setProgressStep(3);

      const formData =
        new FormData();

      formData.append(
        "image",
        optimizedImage
      );

      formData.append(
        "crop",
        crop.trim()
      );

      formData.append(
        "location",
        location.trim()
      );

      formData.append(
        "weather",
        weatherSummary
      );

      const apiStart =
        performance.now();

      const response =
        await fetch(
          "/api/analyze",
          {
            method: "POST",
            body: formData,
          }
        );

      const apiTime =
        performance.now() -
        apiStart;

      console.log(
        `Field Intelligence API: ${apiTime.toFixed(
          0
        )}ms`
      );

      /*
       * -----------------------------------------------------
       * STEP 4
       * Parse result
       * -----------------------------------------------------
       */

      setProgress(
        "Finishing field assessment..."
      );

      setProgressStep(4);

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "AI analysis failed."
        );
      }

      if (!result.analysis) {
        throw new Error(
          "The AI returned no analysis."
        );
      }

      const finalAnalysis =
        result.analysis as AnalysisResult;

      setAnalysis(
        finalAnalysis
      );

      /*
       * -----------------------------------------------------
       * SAVE TO HISTORY / ALERTS
       * -----------------------------------------------------
       */

      onAnalysisComplete?.(
        finalAnalysis
      );

      const totalTime =
        performance.now() -
        totalStart;

      console.log(
        `Total Field Intelligence time: ${totalTime.toFixed(
          0
        )}ms`
      );

      setProgress(
        "Analysis complete."
      );
    } catch (err) {
      console.error(
        "AgriCustos analysis error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to analyze the crop."
      );

      setProgress("");
      setProgressStep(0);
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     STYLES
     ======================================================= */

  function confidenceStyle(
    level: string
  ) {
    if (level === "HIGH") {
      return "bg-green-100 text-green-800";
    }

    if (level === "MEDIUM") {
      return "bg-amber-100 text-amber-800";
    }

    return "bg-slate-100 text-slate-700";
  }

  function severityStyle(
    severity: string
  ) {
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
  }

  function weatherStyle(
    status: string
  ) {
    if (status === "ACT_NOW") {
      return "bg-green-100 text-green-800";
    }

    if (status === "WAIT") {
      return "bg-amber-100 text-amber-800";
    }

    if (
      status ===
      "EXPERT_REVIEW"
    ) {
      return "bg-red-100 text-red-800";
    }

    return "bg-blue-100 text-blue-800";
  }

  /* =======================================================
     UI
     ======================================================= */

  return (
    <section className="mt-5 overflow-hidden rounded-[25px] border border-[#dfe9e1] bg-white shadow-[0_8px_25px_rgba(31,62,43,0.05)]">

      <div className="h-1 bg-gradient-to-r from-[#173b2b] via-[#65b83f] to-[#b8dd73]" />

      <div className="p-6">

        {/* HEADER */}

        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">

          <div className="flex gap-4">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#173b2b] text-sm font-black text-white">
              03
            </div>

            <div>

              <p className="text-[9px] font-extrabold tracking-[0.18em] text-[#57973d]">
                FIELD INTELLIGENCE
              </p>

              <h3 className="mt-1 text-2xl font-black text-[#203529]">
                AI Field Analysis
              </h3>

              <p className="mt-1 max-w-xl text-sm leading-6 text-[#718078]">
                Combine crop observations,
                field context and weather
                conditions.
              </p>

            </div>
          </div>

          <button
            type="button"
            onClick={analyzeCrop}
            disabled={loading}
            className="rounded-xl bg-[#173b2b] px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#0f2f21] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Analyzing..."
              : "Analyze Crop"}
          </button>

        </div>

        {/* PROGRESS */}

        {loading && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-[#d9ebd3] bg-[#f3faef]">

            <div className="h-1 bg-[#e2efdd]">

              <div
                className="h-full bg-[#65b83f] transition-all duration-500"
                style={{
                  width:
                    progressStep === 1
                      ? "25%"
                      : progressStep === 2
                      ? "50%"
                      : progressStep === 3
                      ? "75%"
                      : "95%",
                }}
              />

            </div>

            <div className="p-5">

              <div className="flex items-center gap-3">

                <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#cde5c5] border-t-[#4b9137]" />

                <div>

                  <p className="font-bold text-[#397c2c]">
                    {progress ||
                      "Analyzing field..."}
                  </p>

                  <p className="mt-1 text-xs text-[#66805f]">
                    This can take a little while
                    while Field Intelligence
                    evaluates the image.
                  </p>

                </div>

              </div>

              <div className="mt-4 grid grid-cols-4 gap-2">

                {[
                  "Image",
                  "Weather",
                  "AI",
                  "Result",
                ].map(
                  (
                    step,
                    index
                  ) => (
                    <div
                      key={step}
                      className={`rounded-lg px-2 py-2 text-center text-[10px] font-bold ${
                        progressStep >
                          index
                          ? "bg-[#dff0d8] text-[#397c2c]"
                          : "bg-white text-[#9ba69f]"
                      }`}
                    >
                      {step}
                    </div>
                  )
                )}

              </div>

            </div>
          </div>
        )}

        {/* ERROR */}

        {error && !loading && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">

            <p className="font-bold text-red-800">
              Analysis unavailable
            </p>

            <p className="mt-1 text-sm text-red-700">
              {error}
            </p>

          </div>
        )}

        {/* RESULT */}

        {analysis && !loading && (
          <div className="mt-8 space-y-6">

            {/* SUMMARY */}

            <div className="rounded-[22px] bg-[#173b2b] p-6 text-white">

              <p className="text-[9px] font-extrabold tracking-[0.18em] text-[#bce994]">
                FARMER SUMMARY
              </p>

              <p className="mt-3 text-lg font-semibold leading-8">
                {analysis.farmer_summary}
              </p>

            </div>

            {/* QUICK RESULT */}

            <div className="grid gap-4 md:grid-cols-2">

              <div className="rounded-2xl border border-[#e2ebe4] bg-[#fafcf9] p-5">

                <p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#8c9991]">
                  Severity
                </p>

                <span
                  className={`mt-3 inline-flex rounded-full px-3 py-1.5 text-xs font-extrabold ${severityStyle(
                    analysis.severity
                  )}`}
                >
                  {analysis.severity}
                </span>

              </div>

              <div className="rounded-2xl border border-[#e2ebe4] bg-[#fafcf9] p-5">

                <p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#8c9991]">
                  Crop
                </p>

                <p className="mt-3 font-black text-[#24382b]">
                  {analysis.crop}
                </p>

              </div>

            </div>

            {/* OBSERVATIONS */}

            <div>

              <h4 className="text-lg font-black">
                What Field Intelligence observed
              </h4>

              <div className="mt-3 space-y-2">

                {analysis.observations.map(
                  (
                    observation,
                    index
                  ) => (
                    <div
                      key={index}
                      className="rounded-xl bg-[#f6faf7] p-4 text-sm leading-6 text-[#536159]"
                    >
                      {observation}
                    </div>
                  )
                )}

              </div>

            </div>

            {/* CONDITIONS */}

            <div>

              <h4 className="text-lg font-black">
                Possible crop conditions
              </h4>

              <div className="mt-3 space-y-3">

                {analysis.possible_conditions.map(
                  (
                    condition,
                    index
                  ) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-[#e2ebe4] p-5"
                    >

                      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">

                        <p className="font-black">
                          {
                            condition.condition
                          }
                        </p>

                        <span
                          className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${confidenceStyle(
                            condition.confidence_level
                          )}`}
                        >
                          {
                            condition.confidence_level
                          }{" "}
                          confidence
                        </span>

                      </div>

                      <p className="mt-2 text-sm leading-6 text-[#68766e]">
                        {condition.reason}
                      </p>

                    </div>
                  )
                )}

              </div>

            </div>

            {/* MANAGEMENT */}

            <div>

              <h4 className="text-lg font-black">
                Recommended management
              </h4>

              <div className="mt-3 space-y-3">

                {analysis.management_guidance.map(
                  (
                    guidance,
                    index
                  ) => (
                    <div
                      key={index}
                      className="flex gap-3 rounded-xl bg-[#edf7e9] p-4"
                    >

                      <span className="font-black text-[#4b9137]">
                        {index + 1}.
                      </span>

                      <p className="text-sm leading-6 text-[#35552f]">
                        {guidance}
                      </p>

                    </div>
                  )
                )}

              </div>

            </div>

            {/* WEATHER */}

            <div className="rounded-2xl border border-[#e2ebe4] p-5">

              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">

                <div>

                  <p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#8c9991]">
                    Weather-aware action
                  </p>

                  <p className="mt-2 text-xl font-black">
                    {
                      analysis
                        .weather_assessment
                        .action_window
                    }
                  </p>

                </div>

                <span
                  className={`w-fit rounded-full px-3 py-1.5 text-xs font-extrabold ${weatherStyle(
                    analysis
                      .weather_assessment
                      .status
                  )}`}
                >
                  {
                    analysis
                      .weather_assessment
                      .status
                  }
                </span>

              </div>

              <p className="mt-4 text-sm leading-6 text-[#68766e]">
                {
                  analysis
                    .weather_assessment
                    .reason
                }
              </p>

            </div>

            {/* FOLLOW UP */}

            <div className="rounded-2xl bg-[#eef6fc] p-5">

              <p className="font-bold text-[#315c7a]">
                Follow-up monitoring
              </p>

              <p className="mt-2 text-sm leading-6 text-[#426b87]">
                {
                  analysis.follow_up
                    .reason
                }
              </p>

              {analysis.follow_up
                .recommended &&
                analysis.follow_up
                  .interval_hours >
                  0 && (
                  <div className="mt-4 inline-flex rounded-xl bg-white px-4 py-3 text-sm font-bold text-[#315c7a]">
                    Check again in{" "}
                    {
                      analysis.follow_up
                        .interval_hours
                    }{" "}
                    hours
                  </div>
                )}

            </div>

            {/* UNCERTAINTIES */}

            {analysis.uncertainties
              .length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">

                <p className="font-bold text-amber-900">
                  Important uncertainty
                </p>

                <ul className="mt-3 space-y-2">

                  {analysis.uncertainties.map(
                    (
                      item,
                      index
                    ) => (
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

            {/* EXPERT REVIEW */}

            {analysis.expert_review
              .recommended && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5">

                <p className="font-bold text-red-900">
                  Expert review recommended
                </p>

                <p className="mt-2 text-sm leading-6 text-red-800">
                  {
                    analysis
                      .expert_review
                      .reason
                  }
                </p>

              </div>
            )}

            {/* DISCLAIMER */}

            <div className="border-t border-[#e2ebe4] pt-5">

              <p className="text-xs leading-5 text-[#7b8780]">
                AgriCustos provides
                AI-assisted agricultural
                decision support, not a
                guaranteed diagnosis. Always
                follow locally approved
                agricultural guidance.
              </p>

            </div>

          </div>
        )}

      </div>
    </section>
  );
}