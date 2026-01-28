/**
 * MOJAVOX Script Editor Page
 * Style: Cyberpunk Corporate
 * 
 * Features:
 * - Visual script editor
 * - Conversation flow builder
 * - Preview and test mode
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Edit,
  MessageSquare,
  Play,
  Plus,
  Save,
  Trash2,
  User,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Link } from "wouter";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/ui/page-transition";

interface ScriptNode {
  id: string;
  type: "agent" | "debtor" | "condition" | "action";
  content: string;
  responses?: string[];
  nextNodes?: string[];
}

interface Script {
  id: string;
  name: string;
  description: string;
  category: "collection" | "reminder" | "negotiation" | "verification";
  nodes: ScriptNode[];
  createdAt: string;
  lastModified: string;
}

const defaultScripts: Script[] = [
  {
    id: "1",
    name: "Standard Collection",
    description: "Default collection script for general debt recovery",
    category: "collection",
    nodes: [
      { id: "1", type: "agent", content: "Hello, this is {{agent_name}} calling from {{company_name}}. Am I speaking with {{debtor_name}}?", responses: ["Yes", "No", "Who is this?"] },
      { id: "2", type: "agent", content: "I'm calling regarding your account ending in {{account_last4}}. Our records show a balance of {{balance}}. Are you aware of this outstanding amount?", responses: ["Yes", "No", "I already paid"] },
      { id: "3", type: "agent", content: "I understand. Would you like to resolve this today? We can offer several payment options.", responses: ["Yes", "No", "What options?"] },
    ],
    createdAt: "2026-01-15",
    lastModified: "2026-01-25",
  },
  {
    id: "2",
    name: "Friendly Reminder",
    description: "Soft approach for first-time reminders",
    category: "reminder",
    nodes: [
      { id: "1", type: "agent", content: "Hi {{debtor_name}}, this is a courtesy call from {{company_name}}. How are you today?", responses: ["Good", "Fine", "What do you want?"] },
      { id: "2", type: "agent", content: "I'm reaching out because we noticed your payment of {{balance}} is coming due on {{due_date}}. Just wanted to make sure you received the invoice.", responses: ["Yes", "No", "I'll pay soon"] },
    ],
    createdAt: "2026-01-10",
    lastModified: "2026-01-20",
  },
  {
    id: "3",
    name: "Payment Plan Negotiation",
    description: "Script for negotiating payment arrangements",
    category: "negotiation",
    nodes: [
      { id: "1", type: "agent", content: "I understand that paying the full amount of {{balance}} at once may be difficult. Let's discuss some options that might work better for your situation.", responses: ["OK", "What options?", "I can't pay anything"] },
      { id: "2", type: "agent", content: "We can set up a payment plan. Would monthly payments of {{monthly_amount}} work for you?", responses: ["Yes", "Too much", "Let me think"] },
    ],
    createdAt: "2026-01-08",
    lastModified: "2026-01-18",
  },
];

export default function ScriptEditor() {
  const [loading, setLoading] = useState(true);
  const [scripts, setScripts] = useState<Script[]>(defaultScripts);
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [editingNode, setEditingNode] = useState<ScriptNode | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewStep, setPreviewStep] = useState(0);
  
  // Dialog states
  const [createScriptDialogOpen, setCreateScriptDialogOpen] = useState(false);
  const [addNodeDialogOpen, setAddNodeDialogOpen] = useState(false);
  const [deleteNodeDialogOpen, setDeleteNodeDialogOpen] = useState(false);
  const [nodeToDelete, setNodeToDelete] = useState<ScriptNode | null>(null);
  
  // Form states
  const [newScript, setNewScript] = useState({
    name: "",
    description: "",
    category: "collection" as "collection" | "reminder" | "negotiation" | "verification",
  });
  const [newNode, setNewNode] = useState({
    type: "agent" as "agent" | "debtor",
    content: "",
    responses: "",
  });

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "collection": return "bg-neon-green/20 text-neon-green";
      case "reminder": return "bg-yellow-500/20 text-yellow-400";
      case "negotiation": return "bg-neon-blue/20 text-neon-blue";
      case "verification": return "bg-neon-pink/20 text-neon-pink";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const handleSelectScript = (script: Script) => {
    setSelectedScript(script);
    setPreviewStep(0);
    setPreviewMode(false);
  };

  const handleSaveNode = () => {
    if (editingNode && selectedScript) {
      const updatedNodes = selectedScript.nodes.map(n => n.id === editingNode.id ? editingNode : n);
      setSelectedScript({ ...selectedScript, nodes: updatedNodes });
      setScripts(scripts.map(s => s.id === selectedScript.id ? { ...selectedScript, nodes: updatedNodes, lastModified: new Date().toISOString().split('T')[0] } : s));
      setEditingNode(null);
      toast.success("Node saved");
    }
  };

  const handleStartPreview = () => {
    setPreviewMode(true);
    setPreviewStep(0);
  };

  const handleNextStep = () => {
    if (selectedScript && previewStep < selectedScript.nodes.length - 1) {
      setPreviewStep(previewStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (previewStep > 0) {
      setPreviewStep(previewStep - 1);
    }
  };

  const handleCreateScript = () => {
    if (!newScript.name.trim()) {
      toast.error("Please enter a script name");
      return;
    }
    
    const script: Script = {
      id: `script_${Date.now()}`,
      name: newScript.name,
      description: newScript.description,
      category: newScript.category,
      nodes: [
        { id: "1", type: "agent", content: "Hello, this is {{agent_name}} calling from {{company_name}}. Am I speaking with {{debtor_name}}?", responses: ["Yes", "No", "Who is this?"] },
      ],
      createdAt: new Date().toISOString().split("T")[0],
      lastModified: new Date().toISOString().split("T")[0],
    };
    
    setScripts([script, ...scripts]);
    setSelectedScript(script);
    setCreateScriptDialogOpen(false);
    setNewScript({ name: "", description: "", category: "collection" });
    toast.success("Script created", { description: `"${script.name}" is ready to edit` });
  };

  const handleAddNode = () => {
    if (!selectedScript || !newNode.content.trim()) {
      toast.error("Please enter node content");
      return;
    }
    
    const node: ScriptNode = {
      id: `node_${Date.now()}`,
      type: newNode.type,
      content: newNode.content,
      responses: newNode.responses ? newNode.responses.split(",").map(r => r.trim()).filter(r => r) : undefined,
    };
    
    const updatedScript = {
      ...selectedScript,
      nodes: [...selectedScript.nodes, node],
      lastModified: new Date().toISOString().split("T")[0],
    };
    
    setSelectedScript(updatedScript);
    setScripts(scripts.map(s => s.id === selectedScript.id ? updatedScript : s));
    setAddNodeDialogOpen(false);
    setNewNode({ type: "agent", content: "", responses: "" });
    toast.success("Node added");
  };

  const handleConfirmDeleteNode = () => {
    if (!selectedScript || !nodeToDelete) return;
    
    const updatedScript = {
      ...selectedScript,
      nodes: selectedScript.nodes.filter(n => n.id !== nodeToDelete.id),
      lastModified: new Date().toISOString().split("T")[0],
    };
    
    setSelectedScript(updatedScript);
    setScripts(scripts.map(s => s.id === selectedScript.id ? updatedScript : s));
    setDeleteNodeDialogOpen(false);
    setNodeToDelete(null);
    toast.success("Node deleted");
  };

  const handleDeleteNodeClick = (node: ScriptNode) => {
    setNodeToDelete(node);
    setDeleteNodeDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 bg-muted animate-pulse rounded" />
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="h-64 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
          <Card className="lg:col-span-2 bg-card border-border">
            <CardContent className="p-6">
              <div className="h-64 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        </div>
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
                  <MessageSquare className="w-6 h-6 text-background" />
                </div>
                Script Editor
              </h1>
              <p className="text-muted-foreground mt-1">Create and manage AI agent conversation scripts</p>
            </div>
          </div>
          <Button className="bg-neon-green text-background hover:bg-neon-green/90" onClick={() => setCreateScriptDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Script
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Script List */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Scripts</CardTitle>
              <CardDescription>Select a script to edit</CardDescription>
            </CardHeader>
            <CardContent>
              <StaggerContainer className="space-y-2">
                {scripts.map((script) => (
                  <StaggerItem key={script.id}>
                    <button
                      onClick={() => handleSelectScript(script)}
                      className={`w-full p-3 rounded-lg text-left transition-all ${
                        selectedScript?.id === script.id
                          ? "bg-neon-green/10 border border-neon-green"
                          : "bg-muted/50 hover:bg-muted border border-transparent"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{script.name}</span>
                        <Badge className={`text-xs ${getCategoryColor(script.category)}`}>
                          {script.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{script.description}</p>
                      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                        <span>{script.nodes.length} nodes</span>
                        <span>{script.lastModified}</span>
                      </div>
                    </button>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </CardContent>
          </Card>

          {/* Script Editor / Preview */}
          <Card className="lg:col-span-2 bg-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{selectedScript?.name || "Select a Script"}</CardTitle>
                  <CardDescription>{selectedScript?.description || "Choose a script from the list to edit"}</CardDescription>
                </div>
                {selectedScript && (
                  <div className="flex gap-2">
                    <Button
                      variant={previewMode ? "default" : "outline"}
                      size="sm"
                      onClick={handleStartPreview}
                      className={previewMode ? "bg-neon-green text-background" : ""}
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Preview
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => toast.success("Script saved")}>
                      <Save className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {selectedScript ? (
                previewMode ? (
                  /* Preview Mode */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm text-muted-foreground">
                        Step {previewStep + 1} of {selectedScript.nodes.length}
                      </span>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handlePrevStep} disabled={previewStep === 0}>
                          <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleNextStep} disabled={previewStep >= selectedScript.nodes.length - 1}>
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-4 p-4 bg-background rounded-lg border border-border min-h-[300px]">
                      {selectedScript.nodes.slice(0, previewStep + 1).map((node, idx) => (
                        <div key={node.id} className={`flex gap-3 ${idx === previewStep ? "animate-fade-in" : ""}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            node.type === "agent" ? "bg-neon-green/20" : "bg-neon-blue/20"
                          }`}>
                            {node.type === "agent" ? (
                              <Bot className="w-4 h-4 text-neon-green" />
                            ) : (
                              <User className="w-4 h-4 text-neon-blue" />
                            )}
                          </div>
                          <div className={`p-3 rounded-lg max-w-[80%] ${
                            node.type === "agent" ? "bg-muted" : "bg-neon-blue/10"
                          }`}>
                            <p className="text-sm">{node.content}</p>
                            {node.responses && idx === previewStep && (
                              <div className="flex flex-wrap gap-2 mt-3">
                                {node.responses.map((response, rIdx) => (
                                  <Button
                                    key={rIdx}
                                    variant="outline"
                                    size="sm"
                                    className="text-xs"
                                    onClick={handleNextStep}
                                  >
                                    {response}
                                  </Button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <Button variant="outline" className="w-full" onClick={() => setPreviewMode(false)}>
                      Exit Preview
                    </Button>
                  </div>
                ) : (
                  /* Edit Mode */
                  <div className="space-y-3">
                    {selectedScript.nodes.map((node, idx) => (
                      <div
                        key={node.id}
                        className="p-4 rounded-lg bg-muted/50 border border-border hover:border-neon-green/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              node.type === "agent" ? "bg-neon-green/20" : "bg-neon-blue/20"
                            }`}>
                              {node.type === "agent" ? (
                                <Bot className="w-4 h-4 text-neon-green" />
                              ) : (
                                <User className="w-4 h-4 text-neon-blue" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs">
                                  Step {idx + 1}
                                </Badge>
                                <Badge className={`text-xs ${node.type === "agent" ? "bg-neon-green/20 text-neon-green" : "bg-neon-blue/20 text-neon-blue"}`}>
                                  {node.type}
                                </Badge>
                              </div>
                              {editingNode?.id === node.id ? (
                                <div className="space-y-2">
                                  <Textarea
                                    value={editingNode.content}
                                    onChange={(e) => setEditingNode({ ...editingNode, content: e.target.value })}
                                    rows={3}
                                    className="text-sm"
                                  />
                                  <div className="flex gap-2">
                                    <Button size="sm" onClick={handleSaveNode}>
                                      <Check className="w-3 h-3 mr-1" />
                                      Save
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => setEditingNode(null)}>
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">{node.content}</p>
                              )}
                              {node.responses && !editingNode && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {node.responses.map((response, rIdx) => (
                                    <Badge key={rIdx} variant="outline" className="text-xs">
                                      {response}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          {!editingNode && (
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => setEditingNode(node)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-red-400" onClick={() => handleDeleteNodeClick(node)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    <Button variant="outline" className="w-full" onClick={() => setAddNodeDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Node
                    </Button>
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mb-4 opacity-50" />
                  <p>Select a script from the list to start editing</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      {/* Create Script Dialog */}
      <Dialog open={createScriptDialogOpen} onOpenChange={setCreateScriptDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-neon-green" />
              Create New Script
            </DialogTitle>
            <DialogDescription>
              Create a new conversation script for AI agents
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Script Name *</Label>
              <Input
                placeholder="e.g., Payment Reminder Script"
                value={newScript.name}
                onChange={(e) => setNewScript({ ...newScript, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe the purpose of this script..."
                value={newScript.description}
                onChange={(e) => setNewScript({ ...newScript, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={newScript.category} onValueChange={(v: "collection" | "reminder" | "negotiation" | "verification") => setNewScript({ ...newScript, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="collection">Collection</SelectItem>
                  <SelectItem value="reminder">Reminder</SelectItem>
                  <SelectItem value="negotiation">Negotiation</SelectItem>
                  <SelectItem value="verification">Verification</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateScriptDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-neon-green text-background hover:bg-neon-green/90"
              onClick={handleCreateScript}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Script
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Node Dialog */}
      <Dialog open={addNodeDialogOpen} onOpenChange={setAddNodeDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-neon-blue" />
              Add New Node
            </DialogTitle>
            <DialogDescription>
              Add a new step to the conversation flow
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Node Type</Label>
              <Select value={newNode.type} onValueChange={(v: "agent" | "debtor") => setNewNode({ ...newNode, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agent">Agent (AI speaks)</SelectItem>
                  <SelectItem value="debtor">Debtor (Customer response)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Content *</Label>
              <Textarea
                placeholder="Enter the script content. Use {{variable}} for dynamic values..."
                value={newNode.content}
                onChange={(e) => setNewNode({ ...newNode, content: e.target.value })}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Variables: {"{{debtor_name}}, {{balance}}, {{due_date}}, {{agent_name}}, {{company_name}}"}
              </p>
            </div>
            {newNode.type === "agent" && (
              <div className="space-y-2">
                <Label>Expected Responses (comma-separated)</Label>
                <Input
                  placeholder="e.g., Yes, No, Maybe later"
                  value={newNode.responses}
                  onChange={(e) => setNewNode({ ...newNode, responses: e.target.value })}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddNodeDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-neon-blue text-white hover:bg-neon-blue/90"
              onClick={handleAddNode}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Node
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Node Confirmation */}
      <AlertDialog open={deleteNodeDialogOpen} onOpenChange={setDeleteNodeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-400" />
              Delete Node
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this node? This action cannot be undone.
              {nodeToDelete && (
                <div className="mt-3 p-3 rounded-lg bg-muted/50 text-sm">
                  <p className="text-foreground line-clamp-2">{nodeToDelete.content}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-500 text-white hover:bg-red-600"
              onClick={handleConfirmDeleteNode}
            >
              Delete Node
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageTransition>
  );
}
