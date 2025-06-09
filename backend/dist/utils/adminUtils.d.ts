export declare const updateCategoryProductCount: (categoryId: string) => Promise<void>;
export declare const validateProductData: (productData: any) => {
    valid: boolean;
    errors: string[];
};
export declare const validateCategoryData: (categoryData: any) => {
    valid: boolean;
    errors: string[];
};
export declare const canDeleteCategory: (categoryId: string) => Promise<{
    canDelete: boolean;
    reason?: string;
}>;
export declare const getProductStatistics: (categoryId?: string) => Promise<{
    totalProducts: number;
    inStockProducts: number;
    outOfStockProducts: number;
    averagePrice: number;
    averageRating: number;
    totalValue: number;
    stockPercentage: number;
}>;
export declare const sanitizeProductData: (productData: any) => any;
export declare const getCategoryHierarchy: () => Promise<{
    id: string;
    name: string;
    description: string | null;
    featured: boolean;
    productCount: number;
    image: string;
}[]>;
export declare const buildProductSearchQuery: (params: {
    search?: string;
    category?: string;
    inStock?: boolean;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
}) => any;
declare const _default: {
    updateCategoryProductCount: (categoryId: string) => Promise<void>;
    validateProductData: (productData: any) => {
        valid: boolean;
        errors: string[];
    };
    validateCategoryData: (categoryData: any) => {
        valid: boolean;
        errors: string[];
    };
    canDeleteCategory: (categoryId: string) => Promise<{
        canDelete: boolean;
        reason?: string;
    }>;
    getProductStatistics: (categoryId?: string) => Promise<{
        totalProducts: number;
        inStockProducts: number;
        outOfStockProducts: number;
        averagePrice: number;
        averageRating: number;
        totalValue: number;
        stockPercentage: number;
    }>;
    sanitizeProductData: (productData: any) => any;
    getCategoryHierarchy: () => Promise<{
        id: string;
        name: string;
        description: string | null;
        featured: boolean;
        productCount: number;
        image: string;
    }[]>;
    buildProductSearchQuery: (params: {
        search?: string;
        category?: string;
        inStock?: boolean;
        minPrice?: number;
        maxPrice?: number;
        minRating?: number;
    }) => any;
};
export default _default;
//# sourceMappingURL=adminUtils.d.ts.map