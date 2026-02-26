import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle, ArrowLeft, Clock, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { generateSalesOrderPdf, PdfProduct, PdfCompanyData } from "@/utils/generateSalesOrderPdf";

interface PendingOrder {
  id: string;
  customer_name: string;
  shipping_address: string | null;
  state: string | null;
  contact_number: string | null;
  order_details: string;
  status: string;
  pending_approval_reason: string | null;
  created_at: string;
  freight_expense: number | null;
  cust_gst_number: string | null;
  company_id: string | null;
}

const PendingApprovals = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('employee');
  const [actionDialog, setActionDialog] = useState<{ open: boolean; order: PendingOrder | null; action: 'approve' | 'reject' }>({
    open: false, order: null, action: 'approve'
  });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserRole();
      fetchPendingOrders();
    }
  }, [user]);

  const fetchUserRole = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user?.id)
      .single();
    if (data) setUserRole(data.role);
  };

  const fetchPendingOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sales_orders')
        .select('*')
        .eq('status', 'pending_approval')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching pending orders:', error);
        toast({ title: "Error", description: "Failed to fetch pending orders", variant: "destructive" });
      } else {
        setOrders(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (order: PendingOrder) => {
    setProcessing(true);
    try {
      // Fetch company data for PDF generation
      let companyData: PdfCompanyData | null = null;
      if (order.company_id) {
        const { data: company } = await supabase
          .from('companies')
          .select('*')
          .eq('id', order.company_id)
          .single();
        if (company) {
          companyData = {
            name: company.name,
            address: company.address || "",
            gstin: company.gstin || "",
            state: company.state || "",
            bank_account_holder: company.bank_account_holder || "",
            bank_name: company.bank_name || "",
            bank_account_no: company.bank_account_no || "",
            bank_ifsc: company.bank_ifsc || "",
            logo_url: company.logo_url,
            authorized_signature_url: company.authorized_signature_url,
            payment_qr_url: company.payment_qr_url,
          };
        }
      }

      if (!companyData) throw new Error("Company data not found");

      // Parse order_details back into products (best effort)
      // Order details format: "qty name - discount% discount" per line
      const pdfProducts: PdfProduct[] = [];
      const lines = order.order_details.split('\n').filter(Boolean);
      for (const line of lines) {
        const match = line.match(/^([\d.]+)\s+(.+?)(?:\s*-\s*([\d.]+)%\s*discount)?$/i);
        if (match) {
          const qty = parseFloat(match[1]) || 1;
          const productName = match[2].trim();
          const discount = parseFloat(match[3]) || 0;

          // Try to find actual product in DB
          const { data: productData } = await supabase
            .from('products')
            .select('*')
            .eq('company_id', order.company_id!)
            .ilike('name', productName)
            .limit(1)
            .single();

          if (productData) {
            pdfProducts.push({
              name: productData.name,
              hsn_sac: productData.hsn_sac || "",
              quantity: qty,
              rate: productData.rate,
              unit: productData.unit || "PCS",
              discount,
              tax_rate: productData.tax_rate || 0,
            });
          }
        }
      }

      let pdfUrl: string | null = null;
      if (pdfProducts.length > 0) {
        pdfUrl = await generateSalesOrderPdf(companyData, {
          customerName: order.customer_name,
          shippingAddress: order.shipping_address || "",
          customerState: order.state || "",
          contactNumber: order.contact_number || "",
          custGstNumber: order.cust_gst_number,
          freightExpense: order.freight_expense || 0,
          products: pdfProducts,
        });
      }

      // Update order status to approved
      const { error } = await supabase
        .from('sales_orders')
        .update({ status: 'approved' })
        .eq('id', order.id);

      if (error) throw error;

      toast({ title: "Order Approved", description: `Order for ${order.customer_name} has been approved and generated.` });

      if (pdfUrl) {
        window.open(pdfUrl, '_blank');
      }

      fetchPendingOrders();
    } catch (error: any) {
      console.error('Approval error:', error);
      toast({ title: "Error", description: error.message || "Failed to approve order", variant: "destructive" });
    } finally {
      setProcessing(false);
      setActionDialog({ open: false, order: null, action: 'approve' });
    }
  };

  const handleReject = async (order: PendingOrder) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('sales_orders')
        .update({ status: 'rejected' })
        .eq('id', order.id);

      if (error) throw error;

      toast({ title: "Order Rejected", description: `Order for ${order.customer_name} has been rejected.` });
      fetchPendingOrders();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to reject order", variant: "destructive" });
    } finally {
      setProcessing(false);
      setActionDialog({ open: false, order: null, action: 'reject' });
    }
  };

  if (userRole !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">Only admins can approve or reject orders.</p>
            <Button onClick={() => navigate('/')}>Back to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-8 h-8 animate-pulse mx-auto mb-2" />
          <p>Loading pending approvals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 sm:py-8 px-4 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/')} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Pending Approvals</h1>
              <p className="text-muted-foreground mt-1 text-sm">Orders requiring admin approval due to excess discounts</p>
            </div>
          </div>
          <Badge variant="outline">
            {orders.length} Pending
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Orders Awaiting Approval
            </CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">All caught up!</h3>
                <p className="text-muted-foreground">No orders pending approval.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[700px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Order Details</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{order.customer_name}</p>
                            {order.contact_number && (
                              <p className="text-sm text-muted-foreground">{order.contact_number}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 max-w-[200px]">
                            <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
                            <span className="text-sm text-destructive truncate" title={order.pending_approval_reason || ''}>
                              {order.pending_approval_reason || "Excess discount"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[250px] truncate" title={order.order_details}>
                            {order.order_details}
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(order.created_at), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => setActionDialog({ open: true, order, action: 'approve' })}
                              className="gap-1"
                            >
                              <CheckCircle className="w-3 h-3" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setActionDialog({ open: true, order, action: 'reject' })}
                              className="gap-1"
                            >
                              <XCircle className="w-3 h-3" />
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => !open && setActionDialog({ open: false, order: null, action: 'approve' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action === 'approve' ? 'Approve Order' : 'Reject Order'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.action === 'approve'
                ? `Are you sure you want to approve the order for "${actionDialog.order?.customer_name}"? This will generate the sales order PDF.`
                : `Are you sure you want to reject the order for "${actionDialog.order?.customer_name}"? This action cannot be undone.`
              }
            </DialogDescription>
          </DialogHeader>
          {actionDialog.order?.pending_approval_reason && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{actionDialog.order.pending_approval_reason}</span>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog({ open: false, order: null, action: 'approve' })} disabled={processing}>
              Cancel
            </Button>
            <Button
              variant={actionDialog.action === 'approve' ? 'default' : 'destructive'}
              disabled={processing}
              onClick={() => {
                if (actionDialog.order) {
                  actionDialog.action === 'approve'
                    ? handleApprove(actionDialog.order)
                    : handleReject(actionDialog.order);
                }
              }}
            >
              {processing ? "Processing..." : actionDialog.action === 'approve' ? 'Approve & Generate' : 'Reject Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PendingApprovals;
