'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('noteAttachments', {
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
      fileName: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      filePath: {
        type: Sequelize.STRING(500),
        allowNull: false,
      },
      fileType: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      fileSize: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      uploadedByUserId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
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

    // Add index on noteId for fast lookups
    await queryInterface.addIndex('noteAttachments', ['noteId']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('noteAttachments');
  }
};

