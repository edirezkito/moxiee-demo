import { useRef, useState } from "react";
import { UploadCloud, X, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { toast } from "@/store/toastStore";

const BUCKET = "product-images";
const MAX_FILE_MB = 5;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

interface ImageDropzoneProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
}

/**
 * Drag-and-drop (or click-to-browse) image uploader for the ADMIN side
 * only — uploads files straight to Supabase Storage and returns their
 * public URLs. Buyers/customers never see this component; they only ever
 * see the resulting image URLs on product cards/pages.
 */
export function ImageDropzone({ images, onChange, maxImages = 6 }: ImageDropzoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files);
    const room = maxImages - images.length;
    if (room <= 0) {
      toast.warning("Image limit reached", `You can only add up to ${maxImages} images.`);
      return;
    }

    setUploading(true);
    const uploaded: string[] = [];
    try {
      for (const file of list.slice(0, room)) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          toast.error("Unsupported file type", `${file.name} isn't a JPEG, PNG, WEBP, or GIF.`);
          continue;
        }
        if (file.size > MAX_FILE_MB * 1024 * 1024) {
          toast.error("File too large", `${file.name} is over ${MAX_FILE_MB}MB.`);
          continue;
        }

        const ext = file.name.split(".").pop();
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });
        if (error) throw error;

        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
        uploaded.push(data.publicUrl);
      }
      if (uploaded.length) onChange([...images, ...uploaded]);
    } catch (err: any) {
      toast.error("Upload failed", err?.message ?? "Please try again.");
    } finally {
      setUploading(false);
    }
  }

  function removeImage(url: string) {
    onChange(images.filter((i) => i !== url));
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors",
          dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          multiple
          className="hidden"
          onChange={(e) => e.target.files && uploadFiles(e.target.files)}
        />
        {uploading ? (
          <Loader2 className="size-6 animate-spin text-primary" />
        ) : (
          <UploadCloud className="size-6 text-muted-foreground" />
        )}
        <p className="text-sm font-medium">
          {uploading ? "Uploading..." : "Drag & drop images here, or click to browse"}
        </p>
        <p className="text-xs text-muted-foreground">
          JPEG/PNG/WEBP/GIF, up to {MAX_FILE_MB}MB each — {images.length}/{maxImages} added
        </p>
      </div>

      {images.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((url) => (
            <div key={url} className="group relative aspect-square overflow-hidden rounded-lg border border-border">
              <img src={url} alt="" className="size-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(url)}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Remove image"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
