export type ApiResponse = {
    status: boolean;
    code: number;
    message: string;
    data?: any;
};
export interface PaginationDto {
    page?: number;
    limit?: number;
}
export interface SortDto {
    sortBy?: string;
    sortOrder?: "asc" | "desc";
}
//# sourceMappingURL=common.dto.d.ts.map