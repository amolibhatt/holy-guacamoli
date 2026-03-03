import { useState, useMemo } from "react";
import { Users, User, Search, RefreshCw, Trash2, Shield, Crown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UserWithStats } from "./types";
import { formatRelativeDate } from "./types";

interface UsersTabProps {
  users: UserWithStats[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  userSearch: string;
  setUserSearch: (val: string) => void;
  onDeleteUser: (userId: string) => void;
  onUpdateRole: (params: { userId: string; role: string }) => void;
  currentUserId: string;
  deleteUserPending: boolean;
  updateRolePending: boolean;
}

function getRoleColor(role: string) {
  if (role === "super_admin") return "bg-purple-500/20 text-purple-700 dark:text-purple-300";
  if (role === "admin") return "bg-blue-500/20 text-blue-700 dark:text-blue-300";
  return "bg-muted text-muted-foreground";
}

function getAvatarColor(role: string) {
  if (role === "super_admin") return "bg-purple-500 text-white";
  if (role === "admin") return "bg-blue-500 text-white";
  return "bg-muted-foreground/20 text-muted-foreground";
}

function getDisplayName(user: UserWithStats) {
  if (user.firstName || user.lastName) {
    return `${user.firstName || ""} ${user.lastName || ""}`.trim();
  }
  return user.email;
}

function getInitial(user: UserWithStats) {
  const name = getDisplayName(user);
  return name.charAt(0).toUpperCase();
}

export default function UsersTab({
  users,
  isLoading,
  isError,
  refetch,
  userSearch,
  setUserSearch,
  onDeleteUser,
  onUpdateRole,
  currentUserId,
  deleteUserPending,
  updateRolePending,
}: UsersTabProps) {
  const [roleFilter, setRoleFilter] = useState("all");

  const totalUsers = users.length;
  const adminCount = users.filter((u) => u.role === "admin").length;
  const superAdminCount = users.filter((u) => u.role === "super_admin").length;

  const filteredUsers = useMemo(() => {
    let result = users;
    if (roleFilter !== "all") {
      result = result.filter((u) => u.role === roleFilter);
    }
    if (userSearch.trim()) {
      const q = userSearch.toLowerCase();
      result = result.filter(
        (u) =>
          (u.firstName || "").toLowerCase().includes(q) ||
          (u.lastName || "").toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      );
    }
    return result;
  }, [users, roleFilter, userSearch]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-md" />
          ))}
        </div>
        <Skeleton className="h-9 rounded-md" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14 rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground" data-testid="text-users-error">Failed to load users.</p>
          <Button variant="outline" onClick={() => refetch()} className="mt-3" data-testid="button-retry-users">
            <RefreshCw className="mr-2 h-4 w-4" /> Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Users</p>
              <p className="text-lg font-semibold" data-testid="stat-total-users">{totalUsers}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-500/10">
              <Shield className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Admins</p>
              <p className="text-lg font-semibold" data-testid="stat-admin-count">{adminCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-purple-500/10">
              <Crown className="h-4 w-4 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Super Admins</p>
              <p className="text-lg font-semibold" data-testid="stat-super-admin-count">{superAdminCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            className="pl-9"
            data-testid="input-user-search"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[140px]" data-testid="select-role-filter">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="super_admin">Super Admin</SelectItem>
          </SelectContent>
        </Select>
        <Button size="icon" variant="outline" onClick={() => refetch()} data-testid="button-refresh-users">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="max-h-[600px] overflow-y-auto space-y-1.5">
        {filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <User className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground" data-testid="text-no-users">No users match your filters.</p>
            </CardContent>
          </Card>
        ) : (
          filteredUsers.map((u) => {
            const displayName = getDisplayName(u);
            const cc = u.contentCounts;
            return (
              <div
                key={u.id}
                className="flex items-center gap-3 rounded-md bg-muted/30 px-3 py-2 flex-wrap"
                data-testid={`row-user-${u.id}`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium ${getAvatarColor(u.role)}`}
                  data-testid={`avatar-user-${u.id}`}
                >
                  {getInitial(u)}
                </div>

                <div className="min-w-[120px] flex-1">
                  <p className="text-sm font-medium truncate" data-testid={`text-name-${u.id}`}>
                    {displayName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate max-w-[200px]" data-testid={`text-email-${u.id}`}>
                    {u.email}
                  </p>
                </div>

                {cc && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {(u.boardCount || 0) > 0 && (
                      <Badge variant="secondary" className="text-[10px]" data-testid={`badge-grids-${u.id}`}>
                        {u.boardCount} grids
                      </Badge>
                    )}
                    {cc.sequenceQuestions > 0 && (
                      <Badge variant="secondary" className="text-[10px]" data-testid={`badge-sc-${u.id}`}>
                        {cc.sequenceQuestions} SC
                      </Badge>
                    )}
                    {cc.psyopQuestions > 0 && (
                      <Badge variant="secondary" className="text-[10px]" data-testid={`badge-psyop-${u.id}`}>
                        {cc.psyopQuestions} PsyOp
                      </Badge>
                    )}
                    {cc.timeWarpQuestions > 0 && (
                      <Badge variant="secondary" className="text-[10px]" data-testid={`badge-pf-${u.id}`}>
                        {cc.timeWarpQuestions} PF
                      </Badge>
                    )}
                    {(cc.memePrompts + cc.memeImages) > 0 && (
                      <Badge variant="secondary" className="text-[10px]" data-testid={`badge-meme-${u.id}`}>
                        {cc.memePrompts + cc.memeImages} meme
                      </Badge>
                    )}
                  </div>
                )}

                <Badge className={`no-default-hover-elevate no-default-active-elevate ${getRoleColor(u.role)}`} data-testid={`badge-role-${u.id}`}>
                  {u.role === "super_admin" ? "Super Admin" : u.role === "admin" ? "Admin" : "User"}
                </Badge>

                <span className="text-xs text-muted-foreground whitespace-nowrap" data-testid={`text-last-login-${u.id}`}>
                  {formatRelativeDate(u.lastLoginAt)}
                </span>

                <Select
                  value={u.role}
                  onValueChange={(role) => onUpdateRole({ userId: u.id, role })}
                  disabled={u.id === currentUserId || updateRolePending}
                >
                  <SelectTrigger className="w-[120px]" data-testid={`select-role-${u.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  size="icon"
                  variant="ghost"
                  disabled={u.id === currentUserId || deleteUserPending}
                  onClick={() => onDeleteUser(u.id)}
                  data-testid={`button-delete-user-${u.id}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
