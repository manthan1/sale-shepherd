import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileText, ExternalLink, ArrowLeft, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface TrialSalesOrder {
  id: string;
  customer_name: string;
  shipping_address: string;
  state: string;
  contact_number: string;
  order_details: string;
  pdf_url: string | null;
  created_at: string;
}

const TrialDashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<TrialSalesOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTrialOrders();
  }, []);

  const fetchTrialOrders = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('sales_orders')
        .select('*')
        .eq('is_trial', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching trial orders:', error);
        toast({
          title: "Error",
          description: "Failed to load trial orders",
          variant: "destructive",
        });
        return;
      }

      setOrders(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to load trial orders",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowPdf = (pdfUrl: string) => {
    window.open(pdfUrl, '_blank');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Loading trial orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <Button 
            variant="outline" 
            onClick={() => navigate('/')}
            className="mb-4 w-full sm:w-auto"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
          
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2">Trial Sales Orders</h1>
            <p className="text-base sm:text-lg text-muted-foreground mb-4 px-2">View your recently generated trial sales orders</p>
            
            <Card className="bg-amber-50 border-amber-200 max-w-2xl mx-auto">
              <CardContent className="pt-6 px-4 sm:px-6">
                <div className="flex items-center justify-center gap-2 text-amber-800 text-center">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <p className="text-xs sm:text-sm">
                    <strong>Note:</strong> Trial orders are available for viewing for 1 hour after creation.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {orders.length === 0 ? (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="pt-6 text-center px-4 sm:px-6">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Trial Orders Found</h3>
              <p className="text-muted-foreground mb-4 text-sm sm:text-base">
                No trial sales orders found in the past hour. Create a new trial order to see it here.
              </p>
              <Button onClick={() => navigate('/')}>
                Create Trial Order
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {orders.map((order) => (
              <Card key={order.id} className="max-w-4xl mx-auto">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      <span>Order for {order.customer_name}</span>
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      {formatDate(order.created_at)}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Customer Name</p>
                      <p className="font-medium">{order.customer_name}</p>
                    </div>
                    {order.state && (
                      <div>
                        <p className="text-sm text-muted-foreground">State</p>
                        <p className="font-medium">{order.state}</p>
                      </div>
                    )}
                    {order.contact_number && (
                      <div>
                        <p className="text-sm text-muted-foreground">Contact</p>
                        <p className="font-medium">{order.contact_number}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">Type</p>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-secondary text-secondary-foreground">
                        Trial
                      </span>
                    </div>
                  </div>
                  
                  {order.shipping_address && (
                    <div className="mb-4">
                      <p className="text-sm text-muted-foreground">Shipping Address</p>
                      <p className="font-medium break-words">{order.shipping_address}</p>
                    </div>
                  )}
                  
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground">Order Details</p>
                    <p className="font-medium break-words">{order.order_details}</p>
                  </div>

                  <div className="flex justify-end">
                    {order.pdf_url ? (
                      <Button 
                        onClick={() => handleShowPdf(order.pdf_url!)}
                        className="flex items-center gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View PDF
                      </Button>
                    ) : (
                      <Button variant="outline" disabled>
                        PDF Not Available
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrialDashboard;