export const listingStatuses: Record<string, { label: string; class: string }> = {
  pending:  { label: 'En attente', class: 'badge-orange' },
  active:   { label: 'Active',     class: 'badge-green'  },
  rejected: { label: 'Rejetée',   class: 'badge-red'    },
  sold:     { label: 'Vendue',    class: 'badge-gray'   },
};

export const workshopStatuses: Record<string, { label: string; class: string }> = {
  draft:     { label: 'Brouillon', class: 'badge-gray'   },
  pending:   { label: 'En attente', class: 'badge-orange' },
  active:    { label: 'Actif',     class: 'badge-green'  },
  cancelled: { label: 'Annulé',   class: 'badge-red'    },
};

export const containerStatuses: Record<string, { label: string; class: string }> = {
  operational: { label: 'Opérationnel', class: 'badge-green'  },
  full:        { label: 'Plein',       class: 'badge-orange' },
  maintenance: { label: 'Maintenance', class: 'badge-red'    },
};

export const containerRequestStatuses: Record<string, { label: string; class: string }> = {
  pending:  { label: 'En attente', class: 'badge-orange' },
  approved: { label: 'Approuvée', class: 'badge-green'  },
  rejected: { label: 'Refusée',   class: 'badge-red'    },
};

export const invoiceStatuses: Record<string, { label: string; class: string }> = {
  paid:    { label: 'Payée',      class: 'badge-green'  },
  pending: { label: 'En attente', class: 'badge-orange' },
  overdue: { label: 'En retard',  class: 'badge-red'    },
};
