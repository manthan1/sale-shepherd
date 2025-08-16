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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto py-8 px-4 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Sales Orders</h1>
              <p className="text-slate-600 mt-1">Manage and view your generated sales orders</p>
            </div>
          </div>
          <Badge variant="outline" className="text-sm">
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Order Details</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>PDF</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">
                          <div>
                            <p className="font-medium">{order.customer_name}</p>
                            {order.shipping_address && (
                              <p className="text-sm text-slate-600 truncate max-w-[200px]">
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
                            <span className="text-slate-400">No PDF</span>
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