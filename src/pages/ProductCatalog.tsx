import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExcelUpload } from "@/components/FileUpload";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Package, Trash2 } from "lucide-react";
import { parseExcelFile, validateProductData, ProductRow } from "@/utils/excel";

interface Product {
  id: string;
  name: string;
  rate: number;
  hsn_sac: string | null;
  unit: string | null;
  created_at: string;
}

const ProductCatalog = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, [user]);

  const fetchProducts = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (profile?.company_id) {
        setCompanyId(profile.company_id);
        
        const { data: products } = await supabase
          .from('products')
          .select('*')
          .eq('company_id', profile.company_id)
          .order('created_at', { ascending: false });

        if (products) {
          setProducts(products);
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load products",
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

      console.log("--- Raw Data From Excel ---");
      console.log(rawData);
      // Also log the first row to inspect its keys
      if (rawData.length > 0) {
        console.log("--- Keys of the first row ---");
        console.log(Object.keys(rawData[0]));
      }
      
      const validatedData = validateProductData(rawData);

      if (validatedData.length === 0) {
        toast({
          title: "Error",
          description: "No valid product data found in Excel file. Please check the format.",
          variant: "destructive",
        });
        return;
      }

      // Insert products into database
      const productsToInsert = validatedData.map((row: ProductRow) => ({
        company_id: companyId,
        name: row['Product Name'],
        rate: row['Rate'],
        hsn_sac: row['HSN/SAC'] || null,
        unit: row['Unit'] || null,
      }));

      const { error } = await supabase
        .from('products')
        .insert(productsToInsert);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Successfully imported ${validatedData.length} products`,
      });

      fetchProducts(); // Refresh the list
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Error",
        description: "Failed to import products from Excel file",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      setProducts(prev => prev.filter(p => p.id !== productId));
      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      });
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
              <div className="flex items-center gap-2">
                <Package className="w-6 h-6" />
                <h1 className="text-2xl font-bold">Product Catalog</h1>
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
              <CardTitle>Import Products</CardTitle>
              <CardDescription>
                Upload an Excel file with columns: Product Name, Rate, HSN/SAC, Unit
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ExcelUpload
                label="Product Excel File"
                description="Excel file with Product Name, Rate, HSN/SAC, Unit columns"
                onFileSelect={handleExcelImport}
              />
              {importing && (
                <div className="mt-4 text-sm text-muted-foreground">
                  Importing products...
                </div>
              )}
            </CardContent>
          </Card>

          {/* Products Table */}
          <Card>
            <CardHeader>
              <CardTitle>Products ({products.length})</CardTitle>
              <CardDescription>
                Your imported product catalog
              </CardDescription>
            </CardHeader>
            <CardContent>
              {products.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No products found. Import your first Excel file to get started.
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product Name</TableHead>
                        <TableHead>Rate</TableHead>
                        <TableHead>HSN/SAC</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>₹{product.rate.toFixed(2)}</TableCell>
                          <TableCell>{product.hsn_sac || "-"}</TableCell>
                          <TableCell>{product.unit || "-"}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteProduct(product.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
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
      </main>
    </div>
  );
};

export default ProductCatalog;