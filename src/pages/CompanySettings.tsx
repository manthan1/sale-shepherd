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
  authorized_signature_url: string | null;
  telegram_chat_id: string | null;
}

// Add this type definition
type UploadableField = 'logo_url' | 'pdf_background_url' | 'payment_qr_url' | 'authorized_signature_url';

const CompanySettings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const [isCreateMode, setIsCreateMode] = useState(false);

  // --- ADD THIS LINE ---
  const [uploadingField, setUploadingField] = useState<UploadableField | null>(null);

  useEffect(() => {
    fetchCompanyData();
  }, [user]);

  // Autosave draft to localStorage
  useEffect(() => {
    if (companyData && isCreateMode) {
      localStorage.setItem('companyDraft', JSON.stringify(companyData));
    }
  }, [companyData, isCreateMode]);

  // Load draft from localStorage on mount for create mode
  useEffect(() => {
    if (isCreateMode && companyData && companyData.name === '') {
      const draft = localStorage.getItem('companyDraft');
      if (draft) {
        try {
          const parsedDraft = JSON.parse(draft);
          setCompanyData(parsedDraft);
        } catch (error) {
          // Invalid draft, ignore
        }
      }
    }
  }, [isCreateMode]);

  const fetchCompanyData = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (profile?.company_id) {
        // User has company_id, try to fetch company data
        const { data: company } = await supabase
          .from('companies')
          .select('*')
          .eq('id', profile.company_id)
          .single();

        if (company) {
          setCompanyData(company);
          setIsCreateMode(false);
        } else {
          // Company record doesn't exist, but profile has company_id - this shouldn't happen
          initializeEmptyCompanyData();
        }
      } else {
        // No company_id in profile, user needs to create company
        initializeEmptyCompanyData();
      }
    } catch (error) {
      // Error fetching data, but user might still need to create company
      initializeEmptyCompanyData();
    } finally {
      setLoading(false);
    }
  };

  const initializeEmptyCompanyData = () => {
    setCompanyData({
      id: '', // Will be generated during creation
      name: '',
      address: '',
      gstin: '',
      state: '',
      bank_account_holder: '',
      bank_name: '',
      bank_account_no: '',
      bank_ifsc: '',
      logo_url: null,
      pdf_background_url: null,
      payment_qr_url: null,
      authorized_signature_url: null,
      telegram_chat_id: '',
    });
    setIsCreateMode(true);
  };

  const handleInputChange = (field: keyof CompanyData, value: string) => {
    if (!companyData) return;
    setCompanyData(prev => prev ? { ...prev, [field]: value } : null);
  };

  // const handleFileUpload = async (file: File, field: 'logo_url' | 'pdf_background_url' | 'payment_qr_url') => {
  //   // For now, we'll just show a message that file upload needs storage setup
  //   toast({
  //     title: "File Upload",
  //     description: "File upload functionality requires storage setup. Coming soon!",
  //   });
  // };


  const handleFileUpload = async (file: File, field: UploadableField) => {
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in to upload files.", variant: "destructive" });
      return;
    }

    setUploadingField(field); // Start loading state for this specific field
    try {
      const bucketName = 'company_assets'; // The bucket name you created in Supabase
      // Create a unique file path: user_id/field_name/timestamp-filename.png
      const filePath = `${user.id}/${field}/${Date.now()}-${file.name}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get the public URL of the uploaded file
      const { data } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      if (!data || !data.publicUrl) {
        throw new Error("Could not get public URL for the uploaded file.");
      }
      
      // Update the component's state with the new URL
      setCompanyData(prev => prev ? { ...prev, [field]: data.publicUrl } : null);

      toast({
        title: "Upload Successful",
        description: `${field.replace('_url', '').replace('_', ' ')} has been uploaded.`,
      });

    } catch (error) {
      console.error('File upload error:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred during upload.",
        variant: "destructive",
      });
    } finally {
      setUploadingField(null); // Stop loading state
    }
};

  const handleSave = async () => {
    if (!companyData || !user) return;

    // Validate required fields
    const requiredFields = {
      name: companyData.name,
      address: companyData.address,
      gstin: companyData.gstin,
      state: companyData.state,
      bank_account_holder: companyData.bank_account_holder,
      bank_name: companyData.bank_name,
      bank_account_no: companyData.bank_account_no,
      bank_ifsc: companyData.bank_ifsc,
      telegram_chat_id: companyData.telegram_chat_id,
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value || value.trim() === '')
      .map(([key, _]) => key.replace('_', ' ').toUpperCase());

    if (missingFields.length > 0) {
      toast({
        title: "Missing Required Fields",
        description: `Please fill in: ${missingFields.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {

      const dataToSave = {
      name: companyData.name.trim(),
      address: companyData.address?.trim(),
      gstin: companyData.gstin?.trim(),
      state: companyData.state?.trim(),
      bank_account_holder: companyData.bank_account_holder?.trim(),
      bank_name: companyData.bank_name?.trim(),
      bank_account_no: companyData.bank_account_no?.trim(),
      bank_ifsc: companyData.bank_ifsc?.trim(),
      telegram_chat_id: companyData.telegram_chat_id?.trim(),
      // --- ADD THESE LINES TO INCLUDE IMAGE URLs ---
      logo_url: companyData.logo_url,
      pdf_background_url: companyData.pdf_background_url,
      payment_qr_url: companyData.payment_qr_url,
      authorized_signature_url: companyData.authorized_signature_url,
  };

      
      if (isCreateMode) {

          // Create new company
      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert(dataToSave) // --- USE THE dataToSave OBJECT ---
        .select()
        .single();
        
        // Create new company
        // const { data: newCompany, error: companyError } = await supabase
        //   .from('companies')
        //   .insert({
        //     name: companyData.name.trim(),
        //     address: companyData.address?.trim(),
        //     gstin: companyData.gstin?.trim(),
        //     state: companyData.state?.trim(),
        //     bank_account_holder: companyData.bank_account_holder?.trim(),
        //     bank_name: companyData.bank_name?.trim(),
        //     bank_account_no: companyData.bank_account_no?.trim(),
        //     bank_ifsc: companyData.bank_ifsc?.trim(),
        //     telegram_chat_id: companyData.telegram_chat_id?.trim(),

        //   })
        //   .select()
        //   .single();

        if (companyError) throw companyError;

        // Update user profile with new company_id or create if doesn't exist
        const { data: updatedProfile, error: profileError } = await supabase
          .from('profiles')
          .update({ company_id: newCompany.id })
          .eq('user_id', user.id)
          .select();

        if (profileError) throw profileError;

        // If no profile was updated (doesn't exist), create a new one
        if (!updatedProfile || updatedProfile.length === 0) {
          const { error: createProfileError } = await supabase
            .from('profiles')
            .insert({
              user_id: user.id,
              email: user.email || '',
              company_id: newCompany.id,
              role: 'admin'
            });

          if (createProfileError) throw createProfileError;
        }

        // Update local state
        setCompanyData(newCompany);
        setIsCreateMode(false);

        // Clear draft from localStorage after successful creation
        localStorage.removeItem('companyDraft');

        toast({
          title: "Success",
          description: "Company details created successfully",
        });

        // Navigate back to home to refresh company registration status
        setTimeout(() => {
          navigate("/");
        }, 1000);
      } else {

        const { error } = await supabase
        .from('companies')
        .update(dataToSave) // --- USE THE dataToSave OBJECT ---
        .eq('id', companyData.id);
        
        // Update existing company
        // const { error } = await supabase
        //   .from('companies')
        //   .update({
        //     name: companyData.name.trim(),
        //     address: companyData.address?.trim(),
        //     gstin: companyData.gstin?.trim(),
        //     state: companyData.state?.trim(),
        //     bank_account_holder: companyData.bank_account_holder?.trim(),
        //     bank_name: companyData.bank_name?.trim(),
        //     bank_account_no: companyData.bank_account_no?.trim(),
        //     bank_ifsc: companyData.bank_ifsc?.trim(),
        //     telegram_chat_id: companyData.telegram_chat_id?.trim(),
        //   })
        //   .eq('id', companyData.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Company settings updated successfully",
        });

        // Navigate back to home to refresh company registration status
        setTimeout(() => {
          navigate("/");
        }, 1000);
      }
    } catch (error) {
      console.error('Company operation error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : (isCreateMode ? "Failed to create company details" : "Failed to update company settings"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!companyData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">Unable to load company data</p>
          <Button onClick={() => navigate("/")} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-black">
                  {isCreateMode ? "Company Setup." : "Company Settings."}
                  <br />
                  <span className="text-primary">AI does the rest.</span>
                </h1>
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} className="h-11 px-6 w-full sm:w-auto">
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : isCreateMode ? "Create Company" : "Save Changes"}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="space-y-8">
          {/* Company Details */}
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-black">
                <Building2 className="w-5 h-5 text-primary" />
                Company Details
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {isCreateMode 
                  ? "Enter your company information and bank details to get started" 
                  : "Update your company information and bank details"
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Company Name *</Label>
                  <Input
                    id="name"
                    value={companyData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="gstin">GSTIN *</Label>
                  <Input
                    id="gstin"
                    value={companyData.gstin || ''}
                    onChange={(e) => handleInputChange('gstin', e.target.value)}
                    placeholder="Enter GSTIN"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    value={companyData.state || ''}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    placeholder="Enter state"
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="address">Address *</Label>
                <Textarea
                  id="address"
                  value={companyData.address || ''}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Enter company address"
                  rows={3}
                  required
                />
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-4">Bank Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bank_account_holder">Account Holder *</Label>
                    <Input
                      id="bank_account_holder"
                      value={companyData.bank_account_holder || ''}
                      onChange={(e) => handleInputChange('bank_account_holder', e.target.value)}
                      placeholder="Enter account holder name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="bank_name">Bank Name *</Label>
                    <Input
                      id="bank_name"
                      value={companyData.bank_name || ''}
                      onChange={(e) => handleInputChange('bank_name', e.target.value)}
                      placeholder="Enter bank name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="bank_account_no">Account Number *</Label>
                    <Input
                      id="bank_account_no"
                      value={companyData.bank_account_no || ''}
                      onChange={(e) => handleInputChange('bank_account_no', e.target.value)}
                      placeholder="Enter account number"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="bank_ifsc">IFSC Code *</Label>
                    <Input
                      id="bank_ifsc"
                      value={companyData.bank_ifsc || ''}
                      onChange={(e) => handleInputChange('bank_ifsc', e.target.value)}
                      placeholder="Enter IFSC code"
                      required
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

                // --- ADD THESE PROPS ---
                currentImageUrl={companyData.logo_url}
                isUploading={uploadingField === 'logo_url'}
                
              />

              <FileUpload
                label="PDF Background Image"
                description="Upload background image for PDF documents"
                accept="image/*"
                onFileSelect={(file) => handleFileUpload(file, 'pdf_background_url')}
                buttonText="Upload Background"

                 // --- ADD THESE PROPS ---
                currentImageUrl={companyData.pdf_background_url}
                isUploading={uploadingField === 'pdf_background_url'}
                
              />

              <FileUpload
                label="Payment QR Code"
                description="Upload your payment QR code image"
                accept="image/*"
                onFileSelect={(file) => handleFileUpload(file, 'payment_qr_url')}
                buttonText="Upload QR Code"

                 // --- ADD THESE PROPS ---
                currentImageUrl={companyData.payment_qr_url}
                isUploading={uploadingField === 'payment_qr_url'}
                
              />

              <FileUpload
                label="Authorized Signature"
                description="Upload authorized signature image"
                accept="image/*"
                onFileSelect={(file) => handleFileUpload(file, 'authorized_signature_url')}
                buttonText="Upload Signature"
                currentImageUrl={companyData.authorized_signature_url}
                isUploading={uploadingField === 'authorized_signature_url'}
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
                <Label htmlFor="telegram_chat_id">Telegram Chat ID *</Label>
                <Input
                  id="telegram_chat_id"
                  value={companyData.telegram_chat_id || ''}
                  onChange={(e) => handleInputChange('telegram_chat_id', e.target.value)}
                  placeholder="Enter Telegram Chat ID"
                  required
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