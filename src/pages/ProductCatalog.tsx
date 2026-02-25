import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExcelUpload } from "@/components/FileUpload";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Package, Trash2, Plus, Edit } from "lucide-react";
import { parseExcelFile, validateProductData, ProductRow } from "@/utils/excel";
import ProductForm, { ProductFormData } from "@/components/ProductForm";

interface Product {
  id: string;
  name: string;
  rate: number;
  hsn_sac: string | null;
  unit: string | null;
  tax_rate: number;
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
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductFormData | null>(null);

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

      // console.log("--- Raw Data From Excel ---");
      // console.log(rawData);
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
        tax_rate: row['Tax Rate'] || 0, // Default to 0 if not provided in Excel
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

  const handleSaveProduct = async (productData: ProductFormData) => {
    if (!companyId) {
      toast({
        title: "Error",
        description: "Company not found",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingProduct?.id) {
        // Update existing product
        const { error } = await supabase
          .from('products')
          .update({
            name: productData.name,
            rate: productData.rate,
            hsn_sac: productData.hsn_sac || null,
            unit: productData.unit || null,
            tax_rate: productData.tax_rate,
            max_discount: productData.max_discount,
          })
          .eq('id', editingProduct.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Product updated successfully",
        });
      } else {
        // Create new product
        const { error } = await supabase
          .from('products')
          .insert([{
            company_id: companyId,
            name: productData.name,
            rate: productData.rate,
            hsn_sac: productData.hsn_sac || null,
            unit: productData.unit || null,
            tax_rate: productData.tax_rate,
            max_discount: productData.max_discount,
          }]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Product added successfully",
        });
      }

      fetchProducts(); // Refresh the list
      setShowProductForm(false);
      setEditingProduct(null);
    } catch (error) {
      toast({
        title: "Error",
        description: editingProduct ? "Failed to update product" : "Failed to add product",
        variant: "destructive",
      });
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct({
      id: product.id,
      name: product.name,
      rate: product.rate,
      hsn_sac: product.hsn_sac || "",
      unit: product.unit || "",
      tax_rate: product.tax_rate || 0,
      max_discount: (product as any).max_discount || 0,
    });
    setShowProductForm(true);
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setShowProductForm(true);
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
                  Product Catalog.
                  <br />
                  <span className="text-primary">AI organizes everything.</span>
                </h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="space-y-8">
          {/* Add Products Section */}
          <Card className="border-border shadow-sm">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle className="text-xl text-black">Add Products</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Add individual products or upload an Excel file with columns: Product Name, Rate, HSN/SAC, Unit, Tax Rate
                  </CardDescription>
                </div>
                <Button onClick={handleAddProduct} className="h-11 px-6 w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ExcelUpload
                label="Product Excel File"
                description="Excel file with Product Name, Rate, HSN/SAC, Unit, Tax Rate columns"
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
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl text-black">Products ({products.length})</CardTitle>
              <CardDescription className="text-muted-foreground">
                Your imported product catalog
              </CardDescription>
            </CardHeader>
            <CardContent>
              {products.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No products found. Import your first Excel file to get started.
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  {/* Mobile Cards View */}
                  <div className="sm:hidden">
                    {products.map((product) => (
                      <div key={product.id} className="border-b border-border last:border-b-0 p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-slate-900 truncate">{product.name}</h3>
                            <p className="text-lg font-semibold text-primary">₹{product.rate.toFixed(2)}</p>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditProduct(product)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteProduct(product.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">HSN/SAC:</span>
                            <span className="ml-1">{product.hsn_sac || "-"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Unit:</span>
                            <span className="ml-1">{product.unit || "-"}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Tax Rate:</span>
                            <span className="ml-1">{product.tax_rate}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table View */}
                  <Table className="hidden sm:table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product Name</TableHead>
                        <TableHead>Rate</TableHead>
                        <TableHead>HSN/SAC</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Tax Rate (%)</TableHead>
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
                          <TableCell>{product.tax_rate}%</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditProduct(product)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteProduct(product.id)}
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
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <ProductForm
        open={showProductForm}
        onClose={() => {
          setShowProductForm(false);
          setEditingProduct(null);
        }}
        onSave={handleSaveProduct}
        product={editingProduct}
      />
    </div>
  );
};

export default ProductCatalog;