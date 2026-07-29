import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddLocaleToSessions1718678800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'sessions',
      new TableColumn({
        name: 'locale',
        type: 'varchar',
        // Default of 'en' ensures existing rows are back-filled safely.
        default: "'en'",
        isNullable: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('sessions', 'locale');
  }
}
