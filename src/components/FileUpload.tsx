import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText } from "lucide-react";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  label: string;
  description?: string;
  buttonText?: string;
  icon?: React.ReactNode;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  accept = "*/*",
  label,
  description,
  buttonText = "Choose File",
  icon = <Upload className="w-4 h-4" />
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      <div className="flex items-center gap-3">
        <Input
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
          className="flex items-center gap-2"
        >
          {icon}
          {buttonText}
        </Button>
      </div>
    </div>
  );
};

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