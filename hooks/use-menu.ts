"use client";

import type { MenuCategoryDto, MenuItemDto } from "@nodedr-restaurant/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface MenuCategory {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  showOnWebsite: boolean;
  _count: { items: number };
}

export interface KitchenStation {
  id: string;
  name: string;
}

export interface Modifier {
  id: string;
  name: string;
  priceAdjustment: string;
  isDefault: boolean;
}

export interface ModifierGroup {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  isRequired: boolean;
  modifiers: Modifier[];
}

export interface MenuItem {
  id: string;
  categoryId: string;
  stationId: string | null;
  name: string;
  imageUrl: string | null;
  price: string;
  halfPrice: string | null;
  taxRatePercent: string;
  isVeg: boolean;
  isActive: boolean;
  isCombo: boolean;
  category: { id: string; name: string };
  station: { id: string; name: string } | null;
  modifierGroups: { modifierGroup: ModifierGroup }[];
}

export function useCategories(branchId: string | null) {
  return useQuery({
    queryKey: ["menu", "categories", branchId],
    queryFn: () => api.get<MenuCategory[]>(`/menu/categories?branchId=${branchId}`),
    enabled: !!branchId,
    staleTime: 60_000,
    placeholderData: (previous) => previous,
  });
}

export function useStations(branchId: string | null) {
  return useQuery({
    queryKey: ["menu", "stations", branchId],
    queryFn: () => api.get<KitchenStation[]>(`/menu/stations?branchId=${branchId}`),
    enabled: !!branchId,
    staleTime: 60_000,
    placeholderData: (previous) => previous,
  });
}

export function useMenuItems(branchId: string | null, categoryId?: string) {
  return useQuery({
    queryKey: ["menu", "items", branchId, categoryId],
    queryFn: () =>
      api.get<MenuItem[]>(
        `/menu/items?branchId=${branchId}${categoryId ? `&categoryId=${categoryId}` : ""}`,
      ),
    enabled: !!branchId,
    staleTime: 60_000,
    placeholderData: (previous) => previous,
  });
}

export function useCreateCategory(branchId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: MenuCategoryDto) =>
      api.post<MenuCategory>(`/menu/categories?branchId=${branchId}`, dto),
    onMutate: async (dto) => {
      await queryClient.cancelQueries({ queryKey: ["menu", "categories", branchId] });
      const previousCategories = queryClient.getQueryData<MenuCategory[]>([
        "menu",
        "categories",
        branchId,
      ]);

      const optimisticCategory: MenuCategory = {
        id: `temp-cat-${Date.now()}`,
        name: dto.name,
        sortOrder: dto.sortOrder || 0,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        showOnWebsite: dto.showOnWebsite !== undefined ? dto.showOnWebsite : true,
        _count: { items: 0 },
      };

      queryClient.setQueryData<MenuCategory[]>(
        ["menu", "categories", branchId],
        (old) => (old ? [...old, optimisticCategory] : [optimisticCategory]),
      );

      return { previousCategories };
    },
    onError: (_err, _dto, context) => {
      if (context?.previousCategories) {
        queryClient.setQueryData(
          ["menu", "categories", branchId],
          context.previousCategories,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["menu", "categories", branchId] });
    },
  });
}

export function useUpdateCategory(branchId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<MenuCategoryDto> }) =>
      api.patch<MenuCategory>(`/menu/categories/${id}?branchId=${branchId}`, dto),
    onMutate: async ({ id, dto }) => {
      await queryClient.cancelQueries({ queryKey: ["menu", "categories", branchId] });
      const previousCategories = queryClient.getQueryData<MenuCategory[]>([
        "menu",
        "categories",
        branchId,
      ]);

      queryClient.setQueryData<MenuCategory[]>(
        ["menu", "categories", branchId],
        (old) =>
          old ? old.map((cat) => (cat.id === id ? { ...cat, ...dto } : cat)) : [],
      );

      return { previousCategories };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousCategories) {
        queryClient.setQueryData(
          ["menu", "categories", branchId],
          context.previousCategories,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["menu", "categories", branchId] });
    },
  });
}

export function useDeleteCategory(branchId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/menu/categories/${id}?branchId=${branchId}`),
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ["menu", "categories", branchId] });
      const previousCategories = queryClient.getQueryData<MenuCategory[]>([
        "menu",
        "categories",
        branchId,
      ]);

      queryClient.setQueryData<MenuCategory[]>(
        ["menu", "categories", branchId],
        (old) => (old ? old.filter((cat) => cat.id !== deletedId) : []),
      );

      return { previousCategories };
    },
    onError: (_err, _id, context) => {
      if (context?.previousCategories) {
        queryClient.setQueryData(
          ["menu", "categories", branchId],
          context.previousCategories,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["menu", "categories", branchId] });
      queryClient.invalidateQueries({ queryKey: ["menu", "items", branchId] });
    },
  });
}

export function useUploadItemImage() {
  return useMutation({
    mutationFn: (file: File) => api.upload<{ url: string }>("/menu/items/upload-image", file),
  });
}

export function useCreateMenuItem(branchId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: MenuItemDto) =>
      api.post<MenuItem>(`/menu/items?branchId=${branchId}`, dto),
    onMutate: async (dto) => {
      await queryClient.cancelQueries({ queryKey: ["menu", "items", branchId] });
      const previousSnapshots = queryClient.getQueriesData<MenuItem[]>({
        queryKey: ["menu", "items", branchId],
      });

      const optimisticItem: MenuItem = {
        id: `temp-${Date.now()}`,
        categoryId: dto.categoryId,
        stationId: dto.stationId || null,
        name: dto.name,
        imageUrl: dto.imageUrl || null,
        price: String(dto.price),
        halfPrice: dto.halfPrice ? String(dto.halfPrice) : null,
        taxRatePercent: String(dto.taxRatePercent || 5.0),
        isVeg: Boolean(dto.isVeg),
        isActive: dto.isActive !== undefined ? Boolean(dto.isActive) : true,
        isCombo: Boolean(dto.isCombo),
        category: { id: dto.categoryId, name: "General" },
        station: null,
        modifierGroups: [],
      };

      queryClient.setQueriesData<MenuItem[]>(
        { queryKey: ["menu", "items", branchId] },
        (old) => (old ? [optimisticItem, ...old] : [optimisticItem]),
      );

      return { previousSnapshots };
    },
    onError: (_err, _dto, context) => {
      if (context?.previousSnapshots) {
        context.previousSnapshots.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSuccess: (savedItem) => {
      if (savedItem && savedItem.id) {
        queryClient.setQueriesData<MenuItem[]>(
          { queryKey: ["menu", "items", branchId] },
          (old) =>
            old
              ? old.map((item) => (item.id.startsWith("temp-") ? savedItem : item))
              : [savedItem],
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["menu", "items", branchId] });
      queryClient.invalidateQueries({ queryKey: ["combos"] });
    },
  });
}

export function useUpdateMenuItem(branchId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<MenuItemDto> }) =>
      api.patch<MenuItem>(`/menu/items/${id}?branchId=${branchId}`, dto),
    onMutate: async ({ id, dto }) => {
      await queryClient.cancelQueries({ queryKey: ["menu", "items", branchId] });
      const previousSnapshots = queryClient.getQueriesData<MenuItem[]>({
        queryKey: ["menu", "items", branchId],
      });

      queryClient.setQueriesData<MenuItem[]>(
        { queryKey: ["menu", "items", branchId] },
        (old) =>
          old
            ? old.map((item) =>
                item.id === id
                  ? {
                      ...item,
                      ...(dto.name !== undefined ? { name: dto.name } : {}),
                      ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
                      ...(dto.isVeg !== undefined ? { isVeg: Boolean(dto.isVeg) } : {}),
                      ...(dto.isActive !== undefined ? { isActive: Boolean(dto.isActive) } : {}),
                      ...(dto.isCombo !== undefined ? { isCombo: Boolean(dto.isCombo) } : {}),
                      ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
                      price: dto.price !== undefined ? String(dto.price) : item.price,
                      halfPrice:
                        dto.halfPrice !== undefined
                          ? dto.halfPrice
                            ? String(dto.halfPrice)
                            : null
                          : item.halfPrice,
                      taxRatePercent:
                        dto.taxRatePercent !== undefined
                          ? String(dto.taxRatePercent)
                          : item.taxRatePercent,
                    }
                  : item,
              )
            : [],
      );

      return { previousSnapshots };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousSnapshots) {
        context.previousSnapshots.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["menu", "items", branchId] });
      queryClient.invalidateQueries({ queryKey: ["combos"] });
    },
  });
}

export function useDeleteMenuItem(branchId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/menu/items/${id}?branchId=${branchId}`),
    // OPTIMISTIC DELETE: Vanish immediately in 0ms!
    onMutate: async (deletedId: string) => {
      await queryClient.cancelQueries({ queryKey: ["menu", "items", branchId] });

      const previousSnapshots = queryClient.getQueriesData<MenuItem[]>({
        queryKey: ["menu", "items", branchId],
      });

      queryClient.setQueriesData<MenuItem[]>(
        { queryKey: ["menu", "items", branchId] },
        (old) => (old ? old.filter((item) => item.id !== deletedId) : []),
      );

      return { previousSnapshots };
    },
    onError: (_err, _id, context) => {
      // Rollback on error
      if (context?.previousSnapshots) {
        context.previousSnapshots.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["menu", "items", branchId] });
      queryClient.invalidateQueries({ queryKey: ["combos"] });
    },
  });
}
