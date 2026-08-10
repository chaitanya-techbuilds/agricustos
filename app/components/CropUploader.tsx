"use client";

import { useEffect, useState } from "react";

type CropUploaderProps = {
  onFileChange?: (file: File | null) => void;
};

export default function CropUploader({
  onFileChange,
}: CropUploaderProps) {
  const [image, setImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    return () => {
      if (image) {
        URL.revokeObjectURL(image);
      }
    };
  }, [image]);

  function handleImageChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      alert("Please upload a JPG, PNG, or WEBP image.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("Please choose an image smaller than 10 MB.");
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    setImage(previewUrl);
    setFileName(file.name);
    onFileChange?.(file);
  }

  function removeImage() {
    if (image) {
      URL.revokeObjectURL(image);
    }

    setImage(null);
    setFileName("");
    onFileChange?.(null);
  }

  return (
    <div>
      {!image ? (
        <label className="flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-green-200 bg-green-50/50 px-6 text-center transition hover:border-green-400 hover:bg-green-50">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm">
            📸
          </div>

          <p className="font-semibold text-slate-800">
            Upload crop photo
          </p>

          <p className="mt-1 text-sm text-slate-500">
            JPG, PNG or WEBP • Maximum 10 MB
          </p>

          <span className="mt-5 rounded-xl bg-green-700 px-5 py-2.5 text-sm font-semibold text-white">
            Choose Image
          </span>

          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleImageChange}
            className="hidden"
          />
        </label>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          <div className="relative aspect-video w-full bg-slate-100">
            <img
              src={image}
              alt="Selected crop"
              className="h-full w-full object-contain"
            />
          </div>

          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">
                Image ready
              </p>

              <p className="truncate text-xs text-slate-500">
                {fileName}
              </p>
            </div>

            <div className="flex gap-2">
              <label className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Change

                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={removeImage}
                className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}