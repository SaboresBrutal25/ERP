import React from "react";

const renderCell = (col, row) => {
  if (col.key === "documentos" && row[col.key]) {
    const docs = row[col.key]
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);
    if (!docs.length) return <span className="text-surface-500">-</span>;
    return (
      <div className="flex flex-wrap gap-2">
        {docs.map((doc, idx) => {
          const parts = doc.split("|").map((p) => p.trim());
          const label = parts[0] || `Doc ${idx + 1}`;
          const url = parts[1] || parts[0];
          const href = url?.startsWith("http") ? url : `https://${url}`;
          return (
            <a
              key={idx}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-500/20 text-brand-300 border border-brand-500/30 text-xs font-medium hover:bg-brand-500/30 transition-colors"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {label}
            </a>
          );
        })}
      </div>
    );
  }

  if (col.key === "sueldo" && row[col.key] !== null && row[col.key] !== undefined) {
    return <span className="font-semibold text-accent-400">{Number(row[col.key]).toFixed(2)} €</span>;
  }

  if (typeof row[col.key] === "boolean") {
    return row[col.key] ? "Sí" : "No";
  }

  if (row[col.key] === null || row[col.key] === undefined || row[col.key] === "") {
    return <span className="text-surface-500">-</span>;
  }

  return <span className="text-surface-100">{row[col.key]}</span>;
};

const DataTable = ({ columns, rows, onEdit, onDelete }) => {
  if (!rows || rows.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="mx-auto h-16 w-16 rounded-full bg-surface-700/50 flex items-center justify-center mb-4">
          <svg className="h-8 w-8 text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <p className="text-surface-400 font-medium">No hay registros todavía</p>
        <p className="text-sm text-surface-500 mt-2">Añade el primer registro usando el formulario</p>
      </div>
    );
  }

  return (
    <div className="table-container max-h-[600px] overflow-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-surface-800 sticky top-0 z-10">
          <tr className="border-b border-surface-700">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-xs font-semibold text-surface-300 uppercase tracking-wider whitespace-nowrap"
              >
                {col.label}
              </th>
            ))}
            <th className="px-4 py-3 text-left text-xs font-semibold text-surface-300 uppercase tracking-wider whitespace-nowrap">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-700">
          {rows.map((row, idx) => (
            <tr
              key={row.id}
              className="hover:bg-surface-700/30 transition-colors"
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-4 whitespace-nowrap">
                  {renderCell(col, row)}
                </td>
              ))}
              <td className="px-4 py-4 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEdit(row)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-600/20 text-brand-300 border border-brand-500/30 hover:bg-brand-600/30 transition-colors"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Editar
                  </button>
                  <button
                    onClick={() => onDelete(row.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-600/20 text-rose-300 border border-rose-500/30 hover:bg-rose-600/30 transition-colors"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Borrar
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
