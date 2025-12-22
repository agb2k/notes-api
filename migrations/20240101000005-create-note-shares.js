'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('noteShares', {
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
      sharedWithUserId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      permission: {
        type: Sequelize.ENUM('read', 'edit'),
        allowNull: false,
        defaultValue: 'read',
      },
      sharedByUserId: {
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

    // Add unique constraint on (noteId, sharedWithUserId) to prevent duplicate shares
    await queryInterface.addIndex('noteShares', ['noteId', 'sharedWithUserId'], {
      unique: true,
      name: 'noteShares_noteId_sharedWithUserId_unique'
    });

    // Add index on sharedWithUserId for fast lookups of notes shared with a user
    await queryInterface.addIndex('noteShares', ['sharedWithUserId']);

    // Add index on noteId for fast lookups of users a note is shared with
    await queryInterface.addIndex('noteShares', ['noteId']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('noteShares');
  }
};

