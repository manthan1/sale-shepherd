import React, { useRef , useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, UploadCloud } from "lucide-react";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  label: string;
  description?: string;
  buttonText?: string;
  icon?: React.ReactNode;

   // --- NEW PROPS ---
  currentImageUrl?: string | null; // To display the existing image
  isUploading?: boolean; // To show a loading state
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  accept = "*/*",
  label,
  description,
  buttonText = "Choose File",
  icon = <Upload className="w-4 h-4" />,

  currentImageUrl,
  isUploading = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {

      // Create a temporary local URL for the preview
      setPreviewUrl(URL.createObjectURL(file));
      
      onFileSelect(file);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  // Decide which URL to display: the new preview or the existing one
  const displayUrl = previewUrl || currentImageUrl;


  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {/* --- NEW JSX for displaying the image and placeholder --- */}
      <div className="flex items-center gap-4">
        {displayUrl ? (
          <div className="relative w-24 h-24 rounded-md overflow-hidden border">
            <img src={displayUrl} alt={label} className="w-full h-full object-cover" />
            {isUploading && (
                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                    <p className="text-white text-xs font-semibold">Uploading...</p>
                </div>
            )}
          </div>
        ) : (
          <div className="w-24 h-24 rounded-md border border-dashed flex items-center justify-center bg-muted">
            <UploadCloud className="w-8 h-8 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1">
          <Input
            id={label} // Give it an ID for the button to reference
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleButtonClick}
            disabled={isUploading} // Disable button during upload
          >
            {isUploading ? 'Uploading...' : buttonText}
          </Button>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
};

  // return (
  //   <div className="space-y-2">
  //     <Label className="text-sm font-medium">{label}</Label>
  //     {description && (
  //       <p className="text-sm text-muted-foreground">{description}</p>
  //     )}
  //     <div className="flex items-center gap-3">
  //       <Input
  //         ref={fileInputRef}
  //         type="file"
  //         accept={accept}
  //         onChange={handleFileChange}
  //         className="hidden"
  //       />
  //       <Button
  //         type="button"
  //         variant="outline"
  //         onClick={handleButtonClick}
  //         className="flex items-center gap-2"
  //       >
  //         {icon}
  //         {buttonText}
  //       </Button>
  //     </div>
  //   </div>
  // );
// };

export const ExcelUpload: React.FC<{
  onFileSelect: (file: File) => void;
  label: string;
  description?: string;
}> = ({ onFileSelect, label, description }) => {
  return (
    <FileUpload
      onFileSelect={onFileSelect}
      accept=".xlsx,.xls,.csv"
      label={label}
      description={description}
      buttonText="Import from Excel"
      icon={<FileText className="w-4 h-4" />}
    />
  );
};