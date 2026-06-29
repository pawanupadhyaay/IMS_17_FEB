import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  patchProduct,
  deleteProduct,
  getBrands,
  patchProductsBulk,
  deleteProductsBulk
} from '../services/productService'

// Query keys
export const productKeys = {
  all: ['products'],
  lists: () => [...productKeys.all, 'list'],
  list: (filters) => [...productKeys.lists(), filters],
  details: () => [...productKeys.all, 'detail'],
  detail: (id) => [...productKeys.details(), id],
  brands: () => [...productKeys.all, 'brands'],
}

// Fetch products list
export const useProducts = (filters = {}) => {
  return useQuery({
    queryKey: productKeys.list(filters),
    queryFn: () => getProducts(filters),
    keepPreviousData: true,
  })
}

// Fetch single product
export const useProduct = (id) => {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => getProduct(id),
    enabled: !!id,
  })
}

// Fetch brands
export const useBrands = () => {
  return useQuery({
    queryKey: productKeys.brands(),
    queryFn: () => getBrands(),
    staleTime: 10 * 60 * 1000,
  })
}

// Create product
export const useCreateProduct = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createProduct,
    onSuccess: (response) => {
      if (response?.data) {
        queryClient.setQueryData(
          productKeys.detail(response.data._id),
          { success: true, data: response.data }
        )
      }

      queryClient.invalidateQueries({ queryKey: productKeys.lists() })
      queryClient.invalidateQueries({ queryKey: productKeys.brands() })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

// Update product (PUT)
export const useUpdateProduct = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }) => updateProduct(id, data),
    onSuccess: (response, variables) => {
      if (response?.data) {
        queryClient.setQueryData(
          productKeys.detail(variables.id),
          { success: true, data: response.data }
        )
      }

      queryClient.invalidateQueries({ queryKey: productKeys.lists() })
      queryClient.invalidateQueries({ queryKey: productKeys.brands() })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

// PATCH product (used for image reorder)
export const usePatchProduct = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }) => patchProduct(id, data),

    // Optimistic update
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: productKeys.detail(id) })
      await queryClient.cancelQueries({ queryKey: productKeys.lists() })

      const previousProduct = queryClient.getQueryData(productKeys.detail(id))
      const previousLists = queryClient.getQueriesData({ queryKey: productKeys.lists() })

      // Optimistically update detail
      if (previousProduct?.data) {
        queryClient.setQueryData(productKeys.detail(id), {
          ...previousProduct,
          data: {
            ...previousProduct.data,
            ...data,
          },
        })
      }

      // Optimistically update lists (IMAGE column = primary from images[0])
      previousLists.forEach(([queryKey, listData]) => {
        if (!listData?.data) return

        const updatedList = listData.data.map((p) => {
          if (p._id !== id) return p
          const merged = { ...p, ...data }
          if (Array.isArray(data.images) && data.images.length > 0) {
            merged.images = data.images
            merged.image = { ...(merged.image || {}), url: data.images[0] }
          }
          return merged
        })

        queryClient.setQueryData(queryKey, {
          ...listData,
          data: updatedList,
        })
      })

      return { previousProduct, previousLists }
    },

    // Rollback if error
    onError: (err, variables, context) => {
      if (context?.previousProduct) {
        queryClient.setQueryData(
          productKeys.detail(variables.id),
          context.previousProduct
        )
      }

      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, listData]) => {
          queryClient.setQueryData(queryKey, listData)
        })
      }
    },

    // Sync with real backend response (dashboard IMAGE column = primary from images[0])
    onSuccess: (response, variables) => {
      if (!response?.data) return

      const updated = response.data

      queryClient.setQueryData(
        productKeys.detail(variables.id),
        { success: true, data: updated }
      )

      // List cache: use full updated product so IMAGE column shows new primary
      queryClient.setQueriesData(
        { queryKey: productKeys.lists() },
        (old) => {
          if (!old?.data) return old
          return {
            ...old,
            data: old.data.map((p) =>
              p._id === variables.id ? updated : p
            ),
          }
        }
      )
    },

    // Final refetch safety
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: productKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: productKeys.lists() })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

// Delete product
export const useDeleteProduct = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

// PATCH products in bulk
export const usePatchProductsBulk = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: patchProductsBulk,

    // Optimistic update for all lists
    onMutate: async ({ ids, data }) => {
      await queryClient.cancelQueries({ queryKey: productKeys.lists() })

      const previousLists = queryClient.getQueriesData({ queryKey: productKeys.lists() })

      previousLists.forEach(([queryKey, listData]) => {
        if (!listData?.data) return

        const updatedList = listData.data.map((p) => {
          if (!ids.includes(p._id)) return p
          return { ...p, ...data }
        })

        queryClient.setQueryData(queryKey, {
          ...listData,
          data: updatedList,
        })
      })

      return { previousLists }
    },

    onError: (err, variables, context) => {
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, listData]) => {
          queryClient.setQueryData(queryKey, listData)
        })
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() })
      queryClient.invalidateQueries({ queryKey: productKeys.brands() })
      queryClient.removeQueries({ queryKey: productKeys.details() })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

// DELETE products in bulk
export const useDeleteProductsBulk = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteProductsBulk,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}