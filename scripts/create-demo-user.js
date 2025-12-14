const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('demo123', 10)

  const user = await prisma.user.upsert({
    where: { email: 'demo@disruption.intel' },
    update: {},
    create: {
      name: 'Demo User',
      email: 'demo@disruption.intel',
      password: hashedPassword,
    },
  })

  console.log('Created demo user:', user.email)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
