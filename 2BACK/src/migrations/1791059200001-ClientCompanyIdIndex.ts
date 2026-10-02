import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Índice en `client_entity.company_id` (portado de ABAGAS, hallazgo J6):
 * el modal de empresas ejecuta un COUNT correlacionado por empresa y el
 * registro / anti-duplicados / jerarquía hacen lookups por company_id.
 * Postgres no indexa columnas FK automáticamente.
 */
export class ClientCompanyIdIndex1791059200001 implements MigrationInterface {
  name = 'ClientCompanyIdIndex1791059200001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_client_company_id" ON "client_entity" ("company_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_client_company_id"`);
  }
}
