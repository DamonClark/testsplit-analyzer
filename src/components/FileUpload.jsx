import React from 'react';

export default function FileUpload({ onFileSelected, accept = '.csv,.json' }) {
  return (
    <div className="flex items-center justify-center w-full">
      <label
        htmlFor="file-upload"
        className="flex flex-col items-center justify-center w-full border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 border-gray-300 p-6"
      >
        <div className="flex flex-col items-center justify-center">
          <p className="mb-2 text-sm text-gray-500">
            <span className="font-semibold">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-gray-500">CSV or JSON with test durations</p>
        </div>
        <input
          id="file-upload"
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileSelected(file);
          }}
        />
      </label>
    </div>
  );
}


