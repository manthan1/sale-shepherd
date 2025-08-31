import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { X, FileText, Info, Plus, Edit2, Trash2, Check } from "lucide-react";
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

interface SelectedProduct {
  id: string;
  productId: string;
  name: string;
  rate: number;
  unit: string;
  hsn_sac: string;
  tax_rate: number;
  quantity: number;
  discount: number;
  discountedPrice: number;
  totalAmount: number;
}

interface ProductFormData {
  productId: string;
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
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [productFormData, setProductFormData] = useState<ProductFormData>({
    productId: "",
    quantity: "",
    discount: "",
    discountedPrice: "",
  });
  const [productSearchOpen, setProductSearchOpen] = useState(false);
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
  };

  const handleProductFormChange = (field: keyof ProductFormData, value: string) => {
    setProductFormData(prev => ({ ...prev, [field]: value }));
    
    // Calculate amounts when quantity, discount, or discountedPrice changes
    if ((field === 'quantity' || field === 'discount') && productFormData.productId) {
      const product = products.find(p => p.id === productFormData.productId);
      if (product) {
        const quantity = field === 'quantity' ? parseFloat(value) || 0 : parseFloat(productFormData.quantity) || 0;
        const discount = field === 'discount' ? parseFloat(value) || 0 : parseFloat(productFormData.discount) || 0;
        
        if (quantity > 0) {
          const totalAmount = product.rate * quantity;
          const discountedAmount = totalAmount - (totalAmount * discount / 100);
          
          setProductFormData(prev => ({ 
            ...prev, 
            [field]: value,
            discountedPrice: discountedAmount.toFixed(2)
          }));
        }
      }
    }
    
    // Calculate discount percentage when discountedPrice is entered manually
    if (field === 'discountedPrice' && productFormData.productId && productFormData.quantity) {
      const product = products.find(p => p.id === productFormData.productId);
      if (product) {
        const quantity = parseFloat(productFormData.quantity) || 0;
        const discountedPrice = parseFloat(value) || 0;
        
        if (quantity > 0) {
          const totalAmount = product.rate * quantity;
          const discountPercent = totalAmount > 0 ? ((totalAmount - discountedPrice) / totalAmount) * 100 : 0;
          
          setProductFormData(prev => ({ 
            ...prev, 
            [field]: value,
            discount: Math.max(0, discountPercent).toFixed(2)
          }));
        }
      }
    }
  };

  const addProduct = () => {
    if (!productFormData.productId || !productFormData.quantity) {
      toast({
        title: "Missing Fields",
        description: "Please select a product and enter quantity",
        variant: "destructive",
      });
      return;
    }

    const product = products.find(p => p.id === productFormData.productId);
    if (!product) return;

    const quantity = parseFloat(productFormData.quantity);
    const discount = parseFloat(productFormData.discount) || 0;
    const discountedPrice = parseFloat(productFormData.discountedPrice) || (product.rate * quantity);
    const totalAmount = product.rate * quantity;

    const newProduct: SelectedProduct = {
      id: Date.now().toString(),
      productId: product.id,
      name: product.name,
      rate: product.rate,
      unit: product.unit,
      hsn_sac: product.hsn_sac,
      tax_rate: product.tax_rate,
      quantity,
      discount,
      discountedPrice,
      totalAmount,
    };

    setSelectedProducts(prev => [...prev, newProduct]);
    setProductFormData({ productId: "", quantity: "", discount: "", discountedPrice: "" });
    setProductSearchOpen(false);
  };

  const editProduct = (productId: string) => {
    const product = selectedProducts.find(p => p.id === productId);
    if (product) {
      setProductFormData({
        productId: product.productId,
        quantity: product.quantity.toString(),
        discount: product.discount.toString(),
        discountedPrice: product.discountedPrice.toString(),
      });
      setEditingProduct(productId);
      setProductSearchOpen(true);
    }
  };

  const updateProduct = () => {
    if (!editingProduct || !productFormData.productId || !productFormData.quantity) return;

    const product = products.find(p => p.id === productFormData.productId);
    if (!product) return;

    const quantity = parseFloat(productFormData.quantity);
    const discount = parseFloat(productFormData.discount) || 0;
    const discountedPrice = parseFloat(productFormData.discountedPrice) || (product.rate * quantity);
    const totalAmount = product.rate * quantity;

    setSelectedProducts(prev => prev.map(p => 
      p.id === editingProduct 
        ? {
            ...p,
            productId: product.id,
            name: product.name,
            rate: product.rate,
            unit: product.unit,
            hsn_sac: product.hsn_sac,
            tax_rate: product.tax_rate,
            quantity,
            discount,
            discountedPrice,
            totalAmount,
          }
        : p
    ));

    setEditingProduct(null);
    setProductFormData({ productId: "", quantity: "", discount: "", discountedPrice: "" });
    setProductSearchOpen(false);
  };

  const removeProduct = (productId: string) => {
    setSelectedProducts(prev => prev.filter(p => p.id !== productId));
  };

  const formatSelectedProductsText = (products: SelectedProduct[]): string => {
    return products.map(product => {
      if (product.discount > 0) {
        return `${product.quantity} ${product.name} - ${product.discount}% discount`;
      } else if (product.discountedPrice !== product.rate * product.quantity) {
        return `${product.quantity} ${product.name} - ${product.discountedPrice} rupees discountedPrice`;
      } else {
        return `${product.quantity} ${product.name}`;
      }
    }).join('\n');
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
    const hasProductSelection = selectedProducts.length > 0;
    
    if (!hasOrderDetails && !hasProductSelection) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill in either Order Details OR select at least one product",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const webhookUrl = isTrialMode
        ? "https://n8n.srv898271.hstgr.cloud/webhook/7ed8b450-cdfd-4767-8ed3-3a5f1d225fc3"
        : "https://n8n.srv898271.hstgr.cloud/webhook/bbd7cf14-90df-4946-8d2d-2de208c58b97";
      
      // Prepare order data
      const formattedProductsText = selectedProducts.length > 0 ? formatSelectedProductsText(selectedProducts) : '';
      const combinedOrderDetails = [formData.orderDetails.trim(), formattedProductsText].filter(Boolean).join('\n\n');
      
      const orderData = {
        ...formData,
        orderDetails: combinedOrderDetails,
        cust_gst_number: formData.cust_gst_number.trim() || null,
        selected_products: selectedProducts,
        products_count: selectedProducts.length,
        total_order_value: selectedProducts.reduce((sum, p) => sum + p.discountedPrice, 0),
        timestamp: new Date().toISOString(),
        isTrialMode,
        company_id: isTrialMode ? null : companyProfile?.company_id || null,
        isCompanyIdpresent: !isTrialMode && !!companyProfile?.company_id,
        user: user ? user.email : "anonymous",
        isAdmin: isTrialMode ? false : (companyProfile?.role === 'admin'),
      };

      // Send to webhook
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

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
            window.open(pdfUrl, '_blank');
            
            toast({
              title: "PDF Opened",
              description: "The sales order PDF has been opened in a new tab.",
            });
          }, 1000);
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
        setSelectedProducts([]);
        setProductFormData({ productId: "", quantity: "", discount: "", discountedPrice: "" });
        onClose();
      } else {
        throw new Error("Failed to submit order");
      }
    } catch (error: any) {
      console.log(error.message);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl mx-4 sm:mx-auto max-h-[90vh] overflow-y-auto">
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
                    <p><strong>Test Products:</strong></p>
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
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-medium text-sm sm:text-base">Product Selection</h4>
                      <p className="text-xs text-muted-foreground mt-1">Search and add multiple products with pricing</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-2 bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 border-primary/20"
                      onClick={() => setProductSearchOpen(true)}
                    >
                      <Plus className="w-4 h-4" />
                      {editingProduct ? 'Edit Product' : 'Add Product'}
                    </Button>
                    
                    {/* Add Product Modal */}
                    <Dialog open={productSearchOpen} onOpenChange={setProductSearchOpen}>
                      <DialogContent className="max-w-lg mx-4 sm:mx-auto max-h-[85vh] overflow-y-auto z-[60]">
                        <DialogHeader>
                          <DialogTitle className="text-lg">
                            {editingProduct ? 'Edit Product Details' : 'Select & Configure Product'}
                          </DialogTitle>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                          <Command className="border rounded-md">
                            <CommandInput 
                              placeholder="🔍 Search products by name..." 
                              className="border-0 border-b rounded-none focus:ring-0"
                            />
                            <CommandEmpty className="py-6 text-center text-muted-foreground">
                              <div className="flex flex-col items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                  <Plus className="w-4 h-4" />
                                </div>
                                No products found
                              </div>
                            </CommandEmpty>
                            <CommandGroup>
                              <CommandList className="max-h-48">
                                {products.map((product) => (
                                  <CommandItem
                                    key={product.id}
                                    onSelect={() => {
                                      setProductFormData(prev => ({ ...prev, productId: product.id }));
                                    }}
                                    className="flex items-start justify-between cursor-pointer p-3 hover:bg-muted/50"
                                  >
                                    <div className="flex-1 space-y-1">
                                      <div className="font-medium text-sm text-foreground">{product.name}</div>
                                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        <span className="font-medium text-primary">₹{product.rate?.toLocaleString()}</span>
                                        <span>per {product.unit}</span>
                                        <span className="bg-muted px-1.5 py-0.5 rounded text-xs">HSN: {product.hsn_sac}</span>
                                      </div>
                                      {product.tax_rate && (
                                        <div className="text-xs text-muted-foreground">Tax: {product.tax_rate}%</div>
                                      )}
                                    </div>
                                    {productFormData.productId === product.id && (
                                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Check className="w-3 h-3 text-primary" />
                                      </div>
                                    )}
                                  </CommandItem>
                                ))}
                              </CommandList>
                            </CommandGroup>
                          </Command>
                          
                          {productFormData.productId && (
                            <div className="space-y-4 border-t pt-4">
                              {(() => {
                                const selectedProduct = products.find(p => p.id === productFormData.productId);
                                return selectedProduct && (
                                  <div className="bg-muted/20 rounded-lg p-3 border">
                                    <div className="flex items-center gap-2 mb-2">
                                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                                      <span className="font-medium text-sm">{selectedProduct.name}</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      Base Rate: ₹{selectedProduct.rate?.toLocaleString()}/{selectedProduct.unit}
                                    </div>
                                  </div>
                                );
                              })()}
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <Label className="text-xs font-medium text-foreground">Quantity *</Label>
                                  <Input
                                    type="number"
                                    value={productFormData.quantity}
                                    onChange={(e) => handleProductFormChange('quantity', e.target.value)}
                                    placeholder="Enter qty"
                                    min="1"
                                    className="h-9 mt-1"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs font-medium text-foreground">Discount (%)</Label>
                                  <Input
                                    type="number"
                                    value={productFormData.discount}
                                    onChange={(e) => handleProductFormChange('discount', e.target.value)}
                                    placeholder="0"
                                    min="0"
                                    max="100"
                                    className="h-9 mt-1"
                                  />
                                </div>
                              </div>
                              
                              <div>
                                <Label className="text-xs font-medium text-foreground">Discounted Price (₹) *</Label>
                                <Input
                                  type="number"
                                  value={productFormData.discountedPrice}
                                  onChange={(e) => handleProductFormChange('discountedPrice', e.target.value)}
                                  placeholder="Final amount after discount"
                                  min="0"
                                  className="h-9 mt-1"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  Enter the final price or use discount % above
                                </p>
                              </div>
                              
                              {productFormData.quantity && productFormData.productId && (() => {
                                const selectedProduct = products.find(p => p.id === productFormData.productId);
                                const quantity = parseFloat(productFormData.quantity) || 0;
                                const baseTotal = selectedProduct ? selectedProduct.rate * quantity : 0;
                                const finalPrice = parseFloat(productFormData.discountedPrice) || baseTotal;
                                const savings = baseTotal - finalPrice;
                                
                                return baseTotal > 0 && (
                                  <div className="bg-primary/5 rounded-lg p-3 space-y-1">
                                    <div className="flex justify-between text-xs">
                                      <span>Base Amount:</span>
                                      <span>₹{baseTotal.toLocaleString()}</span>
                                    </div>
                                    {savings > 0 && (
                                      <div className="flex justify-between text-xs text-green-600">
                                        <span>Savings:</span>
                                        <span>-₹{savings.toLocaleString()}</span>
                                      </div>
                                    )}
                                    <div className="flex justify-between text-sm font-medium border-t pt-1">
                                      <span>Final Amount:</span>
                                      <span className="text-primary">₹{finalPrice.toLocaleString()}</span>
                                    </div>
                                  </div>
                                );
                              })()}
                              
                              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                                <Button 
                                  type="button" 
                                  onClick={editingProduct ? updateProduct : addProduct}
                                  size="sm" 
                                  className="flex-1"
                                  disabled={!productFormData.productId || !productFormData.quantity}
                                >
                                  {editingProduct ? (
                                    <>
                                      <Check className="w-3 h-3 mr-1" />
                                      Update Product
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="w-3 h-3 mr-1" />
                                      Add to Order
                                    </>
                                  )}
                                </Button>
                                {editingProduct && (
                                  <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      setEditingProduct(null);
                                      setProductFormData({ productId: "", quantity: "", discount: "", discountedPrice: "" });
                                      setProductSearchOpen(false);
                                    }}
                                    className="sm:w-auto"
                                  >
                                    <X className="w-3 h-3 mr-1" />
                                    Cancel
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                {selectedProducts.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Selected Products</Label>
                    {selectedProducts.map((product) => (
                      <Card key={product.id} className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                              <div className="font-medium text-sm">{product.name}</div>
                              <div className="text-xs text-muted-foreground">
                                ₹{product.rate.toLocaleString()}/{product.unit}
                              </div>
                            </div>
                            <div className="text-sm">
                              <div>Qty: {product.quantity}</div>
                              <div className="text-muted-foreground">Discount: {product.discount}%</div>
                            </div>
                            <div className="text-sm font-medium">
                              Total: ₹{product.discountedPrice.toLocaleString()}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => editProduct(product.id)}
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeProduct(product.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                    
                    <div className="border-t pt-3">
                      <div className="font-medium text-right">
                        Total Order Value: ₹{selectedProducts.reduce((sum, p) => sum + p.discountedPrice, 0).toLocaleString()}
                      </div>
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