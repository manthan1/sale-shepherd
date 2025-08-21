import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { FileText, ExternalLink, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

interface SalesOrder {
  id: string;
  customer_name: string;
  shipping_address: string | null;
  state: string | null;
  contact_number: string | null;
  order_details: string;
  pdf_url: string | null;
  is_trial: boolean;
  created_at: string;
}

const SalesOrders = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSalesOrders();
  }, []);

  const fetchSalesOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sales_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching sales orders:', error);
        toast({
          title: "Error",
          description: "Failed to fetch sales orders",
          variant: "destructive",
        });
      } else {
        setOrders(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShowPdf = (pdfUrl: string) => {
    window.open(pdfUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-8 h-8 animate-pulse mx-auto mb-2" />
          <p>Loading sales orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 sm:py-8 px-4 space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="sm:inline">Back to Dashboard</span>
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Sales Orders</h1>
              <p className="text-muted-foreground mt-1 text-sm sm:text-base">Manage and view your generated sales orders</p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs sm:text-sm self-start sm:self-auto">
            {orders.length} {orders.length === 1 ? 'Order' : 'Orders'}
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Order History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No sales orders yet</h3>
                <p className="text-slate-600 mb-4">
                  Create your first sales order to see it listed here.
                </p>
                <Button onClick={() => navigate('/')} className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Create Sales Order
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Customer</TableHead>
                      <TableHead className="min-w-[100px]">State</TableHead>
                      <TableHead className="min-w-[120px]">Contact</TableHead>
                      <TableHead className="min-w-[200px]">Order Details</TableHead>
                      <TableHead className="min-w-[80px]">Type</TableHead>
                      <TableHead className="min-w-[120px]">Date</TableHead>
                      <TableHead className="min-w-[120px]">PDF</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">
                          <div>
                            <p className="font-medium">{order.customer_name}</p>
                            {order.shipping_address && (
                              <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                {order.shipping_address}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{order.state || "-"}</TableCell>
                        <TableCell>{order.contact_number || "-"}</TableCell>
                        <TableCell>
                          <div className="max-w-[300px] truncate" title={order.order_details}>
                            {order.order_details}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={order.is_trial ? "secondary" : "default"}>
                            {order.is_trial ? "Trial" : "Live"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(order.created_at), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          {order.pdf_url ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleShowPdf(order.pdf_url!)}
                              className="flex items-center gap-2"
                            >
                              <ExternalLink className="w-4 h-4" />
                              View PDF
                            </Button>
                          ) : (
                            <span className="text-muted-foreground">No PDF</span>
                          )}
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
    </div>
  );
};

export default SalesOrders;