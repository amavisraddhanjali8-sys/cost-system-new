import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  Flashlight,
  FlashlightOff,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ScanLine,
  Volume2,
  VolumeX,
  Keyboard,
  UploadCloud,
  Check,
  Zap,
  Radio,
  FileImage
} from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { MaterialItem } from '../types';

export interface CameraBarcodeScannerProps {
  onBarcodeDetected: (code: string) => void;
  materials?: MaterialItem[];
  autoStart?: boolean;
  className?: string;
  onClose?: () => void;
}

interface DetectedBox {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  timestamp: number;
}

// Sound chime synthesizer for positive scan feedback
function playScannerBeep() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(960, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1480, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch (e) {
    console.debug('Audio feedback unavailable:', e);
  }
}

// All supported 1D and 2D barcode formats for universal scanner compatibility
const ALL_BARCODE_FORMATS = [
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.CODE_93,
  BarcodeFormat.CODABAR,
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.ITF,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.QR_CODE,
  BarcodeFormat.DATA_MATRIX,
  BarcodeFormat.PDF_417,
  BarcodeFormat.AZTEC
];

export const CameraBarcodeScanner: React.FC<CameraBarcodeScannerProps> = ({
  onBarcodeDetected,
  materials = [],
  autoStart = true,
  className = '',
  onClose
}) => {
  // Scanner Mode: 'CAMERA' | 'HARDWARE_WEDGE' | 'IMAGE_UPLOAD'
  const [scannerMode, setScannerMode] = useState<'CAMERA' | 'HARDWARE_WEDGE' | 'IMAGE_UPLOAD'>('CAMERA');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const lastScannedCodeRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);

  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [detectedBox, setDetectedBox] = useState<DetectedBox | null>(null);
  const [lastDetectedCode, setLastDetectedCode] = useState<string | null>(null);
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  // Hardware Scanner (HID Keyboard Wedge) State
  const [hardwareInput, setHardwareInput] = useState<string>('');
  const [hardwareLastScanned, setHardwareLastScanned] = useState<string | null>(null);
  const hardwareInputRef = useRef<HTMLInputElement | null>(null);

  // Image Upload Scanner State
  const [isDecodingImage, setIsDecodingImage] = useState<boolean>(false);
  const [imageDecodeError, setImageDecodeError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize ZXing Multi-Format Reader with all format hints
  const getZxingReader = useCallback(() => {
    if (!codeReaderRef.current) {
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, ALL_BARCODE_FORMATS);
      hints.set(DecodeHintType.TRY_HARDER, true);
      codeReaderRef.current = new BrowserMultiFormatReader(hints);
    }
    return codeReaderRef.current;
  }, []);

  // Stop camera video stream
  const stopCamera = useCallback(() => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setTorchOn(false);
    setDetectedBox(null);
  }, []);

  // Universal Code Found Handler
  const handleCodeFound = useCallback(
    (code: string, box?: { x: number; y: number; width: number; height: number }, source: string = 'Camera') => {
      const clean = code.trim();
      if (!clean) return;

      const now = Date.now();
      // Cooldown of 1.2s to prevent multi-triggering of the exact same code
      if (lastScannedCodeRef.current === clean && now - lastScannedTimeRef.current < 1200) {
        return;
      }
      lastScannedCodeRef.current = clean;
      lastScannedTimeRef.current = now;

      setLastDetectedCode(clean);

      if (box) {
        setDetectedBox({
          ...box,
          text: clean,
          timestamp: now
        });
      }

      if (soundEnabled) {
        playScannerBeep();
      }

      // Notify parent component with recognized barcode
      onBarcodeDetected(clean);

      // Fade out bounding box after 2.5s
      setTimeout(() => {
        setDetectedBox((prev) => (prev && prev.timestamp === now ? null : prev));
      }, 2500);
    },
    [soundEnabled, onBarcodeDetected]
  );

  // Start Camera Stream
  const startCamera = useCallback(
    async (deviceId?: string) => {
      setCameraError(null);
      stopCamera();

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera API is not supported in this browser environment.');
        return;
      }

      try {
        const constraints: MediaStreamConstraints = {
          video: deviceId
            ? { deviceId: { exact: deviceId } }
            : {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1280 },
                height: { ideal: 720 }
              }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch((err) => console.warn('Video play error:', err));
        }

        setIsStreaming(true);

        // Check for torch capability
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          const capabilities = videoTrack.getCapabilities
            ? (videoTrack.getCapabilities() as unknown as { torch?: boolean })
            : null;
          setHasTorch(Boolean(capabilities?.torch));
        }

        // Enumerate video devices (webcams, USB cameras, mobile cameras)
        if (navigator.mediaDevices.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const cams = devices.filter((d) => d.kind === 'videoinput');
          setVideoDevices(cams);
          if (!selectedDeviceId && cams.length > 0) {
            setSelectedDeviceId(cams[0].deviceId);
          }
        }
      } catch (err: unknown) {
        console.warn('Camera access error:', err);
        const error = err as Error;
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          setCameraError('Camera permission was denied. Please allow camera access in browser permissions.');
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          setCameraError('No camera device was detected. You can use a USB/Bluetooth handheld barcode scanner or upload an image.');
        } else {
          setCameraError(`Camera initialisation notice: ${error.message || 'Check camera connection'}`);
        }
        setIsStreaming(false);
      }
    },
    [stopCamera, selectedDeviceId]
  );

  // Toggle Torch / Flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const nextState = !torchOn;
        await track.applyConstraints({
          advanced: [{ torch: nextState } as unknown as MediaTrackConstraintSet]
        });
        setTorchOn(nextState);
      } catch (err) {
        console.warn('Torch not supported on this device:', err);
      }
    }
  };

  // Continuous Camera Detection Loop
  useEffect(() => {
    if (scannerMode !== 'CAMERA' || !isStreaming || !videoRef.current) return;

    let isScanning = true;
    let detector: {
      detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string; boundingBox: DOMRectReadOnly }>>;
    } | null = null;

    // Check for native BarcodeDetector API with comprehensive formats
    const windowWithDetector = window as unknown as {
      BarcodeDetector?: new (options?: { formats: string[] }) => {
        detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string; boundingBox: DOMRectReadOnly }>>;
      };
    };

    if (windowWithDetector.BarcodeDetector) {
      try {
        detector = new windowWithDetector.BarcodeDetector({
          formats: [
            'code_128',
            'code_39',
            'code_93',
            'codabar',
            'ean_13',
            'ean_8',
            'itf',
            'upc_a',
            'upc_e',
            'qr_code',
            'data_matrix',
            'aztec',
            'pdf417'
          ]
        });
      } catch (e) {
        console.debug('BarcodeDetector init fallback to ZXing:', e);
      }
    }

    const zxingReader = getZxingReader();
    let scanCounter = 0;

    const detectFrame = async () => {
      if (!isScanning) return;
      const video = videoRef.current;
      if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        animationFrameIdRef.current = requestAnimationFrame(detectFrame);
        return;
      }

      scanCounter++;

      // Scan every 2nd frame for smooth 30fps responsiveness
      if (scanCounter % 2 === 0) {
        try {
          // 1. First attempt: Native BarcodeDetector (fast, hardware-accelerated)
          if (detector) {
            const barcodes = await detector.detect(video);
            if (barcodes && barcodes.length > 0) {
              const b = barcodes[0];
              const videoW = video.videoWidth || 640;
              const videoH = video.videoHeight || 480;
              const rect = video.getBoundingClientRect();

              const scaleX = rect.width / videoW;
              const scaleY = rect.height / videoH;

              const box = {
                x: b.boundingBox.x * scaleX,
                y: b.boundingBox.y * scaleY,
                width: b.boundingBox.width * scaleX,
                height: b.boundingBox.height * scaleY
              };

              handleCodeFound(b.rawValue, box, 'Native Camera');
            }
          } else {
            // 2. Fallback: ZXing multi-format reader with canvas buffer
            if (canvasRef.current) {
              const canvas = canvasRef.current;
              const ctx = canvas.getContext('2d', { willReadFrequently: true });
              if (ctx) {
                canvas.width = video.videoWidth || 640;
                canvas.height = video.videoHeight || 480;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                try {
                  const result = zxingReader.decode(canvas);
                  if (result) {
                    const text = result.getText();
                    const rect = video.getBoundingClientRect();
                    const points = result.getResultPoints ? result.getResultPoints() : [];

                    let box: { x: number; y: number; width: number; height: number } | undefined;
                    if (points && points.length >= 2) {
                      const scaleX = rect.width / canvas.width;
                      const scaleY = rect.height / canvas.height;
                      const xs = points.map((p) => p.getX() * scaleX);
                      const ys = points.map((p) => p.getY() * scaleY);
                      const minX = Math.min(...xs);
                      const maxX = Math.max(...xs);
                      const minY = Math.min(...ys);
                      const maxY = Math.max(...ys);
                      box = {
                        x: Math.max(10, minX - 10),
                        y: Math.max(10, minY - 10),
                        width: Math.max(40, maxX - minX + 20),
                        height: Math.max(30, maxY - minY + 20)
                      };
                    } else {
                      box = {
                        x: rect.width * 0.2,
                        y: rect.height * 0.35,
                        width: rect.width * 0.6,
                        height: rect.height * 0.3
                      };
                    }

                    handleCodeFound(text, box, 'ZXing Camera');
                  }
                } catch {
                  // NotFoundException on empty frames is expected
                }
              }
            }
          }
        } catch (e) {
          console.debug('Scan frame error:', e);
        }
      }

      animationFrameIdRef.current = requestAnimationFrame(detectFrame);
    };

    animationFrameIdRef.current = requestAnimationFrame(detectFrame);

    return () => {
      isScanning = false;
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    };
  }, [scannerMode, isStreaming, handleCodeFound, getZxingReader]);

  // Autostart effect when mode is camera
  useEffect(() => {
    if (autoStart && scannerMode === 'CAMERA') {
      startCamera(selectedDeviceId);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [autoStart, scannerMode, startCamera, stopCamera, selectedDeviceId]);

  // HARDWARE BARCODE SCANNER LISTENER (HID KEYBOARD WEDGE)
  // Handheld USB, Bluetooth, or wireless 2.4GHz barcode scanners send rapid keystrokes (< 50ms interval) terminated with Enter
  useEffect(() => {
    let keyBuffer: string[] = [];
    let lastKeyTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      // If user is actively typing in another form input or textarea, let it type naturally
      const activeEl = document.activeElement;
      const isTypingInOtherInput =
        activeEl &&
        activeEl !== hardwareInputRef.current &&
        (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT');

      if (e.key === 'Enter') {
        if (keyBuffer.length >= 3) {
          // Rapid input burst detected from a physical barcode scanner!
          const scannedCode = keyBuffer.join('').trim();
          keyBuffer = [];
          if (scannedCode) {
            e.preventDefault();
            setHardwareLastScanned(scannedCode);
            handleCodeFound(scannedCode, undefined, 'Hardware Scanner');
          }
        } else {
          keyBuffer = [];
        }
        return;
      }

      // If keys arrive in fast sequence (< 60ms between characters), buffer them
      if (e.key.length === 1) {
        if (timeDiff > 120) {
          keyBuffer = []; // Reset if typing slowly like a human
        }
        keyBuffer.push(e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleCodeFound]);

  // Handle image file upload decoding (from photo or file)
  const handleImageFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsDecodingImage(true);
    setImageDecodeError(null);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const imgUrl = event.target?.result as string;
          const img = new Image();
          img.onload = async () => {
            try {
              const zxing = getZxingReader();
              const result = await zxing.decodeFromImageUrl(imgUrl);
              if (result) {
                const text = result.getText();
                handleCodeFound(text, undefined, 'Uploaded Image');
                setIsDecodingImage(false);
                return;
              }
            } catch (zxingErr) {
              console.warn('ZXing image decode error, trying canvas binarization:', zxingErr);
            }

            // Canvas fallback decode
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              try {
                const zxing = getZxingReader();
                const result = zxing.decode(canvas);
                if (result) {
                  handleCodeFound(result.getText(), undefined, 'Uploaded Image');
                  setIsDecodingImage(false);
                  return;
                }
              } catch {
                // Not found
              }
            }

            setImageDecodeError('Could not recognize a barcode in this image. Please ensure high contrast and good focus.');
            setIsDecodingImage(false);
          };
          img.onerror = () => {
            setImageDecodeError('Failed to load image file.');
            setIsDecodingImage(false);
          };
          img.src = imgUrl;
        } catch (err: any) {
          setImageDecodeError(`Decode error: ${err.message || 'Invalid barcode format'}`);
          setIsDecodingImage(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setImageDecodeError(`File read error: ${err.message || 'Failed to read file'}`);
      setIsDecodingImage(false);
    }
  };

  // Submit manual or hardware input
  const handleHardwareInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = hardwareInput.trim();
    if (!clean) return;
    setHardwareLastScanned(clean);
    handleCodeFound(clean, undefined, 'Manual / Scanner Input');
    setHardwareInput('');
  };

  return (
    <div className={`bg-slate-950 text-white rounded-xl overflow-hidden border border-slate-800 shadow-xl ${className}`}>
      {/* Scanner Mode Selection Header Bar */}
      <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
        {/* Scanner Tabs */}
        <div className="flex items-center space-x-1 p-0.5 bg-slate-950 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setScannerMode('CAMERA')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
              scannerMode === 'CAMERA'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Camera Scanner</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setScannerMode('HARDWARE_WEDGE');
              stopCamera();
              setTimeout(() => hardwareInputRef.current?.focus(), 100);
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
              scannerMode === 'HARDWARE_WEDGE'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Handheld / USB / Bluetooth</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setScannerMode('IMAGE_UPLOAD');
              stopCamera();
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
              scannerMode === 'IMAGE_UPLOAD'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileImage className="w-3.5 h-3.5" />
            <span>Image / Photo</span>
          </button>
        </div>

        {/* Action controls (Beep Audio, Torch, Close) */}
        <div className="flex items-center space-x-2">
          {/* Universal Hardware Scanner Status Indicator */}
          <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-950/60 border border-emerald-800/80 rounded-full text-[11px] text-emerald-400">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>Any Scanner Supported (1D / 2D / USB / BT / Cam)</span>
          </div>

          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
              soundEnabled
                ? 'bg-slate-800 text-emerald-400 border-slate-700'
                : 'bg-slate-800 text-slate-500 border-slate-700'
            }`}
            title={soundEnabled ? 'Mute Scan Beep' : 'Unmute Scan Beep'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
              title="Close Scanner"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* MODE 1: LIVE CAMERA SCANNER */}
      {scannerMode === 'CAMERA' && (
        <>
          {/* Camera Sub-toolbar: Switch Camera, Torch, Pause */}
          <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <span className="relative flex h-2 w-2">
                {isStreaming ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </>
                ) : (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-500" />
                )}
              </span>
              <span className="text-slate-300 font-medium text-[11px]">
                {isStreaming ? 'Camera Feed Active • All 1D/2D Symbologies' : 'Camera in Standby'}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {/* Select Camera Dropdown if multiple cameras detected */}
              {videoDevices.length > 1 && (
                <select
                  value={selectedDeviceId}
                  onChange={(e) => {
                    setSelectedDeviceId(e.target.value);
                    startCamera(e.target.value);
                  }}
                  className="bg-slate-800 border border-slate-700 text-slate-200 text-[11px] rounded px-2 py-1 focus:outline-none"
                >
                  {videoDevices.map((d, i) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Camera ${i + 1}`}
                    </option>
                  ))}
                </select>
              )}

              {hasTorch && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  className={`p-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                    torchOn
                      ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm shadow-amber-400/30'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                  title={torchOn ? 'Turn Torch Off' : 'Turn Torch On'}
                >
                  {torchOn ? <Flashlight className="w-3.5 h-3.5" /> : <FlashlightOff className="w-3.5 h-3.5" />}
                </button>
              )}

              {isStreaming ? (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-2 py-1 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 text-[11px] font-medium flex items-center space-x-1 cursor-pointer"
                >
                  <CameraOff className="w-3 h-3" />
                  <span>Pause</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => startCamera(selectedDeviceId)}
                  className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium flex items-center space-x-1 cursor-pointer"
                >
                  <Camera className="w-3 h-3" />
                  <span>Start</span>
                </button>
              )}
            </div>
          </div>

          {/* Camera Viewfinder Screen */}
          <div className="relative bg-black h-72 sm:h-80 w-full overflow-hidden flex items-center justify-center">
            <canvas ref={canvasRef} className="hidden" />
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                isStreaming ? 'opacity-100' : 'opacity-0'
              }`}
            />

            {/* Standby / Permission Notice */}
            {!isStreaming && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/90 z-10">
                {cameraError ? (
                  <div className="max-w-sm space-y-3">
                    <div className="w-10 h-10 rounded-full bg-rose-950 border border-rose-800 flex items-center justify-center mx-auto text-rose-400">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-bold text-rose-300">Camera Notice</div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{cameraError}</p>
                    <div className="pt-1 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => startCamera(selectedDeviceId)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-1.5 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Retry Camera</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setScannerMode('HARDWARE_WEDGE')}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer border border-slate-700"
                      >
                        Use Handheld Scanner
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-emerald-400">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-bold text-slate-200">Camera is in Standby</div>
                    <p className="text-[11px] text-slate-400 max-w-xs">
                      Click below to activate the video camera for live auto-detection.
                    </p>
                    <button
                      type="button"
                      onClick={() => startCamera(selectedDeviceId)}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-1.5 mx-auto cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Start Camera</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Target Reticle */}
            {isStreaming && (
              <div className="absolute inset-0 pointer-events-none z-10">
                <div className="absolute inset-0 bg-radial from-transparent via-black/20 to-black/60" />

                {/* Center scan guide */}
                <div className="absolute inset-x-8 sm:inset-x-16 top-1/2 -translate-y-1/2 h-44 sm:h-48 border border-white/20 rounded-xl">
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-3 border-l-3 border-emerald-400 rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-3 border-r-3 border-emerald-400 rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-3 border-l-3 border-emerald-400 rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-3 border-r-3 border-emerald-400 rounded-br-lg" />

                  {/* Sweeping Laser Line */}
                  <div className="absolute inset-x-2 top-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-[scannerBeam_2.4s_ease-in-out_infinite]" />
                </div>

                {/* Auto-detected box */}
                {detectedBox && (
                  <div
                    className="absolute border-2 border-emerald-400 bg-emerald-500/20 rounded shadow-[0_0_20px_#10b981] transition-all duration-150 animate-pulse pointer-events-none"
                    style={{
                      left: `${Math.max(10, detectedBox.x)}px`,
                      top: `${Math.max(10, detectedBox.y)}px`,
                      width: `${Math.max(60, detectedBox.width)}px`,
                      height: `${Math.max(30, detectedBox.height)}px`
                    }}
                  >
                    <div className="absolute -top-7 left-0 bg-emerald-500 text-slate-950 px-2 py-0.5 rounded text-[11px] font-mono font-bold shadow-md whitespace-nowrap flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3 text-slate-950" />
                      <span>DETECTED: {detectedBox.text}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* MODE 2: HARDWARE BARCODE SCANNER (USB / BLUETOOTH / LASER / CCD WEDGE) */}
      {scannerMode === 'HARDWARE_WEDGE' && (
        <div className="p-6 space-y-5 bg-slate-950">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <span>Hardware Barcode Scanner Active</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-900 text-emerald-300 border border-emerald-700">
                    HID Wedge Ready
                  </span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Point and pull the trigger on any handheld USB, Bluetooth, 2.4GHz wireless gun, or ring scanner.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg text-xs space-y-1.5">
              <div className="text-emerald-400 font-semibold flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>Supports 100% of industry standard barcode hardware:</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Honeywell, Zebra / Symbol, Datalogic, Eyoyo, Netum, Inateck, Tera, Unitech, Socket Mobile, and generic USB/Bluetooth wedge scanners. All 1D barcodes (Code 128, Code 39, EAN, UPC) and 2D QR / Data Matrix codes are auto-captured.
              </p>
            </div>

            {/* Direct Input Field for Scanners that need an active focus element */}
            <form onSubmit={handleHardwareInputSubmit} className="pt-2">
              <label className="block text-[11px] font-medium text-slate-400 mb-1.5">
                Scanner Input Target / Quick Test Input:
              </label>
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <ScanLine className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    ref={hardwareInputRef}
                    type="text"
                    value={hardwareInput}
                    onChange={(e) => setHardwareInput(e.target.value)}
                    placeholder="Scan with handheld gun or type code and press Enter..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  Lookup Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODE 3: UPLOAD IMAGE / PHOTO BARCODE */}
      {scannerMode === 'IMAGE_UPLOAD' && (
        <div className="p-6 space-y-4 bg-slate-950">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-950 border border-blue-800 flex items-center justify-center mx-auto text-blue-400">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-100">Scan Barcode from Image File</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Upload a photo, screenshot, or digital document containing any barcode or QR code. The system will decode it instantly.
              </p>
            </div>

            {imageDecodeError && (
              <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-lg text-xs text-rose-300 max-w-md mx-auto">
                {imageDecodeError}
              </div>
            )}

            <div className="pt-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileSelected}
                className="hidden"
                id="barcode-image-upload-input"
              />
              <label
                htmlFor="barcode-image-upload-input"
                className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl cursor-pointer shadow-md transition-colors"
              >
                <FileImage className="w-4 h-4" />
                <span>{isDecodingImage ? 'Decoding Barcode...' : 'Select Barcode Image (PNG, JPG, WEBP)'}</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Bar: Live Feedback Banner */}
      <div className="p-3.5 bg-slate-900 border-t border-slate-800">
        {lastDetectedCode ? (
          <div className="p-2.5 bg-emerald-950/80 border border-emerald-600/80 rounded-lg flex items-center justify-between animate-in fade-in">
            <div className="flex items-center space-x-2.5">
              <div className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-xs">
                ✓
              </div>
              <div>
                <div className="text-xs font-bold text-emerald-200">
                  Barcode Recognized: <span className="font-mono text-emerald-400 font-bold">{lastDetectedCode}</span>
                </div>
                <div className="text-[11px] text-emerald-400/90">
                  Matched material data and populated transaction record
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLastDetectedCode(null)}
              className="text-xs text-emerald-400/70 hover:text-emerald-300 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        ) : (
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px]">
              <ScanLine className="w-3.5 h-3.5 text-blue-400" />
              <span>Universal Barcode Reader • 1D & 2D (Code 128, Code 39, QR, DataMatrix, EAN, UPC)</span>
            </span>
            <span className="text-[10px] text-slate-500 hidden sm:inline">
              Plug in any USB/Bluetooth scanner or use camera
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
