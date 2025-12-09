import fs from 'fs';
import path from 'path';
import process from 'process';
import dotenv from 'dotenv';

const rootEnv = path.resolve(process.cwd(), '../.env');
if (fs.existsSync(rootEnv)) {
  dotenv.config({ path: rootEnv });
} else {
  dotenv.config();
}

export const port = process.env.PORT || 4000;
export const jwtSecret = process.env.JWT_SECRET || 'dev-secret';
export const dataDir = process.env.DATA_DIR || path.resolve(process.cwd(), 'data');

export const moduleConfigs = {
  empleados: {
    columns: ['id', 'nombre', 'dni', 'contrato', 'sueldo', 'local'],
    locationField: 'local'
  },
  turnos: {
    columns: ['id', 'semana', 'empleado', 'local', 'fecha', 'turno'],
    locationField: 'local'
  },
  contabilidad: {
    columns: ['id', 'fecha', 'local', 'categoria', 'importe', 'tipo'],
    locationField: 'local'
  },
  ventas: {
    columns: ['id', 'fecha', 'local', 'tickets', 'ticket_medio', 'ventas'],
    locationField: 'local'
  },
  stock: {
    columns: ['id', 'producto', 'local', 'stock_actual', 'movimiento', 'fecha'],
    locationField: 'local'
  },
  facturacion: {
    columns: ['id', 'fecha', 'proveedor', 'local', 'importe', 'estado', 'tipo'],
    locationField: 'local'
  }
};
