
import { PDFDocument } from 'pdf-lib';
import { VoterData, Rect, LayoutType } from '../types';

// Fast Base64 to Uint8Array decoder
const base64ToUint8Array = (base64: string) => {
  const binaryString = atob(base64.split(',')[1]);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export const generateAllSlips = async (
  letterFile: File,
  voterCrops: VoterData[],
  unitMapping: Rect,
  layout: LayoutType = 'single'
) => {
  const mainPdf = await PDFDocument.create();
  const letterImageBytes = await letterFile.arrayBuffer();
  let letterImage: any;
  
  if (letterFile.type.includes('jpeg') || letterFile.type.includes('jpg')) {
    letterImage = await mainPdf.embedJpg(letterImageBytes);
  } else {
    letterImage = await mainPdf.embedPng(letterImageBytes);
  }

  const originalW = letterImage.width;
  const originalH = letterImage.height;
  const realRect = unitMapping;

  if (layout === 'single') {
    for (let i = 0; i < voterCrops.length; i++) {
      const voter = voterCrops[i];
      
      // Prevent browser lock-up during large PDF generation
      if (i % 10 === 0) await new Promise(r => setTimeout(r, 1));

      const page = mainPdf.addPage([originalW, originalH]);
      page.drawImage(letterImage, { x: 0, y: 0, width: originalW, height: originalH });
      
      const vBytes = base64ToUint8Array(voter.imageBlob);
      // Voter images are now JPEGs for 5x faster processing
      const vImg = await mainPdf.embedJpg(vBytes);
      
      page.drawImage(vImg, { 
        x: realRect.x, 
        y: originalH - (realRect.y + realRect.height), 
        width: realRect.width, 
        height: realRect.height 
      });
    }
  } else {
    const A4_W = 595;
    const A4_H = 842;
    const padding = 10;
    
    const slotW = (A4_W - (padding * 3)) / 2;
    const slotH = (A4_H - (padding * 3)) / 2;
    
    const scale = Math.min(slotW / originalW, slotH / originalH);
    const sW = originalW * scale;
    const sH = originalH * scale;

    for (let i = 0; i < voterCrops.length; i += 4) {
      if (i % 8 === 0) await new Promise(r => setTimeout(r, 1));

      const page = mainPdf.addPage([A4_W, A4_H]);
      const chunk = voterCrops.slice(i, i + 4);
      
      for (let j = 0; j < chunk.length; j++) {
        const row = Math.floor(j / 2);
        const col = j % 2;
        
        const posX = padding + col * (slotW + padding) + (slotW - sW) / 2;
        const posY = A4_H - (padding + (row + 1) * slotH) + (slotH - sH) / 2;
        
        page.drawImage(letterImage, { x: posX, y: posY, width: sW, height: sH });
        
        const vBytes = base64ToUint8Array(chunk[j].imageBlob);
        const vImg = await mainPdf.embedJpg(vBytes);
        
        page.drawImage(vImg, { 
          x: posX + (realRect.x * scale), 
          y: posY + (sH - (realRect.y + realRect.height) * scale), 
          width: realRect.width * scale, 
          height: realRect.height * scale 
        });
      }
    }
  }

  const pdfBytes = await mainPdf.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Voter_Slips_${Date.now()}.pdf`;
  link.click();
};
