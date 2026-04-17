import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabase, hasSupabaseEnv } from "@/lib/supabase-client";
import * as api from "@/lib/signage-queries";

export function useProfileQuery() {
  const client = getSupabase();
  return useQuery({
    queryKey: ["signage", "profile"],
    enabled: !!client,
    queryFn: async () => {
      if (!client) return null;
      const { data: auth } = await client.auth.getUser();
      const user = auth.user;
      if (!user) return null;
      return api.fetchProfile(client, user.id);
    },
  });
}

/** Perfil + orgId + flag de env (padrão para páginas /app). */
export function useSignageOrg() {
  const hasBackend = hasSupabaseEnv;
  const profileQuery = useProfileQuery();
  const orgId = profileQuery.data?.organization_id;
  return { hasBackend, orgId, ...profileQuery };
}

export function useOrganizationQuery(orgId: string | undefined) {
  const client = getSupabase();
  return useQuery({
    queryKey: ["signage", "organization", orgId],
    enabled: !!client && !!orgId,
    queryFn: async () => {
      if (!client || !orgId) return null;
      return api.fetchOrganization(client, orgId);
    },
  });
}

export function useUnitsQuery(orgId: string | undefined) {
  const client = getSupabase();
  return useQuery({
    queryKey: ["signage", "units", orgId],
    enabled: !!client && !!orgId,
    queryFn: async () => {
      if (!client || !orgId) return [];
      return api.fetchUnits(client, orgId);
    },
  });
}

export function useScreensQuery(orgId: string | undefined) {
  const client = getSupabase();
  return useQuery({
    queryKey: ["signage", "screens", orgId],
    enabled: !!client && !!orgId,
    queryFn: async () => {
      if (!client || !orgId) return [];
      return api.fetchScreens(client, orgId);
    },
  });
}

export function useMediaQuery(orgId: string | undefined) {
  const client = getSupabase();
  return useQuery({
    queryKey: ["signage", "media", orgId],
    enabled: !!client && !!orgId,
    queryFn: async () => {
      if (!client || !orgId) return [];
      return api.fetchMediaAssets(client, orgId);
    },
  });
}

export function usePlaylistsQuery(orgId: string | undefined) {
  const client = getSupabase();
  return useQuery({
    queryKey: ["signage", "playlists", orgId],
    enabled: !!client && !!orgId,
    queryFn: async () => {
      if (!client || !orgId) return [];
      return api.fetchPlaylists(client, orgId);
    },
  });
}

export function usePlaylistItemsQuery(playlistId: string | undefined) {
  const client = getSupabase();
  return useQuery({
    queryKey: ["signage", "playlist-items", playlistId],
    enabled: !!client && !!playlistId,
    queryFn: async () => {
      if (!client || !playlistId) return [];
      return api.fetchPlaylistItems(client, playlistId);
    },
  });
}

export function useCampaignsQuery(orgId: string | undefined) {
  const client = getSupabase();
  return useQuery({
    queryKey: ["signage", "campaigns", orgId],
    enabled: !!client && !!orgId,
    queryFn: async () => {
      if (!client || !orgId) return [];
      return api.fetchCampaigns(client, orgId);
    },
  });
}

export function useAlertsQuery(orgId: string | undefined) {
  const client = getSupabase();
  return useQuery({
    queryKey: ["signage", "alerts", orgId],
    enabled: !!client && !!orgId,
    queryFn: async () => {
      if (!client || !orgId) return [];
      return api.fetchAlerts(client, orgId);
    },
  });
}

export function useAuditQuery(orgId: string | undefined) {
  const client = getSupabase();
  return useQuery({
    queryKey: ["signage", "audit", orgId],
    enabled: !!client && !!orgId,
    queryFn: async () => {
      if (!client || !orgId) return [];
      return api.fetchAuditLogs(client, orgId);
    },
  });
}

export function useScreenGroupsQuery(orgId: string | undefined) {
  const client = getSupabase();
  return useQuery({
    queryKey: ["signage", "groups", orgId],
    enabled: !!client && !!orgId,
    queryFn: async () => {
      if (!client || !orgId) return [];
      return api.fetchScreenGroups(client, orgId);
    },
  });
}

export function useSchedulesQuery(orgId: string | undefined) {
  const client = getSupabase();
  return useQuery({
    queryKey: ["signage", "schedules", orgId],
    enabled: !!client && !!orgId,
    queryFn: async () => {
      if (!client || !orgId) return [];
      return api.fetchSchedules(client, orgId);
    },
  });
}

export function useProfilesDirectoryQuery(orgId: string | undefined) {
  const client = getSupabase();
  return useQuery({
    queryKey: ["signage", "profiles", orgId],
    enabled: !!client && !!orgId,
    queryFn: async () => {
      if (!client || !orgId) return [];
      return api.fetchProfilesDirectory(client, orgId);
    },
  });
}

export function usePlaybackReportQuery(orgId: string | undefined, sinceIso: string) {
  const client = getSupabase();
  return useQuery({
    queryKey: ["signage", "playback", orgId, sinceIso],
    enabled: !!client && !!orgId,
    queryFn: async () => {
      if (!client || !orgId) return [];
      return api.fetchPlaybackLogs(client, orgId, sinceIso);
    },
  });
}

export function useSignageEnabled() {
  return hasSupabaseEnv;
}

/** Mutations com invalidação básica */
export function useUnitMutations(orgId: string | undefined) {
  const client = getSupabase();
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["signage", "units", orgId] });
    void qc.invalidateQueries({ queryKey: ["signage", "screens", orgId] });
  };
  return {
    create: useMutation({
      mutationFn: async (row: {
        name: string;
        address?: string;
        city?: string;
        state?: string;
      }) => {
        if (!client || !orgId) throw new Error("Supabase indisponível");
        return api.insertUnit(client, orgId, row);
      },
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
        if (!client) throw new Error("Supabase indisponível");
        return api.updateUnit(client, id, patch);
      },
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: async (id: string) => {
        if (!client) throw new Error("Supabase indisponível");
        return api.deleteUnit(client, id);
      },
      onSuccess: invalidate,
    }),
  };
}

export function useScreenMutations(orgId: string | undefined) {
  const client = getSupabase();
  const qc = useQueryClient();
  const invalidate = () => void qc.invalidateQueries({ queryKey: ["signage", "screens", orgId] });
  return {
    create: useMutation({
      mutationFn: async (row: { name: string; unit_id?: string | null }) => {
        if (!client || !orgId) throw new Error("Supabase indisponível");
        return api.insertScreen(client, orgId, row);
      },
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
        if (!client) throw new Error("Supabase indisponível");
        return api.updateScreen(client, id, patch);
      },
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: async (id: string) => {
        if (!client) throw new Error("Supabase indisponível");
        return api.deleteScreen(client, id);
      },
      onSuccess: invalidate,
    }),
  };
}

export function useMediaMutations(orgId: string | undefined) {
  const client = getSupabase();
  const qc = useQueryClient();
  const invalidate = () => void qc.invalidateQueries({ queryKey: ["signage", "media", orgId] });
  return {
    remove: useMutation({
      mutationFn: async (id: string) => {
        if (!client) throw new Error("Supabase indisponível");
        return api.deleteMediaAsset(client, id);
      },
      onSuccess: invalidate,
    }),
  };
}

export function usePlaylistMutations(orgId: string | undefined) {
  const client = getSupabase();
  const qc = useQueryClient();
  const invalidate = () => void qc.invalidateQueries({ queryKey: ["signage", "playlists", orgId] });
  return {
    create: useMutation({
      mutationFn: async (name: string) => {
        if (!client || !orgId) throw new Error("Supabase indisponível");
        return api.insertPlaylist(client, orgId, name);
      },
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
        if (!client) throw new Error("Supabase indisponível");
        return api.updatePlaylist(client, id, patch);
      },
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: async (id: string) => {
        if (!client) throw new Error("Supabase indisponível");
        return api.deletePlaylist(client, id);
      },
      onSuccess: invalidate,
    }),
  };
}

export function useCampaignMutations(orgId: string | undefined) {
  const client = getSupabase();
  const qc = useQueryClient();
  const invalidate = () => void qc.invalidateQueries({ queryKey: ["signage", "campaigns", orgId] });
  return {
    create: useMutation({
      mutationFn: async (row: {
        name: string;
        playlist_id: string;
        start_at: string;
        end_at: string;
      }) => {
        if (!client || !orgId) throw new Error("Supabase indisponível");
        return api.insertCampaign(client, orgId, row);
      },
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
        if (!client) throw new Error("Supabase indisponível");
        return api.updateCampaign(client, id, patch);
      },
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: async (id: string) => {
        if (!client) throw new Error("Supabase indisponível");
        return api.deleteCampaign(client, id);
      },
      onSuccess: invalidate,
    }),
  };
}

export function useOrganizationMutation(orgId: string | undefined) {
  const client = getSupabase();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      if (!client || !orgId) throw new Error("Supabase indisponível");
      return api.updateOrganization(client, orgId, patch);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["signage", "organization", orgId] });
    },
  });
}

export function useScreenGroupMutations(orgId: string | undefined) {
  const client = getSupabase();
  const qc = useQueryClient();
  const invalidate = () => void qc.invalidateQueries({ queryKey: ["signage", "groups", orgId] });
  return {
    create: useMutation({
      mutationFn: async (name: string) => {
        if (!client || !orgId) throw new Error("Supabase indisponível");
        return api.insertScreenGroup(client, orgId, name);
      },
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: async (id: string) => {
        if (!client) throw new Error("Supabase indisponível");
        return api.deleteScreenGroup(client, id);
      },
      onSuccess: invalidate,
    }),
  };
}

export function useAlertMutations(orgId: string | undefined) {
  const client = getSupabase();
  const qc = useQueryClient();
  const invalidate = () => void qc.invalidateQueries({ queryKey: ["signage", "alerts", orgId] });
  return {
    resolve: useMutation({
      mutationFn: async (id: string) => {
        if (!client) throw new Error("Supabase indisponível");
        return api.updateAlert(client, id, {
          resolved_at: new Date().toISOString(),
          status: "inactive",
        });
      },
      onSuccess: invalidate,
    }),
  };
}

export function useScheduleMutations(orgId: string | undefined) {
  const client = getSupabase();
  const qc = useQueryClient();
  const invalidate = () => void qc.invalidateQueries({ queryKey: ["signage", "schedules", orgId] });
  return {
    create: useMutation({
      mutationFn: async (row: Parameters<typeof api.insertCampaignSchedule>[1]) => {
        if (!client) throw new Error("Supabase indisponível");
        return api.insertCampaignSchedule(client, row);
      },
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: async (id: string) => {
        if (!client) throw new Error("Supabase indisponível");
        return api.deleteCampaignSchedule(client, id);
      },
      onSuccess: invalidate,
    }),
  };
}

export function useProfileDirectoryMutation(orgId: string | undefined) {
  const client = getSupabase();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      if (!client) throw new Error("Supabase indisponível");
      return api.updateProfile(client, id, patch);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["signage", "profiles", orgId] });
    },
  });
}
