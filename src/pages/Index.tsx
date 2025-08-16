import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import SalesOrderForm from "@/components/SalesOrderForm";
import { FileText, Plus } from "lucide-react";

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isCompanyRegistered, setIsCompanyRegistered] = useState(false);
  const [checkingCompany, setCheckingCompany] = useState(true);
  const [showSalesOrderForm, setShowSalesOrderForm] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      checkCompanyRegistration();
    }
  }, [user]);

  const checkCompanyRegistration = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (profile?.company_id) {
        const { data: company } = await supabase
          .from('companies')
          .select('name, address, gstin, state, bank_account_holder, bank_name, bank_account_no, bank_ifsc, telegram_chat_id')
          .eq('id', profile.company_id)
          .single();

        if (company) {
          // Check if all required fields are filled
          const requiredFields = [
            company.name,
            company.address,
            company.gstin,
            company.state,
            company.bank_account_holder,
            company.bank_name,
            company.bank_account_no,
            company.bank_ifsc,
            company.telegram_chat_id
          ];
          
          const allFieldsFilled = requiredFields.every(field => field && field.trim() !== '');
          setIsCompanyRegistered(allFieldsFilled);
        }
      }
    } catch (error) {
      console.error("Error checking company registration:", error);
    } finally {
      setCheckingCompany(false);
    }
  };

  const handleGenerateSalesOrder = () => {
    if (!isCompanyRegistered) {
      toast({
        title: "Company Registration Required",
        description: "Please register the company first before generating sales orders.",
        variant: "destructive",
      });
      return;
    }
    setShowSalesOrderForm(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold">Sales Order Portal</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">{user.email}</span>
              <Button variant="outline" onClick={signOut}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Generate Sales Order Button */}
          <div className="flex justify-center">
            <Button 
              size="lg" 
              onClick={handleGenerateSalesOrder}
              className="px-8 py-3 text-lg"
              disabled={checkingCompany}
            >
              <Plus className="w-5 h-5 mr-2" />
              Generate Sales Order
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Company Settings</CardTitle>
                <CardDescription>
                  Manage your company details, branding, and integration settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => navigate("/settings")}>
                  Configure Settings
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Product Catalog</CardTitle>
                <CardDescription>
                  Import and manage your master product list
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => navigate("/products")}>
                  Manage Products
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Product Shortcuts</CardTitle>
                <CardDescription>
                  Create shortcuts for frequently used products
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => navigate("/shortcuts")}>
                  Manage Shortcuts
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <SalesOrderForm 
          open={showSalesOrderForm} 
          onClose={() => setShowSalesOrderForm(false)} 
        />
      </main>
    </div>
  );
};

export default Index;
