import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const apiKey = process.env.GEMINI_API_KEY;

const analysisSchema = {
  type: "object",
  properties: {
    crop: { type: "string" },
    observations: {
      type: "array",
      items: { type: "string" },
    },
    possible_conditions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          condition: { type: "string" },
          confidence_level: { type: "string" },
          reason: { type: "string" },
        },
        required: [
          "condition",
          "confidence_level",
          "reason",
        ],
      },
    },
    severity: { type: "string" },
    management_guidance: {
      type: "array",
      items: { type: "string" },
    },
    weather_assessment: {
      type: "object",
      properties: {
        status: { type: "string" },
        reason: { type: "string" },
        action_window: { type: "string" },
      },
      required: [
        "status",
        "reason",
        "action_window",
      ],
    },
    follow_up: {
      type: "object",
      properties: {
        recommended: { type: "boolean" },
        interval_hours: { type: "number" },
        reason: { type: "string" },
      },
      required: [
        "recommended",
        "interval_hours",
        "reason",
      ],
    },
    uncertainties: {
      type: "array",
      items: { type: "string" },
    },
    expert_review: {
      type: "object",
      properties: {
        recommended: { type: "boolean" },
        reason: { type: "string" },
      },
      required: [
        "recommended",
        "reason",
      ],
    },
    farmer_summary: { type: "string" },
  },
  required: [
    "crop",
    "observations",
    "possible_conditions",
    "severity",
    "management_guidance",
    "weather_assessment",
    "follow_up",
    "uncertainties",
    "expert_review",
    "farmer_summary",
  ],
};

const MASTER_PROMPT = `
You are AgriCustos, an agricultural field decision-support AI.

Analyze the supplied crop image together with the crop,
location, and weather information.

Give practical, conservative agricultural guidance.

Requirements:
- Identify visible crop symptoms.
- Give the most likely condition or conditions.
- Give a confidence level.
- Estimate severity.
- Provide practical management guidance.
- Consider the supplied weather when recommending timing.
- Recommend a follow-up interval.
- Identify important uncertainty.
- Recommend expert review when appropriate.
- Never invent weather information.
- Never claim certainty when the image does not support it.
- Never invent pesticide doses or application rates.
- For chemical treatment, advise following locally approved
  product labels and qualified agricultural guidance.
- Distinguish observations from interpretation.
- Do not claim treatment success is guaranteed.

Return only the requested JSON structure.
`;

export async function POST(request: Request) {
  try {
    if (!apiKey) {
      return NextResponse.json(
        {
          error: "Gemini API key is not configured.",
          code: "MISSING_API_KEY",
        },
        { status: 500 }
      );
    }

    const formData = await request.formData();

    const image = formData.get("image");
    const crop = String(
      formData.get("crop") || "Unknown"
    );
    const location = String(
      formData.get("location") || "Unknown"
    );
    const weather = String(
      formData.get("weather") || "Not provided"
    );

    if (!(image instanceof File)) {
      return NextResponse.json(
        { error: "Crop image is required." },
        { status: 400 }
      );
    }

    if (!image.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Please upload a valid image." },
        { status: 400 }
      );
    }

    if (image.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Image must be smaller than 10 MB." },
        { status: 400 }
      );
    }

    const imageBuffer = Buffer.from(
      await image.arrayBuffer()
    );

    const base64Image = imageBuffer.toString("base64");

    const prompt = `
${MASTER_PROMPT}

FIELD INFORMATION

Crop:
${crop}

Location:
${location}

Weather:
${weather}

Analyze the attached crop image.
`;

    const ai = new GoogleGenAI({
      apiKey,
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [
        {
          inlineData: {
            mimeType: image.type,
            data: base64Image,
          },
        },
        {
          text: prompt,
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
      },
    });

    const text = response.text?.trim();

    if (!text) {
      return NextResponse.json(
        {
          error: "Gemini returned an empty response.",
          code: "EMPTY_AI_RESPONSE",
        },
        { status: 502 }
      );
    }

    let analysis: unknown;

    try {
      analysis = JSON.parse(text);
    } catch {
      console.error(
        "Invalid Gemini JSON:",
        text
      );

      return NextResponse.json(
        {
          error: "Gemini returned an invalid analysis.",
          code: "INVALID_AI_RESPONSE",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error: unknown) {
    console.error(
      "AgriCustos Gemini error:",
      error
    );

    const errorStatus =
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      typeof error.status === "number"
        ? error.status
        : null;

    if (errorStatus === 403) {
      return NextResponse.json(
        {
          error:
            "Google denied access to this Gemini project.",
          code: "GEMINI_PROJECT_ACCESS_DENIED",
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        error:
          "Unable to analyze the crop right now.",
        code: "GEMINI_ANALYSIS_ERROR",
      },
      { status: 500 }
    );
  }
}