'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('notes', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      category: {
        type: Sequelize.ENUM('Work', 'Personal', 'Education'),
        allowNull: true,
      },
      version: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        allowNull: false,
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    // Add index on userId for faster queries
    await queryInterface.addIndex('notes', ['userId']);
    // Add index on (id, version) for optimistic locking
    await queryInterface.addIndex('notes', ['id', 'version']);
    // Add index on deletedAt for soft delete queries
    await queryInterface.addIndex('notes', ['deletedAt']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('notes');
  }
};

