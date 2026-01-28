/**
 * MOJAVOX User Management Page
 * Style: Cyberpunk Corporate
 */

import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import {
  Mail,
  MoreVertical,
  Plus,
  Search,
  Shield,
  User,
  Users,
  UserPlus,
  Edit,
  UserCog,
  UserX,
} from "lucide-react";
import { toast } from "sonner";

interface UserData {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  lastActive: string;
  phone?: string;
  department?: string;
}

const initialUsers: UserData[] = [
  { id: 1, name: "Sarah Johnson", email: "sarah@acme.com", role: "Admin", status: "Active", lastActive: "Now", phone: "+1 555-0101", department: "Management" },
  { id: 2, name: "Michael Chen", email: "michael@acme.com", role: "Supervisor", status: "Active", lastActive: "5 min ago", phone: "+1 555-0102", department: "Collections" },
  { id: 3, name: "Emily Davis", email: "emily@acme.com", role: "Analyst", status: "Active", lastActive: "1 hour ago", phone: "+1 555-0103", department: "Analytics" },
  { id: 4, name: "James Wilson", email: "james@acme.com", role: "Supervisor", status: "Inactive", lastActive: "2 days ago", phone: "+1 555-0104", department: "Collections" },
  { id: 5, name: "Lisa Anderson", email: "lisa@acme.com", role: "Analyst", status: "Active", lastActive: "30 min ago", phone: "+1 555-0105", department: "Analytics" },
];

const roleColors: Record<string, string> = {
  Admin: "bg-neon-pink/20 text-neon-pink",
  Supervisor: "bg-neon-blue/20 text-neon-blue",
  Analyst: "bg-neon-green/20 text-neon-green",
};

const roles = ["Admin", "Supervisor", "Analyst"];
const departments = ["Management", "Collections", "Analytics", "Support", "IT"];

export default function UserManagement() {
  const [users, setUsers] = useState<UserData[]>(initialUsers);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Dialog states
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [changeRoleOpen, setChangeRoleOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  
  // Selected user for operations
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  
  // Form states
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    phone: "",
    role: "Analyst",
    department: "Collections",
  });
  
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
  });
  
  const [newRole, setNewRole] = useState("");

  // Filter users based on search
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.status === "Active").length;
  const adminCount = users.filter(u => u.role === "Admin").length;

  // Handlers
  const handleAddUser = () => {
    if (!newUser.name || !newUser.email) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    const user: UserData = {
      id: Math.max(...users.map(u => u.id)) + 1,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      role: newUser.role,
      department: newUser.department,
      status: "Active",
      lastActive: "Just invited",
    };
    
    setUsers([...users, user]);
    setAddUserOpen(false);
    setNewUser({ name: "", email: "", phone: "", role: "Analyst", department: "Collections" });
    toast.success("User added successfully", {
      description: `${user.name} has been invited to join the team.`,
    });
  };

  const handleEditUser = () => {
    if (!selectedUser || !editForm.name || !editForm.email) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    setUsers(users.map(u => 
      u.id === selectedUser.id 
        ? { ...u, name: editForm.name, email: editForm.email, phone: editForm.phone, department: editForm.department }
        : u
    ));
    setEditUserOpen(false);
    toast.success("User updated", {
      description: `${editForm.name}'s profile has been updated.`,
    });
  };

  const handleChangeRole = () => {
    if (!selectedUser || !newRole) {
      toast.error("Please select a role");
      return;
    }
    
    setUsers(users.map(u => 
      u.id === selectedUser.id ? { ...u, role: newRole } : u
    ));
    setChangeRoleOpen(false);
    toast.success("Role updated", {
      description: `${selectedUser.name} is now a ${newRole}.`,
    });
  };

  const handleDeactivate = () => {
    if (!selectedUser) return;
    
    setUsers(users.map(u => 
      u.id === selectedUser.id ? { ...u, status: "Inactive" } : u
    ));
    setDeactivateOpen(false);
    toast.success("User deactivated", {
      description: `${selectedUser.name} has been deactivated.`,
    });
  };

  const openEditDialog = (user: UserData) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      department: user.department || "",
    });
    setEditUserOpen(true);
  };

  const openChangeRoleDialog = (user: UserData) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setChangeRoleOpen(true);
  };

  const openDeactivateDialog = (user: UserData) => {
    setSelectedUser(user);
    setDeactivateOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-neon-blue" />
            User Management
          </h1>
          <p className="text-muted-foreground">Manage team members and permissions</p>
        </div>
        <Button 
          className="bg-neon-green text-background hover:bg-neon-green/90" 
          onClick={() => setAddUserOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="data-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-neon-blue/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-neon-blue" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Users</p>
              <p className="text-2xl font-display font-bold">{totalUsers}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="data-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-neon-green/10 flex items-center justify-center">
              <User className="w-6 h-6 text-neon-green" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Now</p>
              <p className="text-2xl font-display font-bold">{activeUsers}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="data-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-neon-pink/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-neon-pink" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Admins</p>
              <p className="text-2xl font-display font-bold">{adminCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Search users..." 
          className="pl-10 bg-background"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Users List */}
      <Card className="data-card">
        <CardHeader>
          <CardTitle className="text-sm">Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarFallback className="bg-neon-blue/20 text-neon-blue">
                      {user.name.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge className={cn("font-normal", roleColors[user.role])}>
                    {user.role}
                  </Badge>
                  <span className={cn(
                    "text-sm",
                    user.status === "Active" ? "text-neon-green" : "text-muted-foreground"
                  )}>
                    {user.lastActive}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(user)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit User
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openChangeRoleDialog(user)}>
                        <UserCog className="w-4 h-4 mr-2" />
                        Change Role
                      </DropdownMenuItem>
                      {user.status === "Active" && (
                        <DropdownMenuItem 
                          className="text-neon-pink" 
                          onClick={() => openDeactivateDialog(user)}
                        >
                          <UserX className="w-4 h-4 mr-2" />
                          Deactivate
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
            {filteredUsers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No users found matching your search.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-neon-green" />
              Add New User
            </DialogTitle>
            <DialogDescription>
              Invite a new team member to MOJAVOX. They will receive an email invitation.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email Address *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="john@company.com"
                  className="pl-10"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                placeholder="+1 555-0100"
                value={newUser.phone}
                onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Role *</Label>
                <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map(role => (
                      <SelectItem key={role} value={role}>{role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Department</Label>
                <Select value={newUser.department} onValueChange={(v) => setNewUser({ ...newUser, department: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddUserOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-neon-green text-background hover:bg-neon-green/90"
              onClick={handleAddUser}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editUserOpen} onOpenChange={setEditUserOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-neon-blue" />
              Edit User
            </DialogTitle>
            <DialogDescription>
              Update {selectedUser?.name}'s profile information.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Full Name *</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-email">Email Address *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="edit-email"
                  type="email"
                  className="pl-10"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-phone">Phone Number</Label>
              <Input
                id="edit-phone"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Department</Label>
              <Select value={editForm.department} onValueChange={(v) => setEditForm({ ...editForm, department: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUserOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-neon-blue text-white hover:bg-neon-blue/90"
              onClick={handleEditUser}
            >
              <Edit className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog open={changeRoleOpen} onOpenChange={setChangeRoleOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="w-5 h-5 text-neon-blue" />
              Change Role
            </DialogTitle>
            <DialogDescription>
              Update the role for {selectedUser?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-4 mb-4 p-3 rounded-lg bg-muted/50">
              <Avatar>
                <AvatarFallback className="bg-neon-blue/20 text-neon-blue">
                  {selectedUser?.name.split(" ").map(n => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{selectedUser?.name}</p>
                <p className="text-sm text-muted-foreground">Current role: {selectedUser?.role}</p>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>New Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(role => (
                    <SelectItem key={role} value={role}>
                      <div className="flex items-center gap-2">
                        <Badge className={cn("font-normal", roleColors[role])}>
                          {role}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="mt-4 p-3 rounded-lg bg-muted/30 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Role Permissions:</p>
              {newRole === "Admin" && <p>Full access to all features, user management, and system settings.</p>}
              {newRole === "Supervisor" && <p>Manage campaigns, monitor calls, and oversee team performance.</p>}
              {newRole === "Analyst" && <p>View reports, analyze data, and access read-only dashboards.</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeRoleOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-neon-blue text-white hover:bg-neon-blue/90"
              onClick={handleChangeRole}
              disabled={newRole === selectedUser?.role}
            >
              <UserCog className="w-4 h-4 mr-2" />
              Update Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate User Dialog */}
      <ConfirmDialog
        open={deactivateOpen}
        onOpenChange={setDeactivateOpen}
        title="Deactivate User"
        description={`Are you sure you want to deactivate ${selectedUser?.name}? They will lose access to MOJAVOX immediately.`}
        confirmText="Deactivate"
        cancelText="Cancel"
        variant="warning"
        onConfirm={handleDeactivate}
      />
    </div>
  );
}
