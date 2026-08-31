import React, { useState, useRef, useEffect } from "react";
import { Upload, X, Loader2, Crop, SlidersHorizontal, RotateCw, RotateCcw } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export type AspectRatioType = "square" | "portrait" | "landscape" | "video";

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string) => void;
  className?: string;
  label?: string;
  defaultAspectRatio?: AspectRatioType;
}

export function ImageUpload({ 
  value, 
  onChange, 
  className = "", 
  label = "Upload Image",
  defaultAspectRatio = "square" 
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorImgRef = useRef<HTMLImageElement>(null);

  // Editor states
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorImageSrc, setEditorImageSrc] = useState<string | null>(null);
  const [filename, setFilename] = useState("uploaded_image.jpg");
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>(defaultAspectRatio);
  const [fitMode, setFitMode] = useState<"contain" | "cover">("contain"); // Default to "contain" (Standard Uncropped)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [renderedSize, setRenderedSize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Sync aspect ratio when default changes
  useEffect(() => {
    setAspectRatio(defaultAspectRatio);
  }, [defaultAspectRatio]);

  const [lastCroppedBase64, setLastCroppedBase64] = useState<string | null>(null);

  const uploadMutation = trpc.upload.image.useMutation({
    onSuccess: (data) => {
      onChange(data.url);
      setIsUploading(false);
      toast.success("Image saved successfully");
    },
    onError: (error) => {
      console.warn("Server upload error, using local cropped base64 fallback:", error);
      setIsUploading(false);
      if (lastCroppedBase64) {
        onChange(lastCroppedBase64);
        toast.success("Cropped photo saved!");
      } else {
        toast.error(error.message || "Upload failed");
      }
    }
  });

  // Calculate viewport dimensions dynamically based on selected ratio
  const getViewDimensions = () => {
    switch (aspectRatio) {
      case "portrait":
        return { w_v: 240, h_v: 320, w_c: 600, h_c: 800 }; // 3:4 ratio (Member cards)
      case "video":
        return { w_v: 350, h_v: 197, w_c: 960, h_c: 540 }; // 16:9 ratio (Banner / Campaigns)
      case "landscape":
        return { w_v: 330, h_v: 220, w_c: 900, h_c: 600 }; // 3:2 ratio (Projects / Photos)
      case "square":
      default:
        return { w_v: 280, h_v: 280, w_c: 600, h_c: 600 }; // 1:1 ratio (Avatars / Logos)
    }
  };

  const { w_v: W_view, h_v: H_view, w_c: W_canvas, h_c: H_canvas } = getViewDimensions();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 5MB");
      return;
    }

    setFilename(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setEditorImageSrc(base64);
      setIsEditorOpen(true);
    };
    reader.onerror = () => {
      toast.error("Failed to read file");
    };
    reader.readAsDataURL(file);
  };

  const openRecrop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (value) {
      setEditorImageSrc(value);
      setIsEditorOpen(true);
    }
  };

  const fitImageToViewport = (img: HTMLImageElement, ratio: AspectRatioType, mode: "contain" | "cover" = fitMode) => {
    let w_v = 280;
    let h_v = 280;
    if (ratio === "portrait") {
      w_v = 240;
      h_v = 320;
    } else if (ratio === "video") {
      w_v = 350;
      h_v = 197;
    } else if (ratio === "landscape") {
      w_v = 330;
      h_v = 220;
    }

    const imgRatio = img.naturalWidth / img.naturalHeight;
    const viewRatio = w_v / h_v;

    let baseWidth = w_v;
    let baseHeight = h_v;

    if (mode === "contain") {
      // Standard (Uncropped) mode - image is contained completely with ZERO top/bottom clipping!
      if (imgRatio > viewRatio) {
        baseWidth = w_v;
        baseHeight = w_v / imgRatio;
      } else {
        baseHeight = h_v;
        baseWidth = h_v * imgRatio;
      }
    } else {
      // Filled mode - image fills viewport frame edge-to-edge
      if (imgRatio > viewRatio) {
        baseHeight = h_v;
        baseWidth = h_v * imgRatio;
      } else {
        baseWidth = w_v;
        baseHeight = w_v / imgRatio;
      }
    }

    setRenderedSize({ width: baseWidth, height: baseHeight });
    setPan({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  };

  const handleImageLoad = (img: HTMLImageElement) => {
    fitImageToViewport(img, aspectRatio, fitMode);
  };

  const handleFitModeChange = (newMode: "contain" | "cover") => {
    setFitMode(newMode);
    if (editorImgRef.current) {
      fitImageToViewport(editorImgRef.current, aspectRatio, newMode);
    }
  };

  const handleRotateCw = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleResetTransforms = () => {
    if (editorImgRef.current) {
      fitImageToViewport(editorImgRef.current, aspectRatio, fitMode);
    }
  };

  // Pan dragging mechanics
  const handleDragStart = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleDragMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStartRef.current.x;
    const newY = e.clientY - dragStartRef.current.y;
    setPan({ x: newX, y: newY });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Mobile touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = { 
        x: e.touches[0].clientX - pan.x, 
        y: e.touches[0].clientY - pan.y 
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    e.preventDefault(); // Stop page scrolling
    const newX = e.touches[0].clientX - dragStartRef.current.x;
    const newY = e.touches[0].clientY - dragStartRef.current.y;
    setPan({ x: newX, y: newY });
  };

  const handleCancelEdit = () => {
    setIsEditorOpen(false);
    setEditorImageSrc(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCropConfirm = () => {
    const imgElement = editorImgRef.current;
    if (!imgElement) return;

    const canvas = document.createElement("canvas");
    canvas.width = W_canvas;
    canvas.height = H_canvas;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Fill high-resolution background with clean white for JPEG output
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply exact transforms matching viewport rendering including rotation
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);
    ctx.translate(pan.x / zoom, pan.y / zoom);

    const scaleRatio = canvas.width / W_view;
    const wDraw = renderedSize.width * scaleRatio;
    const hDraw = renderedSize.height * scaleRatio;

    ctx.drawImage(imgElement, -wDraw / 2, -hDraw / 2, wDraw, hDraw);

    const croppedBase64 = canvas.toDataURL("image/jpeg", 0.92);
    setLastCroppedBase64(croppedBase64);
    
    // Call onChange INSTANTLY so parent form updates with cropped image without waiting for network!
    onChange(croppedBase64);
    setIsEditorOpen(false);
    toast.success("Photo cropped & applied!");
    
    // Background upload to Cloudinary if available
    setIsUploading(true);
    uploadMutation.mutate({
      base64: croppedBase64,
      filename: filename
    });
  };

  const clearImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      
      <div 
        className={`relative border-2 border-dashed rounded-lg overflow-hidden transition-all 
          ${value ? "border-gray-200 bg-gray-50" : "border-gray-300 hover:border-blue-400 bg-white cursor-pointer"}
          ${isUploading ? "opacity-50 pointer-events-none" : ""}
        `}
        onClick={() => !value && fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          className="hidden" 
        />

        {isUploading ? (
          <div className="flex flex-col items-center justify-center p-8 text-blue-500">
            <Loader2 className="w-8 h-8 mb-2 animate-spin" />
            <span className="text-sm font-medium">Uploading & Processing...</span>
          </div>
        ) : value ? (
          <div className="relative group">
            <img 
              src={value} 
              alt="Uploaded preview" 
              className="w-full h-52 object-contain bg-slate-900/5 p-1"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-opacity">
              <button
                type="button"
                onClick={openRecrop}
                className="bg-white text-gray-800 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-100 transition-colors shadow-lg flex items-center gap-1.5 cursor-pointer"
                title="Re-crop / Adjust image"
              >
                <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                Adjust Crop
              </button>
              <button
                type="button"
                onClick={clearImage}
                className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors shadow-lg cursor-pointer"
                title="Remove image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-gray-500">
            <Upload className="w-8 h-8 mb-3 text-gray-400" />
            <p className="text-sm font-medium">Click to upload image</p>
            <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP up to 5MB (Interactive cropper opens automatically)</p>
          </div>
        )}
      </div>

      {/* Responsive Crop & Edit Modal */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[95vh]">
            
            {/* Header */}
            <div className="p-4 px-6 border-b border-gray-100 flex justify-between items-center bg-white">
              <div className="flex items-center gap-2">
                <Crop className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-base font-bold text-gray-800 leading-none">Photo Adjustment</h3>
                  <span className="text-[11px] text-gray-400 font-medium">Select framing style below</span>
                </div>
              </div>
              <button 
                type="button" 
                onClick={handleCancelEdit} 
                className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-full hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Adjust Options: Standard (Uncropped) vs Filled */}
            <div className="px-5 py-2.5 bg-slate-50 border-b border-gray-100 flex gap-3 items-center justify-center shrink-0">
              <span className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">Display Mode:</span>
              <button
                type="button"
                onClick={() => handleFitModeChange("contain")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  fitMode === "contain" 
                    ? "bg-teal-700 text-white shadow-sm ring-2 ring-teal-700/20" 
                    : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-100"
                }`}
              >
                🖼️ Standard (Uncropped)
              </button>
              <button
                type="button"
                onClick={() => handleFitModeChange("cover")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  fitMode === "cover" 
                    ? "bg-teal-700 text-white shadow-sm ring-2 ring-teal-700/20" 
                    : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-100"
                }`}
              >
                📐 Filled
              </button>
            </div>

            {/* Interactive Viewport Area */}
            <div className="p-6 flex flex-col items-center justify-center bg-slate-950 overflow-hidden min-h-[360px] relative">
              <div 
                className="relative overflow-hidden bg-slate-900 shadow-2xl select-none cursor-move shrink-0"
                style={{ 
                  width: `${W_view}px`, 
                  height: `${H_view}px`,
                  borderRadius: '8px',
                  border: '2px solid #3b82f6',
                  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.65)' // Dim ambient surrounding space
                }}
                onMouseDown={handleDragStart}
                onMouseMove={handleDragMove}
                onMouseUp={handleDragEnd}
                onMouseLeave={handleDragEnd}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleDragEnd}
              >
                <img
                  ref={editorImgRef}
                  src={editorImageSrc || ''}
                  alt="To crop"
                  className="max-w-none max-h-none pointer-events-none absolute"
                  style={{
                    width: `${renderedSize.width}px`,
                    height: `${renderedSize.height}px`,
                    left: '50%',
                    top: '50%',
                    transform: `translate(-50%, -50%) rotate(${rotation}deg) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: 'center center'
                  }}
                  onLoad={(e) => handleImageLoad(e.currentTarget)}
                />
                
                {/* Circular Mask Guidelines */}
                {aspectRatio === 'square' && (
                  <div className="absolute inset-0 pointer-events-none border-2 border-white/60 rounded-full"></div>
                )}
                
                {/* Grid Overlay for Composition */}
                <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-25">
                  <div className="border-r border-b border-white"></div>
                  <div className="border-r border-b border-white"></div>
                  <div className="border-b border-white"></div>
                  <div className="border-r border-b border-white"></div>
                  <div className="border-r border-b border-white"></div>
                  <div className="border-b border-white"></div>
                  <div className="border-r border-white"></div>
                  <div className="border-r border-white"></div>
                  <div></div>
                </div>
              </div>
              
              {/* Controls Toolbar: Rotation & Reset */}
              <div className="flex items-center gap-3 mt-3">
                <button
                  type="button"
                  onClick={handleRotateCw}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title="Rotate 90° Clockwise"
                >
                  <RotateCw className="w-3.5 h-3.5 text-blue-400" />
                  Rotate 90°
                </button>

                <button
                  type="button"
                  onClick={handleResetTransforms}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title="Reset Position & Zoom"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  Reset
                </button>
              </div>

              <p className="text-[11px] text-slate-400 font-semibold mt-2 tracking-wide uppercase">
                Drag to Position • Slider to Zoom
              </p>
              
              {/* Zoom range controller */}
              <div className="w-full max-w-xs mt-3 flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400 shrink-0">Zoom -</span>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.01"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none"
                />
                <span className="text-xs font-bold text-slate-400 shrink-0">Zoom +</span>
              </div>
            </div>
            
            {/* Action Bar */}
            <div className="p-4 bg-white flex justify-end gap-3 border-t border-gray-100">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCropConfirm}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-extrabold hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
              >
                Save & Crop Photo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
