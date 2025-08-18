import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Download, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface HeroSectionProps {
  onTryDemo: () => void;
}

const HeroSection = ({ onTryDemo }: HeroSectionProps) => {
  const navigate = useNavigate();
  const [animationStep, setAnimationStep] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [showDemoAfter, setShowDemoAfter] = useState(false);
  
  const sampleText = "Generate invoice for Acme Corp → 2 Software Licenses with 20% discount and 5 Hardware Setups with 10% discount";
  
  const sampleInvoice = {
    client: "Acme Corp",
    items: [
      { name: "Software License", quantity: 2, price: 5000, discount: 20 },
      { name: "Hardware Setup", quantity: 5, price: 2000, discount: 10 }
    ]
  };

  useEffect(() => {
    const animationCycle = () => {
      // Reset animation
      setAnimationStep(0);
      setTypedText("");
      setShowDemoAfter(false);
      
      // Step 1: Typing animation
      let currentText = "";
      let charIndex = 0;
      
      const typeChar = () => {
        if (charIndex < sampleText.length) {
          currentText += sampleText[charIndex];
          setTypedText(currentText);
          charIndex++;
          setTimeout(typeChar, 50);
        } else {
          // Move to invoice preview after typing
          setTimeout(() => setAnimationStep(1), 800);
        }
      };
      
      setTimeout(typeChar, 1000);
    };

    // Start animation cycle
    animationCycle();
    
    // Set up repeating cycle
    const interval = setInterval(animationCycle, 12000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (animationStep === 1) {
      // Show invoice for 3 seconds, then show PDF
      setTimeout(() => setAnimationStep(2), 3000);
    } else if (animationStep === 2) {
      // Show PDF for 2 seconds, then show sticky footer
      setTimeout(() => {
        setAnimationStep(3);
        setShowDemoAfter(true);
      }, 2000);
    }
  }, [animationStep]);

  const calculateTotal = () => {
    const subtotal = sampleInvoice.items.reduce((sum, item) => {
      const itemTotal = item.quantity * item.price;
      const discountAmount = (itemTotal * item.discount) / 100;
      return sum + itemTotal - discountAmount;
    }, 0);
    const gst = subtotal * 0.18;
    return { subtotal, gst, total: subtotal + gst };
  };

  const { subtotal, gst, total } = calculateTotal();

  return (
    <>
      <div className="min-h-screen bg-white relative overflow-hidden">
        {/* Floating Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-br from-violet-200/20 to-transparent rounded-full blur-3xl animate-float-slow"></div>
          <div className="absolute top-40 right-32 w-96 h-96 bg-gradient-to-br from-violet-300/15 to-transparent rounded-full blur-3xl animate-float-slower"></div>
          <div className="absolute bottom-32 left-1/3 w-48 h-48 bg-gradient-to-br from-violet-400/10 to-transparent rounded-full blur-2xl animate-float"></div>
        </div>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-50/50 via-transparent to-violet-100/30 pointer-events-none"></div>

        {/* Main Content */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
          {/* Header */}
          <header className="text-center mb-16 animate-fade-in">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-900 mb-6 leading-tight">
              Invoices in seconds.
              <br />
              <span className="bg-gradient-to-r from-violet-600 to-violet-700 bg-clip-text text-transparent">
                AI does the math.
              </span>
            </h1>
            <p className="text-xl sm:text-2xl text-slate-600 max-w-3xl mx-auto mb-12 leading-relaxed font-light">
              Type your order in plain English. InvoiceAI formats it, applies discounts, and exports a polished PDF — instantly.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
              <Button 
                size="lg" 
                onClick={onTryDemo}
                className="px-8 py-4 text-lg bg-violet-600 hover:bg-violet-700 hover:scale-105 transition-all duration-200 hover:shadow-lg hover:shadow-violet-500/25"
              >
                <FileText className="w-5 h-5 mr-2" />
                Try Demo Now
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => navigate("/auth")}
                className="px-8 py-4 text-lg border-violet-200 hover:bg-violet-50 hover:border-violet-300 hover:scale-105 transition-all duration-200"
              >
                Create Free Account
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </header>

          {/* Animation Section */}
          <div className="max-w-4xl mx-auto">
            {/* Input Box */}
            <div className={`transition-all duration-700 ${animationStep >= 1 ? 'transform -translate-y-4 scale-95 opacity-50' : ''}`}>
              <Card className="bg-white/80 backdrop-blur-sm border border-violet-200/50 shadow-lg shadow-violet-500/10">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 text-slate-500 text-sm mb-3">
                    <FileText className="w-4 h-4" />
                    <span>AI Invoice Generator</span>
                  </div>
                  <div className="relative">
                    <div className="min-h-[60px] p-4 bg-slate-50 rounded-lg border-2 border-dashed border-violet-200 text-slate-700 text-lg">
                      {typedText}
                      {animationStep === 0 && (
                        <span className="animate-pulse ml-1 text-violet-600">|</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Invoice Preview */}
            {animationStep >= 1 && (
              <div className={`mt-8 transition-all duration-700 transform ${
                animationStep === 1 ? 'translate-y-0 scale-100 opacity-100' : 
                animationStep >= 2 ? 'scale-95 opacity-50' : 'translate-y-8 scale-95 opacity-0'
              }`}>
                <Card className="bg-white shadow-xl shadow-violet-500/20 border border-violet-200/50 animate-scale-in">
                  <CardContent className="p-8">
                    <div className="space-y-6">
                      {/* Invoice Header */}
                      <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                        <div>
                          <h3 className="text-2xl font-bold text-slate-900">INVOICE</h3>
                          <p className="text-slate-600">#INV-001</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-900">To: {sampleInvoice.client}</p>
                          <p className="text-slate-600">Date: {new Date().toLocaleDateString()}</p>
                        </div>
                      </div>

                      {/* Items Table */}
                      <div className="space-y-3">
                        <div className="grid grid-cols-4 gap-4 text-sm font-semibold text-slate-600 border-b border-slate-200 pb-2">
                          <span>Item</span>
                          <span className="text-center">Qty</span>
                          <span className="text-right">Price</span>
                          <span className="text-right">Total</span>
                        </div>
                        {sampleInvoice.items.map((item, index) => {
                          const itemTotal = item.quantity * item.price;
                          const discountAmount = (itemTotal * item.discount) / 100;
                          const finalTotal = itemTotal - discountAmount;
                          
                          return (
                            <div key={index} className="grid grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="font-medium text-slate-900">{item.name}</p>
                                <p className="text-xs text-violet-600">-{item.discount}% discount</p>
                              </div>
                              <span className="text-center text-slate-700">{item.quantity}</span>
                              <span className="text-right text-slate-700">₹{item.price.toLocaleString()}</span>
                              <span className="text-right font-medium text-slate-900">₹{finalTotal.toLocaleString()}</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Totals */}
                      <div className="border-t border-slate-200 pt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Subtotal:</span>
                          <span className="text-slate-900">₹{subtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">GST (18%):</span>
                          <span className="text-slate-900">₹{gst.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold border-t border-slate-200 pt-2">
                          <span className="text-slate-900">Total:</span>
                          <span className="text-violet-600">₹{total.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* PDF Export Animation */}
            {animationStep >= 2 && (
              <div className={`mt-8 flex justify-center transition-all duration-700 ${
                animationStep === 2 ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 opacity-50'
              }`}>
                <div className="relative">
                  <div className="bg-white rounded-2xl p-8 shadow-2xl shadow-violet-500/25 border border-violet-200 animate-scale-in">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg">
                        <FileText className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">Invoice Generated!</p>
                        <p className="text-sm text-slate-600">Ready for download</p>
                      </div>
                      <div className="ml-4 animate-bounce">
                        <Download className="w-6 h-6 text-violet-600" />
                      </div>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-500/20 to-violet-600/20 rounded-2xl blur-xl scale-110 -z-10"></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Footer CTA */}
      {showDemoAfter && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-violet-200 p-4 shadow-lg shadow-violet-500/10 z-50 animate-slide-up">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-900">Ready to create your own invoices?</p>
              <p className="text-sm text-slate-600">Join thousands of businesses using InvoiceAI</p>
            </div>
            <Button 
              size="lg" 
              onClick={() => navigate("/auth")}
              className="bg-violet-600 hover:bg-violet-700 hover:scale-105 transition-all duration-200 shadow-lg shadow-violet-500/25"
            >
              Sign Up Free
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default HeroSection;