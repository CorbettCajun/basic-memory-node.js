import { Command } from 'commander';
import searchEngine from '../search/index.js';
import chalk from 'chalk';

class SearchCommand {
  constructor() {
    this.command = new Command('search')
      .description('Search through memories')
      .argument('<query>', 'Search query')
      .option('-l, --limit <number>', 'Limit number of results', 10)
      .option('-m, --min-score <score>', 'Minimum relevance score', 0.1)
      .option('-f, --fields <fields>', 'Fields to search (comma-separated)', 'title,content,tags')
      .action(this.executeSearch.bind(this));
  }

  async executeSearch(query, options) {
    try {
      // Ensure search index is initialized
      await searchEngine.initialize();

      // Parse fields option
      const searchFields = options.fields.split(',').map(field => field.trim());

      // Perform search
      const results = searchEngine.search(query, {
        limit: parseInt(options.limit, 10),
        minScore: parseFloat(options.minScore),
        fields: searchFields
      });

      // Display results
      if (results.length === 0) {
        console.log(chalk.yellow('No memories found matching the search query.'));
        return;
      }

      console.log(chalk.green(`Found ${results.length} memories:`));
      
      results.forEach((result, index) => {
        console.log(chalk.blue(`\n${index + 1}. ${result.title}`));
        console.log(chalk.gray(`   Score: ${result.score.toFixed(2)}`));
        console.log(chalk.white(`   Path: ${result.path}`));
        
        // Preview content (first 100 characters)
        const preview = result.content.length > 100 
          ? result.content.substring(0, 100) + '...' 
          : result.content;
        console.log(chalk.white(`   Preview: ${preview}`));
      });
    } catch (error) {
      console.error(chalk.red('Search failed:'), error.message);
      process.exit(1);
    }
  }

  register(program) {
    program.addCommand(this.command);
  }
}

export default new SearchCommand();
