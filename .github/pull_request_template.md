## Summary

<!-- Brief description of what this PR does. Link related issues with "Closes #123" -->

## Type of Change

- [ ] New AI Agent
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update
- [ ] Smart contract change
- [ ] SDK enhancement
- [ ] CI/CD / DevOps

## Changes Made

<!-- List the key changes in bullet points -->

-
-
-

## Testing

<!-- How did you verify your changes? -->

- [ ] Unit tests pass (`make test`)
- [ ] Local dev server runs without errors (`make dev`)
- [ ] Agent responds to `/health`, `/manifest`, `/execute` endpoints
- [ ] Smart contracts compile and tests pass (`forge test`)
- [ ] Dashboard builds without errors (`npm run build`)

## Agent-Specific Checklist

<!-- Only fill this out if you're submitting a new agent -->

- [ ] Agent has a unique `id` (lowercase, hyphens only)
- [ ] Agent includes `.env.example` with required variables
- [ ] Agent registers successfully via `npm run register`
- [ ] Agent handles edge cases gracefully (missing payload, invalid wallet, etc.)
- [ ] Agent returns proper response format with `status`, `result`, and `executionTimeMs`

## Screenshots / Output

<!-- If applicable, add screenshots or paste relevant output -->

## Additional Context

<!-- Any other context, trade-offs, or considerations -->
