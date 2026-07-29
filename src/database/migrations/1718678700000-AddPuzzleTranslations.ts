import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
  TableUnique,
} from 'typeorm';

export class AddPuzzleTranslations1718678700000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'puzzle_translations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            isGenerated: true,
          },
          { name: 'puzzleId', type: 'uuid' },
          { name: 'locale', type: 'varchar' },
          { name: 'title', type: 'varchar' },
          { name: 'description', type: 'text' },
          { name: 'hints', type: 'json', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'puzzle_translations',
      new TableForeignKey({
        columnNames: ['puzzleId'],
        referencedTableName: 'puzzles',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createUniqueConstraint(
      'puzzle_translations',
      new TableUnique({ columnNames: ['puzzleId', 'locale'] }),
    );

    await queryRunner.createIndex(
      'puzzle_translations',
      new TableIndex({ columnNames: ['locale'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('puzzle_translations');
  }
}
