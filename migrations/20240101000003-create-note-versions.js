'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('noteVersions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      noteId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'notes',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      category: {
        type: Sequelize.ENUM('Work', 'Personal', 'Education'),
        allowNull: true,
      },
      versionNumber: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
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

    // Add unique index on (noteId, versionNumber)
    await queryInterface.addIndex('noteVersions', ['noteId', 'versionNumber'], {
      unique: true,
      name: 'noteVersions_noteId_versionNumber_unique'
    });
    // Add index on noteId for faster lookups
    await queryInterface.addIndex('noteVersions', ['noteId']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('noteVersions');
  }
};

