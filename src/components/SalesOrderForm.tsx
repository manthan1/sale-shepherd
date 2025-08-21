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
}

// Fake data for trial mode
const FAKE_COMPANIES = [
  { id: "1", name: "ABC Tech Solutions", address: "123 Tech Street, Delhi", gstin: "07ABCTY1234D1Z5", state: "Delhi" },
  { id: "2", name: "XYZ Manufacturing", address: "456 Industrial Area, Mumbai", gstin: "27XYZAB1234C1Z3", state: "Maharashtra" },
];

const FAKE_PRODUCTS = [
  { id: "1", name: "Software License", rate: 50000, unit: "PCS", hsn_sac: "998313" },
  { id: "2", name: "Hardware Setup", rate: 25000, unit: "SET", hsn_sac: "852520" },
  { id: "3", name: "Training Service", rate: 15000, unit: "HR", hsn_sac: "998541" },
  { id: "4", name: "Maintenance Contract", rate: 30000, unit: "YEAR", hsn_sac: "998315" },
  { id: "5", name: "Consulting Service", rate: 20000, unit: "DAY", hsn_sac: "998542" },
  { id: "6", name: "Custom Development", rate: 80000, unit: "PROJECT", hsn_sac: "998314" },
];

const SalesOrderForm = ({ open, onClose, isTrialMode = false }: SalesOrderFormProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [formData, setFormData] = useState<OrderFormData>({
    customerName: "",
    shippingAddress: "",
    state: "",
    contactNumber: "",
    orderDetails: "",
    freight_expense: "",
    cust_gst_number: "",
  });

  useEffect(() => {
    if (user && !isTrialMode) {
      fetchCompanyProfile();
    }
  }, [user, isTrialMode]);

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

  const handleInputChange = (field: keyof OrderFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.customerName.trim() || !formData.orderDetails.trim()) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill in Customer Name and Order Details",
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
        });
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
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="orderDetails">Order Details *</Label>
                <Textarea
                  id="orderDetails"
                  value={formData.orderDetails}
                  onChange={(e) => handleInputChange('orderDetails', e.target.value)}
                  placeholder="Enter detailed order information..."
                  rows={4}
                  required
                />
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