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
  const [showForm, setShowForm] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [rawCsv, setRawCsv] = useState("");
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
    const hasHeader = lines[0].toLowerCase().includes("nombre") || lines[0].toLowerCase().includes("nómina");
    const body = hasHeader ? lines.slice(1) : lines;
    const registros = [];
    for (const line of body) {
      if (!line || /total/i.test(line)) continue;
      const cells = line.split(",").map((c) => c.replace(/"/g, "").trim());
      const [nombre, ...rest] = cells;
      if (!nombre) continue;
      registros.push({
        nombre,
        dni: rest[0] || "",
        contrato: rest[1] || "Contrato estándar",
        sueldo: parseCurrency(rest[2]) || 0,
        iban: rest[3] || "",
        vacaciones_tomadas: parseFloat(rest[4]) || 0,
        vacaciones_restantes: Math.max(0, 30 - (parseFloat(rest[4]) || 0)),
        documentos: rest[5] || "",
        turno: rest[6] || "",
        notas: rest[7] || ""
      });
    }
    if (!registros.length) throw new Error("No se encontraron filas válidas en el CSV.");
    return registros;
  };

  const normalizeEmployee = (data) => {
    const sueldo = data.sueldo !== "" ? Number(parseFloat(data.sueldo)) : null;
    const vacTomadas = data.vacaciones_tomadas !== "" ? Number(parseFloat(data.vacaciones_tomadas)) : 0;
    const vacRestantes = data.vacaciones_restantes !== "" ? Number(parseFloat(data.vacaciones_restantes)) : Math.max(0, 30 - vacTomadas);
    return { ...data, sueldo, vacaciones_tomadas: vacTomadas, vacaciones_restantes: vacRestantes };
  };

  const handleImport = async () => {
    try {
      setError("");
      setStatus("");
      const parsed = resource === "empleados" ? parseEmployeesCsv() : [];
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
      setUploadDocType("");
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
        setItems((prev) => [created, ...prev]);
        setStatus("Registro creado.");
      }
      setForm(initialState(fields));
      setEditingId(null);
      setShowForm(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (row) => {
    setForm(fields.reduce((acc, field) => ({ ...acc, [field.key]: row[field.key] || "" }), {}));
    setEditingId(row.id);
    setShowForm(true);
    setStatus("");
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  const handleCancel = () => {
    setForm(initialState(fields));
    setEditingId(null);
    setShowForm(false);
    setStatus("");
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
    <section id={resource} className="card p-5 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="pill bg-brand-600/20 border-brand-500/40 text-brand-300 uppercase text-xs">
              {resource}
            </span>
            {loading && (
              <div className="flex items-center gap-2 text-xs text-surface-400">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Cargando...
              </div>
            )}
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-white">{title}</h3>
          <p className="text-sm text-surface-400 max-w-2xl">{description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={load} disabled={loading} className="btn px-3 py-2 text-sm">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button onClick={() => setShowForm(!showForm)} className="btn btn-primary px-4 py-2 text-sm">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {showForm ? "Cerrar formulario" : "Nuevo registro"}
          </button>
          {isEmployees && (
            <button onClick={() => setShowImporter(true)} className="btn px-4 py-2 text-sm">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Importar CSV
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && <div className="alert alert-error">{error}</div>}
      {status && !error && <div className="alert alert-success">{status}</div>}

      {/* Form */}
      {showForm && (
        <div className="card p-5 md:p-6 space-y-5 border-brand-500/30 bg-surface-850">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-brand-400"></span>
              {editingId ? "Editar registro" : "Crear nuevo registro"}
            </h4>
            <button onClick={handleCancel} className="text-sm text-surface-400 hover:text-white">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {fields.filter((f) => f.key !== "documentos").map((field) => (
                <div key={field.key} className="space-y-2">
                  <label htmlFor={field.key} className="block text-sm font-medium text-surface-200">
                    {field.label}
                    {field.required && <span className="text-rose-400 ml-1">*</span>}
                  </label>
                  {field.key === "turno" ? (
                    <select
                      id={field.key}
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
                      id={field.key}
                      required={field.required}
                      type={field.type || "text"}
                      value={form[field.key] || ""}
                      onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                      className="input"
                      placeholder={field.placeholder}
                      step={field.step}
                    />
                  )}
                </div>
              ))}
            </div>

            {isEmployees && (
              <div className="border-t border-surface-700 pt-5 space-y-4">
                <h5 className="text-sm font-semibold text-white">Subir documento</h5>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                  <div className="space-y-2">
                    <label className="block text-xs text-surface-400">Empleado</label>
                    <select className="input" value={uploadTarget} onChange={(e) => setUploadTarget(e.target.value)}>
                      <option value="">-- Elegir empleado --</option>
                      {items.map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs text-surface-400">Tipo de documento</label>
                    <input
                      className="input"
                      placeholder="Ej: Contrato, DNI..."
                      value={uploadDocType}
                      onChange={(e) => setUploadDocType(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs text-surface-400">Archivo</label>
                    <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="text-xs text-surface-300 w-full" />
                  </div>
                  <button type="button" onClick={handleUpload} className="btn btn-success" disabled={uploading}>
                    {uploading ? "Subiendo..." : "Subir"}
                  </button>
                </div>
                {uploadError && <p className="text-xs text-rose-300">{uploadError}</p>}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button type="submit" className="btn btn-primary">
                {editingId ? "Guardar cambios" : "Crear registro"}
              </button>
              <button type="button" onClick={handleCancel} className="btn">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          className="input pl-10"
          placeholder="Buscar en registros..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {/* Data Tables */}
      {isEmployees ? (
        <div className="space-y-6">
          <div className="space-y-3">
            <h5 className="text-sm font-semibold text-white">Datos generales</h5>
            <DataTable columns={columnsBasic} rows={filtered} onEdit={handleEdit} onDelete={handleDelete} />
          </div>
          <div className="space-y-3">
            <h5 className="text-sm font-semibold text-white">Compensación y vacaciones</h5>
            <DataTable columns={columnsVac} rows={filtered} onEdit={handleEdit} onDelete={handleDelete} />
          </div>
        </div>
      ) : (
        <DataTable columns={fields} rows={filtered} onEdit={handleEdit} onDelete={handleDelete} />
      )}

      {/* CSV Importer Modal */}
      {showImporter && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="card max-w-3xl w-full p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="pill text-xs mb-2">Importar CSV</span>
                <h4 className="text-xl font-bold text-white">{title}</h4>
              </div>
              <button onClick={() => setShowImporter(false)} className="btn px-3 py-2">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-surface-300">
              Pega tu CSV con las columnas: Nombre, DNI, Contrato, Sueldo, IBAN, Vac. Tomadas, Documentos, Turno, Notas
            </p>
            <textarea
              className="input min-h-[240px] font-mono text-xs"
              placeholder="Pega aquí tu CSV..."
              value={rawCsv}
              onChange={(e) => setRawCsv(e.target.value)}
            />
            <div className="flex gap-3">
              <button onClick={handleImport} className="btn btn-primary">
                Importar registros
              </button>
              <button onClick={() => setShowImporter(false)} className="btn">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ModulePage;
