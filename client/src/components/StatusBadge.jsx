import React from 'react';

const LABELS = {
  pending:   'Pendiente',
  submitted: 'Enviada',
  approved:  'Aprobada',
  rejected:  'Rechazada',
  draft:     'Borrador',
  active:    'Activo',
  finished:  'Finalizado',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`badge-${status}`}>
      {LABELS[status] ?? status}
    </span>
  );
}
