import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface ProductFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (product: ProductFormData) => void;
  product?: ProductFormData | null;
}

export interface ProductFormData {
  id?: string;
  name: string;
  rate: number;
  hsn_sac: string;
  unit: string;
  tax_rate: number;
  max_discount: number;
}

const ProductForm = ({ open, onClose, onSave, product }: ProductFormProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    rate: 0,
    hsn_sac: "",
    unit: "",
    tax_rate: 0,
    max_discount: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData(product);
    } else {
      setFormData({
        name: "",
        rate: 0,
        hsn_sac: "",
        unit: "",
        tax_rate: 0,
        max_discount: 0,
      });
    }
  }, [product, open]);

  const handleInputChange = (field: keyof ProductFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: "Missing Required Fields",
        description: "Product Name is required",
        variant: "destructive",
      });
      return;
    }

    if (formData.rate <= 0) {
      toast({
        title: "Invalid Rate",
        description: "Rate must be greater than 0",
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
          <DialogTitle>
            {product ? "Edit Product" : "Add Product"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Product Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter product name"
              required
            />
          </div>

          <div>
            <Label htmlFor="rate">Rate *</Label>
            <Input
              id="rate"
              type="number"
              step="0.01"
              min="0"
              value={formData.rate}
              onChange={(e) => handleInputChange('rate', parseFloat(e.target.value) || 0)}
              placeholder="Enter rate"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="hsn_sac">HSN/SAC</Label>
              <Input
                id="hsn_sac"
                value={formData.hsn_sac}
                onChange={(e) => handleInputChange('hsn_sac', e.target.value)}
                placeholder="Enter HSN/SAC code"
              />
            </div>

            <div>
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                value={formData.unit}
                onChange={(e) => handleInputChange('unit', e.target.value)}
                placeholder="e.g., PCS, KG, HR"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tax_rate">Tax Rate (%)</Label>
              <Input
                id="tax_rate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.tax_rate}
                onChange={(e) => handleInputChange('tax_rate', parseFloat(e.target.value) || 0)}
                placeholder="e.g., 12, 18"
              />
            </div>

            <div>
              <Label htmlFor="max_discount">Max Discount (%)</Label>
              <Input
                id="max_discount"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.max_discount}
                onChange={(e) => handleInputChange('max_discount', parseFloat(e.target.value) || 0)}
                placeholder="e.g., 5, 10"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? "Saving..." : "Save Product"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProductForm;