'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add FULLTEXT index on notes.content for efficient full-text search
    await queryInterface.sequelize.query(`
      ALTER TABLE notes ADD FULLTEXT INDEX idx_content_fulltext (content)
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE notes DROP INDEX idx_content_fulltext
    `);
  }
};

