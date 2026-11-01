import { useState, useRef } from 'react';
import { ArrowLeft, Camera, Upload, RotateCw, ScanLine, FileText, CheckCircle, AlertCircle, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';

// ============================================================
// ScanPrescription Page
// ============================================================

type ScanTab = 'prescription' | 'packaging';
type ScanStep = 'capture' | 'scanning' | 'review';

interface ExtractedMedicine {
  name: string;
  dose: string;
  frequency: string;
  duration: string;
  instructions: string;
  confidence: number;
}

export default function ScanPrescription() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<ScanTab>('prescription');
  const [step, setStep] = useState<ScanStep>('capture');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [rawText, setRawText] = useState('');
  const [medicines, setMedicines] = useState<ExtractedMedicine[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);

  async function captureCamera() {
    try {
      const photo = await CapCamera.getPhoto({
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        quality: 90,
      });
      if (photo.webPath) {
        setImageUri(photo.webPath);
        setStep('scanning');
        await runOCR(photo.webPath);
      }
    } catch (e) {
      console.log('Camera cancelled');
    }
  }

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImageUri(url);
    setStep('scanning');
    if (file.type === 'application/pdf') {
      await scanPdf(file);
    } else {
      await runOCR(url);
    }
  }

  async function scanPdf(file: File) {
    try {
      setScanProgress(10);
      const { getDocument } = await import('pdfjs-dist');
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await getDocument({ data: arrayBuffer }).promise;
      setScanProgress(40);
      const page = await pdf.getPage(1);
      const content = await page.getTextContent();
      const text = content.items.map((item: any) => item.str).join(' ');
      setScanProgress(90);
      setRawText(text);
      parseMedicinesFromText(text);
      setScanProgress(100);
      setStep('review');
    } catch (e) {
      setScanError('Could not read PDF. Try a clearer image instead.');
      setStep('review');
    }
  }

  async function runOCR(uri: string) {
    try {
      setScanProgress(5);
      const Tesseract = await import('tesseract.js');
      setScanProgress(10);

      const result = await Tesseract.recognize(uri, 'eng', {
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            setScanProgress(Math.round(10 + m.progress * 80));
          }
        },
      });

      setScanProgress(95);
      const text = result.data.text;
      setRawText(text);
      parseMedicinesFromText(text);
      setScanProgress(100);
      setStep('review');
    } catch (e) {
      setScanError('OCR failed. Please try a clearer, well-lit photo.');
      setStep('review');
    }
  }

  function parseMedicinesFromText(text: string): void {
    // Regex-based heuristic medicine extraction
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const extracted: ExtractedMedicine[] = [];

    const dosePattern = /(\d+(?:\.\d+)?)\s*(mg|ml|mcg|g|tablet|cap|drops?)/i;
    const freqPattern = /(once|twice|three times|1|2|3|4)\s*(?:daily|a day|\/day|times?)/i;
    const durationPattern = /(\d+)\s*(day|week|month)s?/i;
    const instructPattern = /(after|before|with)\s*(food|meal|water|milk)/i;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Heuristic: medicine names are often Title Case, > 3 chars, on their own line
      if (line.length >= 3 && /^[A-Z][a-z]/.test(line) && !/^\d/.test(line)) {
        const doseMatch = (lines[i + 1] ?? lines[i]).match(dosePattern);
        const freqMatch = (lines[i + 1] ?? '').match(freqPattern) ?? line.match(freqPattern);
        const durMatch = (lines[i + 2] ?? lines[i + 1] ?? '').match(durationPattern);
        const instrMatch = text.match(instructPattern);

        if (line.length > 3 && line.length < 50) {
          extracted.push({
            name: line,
            dose: doseMatch ? `${doseMatch[1]} ${doseMatch[2]}` : '',
            frequency: freqMatch ? freqMatch[0] : '',
            duration: durMatch ? durMatch[0] : '',
            instructions: instrMatch ? instrMatch[0] : '',
            confidence: doseMatch ? 0.7 : 0.3,
          });
        }
      }
    }

    setMedicines(extracted.length > 0 ? extracted : []);
  }

  function reset() {
    setStep('capture');
    setImageUri(null);
    setRawText('');
    setMedicines([]);
    setScanError(null);
    setScanProgress(0);
  }

  return (
    <div className="flex flex-col h-full bg-primary-50 dark:bg-primary-950">
      {/* Header */}
      <div className="bg-white dark:bg-primary-900 px-4 pt-12 pb-0 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="tap-target p-1">
            <ArrowLeft size={22} className="text-gray-600 dark:text-gray-300" />
          </button>
          <h1 className="text-xl font-black text-gray-900 dark:text-white">Scan</h1>
        </div>
        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-primary-800">
          {(['prescription', 'packaging'] as ScanTab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); reset(); }}
              className={`flex-1 py-3 text-sm font-bold capitalize tap-target border-b-2 transition-colors ${
                tab === t
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-400 dark:text-gray-500'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        {step === 'capture' && (
          <CaptureStep onCamera={captureCamera} onUpload={() => fileRef.current?.click()} tab={tab} />
        )}
        {step === 'scanning' && (
          <ScanningStep progress={scanProgress} imageUri={imageUri} />
        )}
        {step === 'review' && (
          <ReviewStep
            imageUri={imageUri}
            rawText={rawText}
            medicines={medicines}
            setMedicines={setMedicines}
            error={scanError}
            onReset={reset}
            onAddMedicine={(med) => navigate('/add-medicine', { state: { prefill: med } })}
            tab={tab}
          />
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={uploadFile}
        className="hidden"
      />
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────

function CaptureStep({ onCamera, onUpload, tab }: { onCamera: () => void; onUpload: () => void; tab: ScanTab }) {
  return (
    <div className="flex flex-col items-center gap-5 py-8">
      <div className="w-24 h-24 bg-primary-100 dark:bg-primary-800 rounded-full flex items-center justify-center">
        <ScanLine size={40} className="text-primary-500" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-black text-gray-900 dark:text-white mb-1">
          {tab === 'prescription' ? 'Scan Prescription' : 'Scan Medicine Pack'}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
          {tab === 'prescription'
            ? 'Take a clear photo of the prescription or upload an image/PDF. Text will be extracted on-device.'
            : 'Photograph the medicine box, strip, or label to extract name, strength, and expiry date.'}
        </p>
      </div>

      <button
        onClick={onCamera}
        className="w-full max-w-xs bg-primary-600 text-white py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 tap-target"
      >
        <Camera size={20} /> Take Photo
      </button>
      <button
        onClick={onUpload}
        className="w-full max-w-xs bg-white dark:bg-primary-900 border border-primary-200 dark:border-primary-700 text-primary-600 dark:text-primary-400 py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 tap-target"
      >
        <Upload size={20} /> Upload Image / PDF
      </button>

      {/* Privacy notice */}
      <div className="w-full max-w-xs bg-mint-50 dark:bg-mint-900/20 border border-mint-200 dark:border-mint-800 rounded-xl p-3">
        <p className="text-xs text-mint-700 dark:text-mint-400 font-semibold">
          🔒 All scanning happens on your device. Prescription data is never sent to any server.
        </p>
      </div>
      {tab === 'prescription' && (
        <div className="w-full max-w-xs bg-snooze-50 dark:bg-snooze-900/20 border border-snooze-200 dark:border-snooze-800 rounded-xl p-3">
          <p className="text-xs text-snooze-700 dark:text-snooze-400 font-semibold">
            ⚠️ Handwritten prescriptions may not be recognised accurately. Always verify extracted information before saving.
          </p>
        </div>
      )}
    </div>
  );
}

function ScanningStep({ progress, imageUri }: { progress: number; imageUri: string | null }) {
  return (
    <div className="flex flex-col items-center gap-6 py-8">
      {imageUri && (
        <img
          src={imageUri}
          alt="Scanning"
          className="w-48 h-48 object-cover rounded-2xl shadow-md opacity-60"
        />
      )}
      <ScanLine size={40} className="text-primary-500 animate-pulse" />
      <div className="w-full max-w-xs">
        <div className="flex justify-between mb-1">
          <span className="text-sm text-gray-600 dark:text-gray-400 font-semibold">Reading text...</span>
          <span className="text-sm text-primary-600 font-bold">{progress}%</span>
        </div>
        <div className="h-3 bg-gray-100 dark:bg-primary-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <p className="text-xs text-gray-400 text-center">
        Processing entirely on your device. This may take up to 30 seconds.
      </p>
    </div>
  );
}

function ReviewStep({
  imageUri,
  rawText,
  medicines,
  setMedicines,
  error,
  onReset,
  onAddMedicine,
  tab,
}: {
  imageUri: string | null;
  rawText: string;
  medicines: ExtractedMedicine[];
  setMedicines: (m: ExtractedMedicine[]) => void;
  error: string | null;
  onReset: () => void;
  onAddMedicine: (med: ExtractedMedicine) => void;
  tab: ScanTab;
}) {
  const [showRaw, setShowRaw] = useState(false);

  return (
    <div className="space-y-4">
      {imageUri && (
        <img src={imageUri} alt="Scanned" className="w-full h-40 object-cover rounded-2xl shadow" />
      )}

      {error && (
        <div className="bg-alarm-50 dark:bg-alarm-900/30 border border-alarm-200 dark:border-alarm-800 rounded-xl p-3 flex gap-2">
          <AlertCircle size={18} className="text-alarm-500 shrink-0 mt-0.5" />
          <p className="text-sm text-alarm-700 dark:text-alarm-400">{error}</p>
        </div>
      )}

      {medicines.length > 0 && (
        <div>
          <h3 className="font-extrabold text-gray-900 dark:text-white text-base mb-3">
            Detected Medicines
          </h3>
          <div className="space-y-3">
            {medicines.map((med, i) => (
              <div key={i} className="bg-white dark:bg-primary-900 rounded-2xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <input
                        className="font-bold text-gray-900 dark:text-white text-sm bg-transparent border-b border-gray-200 dark:border-primary-700 outline-none flex-1"
                        value={med.name}
                        onChange={(e) => {
                          const updated = [...medicines];
                          updated[i] = { ...med, name: e.target.value };
                          setMedicines(updated);
                        }}
                      />
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        med.confidence > 0.5
                          ? 'bg-mint-100 text-mint-700'
                          : 'bg-snooze-100 text-snooze-700'
                      }`}>
                        {med.confidence > 0.5 ? 'Confident' : 'Uncertain'}
                      </span>
                    </div>
                    {med.dose && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Dose: {med.dose}</p>}
                    {med.frequency && <p className="text-xs text-gray-500 dark:text-gray-400">Frequency: {med.frequency}</p>}
                    {med.duration && <p className="text-xs text-gray-500 dark:text-gray-400">Duration: {med.duration}</p>}
                    {med.instructions && <p className="text-xs text-primary-600 dark:text-primary-400">Instructions: {med.instructions}</p>}
                  </div>
                </div>
                <button
                  onClick={() => onAddMedicine(med)}
                  className="mt-3 w-full flex items-center justify-center gap-2 bg-primary-600 text-white py-2.5 rounded-xl text-sm font-bold tap-target"
                >
                  <CheckCircle size={15} /> Add to Medicines
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {medicines.length === 0 && !error && (
        <div className="bg-snooze-50 dark:bg-snooze-900/20 border border-snooze-200 dark:border-snooze-800 rounded-xl p-4 text-center">
          <p className="text-sm text-snooze-700 dark:text-snooze-400 font-semibold">
            No medicines could be automatically detected. Please enter medicine details manually.
          </p>
          <button
            onClick={() => onAddMedicine({ name: '', dose: '', frequency: '', duration: '', instructions: '', confidence: 0 })}
            className="mt-3 bg-primary-600 text-white px-5 py-2 rounded-xl text-sm font-bold tap-target"
          >
            Add Manually
          </button>
        </div>
      )}

      {/* Raw text toggle */}
      {rawText && (
        <div>
          <button
            onClick={() => setShowRaw((v) => !v)}
            className="text-xs text-primary-600 dark:text-primary-400 font-semibold tap-target flex items-center gap-1"
          >
            <FileText size={12} />
            {showRaw ? 'Hide' : 'Show'} extracted text
          </button>
          {showRaw && (
            <pre className="mt-2 text-xs bg-gray-50 dark:bg-primary-900 p-3 rounded-xl text-gray-700 dark:text-gray-300 overflow-x-auto whitespace-pre-wrap">
              {rawText}
            </pre>
          )}
        </div>
      )}

      <button
        onClick={onReset}
        className="w-full border border-gray-200 dark:border-primary-700 text-gray-600 dark:text-gray-400 py-3 rounded-2xl font-bold text-sm tap-target"
      >
        Scan Another
      </button>

      <div className="h-4" />
    </div>
  );
}
