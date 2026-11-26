import type { Access, CollectionConfig } from 'payload'

const isAppUser: Access = ({ req }) => req.user?.collection === 'users'
const isSelf: Access = ({ req }) => {
  if (req.user?.collection !== 'users') return false
  return { id: { equals: req.user.id } }
}

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    hidden: true,
    useAsTitle: 'username',
  },
  access: {
    admin: () => false,
    create: () => true,
    delete: isSelf,
    read: isSelf,
    update: isSelf,
  },
  fields: [
    { name: 'username', type: 'text', required: true },
    { name: 'fullName', type: 'text', required: true },
    { name: 'phone', type: 'text' },
  ],
  versions: false,
}
