"use client";

import { useState } from "react";

type FieldContextProps = {
  onContextChange?: (data: {
    crop: string;
    location: string;
    latitude: number | null;
    longitude: number | null;
  }) => void;
};

export default function FieldContext({
  onContextChange,
}: FieldContextProps) {
  const [crop, setCrop] = useState("");
  const [location, setLocation] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationStatus, setLocationStatus] = useState("");

  function updateContext(
    newCrop: string,
    newLocation: string,
    newLatitude: number | null,
    newLongitude: number | null
  ) {
    onContextChange?.({
      crop: newCrop,
      location: newLocation,
      latitude: newLatitude,
      longitude: newLongitude,
    });
  }

  function handleCropChange(value: string) {
    setCrop(value);
    updateContext(value, location, latitude, longitude);
  }

  function handleLocationChange(value: string) {
    setLocation(value);
    updateContext(crop, value, latitude, longitude);
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("Location services are not supported.");
      return;
    }

    setLocationStatus("Getting your location...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lon = Number(position.coords.longitude.toFixed(6));

        setLatitude(lat);
        setLongitude(lon);

        updateContext(crop, location, lat, lon);

        setLocationStatus("Location captured successfully.");
      },
      () => {
        setLocationStatus(
          "Unable to get your location. You can enter it manually."
        );
      }
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <p className="text-sm font-semibold text-green-700">
          FIELD CONTEXT
        </p>

        <h3 className="mt-1 text-xl font-bold">
          Tell us about the field
        </h3>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          This information helps AgriCustos connect the crop observation
          with local environmental conditions.
        </p>
      </div>

      <div className="space-y-5">
        {/* Crop */}
        <div>
          <label
            htmlFor="crop"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Crop
          </label>

          <input
            id="crop"
            type="text"
            value={crop}
            onChange={(event) =>
              handleCropChange(event.target.value)
            }
            placeholder="e.g. Wheat, Rice, Tomato"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
          />
        </div>

        {/* Location */}
        <div>
          <label
            htmlFor="location"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Field location
          </label>

          <input
            id="location"
            type="text"
            value={location}
            onChange={(event) =>
              handleLocationChange(event.target.value)
            }
            placeholder="e.g. Guntur, Andhra Pradesh"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
          />
        </div>

        {/* GPS */}
        <button
          type="button"
          onClick={useMyLocation}
          className="w-full rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800 transition hover:bg-green-100"
        >
          📍 Use my current location
        </button>

        {locationStatus && (
          <p className="text-xs text-slate-500">
            {locationStatus}
          </p>
        )}

        {latitude !== null && longitude !== null && (
          <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
            GPS coordinates captured:
            <span className="ml-1 font-medium text-slate-700">
              {latitude}, {longitude}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}