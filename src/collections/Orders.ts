import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

const prepareOrder: CollectionBeforeChangeHook = ({ data, operation }) => {
  if (operation !== 'create') return data

  const items = Array.isArray(data.items) ? data.items : []
  const subtotal = items.reduce(
    (sum: number, item: { unitPrice?: number; quantity?: number }) =>
      sum + Number(item.unitPrice || 0) * Number(item.quantity || 0),
    0,
  )
  const tax = Math.round(subtotal * 0.08 * 100) / 100
  data.subtotal = Math.round(subtotal * 100) / 100
  data.tax = tax
  data.total = Math.round((subtotal + tax) * 100) / 100
  data.orderNumber = `BB-${Math.floor(1000 + Math.random() * 9000)}`
  data.status = 'confirmed'
  return data
}

export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: {
    group: 'Bakery',
    useAsTitle: 'orderNumber',
    defaultColumns: ['orderNumber', 'customerName', 'pickupDate', 'status', 'total'],
  },
  access: {
    create: () => true,
    delete: () => false,
    read: ({ req }) => {
      if (req.user?.collection === 'admins') return true
      if (req.user?.collection === 'users') return { customer: { equals: req.user.id } }
      return false
    },
    update: ({ req }) => req.user?.collection === 'admins',
  },
  hooks: {
    beforeChange: [prepareOrder],
  },
  fields: [
    {
      name: 'orderNumber',
      type: 'text',
      index: true,
      access: { create: () => false, update: () => false },
    },
    { name: 'customer', type: 'relationship', relationTo: 'users', index: true },
    { name: 'customerName', type: 'text', required: true },
    { name: 'email', type: 'email', required: true },
    { name: 'phone', type: 'text', required: true },
    { name: 'pickupDate', type: 'date', required: true },
    { name: 'pickupWindow', type: 'text', required: true },
    { name: 'notes', type: 'textarea' },
    {
      name: 'items',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        { name: 'product', type: 'relationship', relationTo: 'products', required: true },
        { name: 'name', type: 'text', required: true },
        { name: 'quantity', type: 'number', required: true, min: 1, max: 24 },
        { name: 'unitPrice', type: 'number', required: true, min: 0 },
      ],
    },
    { name: 'subtotal', type: 'number', access: { create: () => false, update: () => false } },
    { name: 'tax', type: 'number', access: { create: () => false, update: () => false } },
    { name: 'total', type: 'number', access: { create: () => false, update: () => false } },
    { name: 'paymentLast4', type: 'text', required: true },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'confirmed',
      options: ['confirmed', 'preparing', 'ready', 'collected', 'cancelled'],
      access: { create: () => false },
      admin: { position: 'sidebar' },
    },
  ],
  versions: false,
}
