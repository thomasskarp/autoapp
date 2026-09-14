# 🤝 Contributing to AutoApp

Thank you for your interest in contributing to AutoApp! We welcome all contributions, from bug reports and documentation polish to performance enhancements and new integration connectors.

## Code of Conduct

We are dedicated to maintaining a collaborative, welcoming, and humble engineering culture. We believe great software is built through steady learning and mutual respect across all skill levels.

## How to Get Started

1. **Fork** the repository on GitHub.
2. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-description
   ```
3. **Install dependencies and test compilation**:
   ```bash
   npm install
   npm run build
   ```
4. **Run the modular verification test scripts**:
   ```bash
   node scripts/test_security_phase1.mjs
   node scripts/test_phase2_performance.mjs
   ```

## Code Standards

- **Strict Typing:** Adhere to TypeScript standards (`strict: true`) without bypassing types with ungrounded `any`.
- **Validation Schemas:** Every AI or external API interaction must have a corresponding typed `Zod` schema.
- **Commit Messages:** Follow the Conventional Commits specification:
  - `feat:` New feature
  - `fix:` Bug fix
  - `docs:` Documentation changes
  - `refactor:` Code restructuring without behavior changes
  - `perf:` Performance improvements
  - `test:` Test suite additions or adjustments

## Submitting Pull Requests

1. Ensure the code compiles cleanly (`npm run build` succeeds).
2. Clearly describe the problem solved, architectural rationale, and verification steps in your PR description.
3. Keep changes as atomic and focused as possible.

Thank you for helping improve AutoApp!
