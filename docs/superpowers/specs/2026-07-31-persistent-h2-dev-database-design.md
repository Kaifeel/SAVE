# Persistent H2 Development Database Design

## Context

The `dev` profile currently uses `jdbc:h2:mem:save`. Hibernate creates the
schema, but the database disappears whenever Spring Boot stops and no reference
rows are inserted. As a result, `GET /api/v1/universities` returns an empty
array on every fresh start until a developer inserts data manually.

## Goals

- Preserve local development data across Spring Boot restarts.
- Create only the minimum reference data needed for existing flows.
- Provide an explicit, predictable way to reset the local database.
- Keep production PostgreSQL behavior and application APIs unchanged.
- Keep automated tests isolated from the persistent development database.

## Non-goals

- Do not add or alter database tables.
- Do not change JPA entities, controllers, services, or frontend API contracts.
- Do not replace the production PostgreSQL and Flyway configuration.
- Do not create a comprehensive demo-data catalog.

## Selected Approach

Use a file-backed H2 database for the `dev` profile, an idempotent development
seed script, and a narrowly scoped Gradle reset task.

This approach has less setup overhead than Docker PostgreSQL while preserving
data between IntelliJ runs. It is also more convenient than an in-memory H2
database because manually created users, items, and chats remain available.

## Configuration

Change only the `dev` datasource default:

```yaml
spring:
  datasource:
    url: ${DB_URL:jdbc:h2:file:./.local-data/save;MODE=PostgreSQL;AUTO_SERVER=TRUE}
```

`DB_URL` remains available as an override. The existing production profile
continues to require PostgreSQL and is not affected.

The `.local-data/` directory is ignored by Git. It contains developer-local
state and must never be committed.

## Minimum Development Seed

No new tables are introduced. Hibernate continues to manage the existing
development schema with `ddl-auto: update`.

After Hibernate has initialized the schema, a `dev`-only SQL script performs
idempotent upserts into the existing tables:

- one `universities` row: `부경대학교`
- one `pickup_locations` row for that university: `대연캠퍼스 정문`

The university row makes signup usable. The single pickup location is also
included because the existing item-registration flow requires a location ID.
Running the seed repeatedly must not duplicate either row.

The seed is configured only by `application-dev.yml`; it does not execute in
the `prod` profile.

## Reset Workflow

Add a `resetDevDb` Gradle task that deletes only
`backend/.local-data/`. It must not accept a caller-provided path or delete any
broader directory.

The developer workflow is:

1. Stop Spring Boot so H2 releases the database files.
2. Run `.\gradlew.bat resetDevDb` on Windows or `./gradlew resetDevDb` on
   macOS/Linux.
3. Start Spring Boot again.
4. Hibernate recreates the existing schema and the dev seed restores the two
   minimum reference rows.

Normal `bootRun` never resets the database.

## Test Isolation

The Gradle `test` task supplies an in-memory `DB_URL` so tests never read or
write `.local-data/`. Test data remains disposable and does not leak into the
developer's IntelliJ database.

Tests will verify:

- the `dev` profile uses the file-backed H2 default;
- the production profile still uses PostgreSQL and Flyway validation;
- the seed is idempotent and exposes one university through the existing API;
- `resetDevDb` targets only the local development database directory.

## Failure Handling

- If the database files are locked, `resetDevDb` fails and instructs the
  developer to stop Spring Boot; it must not attempt forceful process
  termination.
- If the seed fails, Spring Boot startup fails visibly rather than running with
  incomplete required reference data.
- Existing frontend network and empty-list handling remains outside this
  database-only change.

## Expected Impact

Runtime application behavior and API shapes do not change. The only persistent
behavioral difference in `dev` is that local data survives restarts and the two
required reference rows exist automatically. Production and test databases
remain isolated.
