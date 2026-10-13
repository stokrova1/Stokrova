# Manual Setup Checklist

## 1. Create the repository

Create a new private GitHub repository for the product.

Recommended temporary name:

`business-platform`

The final product/brand name can change later.

## 2. Clone the approved reference repositories

From the project root:

```bash
mkdir reference
cd reference

git clone https://github.com/frappe/erpnext.git erpnext
git clone https://github.com/Inventree/Inventree.git inventree
git clone https://github.com/SHalimoosavi/SYJ-QuickStock-Sync.git quickstock
git clone https://github.com/paulo-aunor/tetherpos.git tetherpos
```

These clones are for research and architecture comparison. Do not merge source files into the product repository without a specific license/dependency decision.

## 3. Install runtime tooling

Use Node.js 24 LTS and pnpm.

Verify:

```bash
node -v
corepack enable
pnpm -v
```

Pin the exact Node version in the repository once development begins.

## 4. Install Docker Desktop

Required for local:

- PostgreSQL
- Redis
- optional object-storage emulator
- test infrastructure

## 5. Create local environment

The implementation agent should create:

```text
.env.example
.env.local
```

Never commit `.env.local`.

## 6. Required local services

Minimum:

```text
postgres
redis
```

Later:

```text
object storage emulator
mail testing service
observability development endpoint
```

## 7. Reference inspection

Before writing product code, ask Claude Code to inspect the four cloned references and produce:

```text
docs/reference-analysis/
  erpnext.md
  inventree.md
  quickstock.md
  tetherpos.md
  comparison.md
```

The analysis must identify:

- useful domain concepts
- useful UX ideas
- useful sync ideas
- licensing implications
- architectural ideas to reject
- concepts worth implementing independently

## 8. Do not start from a fork

The product repository remains independent.

Reference repos are research inputs, not the parent project.

## 9. Create the first human review point

After Phase 0 scaffolding, inspect:

```text
package.json
pnpm-workspace.yaml
docker-compose.yml
apps/
packages/
docs/
CLAUDE.md
AGENTS.md
```

Then allow feature implementation.
