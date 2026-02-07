
import React, { useState, useRef, useEffect } from 'react';
import { Upload, ArrowLeft, Loader2, Image as ImageIcon, LayoutGrid, FileText } from 'lucide-react';
import { Rect, LayoutType } from '../types.ts';

const DEFAULT_LETTER_MAPPING = {
  x: 14,
  y: 363,
  width: 328,
  height: 150
};

interface Props {
  letterFile: File | null;
  voterCount: number;
  onUpload: (file: File) => void;
  onMappingSelect: (rect: Rect) => void;
  onGenerate: (layout: LayoutType) => void;
  isGenerating: boolean;
  onBack: () => void;
}

export const LetterMapper: React.FC<Props> = ({ 
  letterFile, voterCount, onUpload, onMappingSelect, onGenerate, isGenerating, onBack
}) => {
  const [unitSelection, setUnitSelection] = useState<Rect | null>(null); 
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [layout, setLayout] = useState<LayoutType>('single');
  const [imgScale, setImgScale] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => { if (letterFile) loadImage(); }, [letterFile]);

  const loadImage = () => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current!;
        const scale = img.width > 800 ? 800 / img.width : 1;
        setImgScale(scale);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const saved = localStorage.getItem('letter_mapping_v2');
        if (saved) {
          try {
            const ur = JSON.parse(saved);
            setUnitSelection(ur);
            onMappingSelect(ur);
          } catch(e) {
            setUnitSelection(DEFAULT_LETTER_MAPPING);
            onMappingSelect(DEFAULT_LETTER_MAPPING);
          }
        } else {
          setUnitSelection(DEFAULT_LETTER_MAPPING);
          onMappingSelect(DEFAULT_LETTER_MAPPING);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(letterFile!);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    setStartPos({ x: e.clientX - r.left, y: e.clientY - r.top });
    setIsSelecting(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting) return;
    const r = canvasRef.current!.getBoundingClientRect();
    const curX = e.clientX - r.left;
    const curY = e.clientY - r.top;
    const rect = {
      x: Math.min(startPos.x, curX),
      y: Math.min(startPos.y, curY),
      width: Math.abs(curX - startPos.x),
      height: Math.abs(curY - startPos.y)
    };
    setUnitSelection({
      x: rect.x / imgScale,
      y: rect.y / imgScale,
      width: rect.width / imgScale,
      height: rect.height / imgScale
    });
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
    if (unitSelection) {
      localStorage.setItem('letter_mapping_v2', JSON.stringify(unitSelection));
      onMappingSelect(unitSelection);
    }
  };

  if (!letterFile) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] border-2 border-dashed rounded-[2.5rem] bg-gray-50/50 relative">
        <button onClick={onBack} className="absolute top-8 left-8 text-gray-500 font-bold flex items-center gap-2 hover:text-gray-800 transition-colors"><ArrowLeft size={20}/> পিছনে</button>
        <label className="cursor-pointer flex flex-col items-center group">
          <div className="w-24 h-24 bg-purple-600 text-white rounded-[2rem] flex items-center justify-center shadow-xl mb-6 group-hover:scale-110 transition-transform"><ImageIcon size={44}/></div>
          <h2 className="text-3xl font-black text-gray-800 tracking-tight">চিঠির ফরমেট দিন</h2>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
        </label>
      </div>
    );
  }

  const displayRect = unitSelection ? {
    x: unitSelection.x * imgScale,
    y: unitSelection.y * imgScale,
    width: unitSelection.width * imgScale,
    height: unitSelection.height * imgScale
  } : null;

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <div className="flex-1 overflow-auto max-h-[700px] border-2 rounded-[2rem] bg-gray-200/20 p-8 flex justify-center items-start custom-scrollbar">
        <div className="relative inline-block shadow-2xl bg-white border-4 border-white">
          <canvas ref={canvasRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} className="block cursor-crosshair" />
          {displayRect && <div className="absolute border-4 border-blue-600 bg-blue-600/20 pointer-events-none" style={{ left: displayRect.x, top: displayRect.y, width: displayRect.width, height: displayRect.height }} />}
        </div>
      </div>
      <div className="w-full lg:w-80 space-y-6">
        <div className="bg-white border p-8 rounded-[2rem] shadow-xl">
          <h3 className="font-black text-xl mb-6 text-gray-800">লেআউট পছন্দ করুন</h3>
          <div className="grid grid-cols-2 gap-3 mb-8">
            <button onClick={() => setLayout('single')} className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center ${layout === 'single' ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-inner' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'}`}><FileText className="mb-2"/><span className="text-[10px] font-black uppercase">১ পেজ</span></button>
            <button onClick={() => setLayout('grid4')} className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center ${layout === 'grid4' ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-inner' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'}`}><LayoutGrid className="mb-2"/><span className="text-[10px] font-black uppercase">৪ গ্রিড</span></button>
          </div>
          <button disabled={!unitSelection || isGenerating} onClick={() => onGenerate(layout)} className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black shadow-xl transition-all disabled:bg-gray-100 disabled:text-gray-300">
            {isGenerating ? <Loader2 className="animate-spin mx-auto"/> : 'পিডিএফ তৈরি করুন'}
          </button>
          <button onClick={onBack} className="w-full mt-6 text-gray-400 font-bold text-sm hover:text-gray-600 transition-colors uppercase tracking-widest">পিছনে ফিরে যান</button>
        </div>
      </div>
    </div>
  );
};
