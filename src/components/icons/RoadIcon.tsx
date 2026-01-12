
import React from 'react';

export const RoadIcon: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5 text-slate-500"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13 5l7 14H4l7-14z"
    />
    <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 2v20"
        strokeDasharray="4 4"
    />
  </svg>
);
