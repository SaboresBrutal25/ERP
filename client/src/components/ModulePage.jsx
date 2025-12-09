import React, { useEffect, useMemo, useRef, useState } from "react";
import { moduleApi } from "../api.js";
import DataTable from "./DataTable.jsx";
import { supabase } from "../lib/supabaseClient";

const initialState = (fields) =>
  fields.reduce((acc, field) => {
    acc[field.key] = "";
    return acc;
  }, {});

const ModulePage = ({ title, resource, fields, description, locale }) => {
  const api = useMemo(() => moduleApi(resource), [resource]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [form, setForm] = useState(initialState(fields));
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState("");
  const [showImporter, setShowImporter] = useState(false);
  const [rawCsv, setRawCsv] = useState("");
  const [importDate, setImportDate] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadTarget, setUploadTarget] = useState("");
  const [uploadDocType, setUploadDocType] = useState("");
  const fileInputRef = useRef(null);
  const isEmployees = resource === "empleados";

  const load = async () => {
    setLoading(true);
    setError("");
    setStatus("");
    try {
      const data = await api.list(locale);
      setItems(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  useEffect(() => {
    if (editingId) setUploadTarget(editingId);
  }, [editingId]);

  const parseCurrency = (str) => {
    if (!str) return null;
    const cleaned = str.replace(/[^0-9,.-]/g, "").replace(/\./g, "").replace(",", ".");
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : null;
  };

  const parseEmployeesCsv = () => {
    const lines = rawCsv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) throw new Error("CSV vacío.");

    const headerLine = lines.find((l) => l.toLowerCase().includes("manipulador alimentos") || l.toLowerCase().includes("cuenta bancaria"));
    if (headerLine) {
      const body = lines.slice(lines.indexOf(headerLine) + 1);
      const registros = [];
      for (const line of body) {
        if (!line || /total/i.test(line)) continue;
        const cells = line.split(",").map((c) => c.replace(/"/g, "").trim());
        const [nombre, documentos, iban, manipulador, sueldoStr, vacTomadasStr, vacNotas] = cells;
        if (!nombre || nombre.toLowerCase().includes("tarde") || nombre.toLowerCase().includes("mañana")) continue;
        const sueldo = parseCurrency(sueldoStr || "0") || 0;
        const vacTomadas = parseFloat((vacTomadasStr || "0").replace(",", ".")) || 0;
        const vacRestantes = Math.max(0, 30 - vacTomadas);
        const mani = manipulador && /x|si|sí|true|1/i.test(manipulador) ? "Sí" : "";
        registros.push({
          nombre,
          dni: "",
          contrato: "Nómina mensual",
          sueldo,
          iban,
          documentos,
          manipulador: mani,
          vacaciones_tomadas: vacTomadas,
          vacaciones_restantes: vacRestantes,
          notas: vacNotas || ""
        });
      }
      if (!registros.length) throw new Error("No se encontraron filas válidas en el CSV de personal.");
      return registros;
    }

    const hasHeader = lines[0].toLowerCase().includes("nómina") || lines[0].toLowerCase().includes("efectivo");
    const body = hasHeader ? lines.slice(1) : lines;
    const registros = [];
    for (const line of body) {
      if (!line || /total/i.test(line)) continue;
      const cells = line.split(",").map((c) => c.replace(/"/g, "").trim());
      const [nombre, nominaStr, efectivoStr] = cells;
      if (!nombre) continue;
      const nomina = parseCurrency(nominaStr || "0") || 0;
      const efectivo = parseCurrency(efectivoStr || "0") || 0;
      const sueldo = nomina + efectivo;
      registros.push({ nombre, dni: "", contrato: "Nómina mensual", sueldo });
    }
    if (!registros.length) throw new Error("No se encontraron filas válidas en el CSV de personal.");
    return registros;
  };

  const normalizeEmployee = (data) => {
    const sueldo = data.sueldo !== "" ? Number(parseFloat(data.sueldo)) : null;
    const vacTomadas = data.vacaciones_tomadas !== "" ? Number(parseFloat(data.vacaciones_tomadas)) : 0;
    const vacRestantes = data.vacaciones_restantes !== "" ? Number(parseFloat(data.vacaciones_restantes)) : Math.max(0, 30 - vacTomadas);
    const maniVal = (data.manipulador || "").toString().trim().toLowerCase();
    const manipulador = ["si", "sí", "x", "true", "1"].includes(maniVal) ? "Sí" : data.manipulador || "";
    return { ...data, sueldo, vacaciones_tomadas: vacTomadas, vacaciones_restantes: vacRestantes, manipulador };
  };

  const handleImport = async () => {
    try {
      setError("");
      setStatus("");
      const parsed =
        resource === "contabilidad"
          ? parseContabilidadCsv()
          : resource === "turnos"
          ? parseTurnosCsv()
          : resource === "empleados"
          ? parseEmployeesCsv()
          : [];
      if (!parsed.length) throw new Error("CSV vacío.");
      const normalized = resource === "empleados" ? parsed.map(normalizeEmployee) : parsed;
      const created = await Promise.all(normalized.map((row) => api.create(row, locale)));
      setItems((prev) => [...created, ...prev]);
      setStatus(`Importados ${created.length} registros desde CSV.`);
      setShowImporter(false);
      setRawCsv("");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpload = async () => {
    if (!fileInputRef.current?.files?.length) {
      setUploadError("Selecciona un archivo");
      return;
    }
    if (!uploadTarget) {
      setUploadError("Selecciona el empleado destino");
      return;
    }
    setUploadError("");
    setStatus("");
    setUploading(true);
    try {
      const targetEmployee = items.find((it) => it.id === uploadTarget);
      if (!targetEmployee) throw new Error("Empleado no encontrado");
      const file = fileInputRef.current.files[0];
      const ext = file.name.split(".").pop();
      const sanitizedName = (targetEmployee.nombre || "empleado").replace(/\s+/g, "-").toLowerCase();
      const path = `${locale}/${sanitizedName}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error: uploadErr } = await supabase.storage.from("empleados-docs").upload(path, file, {
        cacheControl: "3600",
        upsert: false
      });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from("empleados-docs").getPublicUrl(data.path);
      const currentDocs = (targetEmployee.documentos || "").split(",").map((d) => d.trim()).filter(Boolean);
      const label = `${uploadDocType || file.name} | ${urlData.publicUrl}`;
      const nextDocs = [...currentDocs, label].join(", ");
      const updatedEmployee = { ...targetEmployee, documentos: nextDocs };
      const updated = await api.update(targetEmployee.id, updatedEmployee);
      setItems((prev) => prev.map((it) => (it.id === targetEmployee.id ? updated : it)));
      if (editingId === targetEmployee.id) {
        setForm((prev) => ({ ...prev, documentos: nextDocs }));
      }
      setStatus("Documento subido y enlazado.");
      fileInputRef.current.value = "";
    } catch (err) {
      setUploadError(err.message || "Error al subir el archivo (verifica bucket empleados-docs en Supabase).");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setStatus("");
    try {
      const payload = resource === "empleados" ? normalizeEmployee(form) : form;
      if (editingId) {
        const updated = await api.update(editingId, payload);
        setItems((prev) => prev.map((it) => (it.id === editingId ? updated : it)));
        setStatus("Cambios guardados correctamente.");
      } else {
        const created = await api.create(payload, locale);
        setItems((prev) => [...prev, created]);
        setStatus("Registro creado.");
      }
      setForm(initialState(fields));
      setEditingId(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (row) => {
    setForm(fields.reduce((acc, field) => ({ ...acc, [field.key]: row[field.key] || "" }), {}));
    setEditingId(row.id);
    setStatus("");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar registro?")) return;
    setError("");
    setStatus("");
    try {
      await api.remove(id);
      setItems((prev) => prev.filter((it) => it.id !== id));
      setStatus("Registro eliminado.");
    } catch (err) {
      setError(err.message);
    }
  };

  const filtered = items.filter((item) => JSON.stringify(item).toLowerCase().includes(filter.toLowerCase()));

  const columnsBasic = isEmployees
    ? fields.filter((f) => ["nombre", "dni", "iban", "contrato", "turno", "documentos"].includes(f.key))
    : fields;
  const columnsVac = isEmployees
    ? [
        { key: "nombre", label: "Nombre" },
        ...fields.filter((f) => ["sueldo", "vacaciones_tomadas", "vacaciones_restantes", "notas"].includes(f.key))
      ]
    : [];

  return (
    <section id={resource} className="card p-5 md:p-6 space-y-4 text-slate-100 border-white/5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="pill uppercase tracking-wide text-xs bg-brand-600/20 border-brand-500/40 text-brand-50">
              {resource} · {locale}
            </span>
            {loading && <span className="text-xs text-slate-400">Actualizando...</span>}
          </div>
          <h3 className="text-xl font-semibold text-white">{title}</h3>
          <p className="text-sm text-slate-400 max-w-2xl">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <span className="absolute left-3 top-3 text-slate-500">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="11" cy="11" r="7" /><path d="m21 21-4.35-4.35" />
              </svg>
            </span>
            <input className="input pl-9 py-2.5 text-sm" placeholder="Filtrar..." value={filter} onChange={(e) => setFilter(e.target.value)} />
          </div>
          <button onClick={load} className="btn px-4 py-2 text-sm">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 4v5h-5" />
            </svg>
            Refrescar
          </button>
        </div>
      </div>

      {error && <div className="text-sm text-rose-200 bg-rose-900/40 border border-rose-500/30 px-3 py-2 rounded-xl">{error}</div>}
      {status && !error && <div className="text-sm text-emerald-200 bg-emerald-900/30 border border-emerald-500/30 px-3 py-2 rounded-xl">{status}</div>}

      <div className="space-y-4">
        <form onSubmit={handleSubmit} className="card p-4 space-y-4 border-white/5 bg-surface-900">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-brand-400" />
              {editingId ? "Editar registro" : "Crear registro"}
            </p>
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setForm(initialState(fields)); }} className="text-xs text-slate-300 hover:text-white">
                Limpiar
              </button>
            )}
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {fields
              .filter((f) => f.key !== "documentos")
              .map((field) => (
                <label key={field.key} className="flex flex-col gap-2 text-sm">
                  <span className="text-slate-300 font-medium">{field.label}</span>
                  {field.key === "turno" ? (
                    <select
                      value={form[field.key] || ""}
                      onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                      className="input"
                    >
                      <option value="">-- Selecciona turno --</option>
                      <option value="Mañana">Mañana</option>
                      <option value="Tarde">Tarde</option>
                    </select>
                  ) : (
                    <input
                      required={field.required}
                      type={field.type || "text"}
                      value={form[field.key] || ""}
                      onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                      className="input"
                      placeholder={field.placeholder}
                      step={field.step}
                    />
                  )}
                </label>
              ))}
          </div>
          {isEmployees && (
            <div className="flex flex-col gap-3 text-sm border-t border-white/5 pt-3">
              <span className="text-slate-300 font-medium">Subir documento (PDF/JPG/PNG)</span>
              <div className="grid sm:grid-cols-3 gap-3 items-center">
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-slate-400">Empleado destino</label>
                  <select className="input" value={uploadTarget} onChange={(e) => setUploadTarget(e.target.value)}>
                    <option value="">-- Elegir empleado --</option>
                    {items.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-slate-400">Nombre del documento</label>
                  <input
                    className="input"
                    placeholder="Ej: Contrato, Carnet manipulador, DNI..."
                    value={uploadDocType}
                    onChange={(e) => setUploadDocType(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="text-xs text-slate-300" />
                  <button type="button" onClick={handleUpload} className="btn text-sm" disabled={uploading}>
                    {uploading ? "Subiendo..." : "Subir y enlazar"}
                  </button>
                </div>
              </div>
              {uploadError && <p className="text-xs text-rose-200">{uploadError}</p>}
              <p className="text-xs text-slate-400">Bucket público empleados-docs en Supabase Storage.</p>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" className="btn btn-primary text-sm font-semibold">
              {editingId ? "Guardar cambios" : "Crear"}
            </button>
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setForm(initialState(fields)); }} className="btn text-sm">
                Cancelar
              </button>
            )}
            {(resource === "contabilidad" || resource === "turnos" || resource === "empleados") && (
              <button type="button" onClick={() => setShowImporter(true)} className="btn text-sm">
                Importar CSV
              </button>
            )}
          </div>
        </form>

        {isEmployees ? (
          <div className="space-y-4">
            <div className="card p-3 border-white/5">
              <p className="text-sm font-semibold mb-2 text-slate-100">Datos generales</p>
              <DataTable columns={columnsBasic} rows={filtered} onEdit={handleEdit} onDelete={handleDelete} />
            </div>
            <div className="card p-3 border-white/5">
              <p className="text-sm font-semibold mb-2 text-slate-100">Compensación y vacaciones</p>
              <DataTable columns={columnsVac} rows={filtered} onEdit={handleEdit} onDelete={handleDelete} />
            </div>
          </div>
        ) : (
          <div className="card p-3 border-white/5">
            <DataTable columns={fields} rows={filtered} onEdit={handleEdit} onDelete={handleDelete} />
          </div>
        )}
      </div>

      {showImporter && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 flex items-center justify-center p-4">
          <div className="card max-w-4xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-brand-200">Importar CSV</p>
                <h4 className="text-lg font-semibold text-white">{title} · {locale}</h4>
              </div>
              <button className="btn text-sm" onClick={() => setShowImporter(false)}>Cerrar</button>
            </div>
            {resource === "empleados" && (
              <p className="text-sm text-slate-300">CSV con columnas Nombre, Nómina, Efectivo o el formato Mañana/Tarde que enviaste.</p>
            )}
            {resource === "contabilidad" && (
              <div className="space-y-2 text-sm text-slate-300">
                <p>Pega CSV diario, resumen o nóminas. Si es resumen o nóminas, indica fecha.</p>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-slate-400">Fecha a aplicar (resumen/nóminas)</span>
                  <input type="date" className="input" value={importDate} onChange={(e) => setImportDate(e.target.value)} />
                </label>
              </div>
            )}
            {resource === "turnos" && (
              <p className="text-sm text-slate-300">CSV con cabecera de días (LUNES 08/09...). Genera un registro por empleado y día.</p>
            )}
            <textarea className="input min-h-[240px] font-mono text-xs" placeholder="Pega aquí tu CSV..." value={rawCsv} onChange={(e) => setRawCsv(e.target.value)} />
            <div className="flex items-center gap-2">
              <button className="btn btn-primary text-sm" onClick={handleImport}>Importar</button>
              <button className="btn text-sm" onClick={() => setShowImporter(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ModulePage;
