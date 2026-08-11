"use client";

import { useState } from "react";
import { pipeline } from "@huggingface/transformers";

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
    analysis: AnalysisResult
  ) => void;
};

type ClassResult = {
  label: string;
  score: number;
};

let classifierPromise: Promise<any> | null = null;

async function getClassifier() {
  if (!classifierPromise) {
    classifierPromise = pipeline(
      "zero-shot-image-classification",
      "Xenova/clip-vit-base-patch32"
    );
  }

  return classifierPromise;
}

function confidenceFromScore(
  score: number
): "HIGH" | "MEDIUM" | "LOW" {
  if (score >= 0.6) return "HIGH";
  if (score >= 0.35) return "MEDIUM";
  return "LOW";
}

function conditionName(label: string) {
  const names: Record<string, string> = {
    healthy: "Healthy-looking crop tissue",
    fungal: "Possible fungal disease symptoms",
    bacterial: "Possible bacterial disease symptoms",
    viral: "Possible viral disease symptoms",
    pest: "Possible pest or insect damage",
    nutrient: "Possible nutrient deficiency or imbalance",
    drought: "Possible drought or heat stress",
    water: "Possible excess-moisture or water stress",
    physical: "Possible physical or environmental damage",
  };

  return names[label] || label;
}

function buildCandidates(crop: string) {
  const c = crop.trim() || "crop";

  return [
    {
      key: "healthy",
      text: `a healthy ${c} leaf with normal green tissue`,
    },
    {
      key: "fungal",
      text: `a ${c} leaf showing fungal disease symptoms`,
    },
    {
      key: "bacterial",
      text: `a ${c} leaf showing bacterial disease symptoms`,
    },
    {
      key: "viral",
      text: `a ${c} leaf showing viral disease symptoms`,
    },
    {
      key: "pest",
      text: `a ${c} leaf showing insect or pest damage`,
    },
    {
      key: "nutrient",
      text: `a ${c} leaf showing nutrient deficiency symptoms`,
    },
    {
      key: "drought",
      text: `a ${c} leaf showing drought or heat stress`,
    },
    {
      key: "water",
      text: `a ${c} leaf showing excess moisture or water stress`,
    },
    {
      key: "physical",
      text: `a ${c} leaf showing physical or environmental damage`,
    },
  ];
}

export default function AIAnalysis({
  image,
  crop,
  location,
  latitude,
  longitude,
  onAnalysisComplete,
}: AIAnalysisProps) {
  const [analysis, setAnalysis] =
    useState<AnalysisResult | null>(null);

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

    if (
      latitude === null ||
      longitude === null
    ) {
      setError(
        "Please capture the field location first."
      );
      return;
    }

    try {
      setLoading(true);
      setError("");
      setAnalysis(null);

      /*
       * WEATHER
       */

      const weatherUrl =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${latitude}` +
        `&longitude=${longitude}` +
        `&current=temperature_2m,relative_humidity_2m,rain,wind_speed_10m` +
        `&hourly=precipitation_probability,rain` +
        `&forecast_days=2` +
        `&timezone=auto`;

      const weatherResponse =
        await fetch(weatherUrl);

      if (!weatherResponse.ok) {
        throw new Error(
          "Unable to retrieve weather information."
        );
      }

      const weatherData =
        await weatherResponse.json();

      const rainProbability =
        weatherData.hourly
          ?.precipitation_probability
          ?.slice(0, 12) ?? [];

      const rainForecast =
        weatherData.hourly?.rain?.slice(
          0,
          12
        ) ?? [];

      const maxRainProbability =
        rainProbability.length
          ? Math.max(...rainProbability)
          : 0;

      const totalForecastRain =
        rainForecast.reduce(
          (sum: number, value: number) =>
            sum + (value || 0),
          0
        );

      const temperature =
        Number(
          weatherData.current?.temperature_2m
        ) || 0;

      const humidity =
        Number(
          weatherData.current
            ?.relative_humidity_2m
        ) || 0;

      /*
       * LOCAL VISION MODEL
       */

      const classifier =
        await getClassifier();

      const candidates =
        buildCandidates(crop);

      const imageUrl =
        URL.createObjectURL(image);

      let visualResults: ClassResult[];

      try {
        visualResults =
          await classifier(
            imageUrl,
            candidates.map(
              (item) => item.text
            ),
            {
              top_k: 5,
            }
          );
      } finally {
        URL.revokeObjectURL(imageUrl);
      }

      if (
        !visualResults ||
        !visualResults.length
      ) {
        throw new Error(
          "The field vision model returned no visual result."
        );
      }

      const topResult =
        visualResults[0];

      const topCandidate =
        candidates.find(
          (candidate) =>
            candidate.text ===
            topResult.label
        );

      const topKey =
        topCandidate?.key || "unknown";

      const confidence =
        topResult.score;

      /*
       * WEATHER-AWARE RISK
       */

      const diseaseLike = [
        "fungal",
        "bacterial",
        "viral",
      ].includes(topKey);

      const pestLike =
        topKey === "pest";

      const stressLike = [
        "drought",
        "water",
        "nutrient",
        "physical",
      ].includes(topKey);

      let severity:
        | "LOW"
        | "MODERATE"
        | "HIGH"
        | "UNKNOWN" = "LOW";

      if (
        confidence >= 0.6 &&
        (diseaseLike || pestLike)
      ) {
        severity = "HIGH";
      } else if (
        confidence >= 0.35 &&
        (diseaseLike ||
          pestLike ||
          stressLike)
      ) {
        severity = "MODERATE";
      }

      const diseaseWeatherRisk =
        diseaseLike &&
        (humidity >= 75 ||
          maxRainProbability >= 60 ||
          totalForecastRain >= 2);

      if (
        diseaseWeatherRisk &&
        severity === "MODERATE"
      ) {
        severity = "HIGH";
      }

      /*
       * OBSERVATIONS
       */

      const observations: string[] = [
        `The visual screening model most strongly matched: ${topResult.label}.`,
        `Visual screening confidence: ${(confidence * 100).toFixed(0)}%.`,
        `Field location captured at ${latitude.toFixed(
          4
        )}, ${longitude.toFixed(4)}.`,
      ];

      if (humidity >= 75) {
        observations.push(
          `Current relative humidity is ${humidity}%, which indicates a humid field environment.`
        );
      }

      if (maxRainProbability >= 60) {
        observations.push(
          `Rain probability reaches ${maxRainProbability}% during the next 12 hours.`
        );
      }

      if (temperature >= 35) {
        observations.push(
          `Current temperature is ${temperature}°C, so heat stress should be considered.`
        );
      }

      /*
       * POSSIBLE CONDITIONS
       */

      const possibleConditions =
        visualResults
          .slice(0, 3)
          .map((result) => {
            const candidate =
              candidates.find(
                (item) =>
                  item.text ===
                  result.label
              );

            const key =
              candidate?.key || "unknown";

            let reason =
              `The visual model assigned ${(result.score * 100).toFixed(
                0
              )}% relative confidence to this visual category.`;

            if (
              key === "fungal" &&
              diseaseWeatherRisk
            ) {
              reason +=
                " Humidity/rain conditions also increase the need for field inspection.";
            }

            return {
              condition:
                conditionName(key),
              confidence_level:
                confidenceFromScore(
                  result.score
                ),
              reason,
            };
          });

      /*
       * MANAGEMENT
       */

      const management: string[] = [];

      if (topKey === "healthy") {
        management.push(
          "Continue routine field scouting and compare new images with this baseline."
        );

        management.push(
          "Prioritize irrigation, nutrition, and pest monitoring according to the crop's normal schedule."
        );
      } else if (diseaseLike) {
        management.push(
          "Inspect several plants across the field to determine whether the visual symptoms are widespread or localized."
        );

        management.push(
          "Remove or isolate clearly affected plant material where appropriate and avoid unnecessary movement of potentially contaminated material between field areas."
        );

        management.push(
          "If disease symptoms are confirmed, follow locally approved agricultural guidance and product labels for the specific crop and condition."
        );
      } else if (pestLike) {
        management.push(
          "Inspect both sides of leaves and nearby plants for active pests and fresh feeding damage."
        );

        management.push(
          "Check whether damage is isolated or spreading before choosing a control measure."
        );

        management.push(
          "Use locally approved integrated pest-management guidance for the identified crop and pest."
        );
      } else if (topKey === "drought") {
        management.push(
          "Inspect soil moisture and plants across multiple field locations rather than judging the entire field from one image."
        );

        management.push(
          "Prioritize appropriate irrigation according to crop stage, soil condition, and local agronomic guidance."
        );
      } else if (topKey === "water") {
        management.push(
          "Inspect drainage and soil moisture around affected plants."
        );

        management.push(
          "Avoid unnecessary additional irrigation until field moisture conditions are confirmed."
        );
      } else if (topKey === "nutrient") {
        management.push(
          "Compare symptoms across older and younger leaves and inspect whether the pattern is uniform across the field."
        );

        management.push(
          "Confirm suspected nutrient problems with appropriate soil or plant testing before applying corrective inputs."
        );
      } else {
        management.push(
          "Inspect several plants around the field to verify whether the observed pattern is representative."
        );

        management.push(
          "Continue monitoring the affected area and compare the next image with this assessment."
        );
      }

      /*
       * WEATHER DECISION
       */

      let weatherStatus:
        | "ACT_NOW"
        | "WAIT"
        | "MONITOR"
        | "EXPERT_REVIEW" =
        "MONITOR";

      let actionWindow =
        "Monitor the field and reassess during the next scouting cycle.";

      let weatherReason =
        `Current conditions are ${temperature}°C with ${humidity}% relative humidity.`;

      if (
        diseaseLike &&
        maxRainProbability >= 60
      ) {
        weatherStatus = "ACT_NOW";

        actionWindow =
          "Prioritize field inspection before or around the upcoming wet period.";

        weatherReason =
          `Disease-like visual symptoms combined with a ${maxRainProbability}% rain probability create a higher-priority scouting window.`;
      } else if (
        diseaseLike &&
        humidity >= 75
      ) {
        weatherStatus = "MONITOR";

        actionWindow =
          "Inspect within the next 24 hours.";

        weatherReason =
          `The field is currently humid (${humidity}%), which makes close monitoring of disease-like symptoms more important.`;
      } else if (
        topKey === "drought" &&
        temperature >= 35
      ) {
        weatherStatus = "ACT_NOW";

        actionWindow =
          "Inspect crop water status during the current heat period.";

        weatherReason =
          `Temperature is ${temperature}°C and the image shows possible heat/drought stress.`;
      } else if (
        maxRainProbability >= 70
      ) {
        weatherStatus = "WAIT";

        actionWindow =
          "Complete non-urgent field work before the wet period where practical.";

        weatherReason =
          `Rain probability reaches ${maxRainProbability}% during the next 12 hours.`;
      }

      /*
       * FOLLOW-UP
       */

      let followUpHours = 48;

      if (
        severity === "HIGH" ||
        diseaseWeatherRisk
      ) {
        followUpHours = 24;
      } else if (
        severity === "MODERATE"
      ) {
        followUpHours = 36;
      }

      /*
       * UNCERTAINTIES
       */

      const uncertainties: string[] = [
        "This is visual screening rather than a laboratory-confirmed diagnosis.",
        "A single crop image may not represent conditions across the entire field.",
      ];

      if (confidence < 0.5) {
        uncertainties.push(
          "The visual signal is not strong enough to treat the predicted category as a confirmed diagnosis."
        );
      }

      /*
       * EXPERT REVIEW
       */

      const expertRecommended =
        confidence < 0.35 ||
        severity === "HIGH";

      /*
       * FARMER SUMMARY
       */

      let farmerSummary = "";

      if (topKey === "healthy") {
        farmerSummary =
          `The ${crop} image currently looks closer to healthy crop tissue than the other visual categories tested. Keep this assessment as a field baseline and continue routine scouting.`;
      } else {
        farmerSummary =
          `AgriCustos detected a ${conditionName(
            topKey
          ).toLowerCase()} pattern in the ${crop} image. ${actionWindow} Recheck the affected area in about ${followUpHours} hours and compare new images for progression.`;
      }

      if (diseaseWeatherRisk) {
        farmerSummary +=
          " Weather conditions make disease-related monitoring more important right now.";
      }

      const finalAnalysis: AnalysisResult = {
        crop,
        observations,
        possible_conditions:
          possibleConditions,
        severity,
        management_guidance:
          management,
        weather_assessment: {
          status: weatherStatus,
          reason: weatherReason,
          action_window: actionWindow,
        },
        follow_up: {
          recommended: true,
          interval_hours:
            followUpHours,
          reason:
            "Compare the next field image with this assessment and check whether symptoms are spreading, stabilizing, or improving.",
        },
        uncertainties,
        expert_review: {
          recommended:
            expertRecommended,
          reason:
            expertRecommended
              ? "The visual evidence is either uncertain or indicates a higher-priority field condition that should be verified by an agricultural professional."
              : "Current visual evidence is sufficient for routine field monitoring, but confirmation is recommended if symptoms progress.",
        },
        farmer_summary:
          farmerSummary,
      };

      setAnalysis(finalAnalysis);

      // Send the completed result back to the dashboard.
      onAnalysisComplete?.(finalAnalysis);
    } catch (err) {
      console.error(
        "AgriCustos local AI error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to analyze the crop."
      );
    } finally {
      setLoading(false);
    }
  }

  const confidenceStyle = (
    level: string
  ) => {
    if (level === "HIGH") {
      return "bg-green-100 text-green-800";
    }

    if (level === "MEDIUM") {
      return "bg-amber-100 text-amber-800";
    }

    return "bg-slate-100 text-slate-700";
  };

  const severityStyle = (
    severity: string
  ) => {
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

  const weatherStyle = (
    status: string
  ) => {
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
            AgriCustos screens the crop image locally,
            combines the visual signal with field context
            and upcoming weather, and produces a
            field-action assessment.
          </p>
        </div>

        <button
          type="button"
          onClick={analyzeCrop}
          disabled={loading}
          className="rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Analyzing field..."
            : "Analyze Crop"}
        </button>
      </div>

      {loading && (
        <div className="mt-6 rounded-2xl bg-green-50 p-5">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-green-200 border-t-green-700" />

            <div>
              <p className="font-semibold text-green-800">
                Running field intelligence...
              </p>

              <p className="mt-1 text-xs text-green-700">
                First analysis may take longer while the
                vision model loads into the browser.
              </p>
            </div>
          </div>
        </div>
      )}

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

      {analysis && !loading && (
        <div className="mt-8 space-y-6">
          <div className="rounded-2xl bg-slate-900 p-6 text-white">
            <p className="text-sm font-semibold text-green-300">
              FARMER ACTION SUMMARY
            </p>

            <p className="mt-3 text-lg leading-8">
              {analysis.farmer_summary}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Field severity
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

            <div className="rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Next check
              </p>

              <p className="mt-3 font-semibold">
                {analysis.follow_up.interval_hours}{" "}
                hours
              </p>
            </div>
          </div>

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
                        {condition.confidence_level}{" "}
                        confidence
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

          <div className="rounded-2xl bg-blue-50 p-5">
            <p className="text-sm font-semibold text-blue-900">
              🔔 Follow-up monitoring
            </p>

            <p className="mt-2 text-sm leading-6 text-blue-800">
              {analysis.follow_up.reason}
            </p>

            <div className="mt-4 inline-flex rounded-xl bg-white px-4 py-3 text-sm font-semibold text-blue-900">
              Check again in{" "}
              {analysis.follow_up.interval_hours}{" "}
              hours
            </div>
          </div>

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

          <div className="border-t border-slate-200 pt-5">
            <p className="text-xs leading-5 text-slate-500">
              AgriCustos provides AI-assisted visual
              screening and field decision support, not a
              guaranteed diagnosis. Confidence describes
              the visual model's confidence in a category,
              not treatment success. Confirm important
              decisions using locally appropriate
              agricultural guidance.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}