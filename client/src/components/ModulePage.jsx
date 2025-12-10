import React, { useEffect, useMemo, useRef, useState } from "react";
import { moduleApi } from "../api.js";
import DataTable from "./DataTable.jsx";
import VacationCalendar from "./VacationCalendar.jsx";
import { supabase } from "../lib/supabaseClient";

const initialState = (fields) =>
  fields.reduce((acc, field) => {
    acc[field.key] = "";
    return acc;
  }, {});

const parseDateList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return value
    .toString()
    .split(/[,;\n]/)
    .map((d) => d.trim())
    .filter(Boolean);
};

const normalizeDateString = (value) => {
  if (!value) return "";
  const matchIso = value.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (matchIso) return `${matchIso[1]}-${matchIso[2]}-${matchIso[3]}`;
  const parts = value.split("/").map((p) => p.trim());
  if (parts.length === 3) {
    const [d, m, y] = parts;
    const year = y.length === 2 ? `20${y}` : y;
    return `${year.padStart(4, "0")}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return value;
};

const normalizeDateList = (value) => {
  const cleaned = parseDateList(value).map(normalizeDateString).filter(Boolean);
  return Array.from(new Set(cleaned)).sort();
};

const DateList = ({ value, empty }) => {
  const dates = normalizeDateList(value);
  if (!dates.length) return <span className="text-slate-400 text-sm">{empty || "Sin dias"}</span>;
  return (
    <details className="group">
      <summary className="cursor-pointer text-brand-100 hover:text-brand-50 list-none">
        {dates.length} dias
      </summary>
      <div className="flex flex-wrap gap-2 mt-2">
        {dates.map((d) => (
          <span key={d} className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-xs text-slate-100">
            {d}
          </span>
        ))}
      </div>
    </details>
  );
};

const getInitials = (name) => {
  if (!name) return "EMP";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
};

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
  const [vacTaken, setVacTaken] = useState([]);
  const [vacPending, setVacPending] = useState([]);
  const [showTakenCalendar, setShowTakenCalendar] = useState(false);
  const [showPendingCalendar, setShowPendingCalendar] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const fileInputRef = useRef(null);
  const photoFileInputRef = useRef(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState("");
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
    if (!lines.length) throw new Error("CSV vacio.");

    const headerLine = lines.find((l) => l.toLowerCase().includes("manipulador alimentos") || l.toLowerCase().includes("cuenta bancaria"));
    if (headerLine) {
      const body = lines.slice(lines.indexOf(headerLine) + 1);
      const registros = [];
      for (const line of body) {
        if (!line || /total/i.test(line)) continue;
        const cells = line.split(",").map((c) => c.replace(/"/g, "").trim());
        const [nombre, documentos, iban, manipulador, sueldoStr, vacTomadasStr, vacNotas] = cells;
        if (!nombre || nombre.toLowerCase().includes("tarde") || nombre.toLowerCase().includes("manana")) continue;
        const sueldo = parseCurrency(sueldoStr || "0") || 0;
        const vacTomadas = parseFloat((vacTomadasStr || "0").replace(",", ".")) || 0;
        const vacRestantes = Math.max(0, 30 - vacTomadas);
        const mani = manipulador && /x|si|si|true|1/i.test(manipulador) ? "Si" : "";
        registros.push({
          nombre,
          dni: "",
          contrato: "Nomina mensual",
          sueldo,
          iban,
          documentos,
          manipulador: mani,
          vacaciones_tomadas: vacTomadas,
          vacaciones_restantes: vacRestantes,
          notas: vacNotas || ""
        });
      }
      if (!registros.length) throw new Error("No se encontraron filas validas en el CSV de personal.");
      return registros;
    }

    const hasHeader = lines[0].toLowerCase().includes("nomina") || lines[0].toLowerCase().includes("efectivo");
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
      registros.push({ nombre, dni: "", contrato: "Nomina mensual", sueldo });
    }
    if (!registros.length) throw new Error("No se encontraron filas validas en el CSV de personal.");
    return registros;
  };

  const normalizeEmployee = (data, { takenDays = [], pendingDays = [] } = {}) => {
    const sueldo = data.sueldo !== "" ? Number(parseFloat(data.sueldo)) : null;
    const diasTomados = normalizeDateList(takenDays.length ? takenDays : data.vacaciones_dias);
    const diasPendientes = normalizeDateList(pendingDays.length ? pendingDays : data.vacaciones_pendientes);
    const vacTomadasDesdeDias = diasTomados.length;
    const vacTomadasInput = data.vacaciones_tomadas !== "" ? Number(parseFloat(data.vacaciones_tomadas)) : 0;
    const vacaciones_tomadas = vacTomadasDesdeDias || vacTomadasInput || 0;
    const vacaciones_restantes =
      data.vacaciones_restantes !== ""
        ? Number(parseFloat(data.vacaciones_restantes))
        : Math.max(0, 30 - vacaciones_tomadas);
    const maniVal = (data.manipulador || "").toString().trim().toLowerCase();
    const manipulador = ["si", "x", "true", "1"].includes(maniVal) ? "Si" : data.manipulador || "";
    return {
      ...data,
      sueldo,
      vacaciones_tomadas,
      vacaciones_restantes,
      vacaciones_dias: diasTomados.join(", "),
      vacaciones_pendientes: diasPendientes.join(", "),
      manipulador
    };
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
      if (!parsed.length) throw new Error("CSV vacio.");
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
      if (selectedEmployee?.id === targetEmployee.id) {
        setSelectedEmployee(updated);
      }
      setStatus("Documento subido y enlazado.");
      fileInputRef.current.value = "";
    } catch (err) {
      setUploadError(err.message || "Error al subir el archivo (verifica bucket empleados-docs en Supabase).");
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoUpload = async () => {
    if (!photoFileInputRef.current?.files?.length) {
      setPhotoUploadError("Selecciona una foto");
      return;
    }
    if (!uploadTarget) {
      setPhotoUploadError("Selecciona el empleado destino");
      return;
    }
    setPhotoUploadError("");
    setStatus("");
    setPhotoUploading(true);
    try {
      const targetEmployee = items.find((it) => it.id === uploadTarget);
      if (!targetEmployee) throw new Error("Empleado no encontrado");
      const file = photoFileInputRef.current.files[0];
      const ext = file.name.split(".").pop();
      const sanitizedName = (targetEmployee.nombre || "empleado").replace(/\s+/g, "-").toLowerCase();
      const path = `${locale}/${sanitizedName}/foto-${Date.now()}.${ext}`;
      const { data, error: uploadErr } = await supabase.storage.from("empleados-docs").upload(path, file, {
        cacheControl: "3600",
        upsert: true
      });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from("empleados-docs").getPublicUrl(data.path);
      const updatedEmployee = { ...targetEmployee, foto_url: urlData.publicUrl };
      const updated = await api.update(targetEmployee.id, updatedEmployee);
      setItems((prev) => prev.map((it) => (it.id === targetEmployee.id ? updated : it)));
      if (editingId === targetEmployee.id) {
        setForm((prev) => ({ ...prev, foto_url: urlData.publicUrl }));
      }
      if (selectedEmployee?.id === targetEmployee.id) {
        setSelectedEmployee(updated);
      }
      setStatus("Foto subida y vinculada.");
      photoFileInputRef.current.value = "";
    } catch (err) {
      setPhotoUploadError(err.message || "No se pudo subir la foto (revisa bucket empleados-docs).");
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setStatus("");
    try {
      const payload =
        resource === "empleados"
          ? normalizeEmployee(form, { takenDays: vacTaken, pendingDays: vacPending })
          : form;
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
      setVacTaken([]);
      setVacPending([]);
      setSelectedEmployee(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (row) => {
    setForm(fields.reduce((acc, field) => ({ ...acc, [field.key]: row[field.key] || "" }), {}));
    setVacTaken(normalizeDateList(row.vacaciones_dias));
    setVacPending(normalizeDateList(row.vacaciones_pendientes));
    setEditingId(row.id);
    setStatus("");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Eliminar registro?")) return;
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
        { key: "sueldo", label: "Sueldo" },
        { key: "vacaciones_tomadas", label: "Tomadas (dias)" },
        { key: "vacaciones_restantes", label: "Restantes" },
        { key: "vacaciones_dias", label: "Fechas tomadas", render: (row) => <DateList value={row.vacaciones_dias} empty="Sin registrar" /> },
        { key: "vacaciones_pendientes", label: "Solicitudes pendientes", render: (row) => <DateList value={row.vacaciones_pendientes} empty="Sin solicitudes" /> },
        { key: "notas", label: "Notas" }
      ]
    : [];

  const renderDocs = (docStr) => {
    const docs = (docStr || "")
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);
    if (!docs.length) return <span className="text-slate-400 text-sm">Sin documentos</span>;
    return (
      <div className="flex flex-wrap gap-2">
        {docs.map((doc, idx) => {
          const [label, urlRaw] = doc.split("|").map((p) => p?.trim() || "");
          const href = (urlRaw || label || "").startsWith("http") ? (urlRaw || label) : `https://${urlRaw || label}`;
          return (
            <a
              key={idx}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs text-white hover:bg-white/20"
            >
              <span className="inline-block h-2 w-2 rounded-full bg-brand-400" />
              {label || `Doc ${idx + 1}`}
            </a>
          );
        })}
      </div>
    );
  };

  return (
    <section id={resource} className="card p-5 md:p-6 space-y-4 text-slate-100 border-white/5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="pill uppercase tracking-wide text-xs bg-brand-600/20 border-brand-500/40 text-brand-50">
              {resource} - {locale}
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
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(initialState(fields));
                  setVacTaken([]);
                  setVacPending([]);
                }}
                className="text-xs text-slate-300 hover:text-white"
              >
                Limpiar
              </button>
            )}
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {fields
              .filter((f) => !["documentos", "vacaciones_dias", "vacaciones_pendientes", "foto_url"].includes(f.key))
              .map((field) => {
                const isVacTomadas = isEmployees && field.key === "vacaciones_tomadas";
                const isVacRest = isEmployees && field.key === "vacaciones_restantes";
                const vacRestCalc = Math.max(0, 30 - vacTaken.length);
                const value = isVacTomadas ? vacTaken.length : isVacRest ? vacRestCalc : form[field.key] || "";
                const readOnly = isVacTomadas || isVacRest;
                return (
                  <label key={field.key} className="flex flex-col gap-2 text-sm">
                    <span className="text-slate-300 font-medium">{field.label}</span>
                    {field.key === "turno" ? (
                      <select
                        value={form[field.key] || ""}
                        onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                        className="input"
                      >
                        <option value="">-- Selecciona turno --</option>
                        <option value="Manana">Manana</option>
                        <option value="Tarde">Tarde</option>
                      </select>
                    ) : (
                      <input
                        required={field.required}
                        type={field.type || "text"}
                        value={value}
                        onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                        className="input"
                        placeholder={field.placeholder}
                        step={field.step}
                        readOnly={readOnly}
                      />
                    )}
                  </label>
                );
              })}
          </div>
          {isEmployees && (
            <>
              <div className="flex flex-col gap-3 border-t border-white/5 pt-3">
                <div className="flex flex-wrap gap-4 text-sm text-slate-300">
                  <span>Tomadas: <strong className="text-white">{vacTaken.length}</strong> dias</span>
                  <span>Pendientes: <strong className="text-white">{vacPending.length}</strong> dias</span>
                  <span>Restantes: <strong className="text-white">{Math.max(0, 30 - vacTaken.length)}</strong> dias</span>
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    className="w-full text-left flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:border-brand-400/40"
                    onClick={() => setShowTakenCalendar((v) => !v)}
                  >
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-brand-200">Dias disfrutados</p>
                      <p className="text-sm text-slate-200">Marca los dias tomados</p>
                    </div>
                    <span className="text-sm text-slate-200">{showTakenCalendar ? "Cerrar" : "Abrir"}</span>
                  </button>
                  {showTakenCalendar && (
                    <VacationCalendar
                      title=""
                      subtitle=""
                      selectedDates={vacTaken}
                      onChange={setVacTaken}
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    className="w-full text-left flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:border-brand-400/40"
                    onClick={() => setShowPendingCalendar((v) => !v)}
                  >
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-brand-200">Solicitudes pendientes</p>
                      <p className="text-sm text-slate-200">Pedidos en revision</p>
                    </div>
                    <span className="text-sm text-slate-200">{showPendingCalendar ? "Cerrar" : "Abrir"}</span>
                  </button>
                  {showPendingCalendar && (
                    <VacationCalendar
                      title=""
                      subtitle=""
                      selectedDates={vacPending}
                      onChange={setVacPending}
                    />
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3 text-sm border-t border-white/5 pt-3">
                <span className="text-slate-300 font-medium">Foto del empleado</span>
                <div className="grid sm:grid-cols-3 gap-3 items-end">
                  <div className="sm:col-span-2 flex flex-col gap-2">
                    <label className="text-xs text-slate-400">URL de la foto</label>
                    <input
                      className="input"
                      placeholder="https://.../foto.jpg"
                      value={form.foto_url || ""}
                      onChange={(e) => setForm({ ...form, foto_url: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-slate-400">Subir archivo</label>
                    <div className="flex flex-wrap items-center gap-2">
                      <input ref={photoFileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp" className="text-xs text-slate-300" />
                      <button type="button" onClick={handlePhotoUpload} className="btn text-sm" disabled={photoUploading}>
                        {photoUploading ? "Subiendo..." : "Subir foto"}
                      </button>
                    </div>
                  </div>
                </div>
                {photoUploadError && <p className="text-xs text-rose-200">{photoUploadError}</p>}
                {form.foto_url && (
                  <div className="flex items-center gap-3 text-xs text-slate-300">
                    <img
                      src={form.foto_url}
                      alt="Foto del empleado"
                      className="h-16 w-16 rounded-xl object-cover border border-white/10 bg-white/5"
                    />
                    <span className="text-slate-200">Previsualización</span>
                  </div>
                )}
              </div>

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
                <p className="text-xs text-slate-400">Bucket publico empleados-docs en Supabase Storage.</p>
              </div>
            </>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" className="btn btn-primary text-sm font-semibold">
              {editingId ? "Guardar cambios" : "Crear"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(initialState(fields));
                  setVacTaken([]);
                  setVacPending([]);
                }}
                className="btn text-sm"
              >
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
              <DataTable
                columns={columnsBasic}
                rows={filtered}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onView={(row) => setSelectedEmployee(row)}
              />
            </div>
            <div className="card p-3 border-white/5">
              <p className="text-sm font-semibold mb-2 text-slate-100">Compensacion y vacaciones</p>
              <DataTable
                columns={columnsVac}
                rows={filtered}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onView={(row) => setSelectedEmployee(row)}
              />
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
                <h4 className="text-lg font-semibold text-white">{title} - {locale}</h4>
              </div>
              <button className="btn text-sm" onClick={() => setShowImporter(false)}>Cerrar</button>
            </div>
            {resource === "empleados" && (
              <p className="text-sm text-slate-300">CSV con columnas Nombre, Nomina, Efectivo o el formato Manana/Tarde que enviaste.</p>
            )}
            {resource === "contabilidad" && (
              <div className="space-y-2 text-sm text-slate-300">
                <p>Pega CSV diario, resumen o nominas. Si es resumen o nominas, indica fecha.</p>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-slate-400">Fecha a aplicar (resumen/nominas)</span>
                  <input type="date" className="input" value={importDate} onChange={(e) => setImportDate(e.target.value)} />
                </label>
              </div>
            )}
            {resource === "turnos" && (
              <p className="text-sm text-slate-300">CSV con cabecera de dias (LUNES 08/09...). Genera un registro por empleado y dia.</p>
            )}
            <textarea className="input min-h-[240px] font-mono text-xs" placeholder="Pega aqui tu CSV..." value={rawCsv} onChange={(e) => setRawCsv(e.target.value)} />
            <div className="flex items-center gap-2">
              <button className="btn btn-primary text-sm" onClick={handleImport}>Importar</button>
              <button className="btn text-sm" onClick={() => setShowImporter(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {isEmployees && selectedEmployee && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="card max-w-3xl w-full p-6 space-y-4 relative">
            <button
              className="btn text-sm absolute top-4 right-4"
              onClick={() => setSelectedEmployee(null)}
            >
              Cerrar
            </button>
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                {selectedEmployee.foto_url ? (
                  <img
                    src={selectedEmployee.foto_url}
                    alt={`Foto de ${selectedEmployee.nombre || "empleado"}`}
                    className="h-20 w-20 rounded-2xl object-cover border border-white/10 bg-white/5"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-lg font-semibold text-slate-200">
                    {getInitials(selectedEmployee.nombre)}
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.25em] text-brand-200">Ficha de empleado</p>
                  <h4 className="text-2xl font-semibold text-white">{selectedEmployee.nombre || "Sin nombre"}</h4>
                  <p className="text-sm text-slate-300">{selectedEmployee.contrato || "Contrato no definido"}</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {selectedEmployee.turno && <span className="pill">{selectedEmployee.turno}</span>}
                    {selectedEmployee.dni && <span className="pill bg-white/10">DNI {selectedEmployee.dni}</span>}
                    {selectedEmployee.iban && <span className="pill bg-brand-600/20 border-brand-500/30">IBAN {selectedEmployee.iban}</span>}
                  </div>
                </div>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-slate-400 text-xs">Sueldo</p>
                <p className="text-white text-lg font-semibold">{selectedEmployee.sueldo ?? "-"}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-slate-400 text-xs">Local</p>
                <p className="text-white text-lg font-semibold">{selectedEmployee.local || locale}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-slate-400 text-xs">Vacaciones tomadas</p>
                <p className="text-white text-lg font-semibold">{normalizeDateList(selectedEmployee.vacaciones_dias).length}</p>
                <DateList value={selectedEmployee.vacaciones_dias} empty="Sin dias" />
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-slate-400 text-xs">Solicitudes pendientes</p>
                <p className="text-white text-lg font-semibold">{normalizeDateList(selectedEmployee.vacaciones_pendientes).length}</p>
                <DateList value={selectedEmployee.vacaciones_pendientes} empty="Sin solicitudes" />
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-slate-300 font-semibold">Documentos</p>
              {renderDocs(selectedEmployee.documentos)}
            </div>
            <div className="space-y-1 text-sm">
              <p className="text-slate-300 font-semibold">Notas</p>
              <p className="text-slate-200">{selectedEmployee.notas || "Sin notas"}</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ModulePage;
