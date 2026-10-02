import { MigrationInterface, QueryRunner } from "typeorm";

export class Baseline1790977935682 implements MigrationInterface {
    name = 'Baseline1790977935682'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "category_entity" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, CONSTRAINT "PK_1a38b9007ed8afab85026703a53" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "product_entity" ("id" SERIAL NOT NULL, "name" character varying NOT NULL DEFAULT '', "active" boolean NOT NULL DEFAULT true, "image" character varying, "stock" integer NOT NULL DEFAULT '0', "minimum" integer NOT NULL DEFAULT '5', "costPrice" integer NOT NULL DEFAULT '0', "sellingPrice" integer NOT NULL DEFAULT '0', "maxDiscount" integer NOT NULL DEFAULT '0', "location" character varying NOT NULL DEFAULT '', "description" character varying NOT NULL DEFAULT '', "categoryId" integer, CONSTRAINT "PK_6e8f75045ddcd1c389c765c896e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "sales" ("id" SERIAL NOT NULL, "total" numeric(12,2) NOT NULL, "snapshot" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4f0bc990ae81dba46da680895ea" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "transaction_entity" ("id" SERIAL NOT NULL, "operation" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "quantity" integer, "costPrice" integer, "sellingPrice" integer, "maxDiscount" integer, "location" character varying NOT NULL DEFAULT '', "payMethod" character varying NOT NULL DEFAULT '', "finalStock" integer, "purchaseDiscount" integer, "finalValue" integer, "deleted" boolean NOT NULL DEFAULT false, "assignedWorker" character varying, "description" character varying, "snapshotData" json, "productId" integer, "operatorId" integer, "managerId" integer, "saleId" integer, "refillGroupId" integer, CONSTRAINT "PK_6f9d7f02d8835ac9ef1f685a2e8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user_entity" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "email" character varying, "passwordHash" character varying, "role" character varying NOT NULL DEFAULT 'seller', "active" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_415c35b9b3b6fe45a3b065030f5" UNIQUE ("email"), CONSTRAINT "PK_b54f8ea623b17094db7667d8206" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "refill_groups" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "totalValue" numeric(10,2) NOT NULL DEFAULT '0', "technicianId" integer, "orderId" integer, "operatorId" integer, CONSTRAINT "PK_e7732d2ca64742eba89b6fa0b3f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "order_entity" ("id" SERIAL NOT NULL, "description" character varying, "observation" character varying, "date" TIMESTAMP, "status" character varying NOT NULL DEFAULT 'Pendiente', "comment" character varying NOT NULL DEFAULT '', "total" integer NOT NULL DEFAULT '0', "code" character varying, "clientId" integer, CONSTRAINT "PK_428b558237e70f2cd8462e1bea1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "client_group_entity" ("id" SERIAL NOT NULL, "rut_normalizado" character varying(20), "name" character varying NOT NULL, "credit_limit" numeric(15,2) NOT NULL DEFAULT '0', "payment_terms" character varying NOT NULL DEFAULT '', "active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_261244b1039b9baccf6e6388364" UNIQUE ("rut_normalizado"), CONSTRAINT "PK_9be3bbcd79276385b917e8de971" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "client_entity" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "rut_raw" character varying NOT NULL, "address" character varying NOT NULL, "city" character varying NOT NULL, "phone" character varying, "email" character varying, "rut_normalizado" character varying(12), "company_name" character varying, "active" boolean NOT NULL DEFAULT true, "group_id" integer NOT NULL, CONSTRAINT "PK_b730a3f25cd74d13a5cb68cbc59" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "log_entity" ("id" SERIAL NOT NULL, "userName" character varying NOT NULL, "clientId" integer NOT NULL, "clientName" character varying NOT NULL, "action" character varying NOT NULL, "date" TIMESTAMP, CONSTRAINT "PK_db6e55781ba6e3d4fd6485cca24" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "worker_entity" ("id" SERIAL NOT NULL, "name" character varying NOT NULL DEFAULT '', CONSTRAINT "PK_7b07d16a919661836685e11e8da" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "product_entity" ADD CONSTRAINT "FK_641188cadea80dfe98d4c769ebf" FOREIGN KEY ("categoryId") REFERENCES "category_entity"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transaction_entity" ADD CONSTRAINT "FK_8e6de1448553cd78a9d3bcb1928" FOREIGN KEY ("productId") REFERENCES "product_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transaction_entity" ADD CONSTRAINT "FK_52078098fe856122e312b0b191b" FOREIGN KEY ("operatorId") REFERENCES "user_entity"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transaction_entity" ADD CONSTRAINT "FK_7752bd11f66a2bfb8912c59bd98" FOREIGN KEY ("managerId") REFERENCES "user_entity"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transaction_entity" ADD CONSTRAINT "FK_2c235facff9b1fd6c5928c9e5b2" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transaction_entity" ADD CONSTRAINT "FK_0bf2a2abd5e0861808d6272a85d" FOREIGN KEY ("refillGroupId") REFERENCES "refill_groups"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "refill_groups" ADD CONSTRAINT "FK_47f65df87d475f47cad40d2df92" FOREIGN KEY ("technicianId") REFERENCES "user_entity"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "refill_groups" ADD CONSTRAINT "FK_71deccdc89ee0f679f6bf428674" FOREIGN KEY ("orderId") REFERENCES "order_entity"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "refill_groups" ADD CONSTRAINT "FK_4fbb8b9d2f4ce3b45ae67bcc524" FOREIGN KEY ("operatorId") REFERENCES "user_entity"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "order_entity" ADD CONSTRAINT "FK_d9d85aca36d342d72c154c29e6a" FOREIGN KEY ("clientId") REFERENCES "client_entity"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "client_entity" ADD CONSTRAINT "FK_d75eb840f701b9b29551530d8c4" FOREIGN KEY ("group_id") REFERENCES "client_group_entity"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "client_entity" DROP CONSTRAINT "FK_d75eb840f701b9b29551530d8c4"`);
        await queryRunner.query(`ALTER TABLE "order_entity" DROP CONSTRAINT "FK_d9d85aca36d342d72c154c29e6a"`);
        await queryRunner.query(`ALTER TABLE "refill_groups" DROP CONSTRAINT "FK_4fbb8b9d2f4ce3b45ae67bcc524"`);
        await queryRunner.query(`ALTER TABLE "refill_groups" DROP CONSTRAINT "FK_71deccdc89ee0f679f6bf428674"`);
        await queryRunner.query(`ALTER TABLE "refill_groups" DROP CONSTRAINT "FK_47f65df87d475f47cad40d2df92"`);
        await queryRunner.query(`ALTER TABLE "transaction_entity" DROP CONSTRAINT "FK_0bf2a2abd5e0861808d6272a85d"`);
        await queryRunner.query(`ALTER TABLE "transaction_entity" DROP CONSTRAINT "FK_2c235facff9b1fd6c5928c9e5b2"`);
        await queryRunner.query(`ALTER TABLE "transaction_entity" DROP CONSTRAINT "FK_7752bd11f66a2bfb8912c59bd98"`);
        await queryRunner.query(`ALTER TABLE "transaction_entity" DROP CONSTRAINT "FK_52078098fe856122e312b0b191b"`);
        await queryRunner.query(`ALTER TABLE "transaction_entity" DROP CONSTRAINT "FK_8e6de1448553cd78a9d3bcb1928"`);
        await queryRunner.query(`ALTER TABLE "product_entity" DROP CONSTRAINT "FK_641188cadea80dfe98d4c769ebf"`);
        await queryRunner.query(`DROP TABLE "worker_entity"`);
        await queryRunner.query(`DROP TABLE "log_entity"`);
        await queryRunner.query(`DROP TABLE "client_entity"`);
        await queryRunner.query(`DROP TABLE "client_group_entity"`);
        await queryRunner.query(`DROP TABLE "order_entity"`);
        await queryRunner.query(`DROP TABLE "refill_groups"`);
        await queryRunner.query(`DROP TABLE "user_entity"`);
        await queryRunner.query(`DROP TABLE "transaction_entity"`);
        await queryRunner.query(`DROP TABLE "sales"`);
        await queryRunner.query(`DROP TABLE "product_entity"`);
        await queryRunner.query(`DROP TABLE "category_entity"`);
    }

}
