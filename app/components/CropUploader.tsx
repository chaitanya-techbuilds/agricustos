"use client";

import { useRef, useState } from "react";

type CropUploaderProps = {
  onFileChange?: (file: File | null) => void;
};

export default function CropUploader({
  onFileChange,
}: CropUploaderProps) {
  const inputRef =
    useRef<HTMLInputElement>(null);

  const [file, setFile] =
    useState<File | null>(null);

  const [preview, setPreview] =
    useState<string | null>(null);

  const [error, setError] =
    useState("");

  function handleFile(
    selectedFile: File | null
  ) {
    setError("");

    if (!selectedFile) {
      setFile(null);
      setPreview(null);
      onFileChange?.(null);
      return;
    }

    if (
      !selectedFile.type.startsWith(
        "image/"
      )
    ) {
      setError(
        "Please select an image file."
      );
      return;
    }

    if (
      selectedFile.size >
      10 * 1024 * 1024
    ) {
      setError(
        "Image must be smaller than 10 MB."
      );
      return;
    }

    setFile(selectedFile);

    const url =
      URL.createObjectURL(
        selectedFile
      );

    setPreview(url);

    onFileChange?.(
      selectedFile
    );
  }

  function handleInputChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile =
      event.target.files?.[0] ??
      null;

    handleFile(selectedFile);
  }

  function removeImage() {
    setFile(null);
    setPreview(null);
    setError("");

    if (inputRef.current) {
      inputRef.current.value = "";
    }

    onFileChange?.(null);
  }

  function openPicker() {
    inputRef.current?.click();
  }

  return (
    <div className="w-full">

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
      />

      {!preview ? (
        <button
          type="button"
          onClick={openPicker}
          className="group w-full rounded-[22px] border-2 border-dashed border-[#d7e4d9] bg-[#f8fbf8] px-6 py-12 text-center transition hover:border-[#65b83f] hover:bg-[#f2f9ef]"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#eaf5e5] text-[#4d9637] transition group-hover:scale-105">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 17.5A4.5 4.5 0 0 1 5.5 9 6.5 6.5 0 0 1 18 10.5 4 4 0 0 1 18 18H7" />
              <path d="M12 12v7" />
              <path d="m9 15 3-3 3 3" />
            </svg>
          </div>

          <p className="mt-5 text-base font-black text-[#26392d]">
            Upload crop image
          </p>

          <p className="mt-2 text-sm text-[#7b8980]">
            Click to choose a photo from
            your device
          </p>

          <div className="mt-4 flex justify-center gap-2">
            <span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold text-[#7c8b81] ring-1 ring-[#e1e9e2]">
              JPG
            </span>

            <span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold text-[#7c8b81] ring-1 ring-[#e1e9e2]">
              PNG
            </span>

            <span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold text-[#7c8b81] ring-1 ring-[#e1e9e2]">
              Max 10 MB
            </span>
          </div>
        </button>
      ) : (
        <div className="overflow-hidden rounded-[22px] border border-[#dfe9e1] bg-[#f8fbf8]">

          <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#e8eee9]">
            <img
              src={preview}
              alt="Selected crop"
              className="h-full w-full object-cover"
            />

            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-5 pb-4 pt-10">
              <p className="truncate text-sm font-bold text-white">
                {file?.name}
              </p>

              {file && (
                <p className="mt-1 text-xs text-white/80">
                  {(
                    file.size /
                    (1024 * 1024)
                  ).toFixed(2)}{" "}
                  MB
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <p className="text-sm font-bold text-[#304438]">
                Image ready
              </p>

              <p className="mt-1 text-xs text-[#849087]">
                This image will be sent to
                Field Intelligence for analysis.
              </p>
            </div>

            <div className="flex gap-2">

              <button
                type="button"
                onClick={openPicker}
                className="rounded-xl bg-white px-4 py-2.5 text-xs font-extrabold text-[#397c2c] ring-1 ring-[#dfe9e1] transition hover:bg-[#f1f8ef]"
              >
                Change
              </button>

              <button
                type="button"
                onClick={removeImage}
                className="rounded-xl bg-red-50 px-4 py-2.5 text-xs font-extrabold text-red-700 transition hover:bg-red-100"
              >
                Remove
              </button>

            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

    </div>
  );
}