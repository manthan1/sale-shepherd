import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Settings, FileText, Package, Zap, LogOut, AlertCircle, Eye, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SalesOrderForm from "@/components/SalesOrderForm";

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isCompanyRegistered, setIsCompanyRegistered] = useState(false);
  const [checkingCompany, setCheckingCompany] = useState(true);
  const [showSalesOrderForm, setShowSalesOrderForm] = useState(false);
  const [showTrialForm, setShowTrialForm] = useState(false);

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {user ? (
        <div>
          {/* Header */}
          <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Sales Order Dashboard</h1>
                  <p className="text-sm text-slate-600">Welcome back, {user.email}</p>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant={isCompanyRegistered ? "default" : "destructive"}>
                    {isCompanyRegistered ? "Company Registered" : "Registration Required"}
                  </Badge>
                  <Button variant="outline" onClick={signOut} className="flex items-center gap-2">
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </div>
          </header>

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            {/* Generate Sales Order Section */}
            <Card className="bg-white/50 backdrop-blur-sm border-slate-200">
              <CardContent className="p-8">
                <div className="text-center space-y-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                    <FileText className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Generate Sales Order</h2>
                    <p className="text-slate-600 mb-6">Create professional sales orders instantly</p>
                  </div>
                  
                  {!isCompanyRegistered && (
                    <Card className="bg-amber-50 border-amber-200 max-w-md mx-auto">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                          <AlertCircle className="w-5 h-5 text-amber-600" />
                          <p className="text-sm text-amber-800">
                            Please complete your company registration first
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  <Button 
                    size="lg" 
                    onClick={handleGenerateSalesOrder}
                    disabled={checkingCompany || !isCompanyRegistered}
                    className="px-8 py-3 text-lg"
                  >
                    <FileText className="w-5 h-5 mr-2" />
                    Generate Sales Order
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Company Settings
                  </CardTitle>
                  <CardDescription>
                    Configure your company details and preferences
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => navigate("/company-settings")} 
                    className="w-full"
                  >
                    Manage Settings
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Product Catalog
                  </CardTitle>
                  <CardDescription>
                    Manage your product inventory and pricing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => navigate("/product-catalog")} 
                    className="w-full" 
                    variant="outline"
                  >
                    View Catalog
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Product Shortcuts
                  </CardTitle>
                  <CardDescription>
                    Create quick shortcuts for frequently used products
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => navigate("/product-shortcuts")} 
                    className="w-full" 
                    variant="outline"
                  >
                    Manage Shortcuts
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    Sales Orders
                  </CardTitle>
                  <CardDescription>
                    View and manage your generated sales orders
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => navigate("/sales-orders")} 
                    className="w-full" 
                    variant="outline"
                  >
                    View Orders
                  </Button>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      ) : (
        // Show login/signup form for non-authenticated users
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center px-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Welcome to Sales Order Generator</CardTitle>
              <CardDescription className="text-center">
                Generate professional sales orders instantly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={() => navigate("/auth")} 
                className="w-full"
              >
                <Users className="w-4 h-4 mr-2" />
                Sign In / Sign Up
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or try it first
                  </span>
                </div>
              </div>

              <Button 
                onClick={() => setShowTrialForm(true)} 
                variant="outline"
                className="w-full"
              >
                <FileText className="w-4 h-4 mr-2" />
                Try Now (No Registration)
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <SalesOrderForm 
        open={showSalesOrderForm} 
        onClose={() => setShowSalesOrderForm(false)} 
      />

      <SalesOrderForm 
        open={showTrialForm} 
        onClose={() => setShowTrialForm(false)}
        isTrialMode={true}
      />
    </div>
  );
};

export default Index;