# Authentication & Authorization

- **Auth**: JWT bearer tokens issued via `/api/v1/auth/token` using email + password.
- **Password hashing**: PBKDF2-SHA256 (passlib) for portability in offline/test environments.
- **JWT claims**: `sub` = user id (UUID), `exp` = expiry (default 60 minutes).

## Roles per workspace
- **owner**: full control; invite/remove members; promote to admin; manage watchers; toggle public status.
- **admin**: manage watchers; view events; cannot delete workspace or promote owners.
- **observer**: read-only for workspace resources.
- **public**: unauthenticated access only to `/api/v1/public/workspaces/{id}/events` when `is_public` is true.

## Enforcement points
- `get_current_user` – validates JWT, loads user.
- `get_workspace_role` – ensures membership; returns role for downstream checks.
- Watcher creation restricted to `owner` or `admin`.

## Future enhancements
- Magic-link or GitHub OAuth login.
- Workspace invitations via signed tokens.
- Audit log of role changes.
