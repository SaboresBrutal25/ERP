-- Añade columnas para separar importes de nóminas
ALTER TABLE nominas
  ADD COLUMN IF NOT EXISTS importe_ingresado numeric,
  ADD COLUMN IF NOT EXISTS importe_efectivo numeric;

-- Opcional: poner 0 en nulos
UPDATE nominas
SET importe_ingresado = COALESCE(importe_ingresado, 0),
    importe_efectivo = COALESCE(importe_efectivo, 0)
WHERE importe_ingresado IS NULL OR importe_efectivo IS NULL;
