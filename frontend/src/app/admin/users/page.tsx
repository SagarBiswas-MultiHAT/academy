"use client"

import { useEffect, useState } from "react"
import { UsersRound } from "lucide-react"

import api from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

type User = {
  id: string
  email: string
  name?: string
  role: "ADMIN" | "USER"
  createdAt: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [roleUpdates, setRoleUpdates] = useState<Record<string, User["role"]>>({})

  const loadUsers = async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await api.get("/users", { params: { page: 1, limit: 100 } })
      const payload = res.data.data as { users: User[] }
      setUsers(payload.users || [])
    } catch {
      setError("Unable to load users.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleRoleChange = (id: string, role: User["role"]) => {
    setRoleUpdates((prev) => ({ ...prev, [id]: role }))
  }

  const handleSave = async (user: User) => {
    const role = roleUpdates[user.id] ?? user.role
    if (role === user.role) return

    setSavingId(user.id)
    try {
      await api.patch(`/users/${user.id}/role`, { role })
      await loadUsers()
    } catch {
      setError("Unable to update user role.")
    } finally {
      setSavingId(null)
    }
  }

  const displayUsers: Array<User | null> = loading
    ? Array.from({ length: 5 }).map(() => null)
    : users

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold font-[family-name:var(--font-space-grotesk)]">
          Admin users
        </h1>
        <p className="text-sm text-muted-foreground">Manage user roles and access.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UsersRound className="size-5 text-primary" /> Users
          </CardTitle>
          <CardDescription>Latest 100 users.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Email</th>
                  <th className="px-3 py-2 text-left">Role</th>
                  <th className="px-3 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayUsers.map((user, index) => (
                  <tr key={user?.id ?? index} className="border-b">
                    {user ? (
                      <>
                        <td className="px-3 py-3">
                          <p className="font-medium">{user.name ?? "User"}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="px-3 py-3">{user.email}</td>
                        <td className="px-3 py-3">
                          <Badge variant={user.role === "ADMIN" ? "success" : "secondary"}>
                            {user.role}
                          </Badge>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              value={roleUpdates[user.id] ?? user.role}
                              onChange={(event) =>
                                handleRoleChange(user.id, event.target.value as User["role"])
                              }
                              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                            >
                              <option value="USER">USER</option>
                              <option value="ADMIN">ADMIN</option>
                            </select>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSave(user)}
                              disabled={savingId === user.id}
                            >
                              {savingId === user.id ? "Saving" : "Save"}
                            </Button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <td className="px-3 py-3" colSpan={4}>
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-1/2" />
                          <Skeleton className="h-3 w-1/3" />
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
