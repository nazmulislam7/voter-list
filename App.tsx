
import React, { useState } from 'react';
import { VoterExtractor } from './components/VoterExtractor';
import { LetterMapper } from './components/LetterMapper';
import { Header } from './components/Header';
import { AppState, VoterData, Rect, LayoutType } from './types';
import { generateAllSlips } from './services/pdfService';
import { FileText, UserCheck, Download, CheckCircle } from 'lucide-react';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    voterPdf: null,
    letterFile: null,
    voterCrops: [],
    mappingRect: null,
    isGenerating: false,
    layout: 'single'
  });

  const [step, setStep] = useState<number>(1);

  const handleVoterPdfUpload = (file: File) => setState(prev => ({ ...prev, voterPdf: file }));
  const handleLetterFileUpload = (file: File) => setState(prev => ({ ...prev, letterFile: file }));
  const onVotersExtracted = (crops: VoterData[]) => {
    setState(prev => ({ ...prev, voterCrops: crops }));
    setStep(2);
  };
  const onMappingSelected = (rect: Rect) => setState(prev => ({ ...prev, mappingRect: rect }));

  const handleGenerate = async (layout: LayoutType) => {
    if (!state.letterFile || state.voterCrops.length === 0 || !state.mappingRect) return;
    setState(prev => ({ ...prev, isGenerating: true, layout }));
    try {
      await generateAllSlips(state.letterFile, state.voterCrops, state.mappingRect, layout);
      setStep(3);
    } catch (error) {
      alert("স্লিপ তৈরিতে সমস্যা হয়েছে।");
    } finally {
      setState(prev => ({ ...prev, isGenerating: false }));
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto mb-10">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -z-10 -translate-y-1/2"></div>
            <div className={`absolute top-1/2 left-0 h-1 bg-blue-600 -z-10 -translate-y-1/2 transition-all duration-700`} style={{ width: `${((step - 1) / 2) * 100}%` }}></div>
            {[ { id: 1, icon: FileText, label: 'ভোটার লিস্ট' }, { id: 2, icon: UserCheck, label: 'চিঠির ফরমেট' }, { id: 3, icon: Download, label: 'ডাউনলোড' } ].map((s) => (
              <div key={s.id} className="flex flex-col items-center">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all ${step >= s.id ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-110' : 'bg-white border-gray-300 text-gray-400'}`}>
                  <s.icon size={24} />
                </div>
                <span className={`mt-3 text-sm font-bold ${step >= s.id ? 'text-blue-700' : 'text-gray-400'}`}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-[2rem] shadow-xl p-8 min-h-[600px] border border-gray-100">
          {step === 1 && <VoterExtractor pdfFile={state.voterPdf} onUpload={handleVoterPdfUpload} onExtracted={onVotersExtracted} />}
          {step === 2 && <LetterMapper letterFile={state.letterFile} voterCount={state.voterCrops.length} onUpload={handleLetterFileUpload} onMappingSelect={onMappingSelected} onGenerate={handleGenerate} isGenerating={state.isGenerating} onBack={() => setStep(1)} />}
          {step === 3 && (
            <div className="flex flex-col items-center justify-center h-[500px] text-center">
               <div className="bg-green-50 p-8 rounded-[2rem] text-green-600 mb-8"><CheckCircle size={80} className="animate-bounce" /></div>
               <h2 className="text-3xl font-bold text-gray-800 mb-3">সফলভাবে তৈরি হয়েছে!</h2>
               <p className="text-lg text-gray-500 mb-10 max-w-md">আপনার মোট {state.voterCrops.length}টি স্লিপ {state.layout === 'grid4' ? 'A4 গ্রিড' : 'সিঙ্গেল পেজ'} লেআউটে ডাউনলোড হয়েছে।</p>
               <button onClick={() => window.location.reload()} className="px-8 py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-black transition-all shadow-xl">নতুন প্রজেক্ট শুরু করুন</button>
            </div>
          )}
        </div>
      </main>
      <footer className="bg-white border-t py-6 text-center text-gray-400 text-sm font-medium">
        Develop By: <a href="https://www.facebook.com/m.rony21" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Nazmul Islam Rony</a>
      </footer>
    </div>
  );
};

export default App;
