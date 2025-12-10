import React from "react";

const renderCell = (col, row) => {
  if (col.render) return col.render(row);

  if (col.key === "documentos" && row[col.key]) {
    const docs = row[col.key]
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);
    if (!docs.length) return "-";
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
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100"
            >
              {label}
            </a>
          );
        })}
      </div>
    );
  }
  if (typeof row[col.key] === "boolean") {
    return row[col.key] ? "Si" : "No";
  }
  return row[col.key] || "-";
};

const DataTable = ({ columns, rows, onEdit, onDelete, onView, onRowClick }) => {
  return (
    <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-white/5 text-slate-300 uppercase text-[11px] tracking-wide">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-3 py-3 text-left font-semibold">{col.label}</th>
            ))}
            <th className="px-3 py-3 text-left font-semibold">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((row) => (
            <tr
              key={row.id}
              className={`hover:bg-white/5 ${onRowClick ? "cursor-pointer" : ""}`}
              onClick={() => onRowClick && onRowClick(row)}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-3 py-3 text-slate-100">
                  {renderCell(col, row)}
                </td>
              ))}
              <td className="px-3 py-3 flex flex-wrap gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(row); }}
                  className="btn text-xs px-3 py-1.5 bg-brand-600/20 border border-brand-500/30 hover:bg-brand-600/30"
                >
                  Editar
                </button>
                {onView && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onView(row); }}
                    className="btn text-xs px-3 py-1.5 bg-white/10 border border-white/15 hover:bg-white/20"
                  >
                    Ver ficha
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(row.id); }}
                  className="btn text-xs px-3 py-1.5 bg-rose-600/20 border border-rose-500/30 hover:bg-rose-600/30"
                >
                  Borrar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div className="text-sm text-slate-400 px-3 py-4">No hay registros todavia. Anade el primero.</div>
      )}
    </div>
  );
};

export default DataTable;
