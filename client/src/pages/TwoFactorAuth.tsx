/**
 * MOJAVOX Two-Factor Authentication Page
 * Style: Cyberpunk Corporate
 * 
 * Features:
 * - 2FA setup wizard
 * - QR code display
 * - Backup codes
 * - Verification
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  Key,
  QrCode,
  Shield,
  ShieldCheck,
  ShieldOff,
  Smartphone,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Link } from "wouter";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/ui/page-transition";

export default function TwoFactorAuth() {
  const [loading, setLoading] = useState(true);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [setupStep, setSetupStep] = useState(0);
  const [verificationCode, setVerificationCode] = useState("");
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [disableCode, setDisableCode] = useState("");

  // Mock secret key and backup codes
  const secretKey = "JBSWY3DPEHPK3PXP";
  const backupCodes = [
    "ABCD-1234-EFGH",
    "IJKL-5678-MNOP",
    "QRST-9012-UVWX",
    "YZAB-3456-CDEF",
    "GHIJ-7890-KLMN",
    "OPQR-1234-STUV",
    "WXYZ-5678-ABCD",
    "EFGH-9012-IJKL",
  ];

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const handleVerify = () => {
    if (verificationCode.length !== 6) {
      toast.error("Please enter a 6-digit code");
      return;
    }
    // Mock verification
    if (verificationCode === "123456" || verificationCode.length === 6) {
      setIs2FAEnabled(true);
      setSetupStep(0);
      setVerificationCode("");
      toast.success("Two-factor authentication enabled", {
        description: "Your account is now more secure",
      });
    } else {
      toast.error("Invalid verification code");
    }
  };

  const handleDisable = () => {
    if (disableCode.length !== 6) {
      toast.error("Please enter a 6-digit code");
      return;
    }
    setIs2FAEnabled(false);
    setShowDisableDialog(false);
    setDisableCode("");
    toast.success("Two-factor authentication disabled");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const downloadBackupCodes = () => {
    const content = `MOJAVOX Backup Codes\n${"=".repeat(30)}\n\nKeep these codes in a safe place. Each code can only be used once.\n\n${backupCodes.join("\n")}\n\nGenerated: ${new Date().toLocaleString()}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mojavox-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup codes downloaded");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 bg-muted animate-pulse rounded" />
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="h-48 bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/settings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-green to-neon-blue flex items-center justify-center">
                <Shield className="w-6 h-6 text-background" />
              </div>
              Two-Factor Authentication
            </h1>
            <p className="text-muted-foreground mt-1">Add an extra layer of security to your account</p>
          </div>
        </div>

        {/* Status Card */}
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-16 h-16 rounded-xl flex items-center justify-center",
                  is2FAEnabled ? "bg-neon-green/10" : "bg-amber-500/10"
                )}>
                  {is2FAEnabled ? (
                    <ShieldCheck className="w-8 h-8 text-neon-green" />
                  ) : (
                    <ShieldOff className="w-8 h-8 text-amber-400" />
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {is2FAEnabled ? "2FA is Enabled" : "2FA is Disabled"}
                  </h2>
                  <p className="text-muted-foreground">
                    {is2FAEnabled
                      ? "Your account is protected with two-factor authentication"
                      : "Enable 2FA to add an extra layer of security"}
                  </p>
                </div>
              </div>
              {is2FAEnabled ? (
                <Button
                  variant="outline"
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  onClick={() => setShowDisableDialog(true)}
                >
                  Disable 2FA
                </Button>
              ) : (
                <Button
                  className="bg-neon-green text-background hover:bg-neon-green/90"
                  onClick={() => setSetupStep(1)}
                >
                  Enable 2FA
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Setup Steps */}
        {setupStep > 0 && !is2FAEnabled && (
          <StaggerContainer className="space-y-6">
            {/* Step 1: Download App */}
            <StaggerItem>
              <Card className={cn(
                "bg-card border-border transition-colors",
                setupStep >= 1 && "border-neon-green/30"
              )}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                      setupStep > 1 ? "bg-neon-green text-background" : "bg-neon-green/20 text-neon-green"
                    )}>
                      {setupStep > 1 ? <Check className="w-4 h-4" /> : "1"}
                    </div>
                    <CardTitle>Download Authenticator App</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Download and install an authenticator app on your mobile device:
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-muted/50 flex items-center gap-3">
                      <Smartphone className="w-8 h-8 text-neon-green" />
                      <div>
                        <p className="font-medium text-foreground">Google Authenticator</p>
                        <p className="text-sm text-muted-foreground">iOS & Android</p>
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 flex items-center gap-3">
                      <Smartphone className="w-8 h-8 text-neon-blue" />
                      <div>
                        <p className="font-medium text-foreground">Microsoft Authenticator</p>
                        <p className="text-sm text-muted-foreground">iOS & Android</p>
                      </div>
                    </div>
                  </div>
                  {setupStep === 1 && (
                    <Button
                      className="mt-4 bg-neon-green text-background hover:bg-neon-green/90"
                      onClick={() => setSetupStep(2)}
                    >
                      Continue
                    </Button>
                  )}
                </CardContent>
              </Card>
            </StaggerItem>

            {/* Step 2: Scan QR Code */}
            {setupStep >= 2 && (
              <StaggerItem>
                <Card className={cn(
                  "bg-card border-border transition-colors",
                  setupStep >= 2 && "border-neon-green/30"
                )}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                        setupStep > 2 ? "bg-neon-green text-background" : "bg-neon-green/20 text-neon-green"
                      )}>
                        {setupStep > 2 ? <Check className="w-4 h-4" /> : "2"}
                      </div>
                      <CardTitle>Scan QR Code</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-muted-foreground mb-4">
                          Open your authenticator app and scan this QR code:
                        </p>
                        <div className="w-48 h-48 bg-white rounded-lg p-4 mx-auto flex items-center justify-center">
                          <QrCode className="w-40 h-40 text-gray-900" />
                        </div>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-4">
                          Or enter this secret key manually:
                        </p>
                        <div className="p-4 rounded-lg bg-muted/50">
                          <div className="flex items-center justify-between">
                            <code className="text-lg font-mono text-neon-green">{secretKey}</code>
                            <Button variant="ghost" size="icon" onClick={() => copyToClipboard(secretKey)}>
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-4">
                          Account: admin@mojavox.ai
                        </p>
                      </div>
                    </div>
                    {setupStep === 2 && (
                      <Button
                        className="mt-4 bg-neon-green text-background hover:bg-neon-green/90"
                        onClick={() => setSetupStep(3)}
                      >
                        Continue
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </StaggerItem>
            )}

            {/* Step 3: Verify */}
            {setupStep >= 3 && (
              <StaggerItem>
                <Card className="bg-card border-border border-neon-green/30">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-neon-green/20 text-neon-green flex items-center justify-center text-sm font-bold">
                        3
                      </div>
                      <CardTitle>Verify Setup</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      Enter the 6-digit code from your authenticator app:
                    </p>
                    <div className="flex items-center gap-4">
                      <Input
                        type="text"
                        placeholder="000000"
                        maxLength={6}
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                        className="w-40 text-center text-2xl font-mono tracking-widest"
                      />
                      <Button
                        className="bg-neon-green text-background hover:bg-neon-green/90"
                        onClick={handleVerify}
                      >
                        Verify & Enable
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>
            )}
          </StaggerContainer>
        )}

        {/* Backup Codes */}
        {is2FAEnabled && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5 text-neon-green" />
                Backup Codes
              </CardTitle>
              <CardDescription>
                Use these codes to access your account if you lose your authenticator device
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {backupCodes.map((code, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-lg bg-muted/50 font-mono text-sm text-center cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => copyToClipboard(code)}
                  >
                    {code}
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={downloadBackupCodes}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Codes
                </Button>
                <Button variant="outline" onClick={() => copyToClipboard(backupCodes.join("\n"))}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy All
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Disable Dialog */}
        <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-red-400">Disable Two-Factor Authentication</DialogTitle>
              <DialogDescription>
                This will make your account less secure. Enter your current 2FA code to confirm.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label>Verification Code</Label>
              <Input
                type="text"
                placeholder="000000"
                maxLength={6}
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ""))}
                className="mt-2 text-center text-xl font-mono tracking-widest"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDisableDialog(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDisable}
              >
                Disable 2FA
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}
