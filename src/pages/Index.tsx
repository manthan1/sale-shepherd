
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Settings, FileText, Package, Zap, LogOut, AlertCircle, Eye, Users, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SalesOrderForm from "@/components/SalesOrderForm";
import HeroSection from "@/components/HeroSection";

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isCompanyRegistered, setIsCompanyRegistered] = useState(false);
  const [hasCompanyRecord, setHasCompanyRecord] = useState(false);
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
        setHasCompanyRecord(true);
        
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
      } else {
        setHasCompanyRecord(false);
        setIsCompanyRegistered(false);
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
        description: "Please complete your company registration first before generating sales orders.",
        variant: "destructive",
      });
      return;
    }
    setShowSalesOrderForm(true);
  };

  const handleTryNow = () => {
    // Open trial form
    setShowTrialForm(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {user ? (
        <div>
          {/* Header */}
          <header className="bg-white border-b border-border sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-6">
                <div>
                  <h1 className="text-3xl font-bold text-black mb-1">
                    Dashboard.
                    <br />
                    <span className="text-primary">AI does the math.</span>
                  </h1>
                  <p className="text-muted-foreground">Welcome back, {user.email}</p>
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

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
            {/* Generate Sales Order Section */}
            <Card className="border-border shadow-sm">
              <CardContent className="p-8">
                <div className="text-center space-y-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                    <FileText className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-black mb-3">Generate Sales Order</h2>
                    <p className="text-lg text-muted-foreground mb-8">Create professional sales orders instantly</p>
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
                    className="px-8 py-4 text-lg h-12"
                  >
                    <FileText className="w-5 h-5 mr-2" />
                    Generate Sales Order
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <Card className="hover:shadow-lg transition-all duration-200 border-border">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg text-black">
                    <Settings className="w-5 h-5 text-primary" />
                    Company Settings
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    {hasCompanyRecord 
                      ? "Configure your company details and preferences" 
                      : "Add your company details to get started"
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => navigate("/company-settings")} 
                    className="w-full h-11"
                    variant="outline"
                  >
                    {hasCompanyRecord ? (
                      <>
                        <Settings className="w-4 h-4 mr-2" />
                        Manage Settings
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Company Details
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-200 border-border">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg text-black">
                    <Package className="w-5 h-5 text-primary" />
                    Product Catalog
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Manage your product inventory and pricing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => navigate("/product-catalog")} 
                    className="w-full h-11" 
                    variant="outline"
                  >
                    View Catalog
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-200 border-border">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg text-black">
                    <Zap className="w-5 h-5 text-primary" />
                    Product Shortcuts
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Create quick shortcuts for frequently used products
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => navigate("/product-shortcuts")} 
                    className="w-full h-11" 
                    variant="outline"
                  >
                    Manage Shortcuts
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-200 border-border">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg text-black">
                    <Eye className="w-5 h-5 text-primary" />
                    Sales Orders
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    View and manage your generated sales orders
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => navigate("/sales-orders")} 
                    className="w-full h-11" 
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
        // Show hero section for non-authenticated users
        <HeroSection onTryDemo={handleTryNow} />
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
