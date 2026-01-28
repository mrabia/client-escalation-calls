/**
 * MOJAVOX Branding Settings Page
 * Style: Cyberpunk Corporate
 * 
 * Features:
 * - Logo customization
 * - Color palette management
 * - Preview mode
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Check,
  Image,
  Palette,
  RefreshCw,
  Save,
  Upload,
  X,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Link } from "wouter";
import { PageTransition } from "@/components/ui/page-transition";

interface BrandingConfig {
  logoUrl: string;
  companyName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
}

export default function BrandingSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoDialogOpen, setLogoDialogOpen] = useState(false);
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [config, setConfig] = useState<BrandingConfig>({
    logoUrl: "",
    companyName: "MOJAVOX",
    primaryColor: "#00F5D4",
    secondaryColor: "#00BBF9",
    accentColor: "#F15BB5",
    backgroundColor: "#0A1628",
    textColor: "#FFFFFF",
  });

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    localStorage.setItem("mojavox_branding", JSON.stringify(config));
    setSaving(false);
    toast.success("Branding settings saved");
  };

  const handleReset = () => {
    setConfig({
      logoUrl: "",
      companyName: "MOJAVOX",
      primaryColor: "#00F5D4",
      secondaryColor: "#00BBF9",
      accentColor: "#F15BB5",
      backgroundColor: "#0A1628",
      textColor: "#FFFFFF",
    });
    toast.info("Reset to default branding");
  };

  const handleLogoUpload = () => {
    setLogoDialogOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("File too large", { description: "Please select an image under 2MB" });
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewLogo(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplyLogo = () => {
    if (previewLogo) {
      setConfig({ ...config, logoUrl: previewLogo });
      toast.success("Logo applied", { description: "Don't forget to save your changes" });
    }
    setLogoDialogOpen(false);
    setPreviewLogo(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 bg-muted animate-pulse rounded" />
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="h-64 bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/settings">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-pink to-neon-blue flex items-center justify-center">
                  <Palette className="w-6 h-6 text-background" />
                </div>
                Branding Settings
              </h1>
              <p className="text-muted-foreground mt-1">Customize your platform's look and feel</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button
              className="bg-neon-green text-background hover:bg-neon-green/90"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Configuration */}
          <div className="space-y-6">
            {/* Logo */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="w-5 h-5 text-neon-blue" />
                  Logo
                </CardTitle>
                <CardDescription>Upload your company logo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 rounded-xl bg-muted flex items-center justify-center border-2 border-dashed border-border">
                    {config.logoUrl ? (
                      <img src={config.logoUrl} alt="Logo" className="w-full h-full object-contain rounded-xl" />
                    ) : (
                      <Image className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Button variant="outline" onClick={handleLogoUpload}>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Logo
                    </Button>
                    <p className="text-xs text-muted-foreground">PNG, JPG, or SVG. Max 2MB.</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input
                    value={config.companyName}
                    onChange={(e) => setConfig({ ...config, companyName: e.target.value })}
                    placeholder="Your Company Name"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Colors */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-neon-pink" />
                  Color Palette
                </CardTitle>
                <CardDescription>Customize your brand colors</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Primary Color</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={config.primaryColor}
                        onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <Input
                        value={config.primaryColor}
                        onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                        className="flex-1 font-mono"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Secondary Color</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={config.secondaryColor}
                        onChange={(e) => setConfig({ ...config, secondaryColor: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <Input
                        value={config.secondaryColor}
                        onChange={(e) => setConfig({ ...config, secondaryColor: e.target.value })}
                        className="flex-1 font-mono"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Accent Color</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={config.accentColor}
                        onChange={(e) => setConfig({ ...config, accentColor: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <Input
                        value={config.accentColor}
                        onChange={(e) => setConfig({ ...config, accentColor: e.target.value })}
                        className="flex-1 font-mono"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Background Color</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={config.backgroundColor}
                        onChange={(e) => setConfig({ ...config, backgroundColor: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <Input
                        value={config.backgroundColor}
                        onChange={(e) => setConfig({ ...config, backgroundColor: e.target.value })}
                        className="flex-1 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preview */}
          <div>
            <Card className="bg-card border-border sticky top-6">
              <CardHeader>
                <CardTitle>Live Preview</CardTitle>
                <CardDescription>See how your branding will look</CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className="rounded-xl overflow-hidden border border-border"
                  style={{ backgroundColor: config.backgroundColor }}
                >
                  {/* Preview Header */}
                  <div className="p-4 border-b border-white/10 flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: config.primaryColor }}
                    >
                      <span className="text-lg font-bold" style={{ color: config.backgroundColor }}>
                        {config.companyName.charAt(0)}
                      </span>
                    </div>
                    <span className="font-bold text-lg" style={{ color: config.textColor }}>
                      {config.companyName}
                    </span>
                  </div>
                  
                  {/* Preview Content */}
                  <div className="p-4 space-y-4">
                    <div className="flex gap-2">
                      <div
                        className="px-4 py-2 rounded-lg text-sm font-medium"
                        style={{ backgroundColor: config.primaryColor, color: config.backgroundColor }}
                      >
                        Primary Button
                      </div>
                      <div
                        className="px-4 py-2 rounded-lg text-sm font-medium border"
                        style={{ borderColor: config.secondaryColor, color: config.secondaryColor }}
                      >
                        Secondary
                      </div>
                    </div>
                    
                    <div
                      className="p-4 rounded-lg"
                      style={{ backgroundColor: `${config.primaryColor}15` }}
                    >
                      <p className="text-sm" style={{ color: config.textColor }}>
                        This is how your cards will look with the selected color palette.
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: config.primaryColor }}
                      />
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: config.secondaryColor }}
                      />
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: config.accentColor }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Logo Upload Dialog */}
        <Dialog open={logoDialogOpen} onOpenChange={setLogoDialogOpen}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-neon-green" />
                Upload Logo
              </DialogTitle>
              <DialogDescription>
                Upload a custom logo for your MOJAVOX portal
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*"
                className="hidden"
              />
              
              {previewLogo ? (
                <div className="space-y-4">
                  <div className="relative w-full h-40 rounded-lg border border-border bg-muted/50 flex items-center justify-center overflow-hidden">
                    <img src={previewLogo} alt="Logo preview" className="max-h-full max-w-full object-contain" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => setPreviewLogo(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Click "Apply" to use this logo
                  </p>
                </div>
              ) : (
                <div
                  className="w-full h-40 rounded-lg border-2 border-dashed border-border hover:border-neon-green/50 bg-muted/30 flex flex-col items-center justify-center cursor-pointer transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-10 h-10 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG, SVG up to 2MB</p>
                </div>
              )}

              <div className="mt-4 p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">
                  <strong>Recommended:</strong> Square logo (1:1 ratio), minimum 200x200px, transparent background for best results.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setLogoDialogOpen(false); setPreviewLogo(null); }}>
                Cancel
              </Button>
              <Button 
                className="bg-neon-green text-background hover:bg-neon-green/90"
                onClick={handleApplyLogo}
                disabled={!previewLogo}
              >
                <Check className="w-4 h-4 mr-2" />
                Apply Logo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}
