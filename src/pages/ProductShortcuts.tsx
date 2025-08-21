import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExcelUpload } from "@/components/FileUpload";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Zap, Trash2, Plus, Edit } from "lucide-react";
import { parseExcelFile, validateShortcutData, ShortcutRow } from "@/utils/excel";
import ShortcutForm, { ShortcutFormData } from "@/components/ShortcutForm";

interface ProductShortcut {
  id: string;
  full_name: string;
  shortcut_name: string;
  created_at: string;
}

const ProductShortcuts = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [shortcuts, setShortcuts] = useState<ProductShortcut[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [showShortcutForm, setShowShortcutForm] = useState(false);
  const [editingShortcut, setEditingShortcut] = useState<ShortcutFormData | null>(null);

  useEffect(() => {
    fetchShortcuts();
  }, [user]);

  const fetchShortcuts = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (profile?.company_id) {
        setCompanyId(profile.company_id);
        
        const { data: shortcuts } = await supabase
          .from('product_shortcuts')
          .select('*')
          .eq('company_id', profile.company_id)
          .order('created_at', { ascending: false });

        if (shortcuts) {
          setShortcuts(shortcuts);
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load product shortcuts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExcelImport = async (file: File) => {
    if (!companyId) {
      toast({
        title: "Error",
        description: "Company not found",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);
    try {
      const rawData = await parseExcelFile(file);
      const validatedData = validateShortcutData(rawData);

      if (validatedData.length === 0) {
        toast({
          title: "Error",
          description: "No valid shortcut data found in Excel file. Please check the format.",
          variant: "destructive",
        });
        return;
      }

      // Insert shortcuts into database
      const shortcutsToInsert = validatedData.map((row: ShortcutRow) => ({
        company_id: companyId,
        full_name: row['Full Product Name'],
        shortcut_name: row['Shortcut Name'],
      }));

      const { error } = await supabase
        .from('product_shortcuts')
        .insert(shortcutsToInsert);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Successfully imported ${validatedData.length} product shortcuts`,
      });

      fetchShortcuts(); // Refresh the list
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Error",
        description: "Failed to import shortcuts from Excel file",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteShortcut = async (shortcutId: string) => {
    try {
      const { error } = await supabase
        .from('product_shortcuts')
        .delete()
        .eq('id', shortcutId);

      if (error) throw error;

      setShortcuts(prev => prev.filter(s => s.id !== shortcutId));
      toast({
        title: "Success",
        description: "Product shortcut deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete product shortcut",
        variant: "destructive",
      });
    }
  };

  const handleSaveShortcut = async (shortcutData: ShortcutFormData) => {
    if (!companyId) {
      toast({
        title: "Error",
        description: "Company not found",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingShortcut?.id) {
        // Update existing shortcut
        const { error } = await supabase
          .from('product_shortcuts')
          .update({
            full_name: shortcutData.full_name,
            shortcut_name: shortcutData.shortcut_name,
          })
          .eq('id', editingShortcut.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Shortcut updated successfully",
        });
      } else {
        // Create new shortcut
        const { error } = await supabase
          .from('product_shortcuts')
          .insert([{
            company_id: companyId,
            full_name: shortcutData.full_name,
            shortcut_name: shortcutData.shortcut_name,
          }]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Shortcut added successfully",
        });
      }

      fetchShortcuts(); // Refresh the list
      setShowShortcutForm(false);
      setEditingShortcut(null);
    } catch (error) {
      toast({
        title: "Error",
        description: editingShortcut ? "Failed to update shortcut" : "Failed to add shortcut",
        variant: "destructive",
      });
    }
  };

  const handleEditShortcut = (shortcut: ProductShortcut) => {
    setEditingShortcut({
      id: shortcut.id,
      full_name: shortcut.full_name,
      shortcut_name: shortcut.shortcut_name,
    });
    setShowShortcutForm(true);
  };

  const handleAddShortcut = () => {
    setEditingShortcut(null);
    setShowShortcutForm(true);
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

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 gap-4">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Back</span>
              </Button>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 sm:w-6 sm:h-6" />
                <h1 className="text-xl sm:text-2xl font-bold">Product Shortcuts</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Import Section */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle className="text-lg sm:text-xl">Add Product Shortcuts</CardTitle>
                  <CardDescription className="text-sm sm:text-base mt-1">
                    Add individual shortcuts or upload an Excel file with columns: Full Product Name, Shortcut Name
                  </CardDescription>
                </div>
                <Button onClick={handleAddShortcut} className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Shortcut
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ExcelUpload
                label="Shortcuts Excel File"
                description="Excel file with Full Product Name, Shortcut Name columns"
                onFileSelect={handleExcelImport}
              />
              {importing && (
                <div className="mt-4 text-sm text-muted-foreground">
                  Importing shortcuts...
                </div>
              )}
            </CardContent>
          </Card>

          {/* Shortcuts Table */}
          <Card>
            <CardHeader>
              <CardTitle>Product Shortcuts ({shortcuts.length})</CardTitle>
              <CardDescription>
                Your imported product name mappings
              </CardDescription>
            </CardHeader>
            <CardContent>
              {shortcuts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No product shortcuts found. Import your first Excel file to get started.
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[200px]">Full Product Name</TableHead>
                          <TableHead className="min-w-[150px]">Shortcut Name</TableHead>
                          <TableHead className="min-w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                    <TableBody>
                      {shortcuts.map((shortcut) => (
                        <TableRow key={shortcut.id}>
                          <TableCell className="font-medium">{shortcut.full_name}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-accent text-accent-foreground">
                              {shortcut.shortcut_name}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditShortcut(shortcut)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteShortcut(shortcut.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <ShortcutForm
        open={showShortcutForm}
        onClose={() => {
          setShowShortcutForm(false);
          setEditingShortcut(null);
        }}
        onSave={handleSaveShortcut}
        shortcut={editingShortcut}
      />
    </div>
  );
};

export default ProductShortcuts;