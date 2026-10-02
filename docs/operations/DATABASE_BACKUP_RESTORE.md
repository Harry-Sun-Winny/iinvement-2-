# Local Database Backup and Restore

The Investment Platform development database is PostgreSQL at `localhost:5432`, database `investment`, user `investment`.

## Backup

```powershell
.\scripts\backup-postgres.cmd
```

The script writes a PostgreSQL custom archive to `backups\<timestamp>\investment.backup`.

## Restore

Stop the backend first, then restore a custom archive:

```powershell
.\scripts\restore-db.cmd .\backups\<timestamp>\investment.backup
```

The restore replaces the `public` schema within one transaction. Start the backend afterward so Flyway can apply newer migrations.

Both frontend applications use the same backend at `http://localhost:8080`; they should not start separate backend instances.
