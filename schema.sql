[
  {
    "table_name": "contabilidad",
    "create_table_sql": "CREATE TABLE contabilidad (\n  importe numeric NOT NULL,\\n  locale USER-DEFINED NOT NULL,\\n  fecha date NOT NULL,\\n  id uuid NOT NULL,\\n  tipo text NOT NULL,\\n  categoria text NOT NULL,\\n  created_at timestamp with time zone\n);"
  },
  {
    "table_name": "empleados",
    "create_table_sql": "CREATE TABLE empleados (\n  sueldo numeric NOT NULL,\\n  documentos text,\\n  vacaciones_tomadas numeric,\\n  vacaciones_restantes numeric,\\n  manipulador text,\\n  iban text,\\n  contrato text NOT NULL,\\n  fecha_inicio date,\\n  dni text NOT NULL,\\n  nombre text NOT NULL,\\n  vacaciones_pendientes text,\\n  vacaciones_dias text,\\n  id uuid NOT NULL,\\n  created_at timestamp with time zone,\\n  locale USER-DEFINED NOT NULL,\\n  notas text,\\n  turno text\n);"
  },
  {
    "table_name": "facturacion",
    "create_table_sql": "CREATE TABLE facturacion (\n  fecha date NOT NULL,\\n  importe numeric NOT NULL,\\n  id uuid NOT NULL,\\n  created_at timestamp with time zone,\\n  locale USER-DEFINED NOT NULL,\\n  proveedor text NOT NULL,\\n  estado text NOT NULL,\\n  tipo text NOT NULL\n);"
  },
  {
    "table_name": "stock",
    "create_table_sql": "CREATE TABLE stock (\n  stock_actual text NOT NULL,\\n  movimiento text NOT NULL,\\n  fecha date NOT NULL,\\n  created_at timestamp with time zone,\\n  id uuid NOT NULL,\\n  locale USER-DEFINED NOT NULL,\\n  producto text NOT NULL\n);"
  },
  {
    "table_name": "turnos",
    "create_table_sql": "CREATE TABLE turnos (\n  fecha date NOT NULL,\\n  semana text NOT NULL,\\n  empleado text NOT NULL,\\n  turno text NOT NULL,\\n  id uuid NOT NULL,\\n  locale USER-DEFINED NOT NULL,\\n  created_at timestamp with time zone\n);"
  },
  {
    "table_name": "ventas",
    "create_table_sql": "CREATE TABLE ventas (\n  tickets integer,\\n  created_at timestamp with time zone,\\n  ventas numeric,\\n  id uuid NOT NULL,\\n  fecha date NOT NULL,\\n  locale USER-DEFINED NOT NULL,\\n  ticket_medio numeric\n);"
  }
]
