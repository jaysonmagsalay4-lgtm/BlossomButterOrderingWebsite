import type { CollectionConfig } from 'payload'

export const Products: CollectionConfig = {
  slug: 'products',
  admin: {
    group: 'Bakery',
    useAsTitle: 'name',
    defaultColumns: ['name', 'category', 'price', 'available'],
  },
  access: {
    read: () => true,
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'slug', useAsSlug: 'name' },
    { name: 'description', type: 'textarea', required: true },
    { name: 'price', type: 'number', required: true, min: 0 },
    {
      name: 'category',
      type: 'select',
      required: true,
      options: [
        { label: 'Pastries', value: 'pastries' },
        { label: 'Cookies', value: 'cookies' },
        { label: 'Desserts', value: 'desserts' },
      ],
      admin: { position: 'sidebar' },
    },
    { name: 'image', type: 'upload', relationTo: 'media', required: true },
    { name: 'available', type: 'checkbox', defaultValue: true, admin: { position: 'sidebar' } },
    { name: 'featured', type: 'checkbox', defaultValue: false, admin: { position: 'sidebar' } },
    { name: 'sortOrder', type: 'number', defaultValue: 0, admin: { position: 'sidebar' } },
  ],
  versions: false,
}
