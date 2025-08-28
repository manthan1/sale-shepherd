import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { X, FileText, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SalesOrderFormProps {
  open: boolean;
  onClose: () => void;
  isTrialMode?: boolean;
}

interface OrderFormData {
  customerName: string;
  shippingAddress: string;
  state: string;
  contactNumber: string;
  orderDetails: string;
  freight_expense: string;
  cust_gst_number: string;
  selectedProduct: string;
  quantity: string;
  discount: string;
  discountedPrice: string;
}

// Fake data for trial mode
const FAKE_COMPANIES = [
  { id: "1", name: "ABC Tech Solutions", address: "123 Tech Street, Delhi", gstin: "07ABCTY1234D1Z5", state: "Delhi" },
  { id: "2", name: "XYZ Manufacturing", address: "456 Industrial Area, Mumbai", gstin: "27XYZAB1234C1Z3", state: "Maharashtra" },
];

const FAKE_PRODUCTS = [
  { id: "1", name: "Software License", rate: 50000, unit: "PCS", hsn_sac: "998313", tax_rate: 18 },
  { id: "2", name: "Hardware Setup", rate: 25000, unit: "SET", hsn_sac: "852520", tax_rate: 18 },
  { id: "3", name: "Training Service", rate: 15000, unit: "HR", hsn_sac: "998541", tax_rate: 18 },
  { id: "4", name: "Maintenance Contract", rate: 30000, unit: "YEAR", hsn_sac: "998315", tax_rate: 18 },
  { id: "5", name: "Consulting Service", rate: 20000, unit: "DAY", hsn_sac: "998542", tax_rate: 18 },
  { id: "6", name: "Custom Development", rate: 80000, unit: "PROJECT", hsn_sac: "998314", tax_rate: 18 },
];

const SalesOrderForm = ({ open, onClose, isTrialMode = false }: SalesOrderFormProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductData, setSelectedProductData] = useState<any>(null);
  const [formData, setFormData] = useState<OrderFormData>({
    customerName: "",
    shippingAddress: "",
    state: "",
    contactNumber: "",
    orderDetails: "",
    freight_expense: "",
    cust_gst_number: "",
    selectedProduct: "",
    quantity: "",
    discount: "",
    discountedPrice: "",
  });

  useEffect(() => {
    if (user && !isTrialMode) {
      fetchCompanyProfile();
    } else if (isTrialMode) {
      setProducts(FAKE_PRODUCTS);
    }
  }, [user, isTrialMode]);

  useEffect(() => {
    if (companyProfile?.company_id) {
      fetchProducts();
    }
  }, [companyProfile]);

  const fetchCompanyProfile = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id, role, companies(*)')
        .eq('user_id', user?.id)
        .single();
      
      if (profile) {
        setCompanyProfile(profile);
      }
    } catch (error) {
      console.error('Error fetching company profile:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .eq('company_id', companyProfile?.company_id);
      
      if (productsData) {
        setProducts(productsData);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleInputChange = (field: keyof OrderFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // If product is selected, update selected product data and calculate discounted price
    if (field === 'selectedProduct' && value) {
      const product = products.find(p => p.id === value);
      setSelectedProductData(product);
      
      // Reset dependent fields when product changes
      setFormData(prev => ({ 
        ...prev, 
        [field]: value,
        quantity: "",
        discount: "",
        discountedPrice: ""
      }));
    }
    
    // Calculate discounted price when quantity or discount changes
    if ((field === 'quantity' || field === 'discount') && selectedProductData) {
      const quantity = field === 'quantity' ? parseFloat(value) || 0 : parseFloat(formData.quantity) || 0;
      const discount = field === 'discount' ? parseFloat(value) || 0 : parseFloat(formData.discount) || 0;
      
      if (quantity > 0) {
        const totalAmount = selectedProductData.rate * quantity;
        const discountedAmount = totalAmount - (totalAmount * discount / 100);
        
        setFormData(prev => ({ 
          ...prev, 
          [field]: value,
          discountedPrice: discountedAmount.toFixed(2)
        }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.customerName.trim()) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill in Customer Name",
        variant: "destructive",
      });
      return;
    }

    // Validate that either order details OR product selection is filled
    const hasOrderDetails = formData.orderDetails.trim();
    const hasProductSelection = formData.selectedProduct && formData.quantity;
    
    if (!hasOrderDetails && !hasProductSelection) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill in either Order Details OR select a product with quantity",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {

      const webhookUrl = isTrialMode
        ? "https://n8n.srv898271.hstgr.cloud/webhook/7ed8b450-cdfd-4767-8ed3-3a5f1d225fc3" // Trial form submission webhook
        : "https://n8n.srv898271.hstgr.cloud/webhook/bbd7cf14-90df-4946-8d2d-2de208c58b97"; // Logged-in user webhook
      
      // Prepare order data
      const orderData = {
        ...formData, // This will include all fields, even if blank
        cust_gst_number: formData.cust_gst_number.trim() || null,
        product_name: selectedProductData?.name || null,
        product_rate: selectedProductData?.rate || null,
        product_unit: selectedProductData?.unit || null,
        product_hsn_sac: selectedProductData?.hsn_sac || null,
        product_tax_rate: selectedProductData?.tax_rate || null,
        timestamp: new Date().toISOString(),
        isTrialMode,
        company_id: isTrialMode ? null : companyProfile?.company_id || null,
        isCompanyIdpresent: !isTrialMode && !!companyProfile?.company_id,
        user: user ? user.email : "anonymous",
        isAdmin: isTrialMode ? false : (companyProfile?.role === 'admin'),
      };
      // const orderData = {
      //   customerName: formData.customerName.trim(),
      //   shippingAddress: formData.shippingAddress.trim(),
      //   state: formData.state.trim(),
      //   contactNumber: formData.contactNumber.trim(),
      //   orderDetails: formData.orderDetails.trim(),
      //   timestamp: new Date().toISOString(),
      //   isTrialMode,
      //   company_id: isTrialMode ? null : companyProfile?.company_id || null,
      //   isCompanyIdpresent: !isTrialMode && !!companyProfile?.company_id,
      // };

      // Send to webhook
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });
      // const response = await fetch("https://n8n.srv898271.hstgr.cloud/webhook/bbd7cf14-90df-4946-8d2d-2de208c58b97", {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //   },
      //   body: JSON.stringify(orderData),
      // });

      // Get response data (if available)
      const result = await response.json();
      
      // Check if there's an error in the response
      if (result.error) {
        console.log("Error Message : ", result.error);
        throw new Error(result.error);
      }

      if (response.ok) {
        const pdfUrl = result.pdfUrl || null;

        // Only save to database for non-trial users
        if (!isTrialMode) {
          const { error: dbError } = await supabase
            .from('sales_orders')
            .insert([{
              company_id: companyProfile?.company_id,
              customer_name: formData.customerName.trim(),
              shipping_address: formData.shippingAddress.trim(),
              state: formData.state.trim(),
              contact_number: formData.contactNumber.trim(),
              order_details: formData.orderDetails.trim(),
              freight_expense: parseInt(formData.freight_expense) || 0,
              cust_gst_number: formData.cust_gst_number.trim() || null,
              pdf_url: pdfUrl,
              is_trial: false,
            }]);

          if (dbError) {
            console.error('Database error:', dbError);
          }
        }

        toast({
          title: "Success",
          description: isTrialMode 
            ? "Sales order generated successfully!" 
            : "Sales order submitted successfully!",
        });

        // Open PDF in a new tab for both trial and logged-in users
        if (pdfUrl) {
          setTimeout(() => {
            // This is the standard and most reliable way to open a URL in a new tab.
            // Note: It might be affected by browser pop-up blockers if not triggered by a direct user action.
            window.open(pdfUrl, '_blank');
            
            toast({
              title: "PDF Opened",
              description: "The sales order PDF has been opened in a new tab.",
            });
          }, 1000); // A small delay gives the success toast time to appear.
        }
        
        // Reset form
        setFormData({
          customerName: "",
          shippingAddress: "",
          state: "",
          contactNumber: "",
          orderDetails: "",
          freight_expense: "",
          cust_gst_number: "",
          selectedProduct: "",
          quantity: "",
          discount: "",
          discountedPrice: "",
        });
        setSelectedProductData(null);
        onClose();
        
        // Auto-download PDF for both trial and logged-in users
        // if (pdfUrl) {
        //   setTimeout(() => {
        //     try {
        //       // Create a temporary download link
        //       const link = document.createElement('a');
        //       link.href = pdfUrl;
        //       const sanitizedCustomerName = formData.customerName.replace(/[^a-zA-Z0-9]/g, '_');
        //       const dateString = new Date().toISOString().split('T')[0];
        //       link.download = `sales_order_${sanitizedCustomerName}_${dateString}.pdf`;
        //       link.style.display = 'none';
              
        //       // Add to DOM, click, and remove
        //       document.body.appendChild(link);
        //       link.click();
        //       document.body.removeChild(link);
              
        //       toast({
        //         title: "PDF Downloaded",
        //         description: "Sales order PDF has been downloaded to your device.",
        //       });
        //     } catch (error) {
        //       console.error('PDF download error:', error);
        //       // Fallback: open in new tab
        //       window.open(pdfUrl, '_blank');
        //       toast({
        //         title: "PDF Available",
        //         description: "PDF opened in new tab. You can download it from there.",
        //       });
        //     }
        //   }, 1000);
        // }
      } else {
        throw new Error("Failed to submit order");
      }
    } catch (error) {
      // console.error("Order submission error:", error);
      console.log(error.message);
      toast({
        title: "Error",
        // description: "Failed to submit sales order. Please try again.",
        description : error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl mx-4 sm:mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <FileText className="w-5 h-5" />
            {isTrialMode ? "Try Sales Order Generation" : "Generate Sales Order"}
          </DialogTitle>
        </DialogHeader>

        {isTrialMode && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <h4 className="font-medium text-blue-900 text-sm sm:text-base">Trial Mode - Test Data Available</h4>
                  <div className="text-sm text-blue-700">
                    <p><strong>Test Companies:</strong></p>
                    <ul className="list-disc list-inside ml-2 space-y-1 text-xs sm:text-sm">
                      {FAKE_COMPANIES.map(company => (
                        <li key={company.id} className="break-words">{company.name} - {company.state}</li>
                      ))}
                    </ul>
                    <p className="mt-2"><strong>Test Products:</strong></p>
                    <ul className="list-disc list-inside ml-2 space-y-1 text-xs sm:text-sm">
                      {FAKE_PRODUCTS.map(product => (
                        <li key={product.id} className="break-words">{product.name} - ₹{product.rate.toLocaleString()}/{product.unit}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerName">Customer Name *</Label>
                  <Input
                    id="customerName"
                    value={formData.customerName}
                    onChange={(e) => handleInputChange('customerName', e.target.value)}
                    placeholder="Enter customer name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="contactNumber">Contact Number</Label>
                  <Input
                    id="contactNumber"
                    type="tel"
                    value={formData.contactNumber}
                    onChange={(e) => handleInputChange('contactNumber', e.target.value)}
                    placeholder="Enter contact number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    placeholder="Enter state"
                  />
                </div>
                <div>
                  <Label htmlFor="cust_gst_number">Customer GST Number</Label>
                  <Input
                    id="cust_gst_number"
                    value={formData.cust_gst_number}
                    onChange={(e) => handleInputChange('cust_gst_number', e.target.value)}
                    placeholder="Enter GST number (optional)"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="shippingAddress">Shipping Address</Label>
                <Textarea
                  id="shippingAddress"
                  value={formData.shippingAddress}
                  onChange={(e) => handleInputChange('shippingAddress', e.target.value)}
                  placeholder="Enter shipping address"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">Order Information</CardTitle>
              <p className="text-sm text-muted-foreground">Fill either Order Details OR Product Selection below</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="orderDetails">Order Details</Label>
                <Textarea
                  id="orderDetails"
                  value={formData.orderDetails}
                  onChange={(e) => handleInputChange('orderDetails', e.target.value)}
                  placeholder="Enter detailed order information... (OR use product selection below)"
                  rows={4}
                />
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3 text-sm sm:text-base">Product Selection</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="selectedProduct">Select Product</Label>
                    <Select value={formData.selectedProduct} onValueChange={(value) => handleInputChange('selectedProduct', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a product..." />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} - ₹{product.rate?.toLocaleString()}/{product.unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => handleInputChange('quantity', e.target.value)}
                      placeholder="Enter quantity"
                      min="1"
                      disabled={!formData.selectedProduct}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label htmlFor="discount">Discount (%)</Label>
                    <Input
                      id="discount"
                      type="number"
                      value={formData.discount}
                      onChange={(e) => handleInputChange('discount', e.target.value)}
                      placeholder="Enter discount percentage"
                      min="0"
                      max="100"
                      disabled={!formData.selectedProduct || !formData.quantity}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="discountedPrice">Total Amount</Label>
                    <Input
                      id="discountedPrice"
                      value={formData.discountedPrice ? `₹${parseFloat(formData.discountedPrice).toLocaleString()}` : ''}
                      placeholder="Calculated total amount"
                      disabled
                      className="bg-muted"
                    />
                  </div>
                </div>
                
                {selectedProductData && (
                  <div className="bg-muted/50 p-3 rounded-md mt-3">
                    <h5 className="font-medium text-sm">Selected Product Details:</h5>
                    <div className="text-sm text-muted-foreground mt-1 space-y-1">
                      <p>Name: {selectedProductData.name}</p>
                      <p>Rate: ₹{selectedProductData.rate?.toLocaleString()}/{selectedProductData.unit}</p>
                      <p>HSN/SAC: {selectedProductData.hsn_sac}</p>
                      <p>Tax Rate: {selectedProductData.tax_rate}%</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div>
                <Label htmlFor="freight_expense">Freight Expense</Label>
                <Input
                  id="freight_expense"
                  type="number"
                  value={formData.freight_expense}
                  onChange={(e) => handleInputChange('freight_expense', e.target.value)}
                  placeholder="Enter freight expense amount"
                  min="0"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? "Submitting..." : "Submit Order"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SalesOrderForm;