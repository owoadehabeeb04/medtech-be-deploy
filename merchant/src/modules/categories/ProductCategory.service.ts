import { HttpException } from "@medtech/utils";
import { Op, Transaction } from "sequelize";
import taxonomy from "./product-taxonomy.json";
import { Product } from "../products/Product.model";
import { ProductCategory } from "./ProductCategory.model";

export type ProductCategorySeedNode = {
  key: string;
  name: string;
  children?: ProductCategorySeedNode[];
  isActive?: boolean;
};

export type ProductCategoryNode = {
  id: string;
  key: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  isSelectable: boolean;
  childCount: number;
  breadcrumb: Array<{ id: string; key: string; name: string }>;
  children?: ProductCategoryNode[];
};

const seedData = taxonomy as ProductCategorySeedNode[];

// PostgreSQL advisory locks are scoped to the transaction below. The stable key
// serializes taxonomy synchronization across all Merchant instances without
// adding a seed-version flag that could become stale after a restore or edit.
const TAXONOMY_SYNC_ADVISORY_LOCK_KEY = 739184219;

type CategoryWriteOptions = {
  transaction?: Transaction;
};

export type TaxonomySyncResult = {
  seed: { created: number; updated: number };
  backfill: { mapped: number; ambiguous: number; flagged: number };
};

const normalize = (value: unknown): string => String(value || "").trim().toLowerCase();

const sortRows = (rows: ProductCategory[]): ProductCategory[] =>
  [...rows].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

const flattenSeed = (
  nodes: ProductCategorySeedNode[],
  parentKey: string | null = null,
  parentIsActive = true,
  output: Array<{
    key: string;
    name: string;
    parentKey: string | null;
    sortOrder: number;
    isActive: boolean;
    isSelectable: boolean;
  }> = []
) => {
  nodes.forEach((node, index) => {
    const children = node.children || [];
    const isActive = parentIsActive && node.isActive !== false;
    output.push({
      key: node.key,
      name: node.name,
      parentKey,
      sortOrder: index,
      isActive,
      isSelectable: children.length === 0,
    });
    flattenSeed(children, node.key, isActive, output);
  });
  return output;
};

const buildRowsById = (rows: ProductCategory[]) => new Map(rows.map((row) => [row.id, row]));

const getBreadcrumb = (row: ProductCategory, byId: Map<string, ProductCategory>) => {
  const path: ProductCategory[] = [];
  const visited = new Set<string>();
  let current: ProductCategory | undefined = row;

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    path.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }

  return path.map((item) => ({ id: item.id, key: item.key, name: item.name }));
};

const toNode = (
  row: ProductCategory,
  byId: Map<string, ProductCategory>,
  childrenByParent: Map<string, ProductCategory[]>,
  includeChildren = false
): ProductCategoryNode => {
  const children = sortRows(childrenByParent.get(row.id) || []);
  const node: ProductCategoryNode = {
    id: row.id,
    key: row.key,
    name: row.name,
    parentId: row.parentId,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    isSelectable: row.isSelectable,
    childCount: children.length,
    breadcrumb: getBreadcrumb(row, byId),
  };

  if (includeChildren && children.length > 0) {
    node.children = children.map((child) => toNode(child, byId, childrenByParent, true));
  }

  return node;
};

const buildChildrenMap = (rows: ProductCategory[]) => {
  const childrenByParent = new Map<string, ProductCategory[]>();
  for (const row of rows) {
    if (!row.parentId) continue;
    const children = childrenByParent.get(row.parentId) || [];
    children.push(row);
    childrenByParent.set(row.parentId, children);
  }
  return childrenByParent;
};

export class ProductCategoryService {
  static async syncTaxonomyAndBackfill(): Promise<TaxonomySyncResult> {
    const sequelize = ProductCategory.sequelize;
    if (!sequelize) throw new Error("Database not initialized for taxonomy synchronization");

    return sequelize.transaction(async (transaction) => {
      await sequelize.query(
        "SELECT pg_advisory_xact_lock(CAST(:lockKey AS BIGINT))",
        {
          replacements: { lockKey: TAXONOMY_SYNC_ADVISORY_LOCK_KEY },
          transaction,
        }
      );

      const seed = await ProductCategoryService.syncSeedData({ transaction });
      const backfill = await ProductCategoryService.backfillLegacyProductCategoryIds({ transaction });

      return { seed, backfill };
    });
  }

  static async syncSeedData(options: CategoryWriteOptions = {}): Promise<{ created: number; updated: number }> {
    const flattened = flattenSeed(seedData);
    const existing = await ProductCategory.findAll({ paranoid: false, transaction: options.transaction });
    const byKey = new Map(existing.map((row) => [row.key, row]));
    let created = 0;
    let updated = 0;

    for (const seed of flattened) {
      const parent = seed.parentKey ? byKey.get(seed.parentKey) : null;
      if (seed.parentKey && !parent) {
        throw new Error(`Cannot seed category ${seed.key}: parent ${seed.parentKey} does not exist`);
      }

      const values = {
        name: seed.name,
        parentId: parent?.id || null,
        sortOrder: seed.sortOrder,
        isActive: seed.isActive,
        isSelectable: seed.isSelectable,
      };
      const existingRow = byKey.get(seed.key);

      if (existingRow) {
        const hasChanges =
          existingRow.name !== values.name ||
          existingRow.parentId !== values.parentId ||
          existingRow.sortOrder !== values.sortOrder ||
          existingRow.isActive !== values.isActive ||
          existingRow.isSelectable !== values.isSelectable;

        if (hasChanges) {
          await existingRow.update(values, { transaction: options.transaction });
          updated += 1;
        }
      } else {
        const createdRow = await ProductCategory.create(
          { key: seed.key, ...values },
          { transaction: options.transaction }
        );
        byKey.set(seed.key, createdRow);
        created += 1;
      }
    }

    return { created, updated };
  }

  static async list(options: { parentId?: string; includeChildren?: boolean } = {}): Promise<ProductCategoryNode[]> {
    const rows = await ProductCategory.findAll({
      where: { isActive: true },
      order: [
        ["sortOrder", "ASC"],
        ["name", "ASC"],
      ],
    });
    const byId = buildRowsById(rows);
    const childrenByParent = buildChildrenMap(rows);

    if (options.parentId) {
      const parent = byId.get(options.parentId);
      if (!parent) throw new HttpException(404, "Category not found");
      return sortRows(childrenByParent.get(parent.id) || []).map((row) =>
        toNode(row, byId, childrenByParent, Boolean(options.includeChildren))
      );
    }

    return sortRows(rows.filter((row) => !row.parentId)).map((row) =>
      toNode(row, byId, childrenByParent, Boolean(options.includeChildren))
    );
  }

  static async search(query: string): Promise<ProductCategoryNode[]> {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) return [];

    const rows = await ProductCategory.findAll({
      where: { isActive: true },
      order: [
        ["sortOrder", "ASC"],
        ["name", "ASC"],
      ],
    });
    const byId = buildRowsById(rows);
    const childrenByParent = buildChildrenMap(rows);
    const matches = rows.filter((row) => normalize(row.name).includes(normalizedQuery) || normalize(row.key).includes(normalizedQuery));
    const matchingIds = new Set(matches.map((row) => row.id));
    const highestMatches = matches.filter((row) => {
      let parentId = row.parentId;
      while (parentId) {
        if (matchingIds.has(parentId)) return false;
        parentId = byId.get(parentId)?.parentId || null;
      }
      return true;
    });

    return sortRows(highestMatches).map((row) => toNode(row, byId, childrenByParent, childrenByParent.has(row.id)));
  }

  static async getById(categoryId: string, includeChildren = true): Promise<ProductCategoryNode> {
    const rows = await ProductCategory.findAll({ where: { isActive: true } });
    const row = rows.find((item) => item.id === categoryId);
    if (!row) throw new HttpException(404, "Category not found");

    const byId = buildRowsById(rows);
    const childrenByParent = buildChildrenMap(rows);
    return toNode(row, byId, childrenByParent, includeChildren);
  }

  static async getSelectableById(categoryId: string): Promise<ProductCategory> {
    const category = await ProductCategory.findOne({ where: { id: categoryId, isActive: true } });
    if (!category) throw new HttpException(400, "Invalid or inactive categoryId");
    if (!category.isSelectable) throw new HttpException(400, "Select a detailed category, not a category group");
    return category;
  }

  static async resolveForProduct(categoryId?: string, legacyName?: string): Promise<ProductCategory> {
    if (categoryId) return this.getSelectableById(categoryId);

    const name = String(legacyName || "").trim();
    if (!name) throw new HttpException(400, "categoryId is required");

    const matches = await ProductCategory.findAll({
      where: {
        isActive: true,
        isSelectable: true,
        name: { [Op.iLike]: name },
      },
    });
    if (matches.length === 0) throw new HttpException(400, `Invalid category: ${name}`);
    if (matches.length > 1) {
      throw new HttpException(400, `Category name is ambiguous. Please send categoryId for: ${name}`);
    }
    return matches[0];
  }

  static async backfillLegacyProductCategoryIds(
    options: CategoryWriteOptions = {}
  ): Promise<{ mapped: number; ambiguous: number; flagged: number }> {
    const products = await Product.findAll({
      where: { categoryId: { [Op.is]: null } },
      attributes: ["id", "category", "categoryReviewRequired"],
      transaction: options.transaction,
    });
    if (products.length === 0) return { mapped: 0, ambiguous: 0, flagged: 0 };

    const categories = await ProductCategory.findAll({
      attributes: ["id", "name"],
      where: { isActive: true, isSelectable: true },
      transaction: options.transaction,
    });
    const byName = new Map<string, ProductCategory[]>();
    for (const category of categories) {
      const key = normalize(category.name);
      const items = byName.get(key) || [];
      items.push(category);
      byName.set(key, items);
    }

    let mapped = 0;
    let ambiguous = 0;
    let flagged = 0;
    for (const product of products) {
      const matches = byName.get(normalize(product.category)) || [];
      if (matches.length === 1) {
        await product.update(
          { categoryId: matches[0].id, categoryReviewRequired: false },
          { transaction: options.transaction }
        );
        mapped += 1;
      } else if (!product.categoryReviewRequired) {
        await product.update({ categoryReviewRequired: true }, { transaction: options.transaction });
        flagged += 1;
        if (matches.length > 1) ambiguous += 1;
      }
    }

    if (mapped > 0 || flagged > 0) {
      console.log(`[Migration] Product category backfill mapped=${mapped} ambiguous=${ambiguous} flagged=${flagged}`);
    }
    return { mapped, ambiguous, flagged };
  }
}
