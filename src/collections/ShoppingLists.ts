import type { Access, CollectionBeforeChangeHook, CollectionConfig } from 'payload'

const ownedByUser: Access = ({ req }) => {
  if (req.user?.collection !== 'users') return false
  return { owner: { equals: req.user.id } }
}

const prepareList: CollectionBeforeChangeHook = async ({ data, req, operation }) => {
  if (operation === 'create' && req.user?.collection === 'users') {
    data.owner = req.user.id
  }
  if (Array.isArray(data.products) && data.products.length > 0) {
    const eligible = await req.payload.find({
      collection: 'products',
      overrideAccess: false,
      user: req.user,
      depth: 0,
      limit: Math.min(data.products.length, 100),
      where: {
        and: [
          { id: { in: data.products } },
          { available: { equals: true } },
        ],
      },
    })
    if (eligible.docs.length !== data.products.length) {
      throw new Error('Shopping lists may only contain available bakery products.')
    }
  }
  return data
}

export const ShoppingLists: CollectionConfig = {
  slug: 'shopping-lists',
  admin: {
    hidden: true,
    useAsTitle: 'name',
  },
  access: {
    create: ({ req }) => req.user?.collection === 'users',
    delete: ownedByUser,
    read: ownedByUser,
    update: ownedByUser,
  },
  hooks: {
    beforeChange: [prepareList],
  },
  fields: [
    { name: 'name', type: 'text', required: true, defaultValue: 'My favorites' },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      access: { create: () => false, update: () => false },
    },
    { name: 'products', type: 'relationship', relationTo: 'products', hasMany: true },
  ],
  versions: false,
}
