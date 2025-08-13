import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "@/components/FileUpload";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Save, Building2, Palette, Settings } from "lucide-react";

interface CompanyData {
  id: string;
  name: string;
  address: string | null;
  gstin: string | null;
  state: string | null;
  bank_account_holder: string | null;
  bank_name: string | null;
  bank_account_no: string | null;
  bank_ifsc: string | null;
  logo_url: string | null;
  pdf_background_url: string | null;
  payment_qr_url: string | null;
  telegram_bot_token: string | null;
}

const CompanySettings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);

  useEffect(() => {
    fetchCompanyData();
  }, [user]);

  const fetchCompanyData = async () => {
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
          .select('*')
          .eq('id', profile.company_id)
          .single();

        if (company) {
          setCompanyData(company);
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load company data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CompanyData, value: string) => {
    if (!companyData) return;
    setCompanyData(prev => prev ? { ...prev, [field]: value } : null);
  };

  const handleFileUpload = async (file: File, field: 'logo_url' | 'pdf_background_url' | 'payment_qr_url') => {
    // For now, we'll just show a message that file upload needs storage setup
    toast({
      title: "File Upload",
      description: "File upload functionality requires storage setup. Coming soon!",
    });
  };

  const handleSave = async () => {
    if (!companyData) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          address: companyData.address,
          gstin: companyData.gstin,
          state: companyData.state,
          bank_account_holder: companyData.bank_account_holder,
          bank_name: companyData.bank_name,
          bank_account_no: companyData.bank_account_no,
          bank_ifsc: companyData.bank_ifsc,
          telegram_bot_token: companyData.telegram_bot_token,
        })
        .eq('id', companyData.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Company settings saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save company settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
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

  if (!companyData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">Company data not found</p>
          <Button onClick={() => navigate("/")} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <h1 className="text-2xl font-bold">Company Settings</h1>
            </div>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Company Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Company Details
              </CardTitle>
              <CardDescription>
                Update your company information and bank details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Company Name</Label>
                  <Input
                    id="name"
                    value={companyData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="gstin">GSTIN</Label>
                  <Input
                    id="gstin"
                    value={companyData.gstin || ''}
                    onChange={(e) => handleInputChange('gstin', e.target.value)}
                    placeholder="Enter GSTIN"
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={companyData.state || ''}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    placeholder="Enter state"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={companyData.address || ''}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Enter company address"
                  rows={3}
                />
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-4">Bank Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bank_account_holder">Account Holder</Label>
                    <Input
                      id="bank_account_holder"
                      value={companyData.bank_account_holder || ''}
                      onChange={(e) => handleInputChange('bank_account_holder', e.target.value)}
                      placeholder="Enter account holder name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bank_name">Bank Name</Label>
                    <Input
                      id="bank_name"
                      value={companyData.bank_name || ''}
                      onChange={(e) => handleInputChange('bank_name', e.target.value)}
                      placeholder="Enter bank name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bank_account_no">Account Number</Label>
                    <Input
                      id="bank_account_no"
                      value={companyData.bank_account_no || ''}
                      onChange={(e) => handleInputChange('bank_account_no', e.target.value)}
                      placeholder="Enter account number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bank_ifsc">IFSC Code</Label>
                    <Input
                      id="bank_ifsc"
                      value={companyData.bank_ifsc || ''}
                      onChange={(e) => handleInputChange('bank_ifsc', e.target.value)}
                      placeholder="Enter IFSC code"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Branding */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Branding
              </CardTitle>
              <CardDescription>
                Upload your company logo, PDF background, and payment QR code
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FileUpload
                label="Company Logo"
                description="Upload your company logo (PNG, JPG, SVG)"
                accept="image/*"
                onFileSelect={(file) => handleFileUpload(file, 'logo_url')}
                buttonText="Upload Logo"
              />

              <FileUpload
                label="PDF Background Image"
                description="Upload background image for PDF documents"
                accept="image/*"
                onFileSelect={(file) => handleFileUpload(file, 'pdf_background_url')}
                buttonText="Upload Background"
              />

              <FileUpload
                label="Payment QR Code"
                description="Upload your payment QR code image"
                accept="image/*"
                onFileSelect={(file) => handleFileUpload(file, 'payment_qr_url')}
                buttonText="Upload QR Code"
              />
            </CardContent>
          </Card>

          {/* Integration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Integration
              </CardTitle>
              <CardDescription>
                Configure external integrations and API tokens
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="telegram_bot_token">Telegram Bot API Token</Label>
                <Input
                  id="telegram_bot_token"
                  type="password"
                  value={companyData.telegram_bot_token || ''}
                  onChange={(e) => handleInputChange('telegram_bot_token', e.target.value)}
                  placeholder="Enter Telegram Bot API Token"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default CompanySettings;