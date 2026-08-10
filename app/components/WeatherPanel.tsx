"use client";

import { useEffect, useState } from "react";

type WeatherPanelProps = {
  latitude: number | null;
  longitude: number | null;
};

type WeatherData = {
  temperature: number;
  humidity: number;
  precipitationProbability: number;
  rain: number;
  windSpeed: number;
};

export default function WeatherPanel({
  latitude,
  longitude,
}: WeatherPanelProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (latitude === null || longitude === null) {
      setWeather(null);
      return;
    }

    async function fetchWeather() {
      try {
        setLoading(true);
        setError("");

        const url =
          `https://api.open-meteo.com/v1/forecast` +
          `?latitude=${latitude}` +
          `&longitude=${longitude}` +
          `&current=temperature_2m,relative_humidity_2m,rain,wind_speed_10m` +
          `&hourly=precipitation_probability` +
          `&forecast_days=2` +
          `&timezone=auto`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error("Weather service unavailable");
        }

        const data = await response.json();

        setWeather({
          temperature: data.current.temperature_2m,
          humidity: data.current.relative_humidity_2m,
          rain: data.current.rain,
          windSpeed: data.current.wind_speed_10m,
          precipitationProbability:
            data.hourly.precipitation_probability[0] ?? 0,
        });
      } catch {
        setError("Unable to load weather data.");
      } finally {
        setLoading(false);
      }
    }

    fetchWeather();
  }, [latitude, longitude]);

  if (latitude === null || longitude === null) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-green-700">
          WEATHER INTELLIGENCE
        </p>

        <h3 className="mt-1 text-xl font-bold">
          Waiting for field location
        </h3>

        <p className="mt-2 text-sm text-slate-500">
          Capture your field location to load local weather conditions.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-green-700">
          WEATHER INTELLIGENCE
        </p>

        <h3 className="mt-2 text-xl font-bold">
          Loading weather...
        </h3>

        <p className="mt-2 text-sm text-slate-500">
          Connecting your field location with current weather conditions.
        </p>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="rounded-3xl border border-red-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-red-600">
          WEATHER UNAVAILABLE
        </p>

        <p className="mt-2 text-sm text-slate-500">
          {error || "Weather data could not be loaded."}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-green-700">
            WEATHER INTELLIGENCE
          </p>

          <h3 className="mt-1 text-3xl font-bold">
            {Math.round(weather.temperature)}°C
          </h3>
        </div>

        <div className="text-3xl">🌦️</div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Humidity</p>
          <p className="mt-1 font-semibold">
            {weather.humidity}%
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs text-slate-500">
            Rain probability
          </p>
          <p className="mt-1 font-semibold">
            {weather.precipitationProbability}%
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Rain now</p>
          <p className="mt-1 font-semibold">
            {weather.rain} mm
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Wind</p>
          <p className="mt-1 font-semibold">
            {Math.round(weather.windSpeed)} km/h
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-xl bg-green-50 p-4">
        <p className="text-sm font-semibold text-green-800">
          Weather context ready
        </p>

        <p className="mt-1 text-xs leading-5 text-green-700">
          These conditions can be passed to the AI decision engine
          when evaluating the crop.
        </p>
      </div>
    </div>
  );
}