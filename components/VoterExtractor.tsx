
import React, { useState, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { 
  Upload, Scissors, Loader2, Save, Trash2, ZoomIn, ZoomOut,
  Download as DownloadIcon, Import as ImportIcon
} from 'lucide-react';
import { VoterData, Rect } from '../types';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';

const DEFAULT_VOTER_CONFIG = {
  unitRects: [
    { "x": 66.45161290322578, "y": 112.79569810436614, "width": 235.80645161290315, "height": 79.67741935483869 },
    { "x": 303.97849790511583, "y": 113.44085939468873, "width": 235.16129032258058, "height": 79.3548387096774 },
    { "x": 539.8924796811995, "y": 113.44085939468873, "width": 235.80645161290315, "height": 79.0322580645161 },
    { "x": 66.77419354838707, "y": 194.30107855027717, "width": 234.83870967741927, "height": 79.0322580645161 },
    { "x": 304.19354838709666, "y": 194.62365919543845, "width": 234.516129032258, "height": 79.0322580645161 },
    { "x": 540.537640971522, "y": 194.62365919543845, "width": 234.83870967741927, "height": 78.38709677419352 },
    { "x": 66.8817187893775, "y": 275.16129032258056, "width": 235.16129032258058, "height": 79.3548387096774 },
    { "x": 303.8709677419354, "y": 275.48387096774184, "width": 234.83870967741927, "height": 79.0322580645161 },
    { "x": 540.537640971522, "y": 275.48387096774184, "width": 235.16129032258058, "height": 79.0322580645161 },
    { "x": 66.5591381442162, "y": 356.021511939264, "width": 235.48387096774186, "height": 79.3548387096774 },
    { "x": 304.19354838709666, "y": 356.3440925844253, "width": 234.516129032258, "height": 79.67741935483869 },
    { "x": 540.3225806451611, "y": 356.6666732295866, "width": 234.83870967741927, "height": 78.70967741935482 },
    { "x": 66.77419354838707, "y": 437.7419354838708, "width": 234.83870967741927, "height": 78.70967741935482 },
    { "x": 304.19354838709666, "y": 437.09677419354824, "width": 234.516129032258, "height": 79.67741935483869 },
    { "x": 540.537640971522, "y": 437.09677419354824, "width": 235.16129032258058, "height": 79.99999999999997 }
  ],
  savedZoom: 1.1000000000000003
};

interface Props {
  pdfFile: File | null;
  onUpload: (file: File) => void;
  onExtracted: (crops: VoterData[]) => void;
}

export const VoterExtractor: React.FC<Props> = ({ pdfFile, onUpload, onExtracted }) => {
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [unitRects, setUnitRects] = useState<Rect[]>([]); 
  const [drawingRect, setDrawingRect] = useState<Rect | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1.1);
  const [status, setStatus] = useState('');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfRef = useRef<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem('voter_setup_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.unitRects) {
          setUnitRects(parsed.unitRects);
          setZoom(parsed.savedZoom || 1.1);
        } else {
          setUnitRects(DEFAULT_VOTER_CONFIG.unitRects);
          setZoom(DEFAULT_VOTER_CONFIG.savedZoom);
        }
      } catch (e) {
        setUnitRects(DEFAULT_VOTER_CONFIG.unitRects);
        setZoom(DEFAULT_VOTER_CONFIG.savedZoom);
      }
    } else {
      setUnitRects(DEFAULT_VOTER_CONFIG.unitRects);
      setZoom(DEFAULT_VOTER_CONFIG.savedZoom);
    }
  }, []);

  useEffect(() => { if (pdfFile) loadPdf(); }, [pdfFile]);

  const saveToLocal = (currentUnitRects: Rect[], currentZoom: number) => {
    localStorage.setItem('voter_setup_v3', JSON.stringify({ 
      unitRects: currentUnitRects, 
      savedZoom: currentZoom 
    }));
  };

  const handleExport = () => {
    const voter = localStorage.getItem('voter_setup_v3');
    const letter = localStorage.getItem('letter_mapping_v2');
    const config = { voter: voter ? JSON.parse(voter) : null, letter: letter ? JSON.parse(letter) : null };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Voter_Setup_Master.json`;
    a.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const config = JSON.parse(ev.target?.result as string);
        if (config.voter) {
          localStorage.setItem('voter_setup_v3', JSON.stringify(config.voter));
          setUnitRects(config.voter.unitRects || []);
          setZoom(config.voter.savedZoom || 1.1);
        }
        if (config.letter) {
          localStorage.setItem('letter_mapping_v2', JSON.stringify(config.letter));
        }
        alert('সেটিংস ইমপোর্ট সফল হয়েছে!');
        window.location.reload();
      } catch (err) { alert('ভুল ফাইল ফরম্যাট।'); }
    };
    reader.readAsText(file);
  };

  const loadPdf = async () => {
    setLoading(true);
    try {
      const buffer = await pdfFile!.arrayBuffer();
      pdfRef.current = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
      setTotalPages(pdfRef.current.numPages);
      await renderPage(3, zoom);
    } catch (err) { setLoading(false); }
  };

  const renderPage = async (num: number, z: number) => {
    if (!pdfRef.current || !canvasRef.current) return;
    setLoading(true);
    const page = await pdfRef.current.getPage(num);
    const vp = page.getViewport({ scale: z });
    const canvas = canvasRef.current;
    canvas.width = vp.width; canvas.height = vp.height;
    await page.render({ canvasContext: canvas.getContext('2d')!, viewport: vp }).promise;
    setLoading(false);
  };

  const handleZoom = (delta: number) => {
    const newZoom = Math.min(4, Math.max(0.5, zoom + delta));
    setZoom(newZoom);
    renderPage(3, newZoom);
    saveToLocal(unitRects, newZoom);
  };

  const autoDetect = (rows: number) => {
    const baseW = 595 * 1.33; 
    const baseH = 842 * 1.33;
    const startY = rows === 6 ? baseH * 0.05 : baseH * 0.17;
    const gridW = baseW * 0.92;
    const gridH = baseH * (rows === 6 ? 0.91 : 0.79);
    const hGap = 12;
    const vGap = 10;
    const cellW = (gridW - (2 * hGap)) / 3;
    const cellH = (gridH - ((rows - 1) * vGap)) / rows;
    const detected: Rect[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < 3; c++) {
        detected.push({
          x: (baseW * 0.04) + (c * (cellW + hGap)),
          y: startY + (r * (cellH + vGap)),
          width: cellW,
          height: cellH
        });
      }
    }
    setUnitRects(detected);
    saveToLocal(detected, zoom);
  };

  const processAll = async () => {
    if (unitRects.length === 0) return;
    setLoading(true);
    const crops: VoterData[] = [];
    // Set to 4.0 (288 DPI) for excellent clarity while maintaining reasonable speed
    const exZoom = 4.0; 
    for (let p = 3; p <= totalPages; p++) {
      setStatus(`পাতা ${p} প্রসেস হচ্ছে... (Sharp Mode)`);
      
      await new Promise(resolve => setTimeout(resolve, 1));

      const page = await pdfRef.current.getPage(p);
      const vp = page.getViewport({ scale: exZoom });
      const can = document.createElement('canvas');
      can.width = vp.width; can.height = vp.height;
      const ctx = can.getContext('2d', { willReadFrequently: true })!;
      
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      let activeRects = unitRects.map(r => ({
        x: r.x * exZoom,
        y: r.y * exZoom,
        width: r.width * exZoom,
        height: r.height * exZoom
      }));
      
      if (p >= 4 && unitRects.length === 15) {
        const vDiff = activeRects[3].y - activeRects[0].y;
        activeRects = [...activeRects.slice(0, 3).map(r => ({ ...r, y: r.y - vDiff })), ...activeRects];
      }

      for (let i = 0; i < activeRects.length; i++) {
        const r = activeRects[i];
        if (r.y < 0 || r.y + r.height > can.height) continue;
        
        const data = ctx.getImageData(r.x + (5 * exZoom), r.y + (5 * exZoom), r.width - (10 * exZoom), r.height - (10 * exZoom)).data;
        let dark = 0;
        for (let j = 0; j < data.length; j += 4) {
          if ((data[j] + data[j + 1] + data[j + 2]) / 3 < 200) dark++;
        }
        
        if (dark > (r.width * r.height) * 0.005) {
          const cCan = document.createElement('canvas');
          cCan.width = r.width; cCan.height = r.height;
          const cCtx = cCan.getContext('2d')!;
          
          // Enhancement Filter: Increase contrast and brightness slightly for sharp text
          cCtx.filter = 'contrast(1.1) brightness(1.05)';
          cCtx.imageSmoothingEnabled = true;
          cCtx.imageSmoothingQuality = 'high';
          
          cCtx.fillStyle = '#ffffff';
          cCtx.fillRect(0, 0, r.width, r.height);
          cCtx.drawImage(can, r.x, r.y, r.width, r.height, 0, 0, r.width, r.height);
          
          // Use JPEG 95% for virtually artifact-free text extraction
          crops.push({ id: `v-${p}-${i}`, imageBlob: cCan.toDataURL('image/jpeg', 0.95), pageNumber: p });
        }
      }
    }
    setLoading(false);
    onExtracted(crops);
  };

  if (!pdfFile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] border-4 border-dashed border-blue-100 rounded-[3rem] bg-white hover:bg-blue-50/50 transition-all cursor-pointer group relative">
        <label className="cursor-pointer p-20 flex flex-col items-center text-center w-full">
          <div className="w-32 h-32 bg-blue-600 text-white rounded-[2.5rem] flex items-center justify-center shadow-2xl mb-10 group-hover:scale-110 transition-transform"><Upload size={56} /></div>
          <h2 className="text-4xl font-black text-gray-800 mb-4 tracking-tight">ভোটার লিস্ট আপলোড দিন</h2>
          <p className="text-gray-500 font-medium text-lg">পিডিএফ ফাইলটি এখানে ড্র্যাগ করুন অথবা ক্লিক করুন</p>
          <input type="file" accept=".pdf" className="hidden" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
        </label>
        <div className="flex gap-4 mt-8 pb-10">
            <button onClick={handleExport} className="flex items-center gap-2 px-6 py-3 bg-white text-gray-700 rounded-2xl font-black text-sm shadow-md border border-gray-100 hover:bg-gray-50 transition-all"><DownloadIcon size={18} className="text-blue-600" /> সেটিং এক্সপোর্ট</button>
            <label className="flex items-center gap-2 px-6 py-3 bg-white text-gray-700 rounded-2xl font-black text-sm shadow-md border border-gray-100 hover:bg-gray-50 transition-all cursor-pointer"><ImportIcon size={18} className="text-purple-600" /> সেটিং ইমপোর্ট<input type="file" accept=".json" className="hidden" onChange={handleImport} /></label>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row gap-6">
        <div className="flex-1 bg-gray-50 p-6 rounded-[2.5rem] border-2">
          <div className="flex justify-between items-center mb-6">
            <div className="flex gap-2">
              <button onClick={() => handleZoom(0.2)} className="p-2 bg-white border rounded-xl shadow-sm hover:bg-blue-50"><ZoomIn size={20}/></button>
              <button onClick={() => handleZoom(-0.2)} className="p-2 bg-white border rounded-xl shadow-sm hover:bg-blue-50"><ZoomOut size={20}/></button>
              <button onClick={() => autoDetect(5)} className="px-4 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-blue-700">১৫ স্লট</button>
              <button onClick={() => autoDetect(6)} className="px-4 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-blue-700">১৮ স্লট</button>
            </div>
            <div className="flex gap-2">
              <button onClick={handleExport} className="p-2 bg-white border text-blue-600 rounded-xl shadow-sm hover:bg-blue-50"><DownloadIcon size={20}/></button>
              <label className="p-2 bg-white border text-purple-600 rounded-xl shadow-sm cursor-pointer hover:bg-blue-50"><ImportIcon size={20}/><input type="file" accept=".json" className="hidden" onChange={handleImport}/></label>
              <button onClick={() => { setUnitRects([]); localStorage.removeItem('voter_setup_v3'); }} className="p-2 bg-white border text-red-500 rounded-xl shadow-sm hover:bg-red-50"><Trash2 size={20}/></button>
            </div>
          </div>
          <div className="relative bg-white border-2 rounded-2xl overflow-auto max-h-[600px] custom-scrollbar">
            {loading && <div className="absolute inset-0 bg-white/80 z-50 flex flex-col items-center justify-center backdrop-blur-sm"><Loader2 className="animate-spin text-blue-600 mb-2"/><span className="text-xs font-black text-gray-500">{status || 'অপেক্ষা করুন...'}</span></div>}
            <div className="relative inline-block">
              <canvas ref={canvasRef} onMouseDown={(e) => {
                const r = canvasRef.current!.getBoundingClientRect();
                setStartPos({ x: e.clientX - r.left, y: e.clientY - r.top });
                setIsDrawing(true);
              }} onMouseMove={(e) => {
                if (!isDrawing) return;
                const r = canvasRef.current!.getBoundingClientRect();
                const curX = e.clientX - r.left;
                const curY = e.clientY - r.top;
                setDrawingRect({
                  x: Math.min(startPos.x, curX),
                  y: Math.min(startPos.y, curY),
                  width: Math.abs(curX - startPos.x),
                  height: Math.abs(curY - startPos.y)
                });
              }} onMouseUp={() => {
                if (isDrawing && drawingRect && drawingRect.width > 5) {
                  const unitRect = {
                    x: drawingRect.x / zoom,
                    y: drawingRect.y / zoom,
                    width: drawingRect.width / zoom,
                    height: drawingRect.height / zoom
                  };
                  const next = [...unitRects, unitRect];
                  setUnitRects(next);
                  saveToLocal(next, zoom);
                }
                setIsDrawing(false);
                setDrawingRect(null);
              }} className="block cursor-crosshair" />
              {unitRects.map((ur, i) => {
                const r = {
                  x: ur.x * zoom,
                  y: ur.y * zoom,
                  width: ur.width * zoom,
                  height: ur.height * zoom
                };
                return (
                  <div key={i} className="absolute border-2 border-blue-600 bg-blue-600/10 group" style={{ left: r.x, top: r.y, width: r.width, height: r.height }}>
                    <span className="absolute -top-2 -left-2 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-md font-bold shadow-sm">{i + 1}</span>
                    <button onClick={() => { 
                      const n = unitRects.filter((_, idx) => idx !== i); 
                      setUnitRects(n); 
                      saveToLocal(n, zoom); 
                    }} className="opacity-0 group-hover:opacity-100 absolute top-1 right-1 bg-red-500 text-white p-0.5 rounded-full shadow-md"><Trash2 size={10}/></button>
                  </div>
                );
              })}
              {drawingRect && <div className="absolute border-2 border-dashed border-blue-400 bg-blue-400/5 pointer-events-none" style={{ left: drawingRect.x, top: drawingRect.y, width: drawingRect.width, height: drawingRect.height }} />}
            </div>
          </div>
        </div>
        <div className="w-full xl:w-72">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border h-full flex flex-col">
             <div className="mb-8 p-6 bg-blue-50 rounded-2xl text-center"><span className="text-xs font-black text-blue-400 uppercase block tracking-widest mb-1">মোট পাতা</span><span className="text-4xl font-black text-blue-800 leading-none">{totalPages}</span></div>
             <button onClick={processAll} disabled={unitRects.length === 0 || loading} className="w-full py-6 bg-blue-600 hover:bg-blue-700 text-white rounded-[2rem] font-black shadow-xl transition-all disabled:bg-gray-200 disabled:shadow-none">কাটিং শুরু করুন</button>
             <div className="mt-4 text-[10px] text-gray-400 text-center font-bold">জুম লেভেল: {Math.round(zoom * 100)}%</div>
          </div>
        </div>
      </div>
    </div>
  );
};
