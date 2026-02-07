
import React from 'react';
import { FileText } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-sm border-b px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="bg-blue-600 p-2 rounded-lg text-white">
          <FileText size={24} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800 leading-tight">ভোটার স্লিপ মেকার</h1>
          <p className="text-xs text-gray-500 uppercase tracking-wider">Voter Slip Automated Generator</p>
        </div>
      </div>
      <div className="hidden md:block">
        <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">বিনা খরচে ভোটার কার্ড বা স্লিপ তৈরি করুন</span>
      </div>
    </header>
  );
};
