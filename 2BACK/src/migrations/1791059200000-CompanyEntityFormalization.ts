import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Formaliza la empresa como entidad de primera clase (spec `companies`,
 * portado de ABAGAS 1790884794027):
 *
 * - client_group_entity → company_entity (se van las columnas muertas
 *   credit_limit / payment_terms: sin lectores ni escritores).
 * - client.group_id → company_id, ahora NULLABLE (particulares = NULL).
 * - client.company_name se elimina: el nombre vive en company_entity.name.
 * - Backfill (política B, ABAGAS 2026-10-01): sobreviven como empresa SOLO
 *   los grupos con rut significativo Y 2+ clientes. Los grupos 1:1
 *   (personas con rut propio) y los de rut basura/NULL sueltan a sus
 *   clientes (company_id NULL) y se eliminan. Una empresa real de una sola
 *   sucursal se re-declara con el flujo "Es empresa".
 *
 * ANTES de aplicar sobre datos que importen: correr
 * `ts-node src/scripts/company-migration-report.ts` (dry-run).
 */
export class CompanyEntityFormalization1791059200000 implements MigrationInterface {
  name = 'CompanyEntityFormalization1791059200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Renombrar tabla (las FKs existentes siguen a la tabla renombrada).
    await queryRunner.query(`ALTER TABLE "client_group_entity" RENAME TO "company_entity"`);

    // 2. Columnas muertas fuera.
    await queryRunner.query(`ALTER TABLE "company_entity" DROP COLUMN "credit_limit"`);
    await queryRunner.query(`ALTER TABLE "company_entity" DROP COLUMN "payment_terms"`);

    // 3. client_entity: group_id → company_id, NULLABLE.
    await queryRunner.query(`ALTER TABLE "client_entity" RENAME COLUMN "group_id" TO "company_id"`);
    await queryRunner.query(`ALTER TABLE "client_entity" ALTER COLUMN "company_id" DROP NOT NULL`);

    // 4. Backfill (política B): CTE materializada para que el conteo no
    //    cambie a mitad del UPDATE.
    await queryRunner.query(`
      WITH group_stats AS (
        SELECT g.id,
               (SELECT COUNT(*) FROM "client_entity" c WHERE c."company_id" = g.id) AS client_count,
               (g."rut_normalizado" IS NULL
                OR length(regexp_replace(COALESCE(g."rut_normalizado", ''), '[^0-9kK]', '', 'g')) < 7
                OR regexp_replace(COALESCE(g."rut_normalizado", ''), '[^0-9kK]', '', 'g') ~ '^0+$') AS junk_rut
        FROM "company_entity" g
      )
      UPDATE "client_entity" c SET "company_id" = NULL
      FROM group_stats s
      WHERE c."company_id" = s.id
        AND (s.junk_rut OR s.client_count < 2)
    `);

    // 5. Grupos huérfanos fuera (los disueltos + los que ya estaban vacíos).
    await queryRunner.query(`
      DELETE FROM "company_entity" g
      WHERE NOT EXISTS (SELECT 1 FROM "client_entity" c WHERE c."company_id" = g.id)
    `);

    // 6. Los sobrevivientes tienen rut significativo → NOT NULL.
    await queryRunner.query(`ALTER TABLE "company_entity" ALTER COLUMN "rut_normalizado" SET NOT NULL`);

    // 7. company_name fuera del cliente.
    await queryRunner.query(`ALTER TABLE "client_entity" DROP COLUMN "company_name"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reversible con reconstrucción de los grupos 1:1 (lossy: el nombre de
    // empresa original se pierde — company_name se restaura vacío).
    await queryRunner.query(`ALTER TABLE "client_entity" ADD COLUMN "company_name" character varying`);

    await queryRunner.query(`ALTER TABLE "company_entity" ALTER COLUMN "rut_normalizado" DROP NOT NULL`);
    await queryRunner.query(`
      DO $$
      DECLARE c RECORD; gid integer;
      BEGIN
        FOR c IN SELECT id, name FROM "client_entity" WHERE "company_id" IS NULL LOOP
          INSERT INTO "company_entity" ("rut_normalizado", "name", "active", "created_at", "updated_at")
          VALUES (NULL, c.name, true, now(), now()) RETURNING id INTO gid;
          UPDATE "client_entity" SET "company_id" = gid WHERE id = c.id;
        END LOOP;
      END $$
    `);

    await queryRunner.query(`ALTER TABLE "client_entity" RENAME COLUMN "company_id" TO "group_id"`);
    await queryRunner.query(`ALTER TABLE "client_entity" ALTER COLUMN "group_id" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "company_entity" RENAME TO "client_group_entity"`);
    await queryRunner.query(`ALTER TABLE "client_group_entity" ADD COLUMN "credit_limit" numeric(15,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "client_group_entity" ADD COLUMN "payment_terms" character varying NOT NULL DEFAULT ''`);
  }
}
