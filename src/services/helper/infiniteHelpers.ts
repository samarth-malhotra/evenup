// src/lib/infiniteHelpers.ts
import type { InfiniteData } from '@tanstack/react-query';

/**
 * Generic helpers for manipulating infinite query pages.
 * TItem = item type stored in pages[]. (e.g., Expense)
 * TPage = shape of each page: usually { items: TItem[], nextCursor?: string } or similar.
 *
 * These helpers assume pages is either TPage[] OR you can adapt to your shape.
 */

/**
 * Insert an item into the first page (prepend).
 * If pages are arrays of items directly (TPage = TItem[]), it will handle that too.
 */
export function prependToFirstPage<TPage, TItem = any>(
  prev: InfiniteData<TPage> | undefined,
  makeNewPages: (pages: TPage[] | undefined) => TPage[]
): InfiniteData<TPage> | undefined {
  if (!prev) {
    const newPages = makeNewPages(undefined);
    return { pages: newPages, pageParams: [] };
  }
  const newPages = makeNewPages(prev.pages);
  return { ...prev, pages: newPages };
}

/**
 * Default-maker to prepend a plain item to a page when pages are arrays of items
 * (pages: TItem[]).
 */
export function makePrependSimpleItem<TItem>(item: TItem) {
  return (pages?: TItem[][]) => {
    if (!pages || pages.length === 0) return [[item]];
    const first = pages[0] ?? [];
    const rest = pages.slice(1);
    return [[item, ...first], ...rest];
  };
}

/**
 * Remove an optimistic item by temporary id predicate.
 * Works for pages that are arrays of items (TPage = TItem[]).
 */
export function removeOptimisticFromPages<TItem>(
  prev: InfiniteData<TItem[]> | undefined,
  isOptimistic: (item: TItem) => boolean
): InfiniteData<TItem[]> | undefined {
  if (!prev) return prev;
  const pages = prev.pages.map((page) => page.filter((it) => !isOptimistic(it)));
  return { ...prev, pages };
}

/**
 * Replace optimistic item id (e.g., 'optimistic-123') with real server id in pages
 * when server returns canonical item.
 */
export function replaceOptimisticInPages<TItem extends { id?: string }>(
  prev: InfiniteData<TItem[]> | undefined,
  optimisticId: string,
  realItem: TItem
): InfiniteData<TItem[]> | undefined {
  if (!prev) return prev;
  const pages = prev.pages.map((page) =>
    page.map((it) => (it.id === optimisticId ? realItem : it))
  );
  return { ...prev, pages };
}
