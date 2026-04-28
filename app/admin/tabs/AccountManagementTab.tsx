"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Search, Users, UserCheck, UserX, Shield, Ban, Mail, Crown } from "lucide-react"
import { cn } from "@/lib/utils"

interface Profile {
  id: string
  email: string
  display_name?: string
  full_name?: string
  role: 'user' | 'premium' | 'admin'
  is_admin: boolean
  is_active: boolean
  is_banned: boolean
  created_at: string
  last_login?: string
  generation_count?: number
}

interface AccountManagementTabProps {
  initialProfiles: any[]
}

export function AccountManagementTab({ initialProfiles }: AccountManagementTabProps) {
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles)
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // Calcular estatísticas
  const stats = {
    total: profiles.length,
    active: profiles.filter(p => p.is_active && !p.is_banned).length,
    admins: profiles.filter(p => p.is_admin).length,
    banned: profiles.filter(p => p.is_banned).length,
    premium: profiles.filter(p => p.role === 'premium').length
  }

  // Filtrar perfis
  const filteredProfiles = profiles.filter(profile => {
    const searchLower = searchTerm.toLowerCase()
    return (
      profile.email.toLowerCase().includes(searchLower) ||
      (profile.display_name?.toLowerCase().includes(searchLower) || false) ||
      (profile.full_name?.toLowerCase().includes(searchLower) || false)
    )
  })

  // Atualizar role do usuário
  const updateRole = async (userId: string, newRole: 'user' | 'premium' | 'admin') => {
    setUpdatingId(userId)
    try {
      const sb = createClient()
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await sb
        .from('profiles' as any)
        .update({ 
          role: newRole,
          is_admin: newRole === 'admin'
        })
        .eq('id', userId)

      if (error) throw error

      setProfiles(prev => prev.map(p => 
        p.id === userId 
          ? { ...p, role: newRole, is_admin: newRole === 'admin' }
          : p
      ))

      setToast({
        type: 'success',
        message: `Role atualizado para ${newRole}`
      })

    } catch (error) {
      console.error('Error updating role:', error)
      setToast({
        type: 'error',
        message: 'Erro ao atualizar role'
      })
    } finally {
      setUpdatingId(null)
    }
  }

  // Toggle status ativo
  const toggleActive = async (userId: string, currentStatus: boolean) => {
    setUpdatingId(userId)
    try {
      const sb = createClient()
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await sb
        .from('profiles' as any)
        .update({ is_active: !currentStatus })
        .eq('id', userId)

      if (error) throw error

      setProfiles(prev => prev.map(p => 
        p.id === userId 
          ? { ...p, is_active: !currentStatus }
          : p
      ))

      setToast({
        type: 'success',
        message: `Usuário ${!currentStatus ? 'ativado' : 'desativado'} com sucesso`
      })

    } catch (error) {
      console.error('Error toggling active status:', error)
      setToast({
        type: 'error',
        message: 'Erro ao atualizar status'
      })
    } finally {
      setUpdatingId(null)
    }
  }

  // Toggle ban
  const toggleBan = async (userId: string, currentStatus: boolean) => {
    setUpdatingId(userId)
    try {
      const sb = createClient()
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await sb
        .from('profiles' as any)
        .update({ 
          is_banned: !currentStatus,
          is_active: currentStatus // Se banindo, desativa. Se desbanindo, mantém ativo
        })
        .eq('id', userId)

      if (error) throw error

      setProfiles(prev => prev.map(p => 
        p.id === userId 
          ? { ...p, is_banned: !currentStatus, is_active: currentStatus }
          : p
      ))

      setToast({
        type: 'success',
        message: `Usuário ${!currentStatus ? 'banido' : 'desbanido'} com sucesso`
      })

    } catch (error) {
      console.error('Error toggling ban status:', error)
      setToast({
        type: 'error',
        message: 'Erro ao atualizar status de ban'
      })
    } finally {
      setUpdatingId(null)
    }
  }

  const getRoleBadge = (role: string, isAdmin: boolean) => {
    if (isAdmin) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/50">
          <Shield className="h-3 w-3" />
          Admin
        </span>
      )
    }

    const styles = {
      premium: "bg-amber-500/20 text-amber-300 border-amber-500/50",
      user: "bg-zinc-500/20 text-zinc-300 border-zinc-500/50"
    }

    const icons = {
      premium: <Crown className="h-3 w-3" />,
      user: <Users className="h-3 w-3" />
    }

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${styles[role as keyof typeof styles]}`}>
        {icons[role as keyof typeof icons]}
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    )
  }

  const getStatusBadge = (isActive: boolean, isBanned: boolean) => {
    if (isBanned) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/50">
          <Ban className="h-3 w-3" />
          Banido
        </span>
      )
    }

    return (
      <span className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border",
        isActive 
          ? "bg-green-500/20 text-green-300 border-green-500/50"
          : "bg-orange-500/20 text-orange-300 border-orange-500/50"
      )}>
        {isActive ? (
          <>
            <UserCheck className="h-3 w-3" />
            Ativo
          </>
        ) : (
          <>
            <UserX className="h-3 w-3" />
            Inativo
          </>
        )}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-white">Gerenciamento de Contas</h2>
        <p className="text-zinc-400 mt-1">
          Gerencie usuários, roles e permissões
        </p>
      </div>

      {toast && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${
          toast.type === 'success' 
            ? 'border-emerald-500/25 bg-emerald-950/30 text-emerald-100'
            : 'border-red-500/25 bg-red-950/30 text-red-100'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-400">Total Usuários</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
            <Users className="h-8 w-8 text-zinc-600" />
          </div>
        </div>
        
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-400">Ativos</p>
              <p className="text-2xl font-bold text-green-400">{stats.active}</p>
            </div>
            <UserCheck className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-400">Admins</p>
              <p className="text-2xl font-bold text-purple-400">{stats.admins}</p>
            </div>
            <Shield className="h-8 w-8 text-purple-600" />
          </div>
        </div>
        
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-400">Premium</p>
              <p className="text-2xl font-bold text-amber-400">{stats.premium}</p>
            </div>
            <Crown className="h-8 w-8 text-amber-600" />
          </div>
        </div>
        
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-400">Banidos</p>
              <p className="text-2xl font-bold text-red-400">{stats.banned}</p>
            </div>
            <Ban className="h-8 w-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* Barra de Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <input
          type="text"
          placeholder="Buscar por email, nome ou display name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        />
      </div>

      {/* Tabela de Usuários */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left p-4 text-sm font-medium text-zinc-300">Usuário</th>
                <th className="text-left p-4 text-sm font-medium text-zinc-300">Role</th>
                <th className="text-left p-4 text-sm font-medium text-zinc-300">Status</th>
                <th className="text-left p-4 text-sm font-medium text-zinc-300">Data Criação</th>
                <th className="text-left p-4 text-sm font-medium text-zinc-300">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredProfiles.map((profile) => (
                <tr key={profile.id} className="border-b border-zinc-800 hover:bg-zinc-800/30">
                  <td className="p-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-zinc-400" />
                        <span className="text-sm text-white font-medium">
                          {profile.display_name || profile.full_name || 'Sem nome'}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1 ml-6">{profile.email}</p>
                    </div>
                  </td>
                  
                  <td className="p-4">
                    <select
                      value={profile.role}
                      onChange={(e) => updateRole(profile.id, e.target.value as 'user' | 'premium' | 'admin')}
                      disabled={updatingId === profile.id}
                      className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
                    >
                      <option value="user">User</option>
                      <option value="premium">Premium</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  
                  <td className="p-4">
                    {getStatusBadge(profile.is_active, profile.is_banned)}
                  </td>
                  
                  <td className="p-4">
                    <span className="text-sm text-zinc-300">
                      {new Date(profile.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </td>
                  
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleActive(profile.id, profile.is_active)}
                        disabled={updatingId === profile.id || profile.is_banned}
                        className="px-3 py-1 text-xs font-medium rounded border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {profile.is_active ? 'Desativar' : 'Ativar'}
                      </button>
                      
                      <button
                        onClick={() => toggleBan(profile.id, profile.is_banned)}
                        disabled={updatingId === profile.id}
                        className={cn(
                          "px-3 py-1 text-xs font-medium rounded border disabled:opacity-50 disabled:cursor-not-allowed",
                          profile.is_banned
                            ? "bg-green-900/50 text-green-300 border-green-800 hover:bg-green-900"
                            : "bg-red-900/50 text-red-300 border-red-800 hover:bg-red-900"
                        )}
                      >
                        {profile.is_banned ? 'Desbanir' : 'Banir'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredProfiles.length === 0 && (
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto mb-4 text-zinc-600" />
            <p className="text-zinc-400">
              {searchTerm ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
