# API Surface (v0)

Base path: `/api/v1`

## Auth
- `POST /auth/register` – body `{ email, password, full_name? }` → `201 User`.
- `POST /auth/token` – form `{ username, password }` → `{ access_token, token_type }`.
- `GET /me` – returns current user.

## Workspaces
- `POST /workspaces` – create workspace, caller becomes owner.
- `GET /workspaces` – list workspaces the user belongs to.
- `GET /workspaces/{workspace_id}/members` – list members (owner/admin).
- `POST /workspaces/{workspace_id}/members/invite` – invite or auto-create user, set role.
- `PATCH /workspaces/{workspace_id}/members/{user_id}` – change member role.
- `DELETE /workspaces/{workspace_id}/members/{user_id}` – remove member.

## Watchers
- `POST /workspaces/{workspace_id}/watchers` – create watcher (owner/admin).
- `PATCH /watchers/{watcher_id}` – update watcher cadence/expectations (owner/admin).
- `GET /workspaces/{workspace_id}/watchers` – list watchers for members.
- `GET /watchers/{watcher_id}/events` – list events (members only).

## Public
- `GET /public/workspaces/{workspace_id}/events` – list events if `is_public`.

## Auth headers
`Authorization: Bearer <token>`

## Health event status values
- `healthy`, `degraded`, `down`

## Notes
- Watcher cadence uses `every_value` + `every_unit` (minutes|hours|days|weeks). Default 15 minutes.
- API currently schedules HTTP GET checks; body substring validation optional via `expected_body`.
- Email notifications are stubbed for future extension; queue already available.
