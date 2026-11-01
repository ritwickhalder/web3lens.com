'use client';

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { useMemo, useState } from 'react';

export type DirectoryEntry = { source: string; name: string; url: string };

type SortKey = 'source' | 'name';
type Sort = { key: SortKey; dir: 1 | -1 } | null;
const PAGE_SIZES = [10, 25, 50, 100];

function SortHeader({ k, label, sort, onToggle }: { k: SortKey; label: string; sort: Sort; onToggle: (k: SortKey) => void }) {
  const Icon = sort?.key !== k ? ArrowUpDown : sort.dir === 1 ? ArrowUp : ArrowDown;
  return (
    <th
      scope="col"
      aria-sort={sort?.key === k ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}
      className="border-b border-black/30 px-4 py-2.5 font-bold"
    >
      <button type="button" onClick={() => onToggle(k)} className="flex w-full items-center justify-between gap-2">
        {label}
        <Icon aria-hidden className="size-4 opacity-60" />
      </button>
    </th>
  );
}

/** Searchable, sortable, paginated table (replaces the legacy jQuery DataTables include). */
export function DirectoryTable({ entries }: { entries: DirectoryEntry[] }) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<Sort>(null);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const rows = s ? entries.filter((e) => `${e.source} ${e.name}`.toLowerCase().includes(s)) : entries;
    if (!sort) return rows;
    return [...rows].sort((a, b) => a[sort.key].localeCompare(b[sort.key]) * sort.dir);
  }, [entries, search, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pageCount - 1);
  const rows = filtered.slice(current * pageSize, current * pageSize + pageSize);
  const from = filtered.length ? current * pageSize + 1 : 0;
  const to = current * pageSize + rows.length;

  function toggleSort(key: SortKey) {
    setSort((s) => (s?.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }));
    setPage(0);
  }


  return (
    <div className="text-left text-sm text-[#333]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-1.5">
          Show
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(0);
            }}
            className="rounded border border-[#aaa] bg-white px-1 py-0.5"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          entries
        </label>
        <label className="flex items-center gap-1.5">
          Search:
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="rounded border border-[#aaa] bg-white px-1.5 py-0.5"
          />
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-directory-head">
            <tr>
              <SortHeader k="source" label="Source" sort={sort} onToggle={toggleSort} />
              <SortHeader k="name" label="Name" sort={sort} onToggle={toggleSort} />
            </tr>
          </thead>
          <tbody>
            {rows.map((e, i) => (
              <tr key={`${e.name}|${e.url}`} className={i % 2 ? 'bg-white' : 'bg-[#f9f9f9]'}>
                <td className="border-t border-[#ddd] px-4 py-2">{e.source}</td>
                <td className="border-t border-[#ddd] px-4 py-2">
                  <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-[#007bff] hover:underline">
                    {e.name}
                  </a>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={2} className="border-t border-[#ddd] px-4 py-2 text-center">
                  No matching records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite">
          Showing {from} to {to} of {filtered.length} entries
          {filtered.length !== entries.length && ` (filtered from ${entries.length} total entries)`}
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
            className="rounded px-3 py-1 enabled:hover:bg-[#ddd] disabled:text-[#999]"
          >
            Previous
          </button>
          {Array.from({ length: pageCount }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-current={i === current ? 'page' : undefined}
              onClick={() => setPage(i)}
              className={`rounded px-3 py-1 ${i === current ? 'border border-[#979797] bg-white' : 'hover:bg-[#ddd]'}`}
            >
              {i + 1}
            </button>
          ))}
          <button
            type="button"
            disabled={current >= pageCount - 1}
            onClick={() => setPage(current + 1)}
            className="rounded px-3 py-1 enabled:hover:bg-[#ddd] disabled:text-[#999]"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
