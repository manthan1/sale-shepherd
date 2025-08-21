import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup form state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/");
      }
    };
    checkUser();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) throw error;

      if (data.user) {
        toast({ title: "Success", description: "Logged in successfully!" });
        navigate("/");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to login",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupEmail || !signupPassword || !companyName) {
      toast({
        title: "Error", 
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    // Add basic password validation
    if (signupPassword.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // SECURITY FIX: Sign up user first with proper authentication
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: signupEmail.toLowerCase().trim(),
        password: signupPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error("User creation failed");
      }

      // Now create company with authenticated user context
      const { data: companyData, error: companyError } = await supabase
        .from("companies")
        .insert({ name: companyName.trim() })
        .select()
        .single();

      if (companyError) {
        console.error("Company creation failed:", companyError);
        throw new Error("Failed to create company");
      }

      // Create profile linking user to company
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          user_id: authData.user.id,
          company_id: companyData.id,
          email: signupEmail.toLowerCase().trim(),
          role: "admin",
        });

      if (profileError) {
        console.error("Profile creation failed:", profileError);
        // Cleanup company on profile failure
        await supabase.from("companies").delete().eq("id", companyData.id);
        throw new Error("Failed to create user profile");
      }

      toast({
        title: "Success",
        description: "Account created! Please check your email for verification.",
      });
      
      // Clear form
      setSignupEmail("");
      setSignupPassword("");
      setCompanyName("");
    } catch (error: any) {
      console.error("Signup error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-6 sm:py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4">
            Welcome back.
            <br />
            <span className="text-primary">AI does the work.</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground px-2">
            Access your company configuration dashboard
          </p>
        </div>
        
        <Card className="border-border shadow-lg mx-2 sm:mx-0">
        <CardHeader className="text-center pb-4 px-4 sm:px-6">
          <CardTitle className="text-lg sm:text-xl text-foreground">Get Started</CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <Tabs defaultValue="login" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 h-10">
              <TabsTrigger value="login" className="text-sm">Login</TabsTrigger>
              <TabsTrigger value="signup" className="text-sm">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-sm font-medium text-foreground">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-sm font-medium text-foreground">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                <Button type="submit" className="w-full h-11 text-base font-medium" disabled={isLoading}>
                  {isLoading ? "Logging in..." : "Login"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-6">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="company-name" className="text-sm font-medium text-foreground">Company Name</Label>
                  <Input
                    id="company-name"
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-sm font-medium text-foreground">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-sm font-medium text-foreground">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-11"
                  />
                </div>
                <Button type="submit" className="w-full h-11 text-base font-medium" disabled={isLoading}>
                  {isLoading ? "Creating Account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;