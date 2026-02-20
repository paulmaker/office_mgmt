// Run with: npx dotenv -e .env -- node scripts/check-migrate-drift.js
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL not set in .env');
  process.exit(1);
}
const { execSync } = require('child_process');
execSync(
  `npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url "${url.replace(/"/g, '\\"')}" --script`,
  { stdio: 'inherit', cwd: require('path').join(__dirname, '..') }
);
