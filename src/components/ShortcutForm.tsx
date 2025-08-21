import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface ShortcutFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (shortcut: ShortcutFormData) => void;
  shortcut?: ShortcutFormData | null;
}

export interface ShortcutFormData {
  id?: string;
  full_name: string;
  shortcut_name: string;
}

const ShortcutForm = ({ open, onClose, onSave, shortcut }: ShortcutFormProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<ShortcutFormData>({
    full_name: "",
    shortcut_name: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (shortcut) {
      setFormData(shortcut);
    } else {
      setFormData({
        full_name: "",
        shortcut_name: "",
      });
    }
  }, [shortcut, open]);

  const handleInputChange = (field: keyof ShortcutFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.full_name.trim() || !formData.shortcut_name.trim()) {
      toast({
        title: "Missing Required Fields",
        description: "Both Full Product Name and Shortcut Name are required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      // Error handling is done in parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-4 sm:mx-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">
            {shortcut ? "Edit Shortcut" : "Add Shortcut"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div>
            <Label htmlFor="full_name">Full Product Name *</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => handleInputChange('full_name', e.target.value)}
              placeholder="Enter full product name"
              required
            />
          </div>

          <div>
            <Label htmlFor="shortcut_name">Shortcut Name *</Label>
            <Input
              id="shortcut_name"
              value={formData.shortcut_name}
              onChange={(e) => handleInputChange('shortcut_name', e.target.value)}
              placeholder="Enter shortcut name"
              required
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? "Saving..." : "Save Shortcut"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ShortcutForm;