import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Idempotent migration: renames client_entity.branch_name → company_name.
 * Checks if the old column still exists before altering.
 *
 * Usage: import this class into your migration runner or NestJS config.
 * For manual run: npx ts-node -r tsconfig-paths/register migration-rename-branch-name.ts
 */
export class RenameBranchNameToCompanyName implements MigrationInterface {
  name = 'RenameBranchNameToCompanyName1680000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasOldColumn = await queryRunner.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_name = 'client_entity' AND column_name = 'branch_name'`
    );

    if (Array.isArray(hasOldColumn) && hasOldColumn.length > 0) {
      const hasNewColumn = await queryRunner.query(
        `SELECT 1 FROM information_schema.columns
         WHERE table_name = 'client_entity' AND column_name = 'company_name'`
      );

      if (!Array.isArray(hasNewColumn) || hasNewColumn.length === 0) {
        await queryRunner.query(
          `ALTER TABLE client_entity RENAME COLUMN branch_name TO company_name`
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasNewColumn = await queryRunner.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_name = 'client_entity' AND column_name = 'company_name'`
    );

    if (Array.isArray(hasNewColumn) && hasNewColumn.length > 0) {
      await queryRunner.query(
        `ALTER TABLE client_entity RENAME COLUMN company_name TO branch_name`
      );
    }
  }
}
